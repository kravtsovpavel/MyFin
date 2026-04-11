// ========================================
// MyFin - Страница календаря
// ========================================

/**
 * Форматирование числа без символа валюты
 */
function formatNumber(amount) {
    return amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

/**
 * Рендер страницы календаря
 */
async function renderCalendar() {
    const mainContent = document.getElementById('main-content');
    const userId = Auth.getUserId();
    const profile = Auth.getProfile();
    const currency = profile?.currency || 'RUB';

    const { year, month } = Utils.getCurrentYearMonth();

    mainContent.innerHTML = `
        <!-- Мобильный хедер -->
        <div class="mobile-header">
            <svg class="mobile-header-logo" viewBox="0 0 120 100">
                <defs>
                    <linearGradient id="mobHeaderGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="120" height="100" rx="22" fill="url(#mobHeaderGrad3)"/>
                <text x="60" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="60" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
                
            </svg>
            <span class="mobile-header-title">Календарь</span>
        </div>
        
        <div class="calendar-page">
            <!-- Навигация -->
            <div class="calendar-header">
                <button id="prev-month-btn" class="calendar-nav-btn">←</button>
                <div class="calendar-title" id="calendar-title">
                    ${Utils.getMonthName(month)} ${year}
                </div>
                <button id="next-month-btn" class="calendar-nav-btn">→</button>
            </div>
            
            <!-- Календарь -->
            <div class="card">
                <div class="calendar-grid" id="calendar-grid">
                    <!-- Дни недели -->
                    ${renderWeekDays(profile?.week_start || 'monday')}
                    <!-- Дни месяца будут загружены здесь -->
                </div>
            </div>
        </div>
    `;

    // Загружаем данные календаря
    await loadCalendarData(userId, currency, year, month);

    // Обработчики
    setupCalendarHandlers(userId, currency, year, month);
}

/**
 * Ренер дней недели
 * @param {string} weekStart - первый день недели
 * @returns {string}
 */
function renderWeekDays(weekStart) {
    const days = Utils.getWeekDays(weekStart);
    return days.map(day => `<div class="calendar-weekday">${day}</div>`).join('');
}

/**
 * Загрузка данных календаря
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 * @param {number} year - год
 * @param {number} month - месяц
 */
async function loadCalendarData(userId, currency, year, month) {
    try {
        const startDate = Utils.getFirstDayOfMonth(year, month);
        const endDate = Utils.getLastDayOfMonth(year, month);

        // Получаем транзакции за период
        const transactions = await API.getTransactionsByPeriod(userId, startDate, endDate);

        // Группируем доходы и расходы по дням
        const dataByDay = {};
        transactions.forEach(t => {
            if (!dataByDay[t.transaction_date]) {
                dataByDay[t.transaction_date] = { income: 0, expense: 0 };
            }
            if (t.type === TRANSACTION_TYPE.INCOME) {
                dataByDay[t.transaction_date].income += parseFloat(t.amount);
            } else {
                dataByDay[t.transaction_date].expense += parseFloat(t.amount);
            }
        });

        // Рендерим календарь
        renderCalendarGrid(year, month, dataByDay, currency, transactions);
    } catch (error) {
        console.error('Error loading calendar data:', error);
        App.showToast('Ошибка загрузки данных', 'error');
    }
}

/**
 * Рендер сетки календаря
 * @param {number} year - год
 * @param {number} month - месяц
 * @param {Object} dataByDay - доходы и расходы по дням
 * @param {string} currency - валюта
 * @param {Array} allTransactions - все транзакции за период
 */
function renderCalendarGrid(year, month, dataByDay, currency, allTransactions) {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    const profile = Auth.getProfile();
    const weekStart = profile?.week_start || 'monday';
    const days = Utils.getCalendarDays(year, month, weekStart);

    const daysHTML = days.map(day => {
        if (!day.day) {
            return '<div class="calendar-day empty"></div>';
        }

        const date = day.date;
        const data = dataByDay[date] || { income: 0, expense: 0 };
        const isToday = day.isToday;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';

        return `
            <div class="${classes}" data-date="${date}">
                <span class="calendar-day-number">${day.day}</span>
                ${data.income > 0 ? `<span class="calendar-day-income">+${formatNumber(data.income)}</span>` : ''}
                ${data.expense > 0 ? `<span class="calendar-day-expense">-${formatNumber(data.expense)}</span>` : ''}
            </div>
        `;
    }).join('');

    grid.innerHTML = renderWeekDays(weekStart) + daysHTML;

    // Обработчики кликов по дням
    grid.querySelectorAll('.calendar-day[data-date]').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.dataset.date;
            const dayTransactions = allTransactions.filter(t => t.transaction_date === date);
            showDayModal(date, dayTransactions, currency);
        });
    });
}

/**
 * Показать модальное окно дня
 * @param {string} date - дата
 * @param {Array} transactions - транзакции за день
 * @param {string} currency - валюта
 */
function showDayModal(date, transactions, currency) {
    const totalExpense = transactions
        .filter(t => t.type === TRANSACTION_TYPE.EXPENSE)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalIncome = transactions
        .filter(t => t.type === TRANSACTION_TYPE.INCOME)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const html = `
        <div class="modal-header">
            <h2 class="modal-title">${Utils.formatDate(date)}</h2>
            <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="flex gap-lg mb-lg">
                <div class="flex-1">
                    <div class="text-sm text-secondary">Доходы</div>
                    <div class="text-xl text-income">${Utils.formatAmount(totalIncome, currency)}</div>
                </div>
                <div class="flex-1">
                    <div class="text-sm text-secondary">Расходы</div>
                    <div class="text-xl text-expense">${Utils.formatAmount(totalExpense, currency)}</div>
                </div>
            </div>
            
            ${transactions.length > 0 ? `
                <div class="transaction-list">
                    ${transactions.map(t => {
                        const isIncome = t.type === TRANSACTION_TYPE.INCOME;
                        const sign = isIncome ? '+' : '-';
                        const amountClass = isIncome ? 'income' : 'expense';
                        
                        return `
                            <div class="transaction-item" data-id="${t.id}">
                                <div class="transaction-category">
                                    <span>${Utils.escapeHtml(t.category?.name || 'Без категории')}</span>
                                </div>
                                <div class="transaction-amount ${amountClass}">
                                    ${sign}${Utils.formatAmount(t.amount, currency)}
                                </div>
                                <div class="transaction-date">${Utils.formatDate(t.transaction_date, true)}</div>
                                ${t.comment ? `<div class="transaction-comment">${Utils.escapeHtml(t.comment)}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div class="text-center text-secondary py-lg">
                    Нет транзакций за этот день
                </div>
            `}
        </div>
    `;
    
    App.showModal(html);
    
    // Обработчики кликов по транзакциям
    document.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', () => {
            const transactionId = item.dataset.id;
            const transaction = transactions.find(t => t.id === transactionId);
            if (transaction) {
                App.closeModal();
                setTimeout(() => {
                    showTransactionModal(null, transaction);
                }, 200);
            }
        });
    });
}

/**
 * Настройка обработчиков календаря
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 * @param {number} year - год
 * @param {number} month - месяц
 */
function setupCalendarHandlers(userId, currency, year, month) {
    let currentYear = year;
    let currentMonth = month;
    
    // Предыдущий месяц
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        const prev = Utils.getPreviousMonth(currentYear, currentMonth);
        currentYear = prev.year;
        currentMonth = prev.month;
        updateCalendarTitle(currentYear, currentMonth);
        loadCalendarData(userId, currency, currentYear, currentMonth);
    });
    
    // Следующий месяц
    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        const next = Utils.getNextMonth(currentYear, currentMonth);
        currentYear = next.year;
        currentMonth = next.month;
        
        // Не показываем будущие месяцы
        const now = new Date();
        if (currentYear > now.getFullYear() || (currentYear === now.getFullYear() && currentMonth > now.getMonth() + 1)) {
            return;
        }
        
        updateCalendarTitle(currentYear, currentMonth);
        loadCalendarData(userId, currency, currentYear, currentMonth);
    });
}

/**
 * Обновление заголовка календаря
 * @param {number} year - год
 * @param {number} month - месяц
 */
function updateCalendarTitle(year, month) {
    const title = document.getElementById('calendar-title');
    if (title) {
        title.textContent = `${Utils.getMonthName(month)} ${year}`;
    }
}
