// ========================================
// MyFin - Страница всех операций
// ========================================

let currentFilters = {
    page: 1,
    type: null,
    categoryId: null,
    dateFrom: null,
    dateTo: null
};

/**
 * Рендер страницы всех операций
 */
async function renderTransactions() {
    const mainContent = document.getElementById('main-content');
    const userId = Auth.getUserId();
    const profile = Auth.getProfile();
    const currency = profile?.currency || 'RUB';

    currentFilters.page = 1;

    mainContent.innerHTML = `
        <!-- Мобильный хедер -->
        <div class="mobile-header">
            <svg class="mobile-header-logo" viewBox="0 0 120 100">
                <defs>
                    <linearGradient id="mobHeaderGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="120" height="100" rx="22" fill="url(#mobHeaderGrad4)"/>
                <text x="60" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="60" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
                
            </svg>
            <span class="mobile-header-title">Операции</span>
        </div>
        
        <div class="transactions-page">
            <!-- Фильтры -->
            <div class="card transactions-filters">
                <div class="filter-row">
                    <select id="filter-type" class="form-select">
                        <option value="">Все типы</option>
                        <option value="income">Доходы</option>
                        <option value="expense">Расходы</option>
                    </select>
                    <select id="filter-category" class="form-select">
                        <option value="">Все категории</option>
                    </select>
                </div>
                <div class="filter-row">
                    <div class="date-picker-wrapper">
                        <div class="date-input-display" id="filter-date-from-display">
                            <svg class="date-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                            </svg>
                            <span class="date-text empty" id="filter-date-from-text">С даты</span>
                        </div>
                        <input type="hidden" id="filter-date-from">
                        <div class="date-picker-dropdown" id="filter-date-from-picker"></div>
                    </div>
                    <div class="date-picker-wrapper">
                        <div class="date-input-display" id="filter-date-to-display">
                            <svg class="date-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                            </svg>
                            <span class="date-text empty" id="filter-date-to-text">По дату</span>
                        </div>
                        <input type="hidden" id="filter-date-to">
                        <div class="date-picker-dropdown" id="filter-date-to-picker"></div>
                    </div>
                </div>
                <div class="flex gap-md">
                    <button id="apply-filters-btn" class="btn btn-primary flex-1">Применить</button>
                    <button id="reset-filters-btn" class="btn btn-secondary flex-1">Сбросить</button>
                    <button id="copy-report-tx-btn" class="btn btn-secondary">Отчёт</button>
                    <button id="export-filters-btn" class="btn btn-secondary">Excel</button>
                </div>
            </div>
            
            <!-- Список транзакций -->
            <div id="transactions-list" class="transaction-list">
                <div class="text-center text-secondary py-lg">Загрузка...</div>
            </div>
            
            <!-- Пагинация -->
            <div id="pagination" class="pagination">
                <button id="prev-page-btn" class="pagination-btn" disabled>← Назад</button>
                <span id="pagination-info" class="pagination-info">Стр. 1</span>
                <button id="next-page-btn" class="pagination-btn">Вперёд →</button>
            </div>
        </div>
    `;

    // Загружаем категории для фильтра
    await loadCategoriesForFilter(userId);

    // При изменении типа фильтра обновляем список категорий
    document.getElementById('filter-type')?.addEventListener('change', (e) => {
        loadCategoriesForFilter(userId, e.target.value || null);
        // Сбрасываем выбранную категорию при смене типа
        document.getElementById('filter-category').value = '';
    });
    
    // Инициализация кастомных календарей для фильтров
    CustomDatePicker.init('filter-date-from-picker', null, (selectedDate) => {
        document.getElementById('filter-date-from').value = selectedDate;
        document.getElementById('filter-date-from-text').textContent = Utils.formatDate(selectedDate);
        document.getElementById('filter-date-from-text').classList.remove('empty');
    });

    CustomDatePicker.init('filter-date-to-picker', null, (selectedDate) => {
        document.getElementById('filter-date-to').value = selectedDate;
        document.getElementById('filter-date-to-text').textContent = Utils.formatDate(selectedDate);
        document.getElementById('filter-date-to-text').classList.remove('empty');
    });

    // Единый делегированный обработчик для всех календарей
    setupDatePickerHandlers();

    // Загружаем транзакции
    await loadTransactions(userId, currency);

    // Обработчики
    setupTransactionsHandlers(userId, currency);
}

/**
 * Загрузка категорий для фильтра
 * @param {string} userId - ID пользователя
 * @param {string} typeFilter - фильтр по типу ('income', 'expense', или null)
 */
async function loadCategoriesForFilter(userId, typeFilter = null) {
    try {
        let categories = await API.getCategories(userId);
        const select = document.getElementById('filter-category');

        if (select && categories) {
            // Фильтруем категории по типу
            if (typeFilter) {
                categories = categories.filter(c => c.type === typeFilter);
            }

            select.innerHTML = `
                <option value="">Все категории</option>
                ${categories.map(c => `
                    <option value="${c.id}">${Utils.escapeHtml(c.name)}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading categories for filter:', error);
    }
}

/**
 * Единый делегированный обработчик для календарей
 * (предотвращает дублирование и конфликт событий)
 */
let _datePickerHandlerInstalled = false;

function setupDatePickerHandlers() {
    if (_datePickerHandlerInstalled) return;
    _datePickerHandlerInstalled = true;

    document.addEventListener('click', (e) => {
        // Открытие календаря по клику на поле
        const dateDisplay = e.target.closest('.date-input-display');
        if (dateDisplay) {
            const wrapper = dateDisplay.closest('.date-picker-wrapper');
            if (!wrapper) return;
            const dropdown = wrapper.querySelector('.date-picker-dropdown');
            if (!dropdown) return;
            const id = dropdown.id;
            if (!id) return;

            // Закрываем все остальные календари
            document.querySelectorAll('.date-picker-dropdown.open').forEach(el => {
                if (el.id !== id) {
                    el.classList.remove('open');
                }
            });

            CustomDatePicker.toggle(id);
            return;
        }

        // Закрытие при клике вне календаря
        const isInsideWrapper = e.target.closest('.date-picker-wrapper');
        if (!isInsideWrapper) {
            CustomDatePicker.hide('filter-date-from-picker');
            CustomDatePicker.hide('filter-date-to-picker');
        }
    }, { once: false });
}

/**
 * Загрузка транзакций
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 */
async function loadTransactions(userId, currency) {
    const list = document.getElementById('transactions-list');
    if (!list) return;
    
    list.innerHTML = '<div class="text-center text-secondary py-lg">Загрузка...</div>';
    
    try {
        const result = await API.getTransactionsPaginated(userId, currentFilters);
        const transactions = result.data || [];
        
        if (transactions.length === 0) {
            list.innerHTML = `
                <div class="text-center text-secondary py-lg">
                    ${currentFilters.page === 1 ? 'Нет транзакций' : 'Конец списка'}
                </div>
            `;
        } else {
            list.innerHTML = renderTransactionsList(transactions, currency);
        }
        
        updatePagination(result.total, currency);
    } catch (error) {
        console.error('Error loading transactions:', error);
        list.innerHTML = '<div class="text-center text-secondary py-lg">Ошибка загрузки</div>';
    }
}

/**
 * Рендер списка транзакций
 * @param {Array} transactions - транзакции
 * @param {string} currency - валюта
 * @returns {string}
 */
function renderTransactionsList(transactions, currency) {
    return transactions.map(t => {
        const isIncome = t.type === TRANSACTION_TYPE.INCOME;
        const amountClass = isIncome ? 'income' : 'expense';
        const sign = isIncome ? '+' : '-';
        
        return `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-category">
                    <span>${Utils.escapeHtml(t.category?.name || 'Без категории')}</span>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign}${Utils.formatAmount(t.amount, currency)}
                </div>
                <div class="transaction-date">${Utils.formatDate(t.transaction_date)}</div>
                ${t.comment ? `<div class="transaction-comment">${Utils.escapeHtml(t.comment)}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Обновление пагинации
 * @param {number} total - общее количество
 * @param {string} currency - валюта
 */
function updatePagination(total) {
    const perPage = APP_CONFIG.TRANSACTIONS_PER_PAGE;
    const totalPages = Math.ceil(total / perPage);
    
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const info = document.getElementById('pagination-info');
    
    if (prevBtn) {
        prevBtn.disabled = currentFilters.page <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentFilters.page >= totalPages;
    }
    
    if (info) {
        info.textContent = `Стр. ${currentFilters.page} из ${totalPages || 1}`;
    }
}

/**
 * Настройка обработчиков операций
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 */
function setupTransactionsHandlers(userId, currency) {
    // Применение фильтров
    document.getElementById('apply-filters-btn')?.addEventListener('click', () => {
        const typeSelect = document.getElementById('filter-type');
        const categorySelect = document.getElementById('filter-category');
        const dateFromInput = document.getElementById('filter-date-from');
        const dateToInput = document.getElementById('filter-date-to');
        
        currentFilters = {
            page: 1,
            type: typeSelect?.value || null,
            categoryId: categorySelect?.value || null,
            dateFrom: dateFromInput?.value || null,
            dateTo: dateToInput?.value || null
        };
        
        loadTransactions(userId, currency);
    });
    
    // Сброс фильтров
    document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
        currentFilters = {
            page: 1,
            type: null,
            categoryId: null,
            dateFrom: null,
            dateTo: null
        };

        document.getElementById('filter-type').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';

        const dateFromText = document.getElementById('filter-date-from-text');
        const dateToText = document.getElementById('filter-date-to-text');
        if (dateFromText) {
            dateFromText.textContent = 'С даты';
            dateFromText.classList.add('empty');
        }
        if (dateToText) {
            dateToText.textContent = 'По дату';
            dateToText.classList.add('empty');
        }

        // Сбрасываем состояния календарей
        CustomDatePicker.destroy('filter-date-from-picker');
        CustomDatePicker.destroy('filter-date-to-picker');

        // Загружаем все категории
        loadCategoriesForFilter(userId, null);

        loadTransactions(userId, currency);
    });
    
    // Экспорт
    document.getElementById('export-filters-btn')?.addEventListener('click', async () => {
        try {
            const btn = document.getElementById('export-filters-btn');
            btn.disabled = true;
            btn.textContent = 'Экспорт...';
            
            const transactions = await API.exportFilteredTransactions(userId, currentFilters);
            exportToExcel(transactions, 'myfin-transactions');
            
            App.showToast('Данные экспортированы', 'success');
        } catch (error) {
            console.error('Export error:', error);
            App.showToast('Ошибка экспорта', 'error');
        } finally {
            const btn = document.getElementById('export-filters-btn');
            btn.disabled = false;
            btn.textContent = 'Excel';
        }
    });

    // Копирование отчёта
    document.getElementById('copy-report-tx-btn').onclick = async () => {
        await copyTransactionsReport(userId, currency);
    };
    
    // Пагинация
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (currentFilters.page > 1) {
            currentFilters.page--;
            loadTransactions(userId, currency);
        }
    });
    
    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        currentFilters.page++;
        loadTransactions(userId, currency);
    });
    
    // Клик по транзакции
    document.getElementById('transactions-list')?.addEventListener('click', (e) => {
        const item = e.target.closest('.transaction-item');
        if (item) {
            const transactionId = item.dataset.id;
            // Получаем транзакцию из кэша или загружаем
            const cached = Storage.getTransactionsCache(userId);
            let transaction = null;
            
            if (cached && cached.data) {
                transaction = cached.data.find(t => t.id === transactionId);
            }
            
            if (transaction) {
                showTransactionModal(null, transaction);
            }
        }
    });
}

/**
 * Сформировать и скопировать отчёт со страницы операций
 */
async function copyTransactionsReport(userId, currency) {
    try {
        const transactions = await API.exportFilteredTransactions(userId, currentFilters);

        // Рассчитываем статистику
        let totalIncome = 0;
        let totalExpense = 0;
        const byCategory = {};

        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            if (t.type === 'income') {
                totalIncome += amount;
            } else {
                totalExpense += amount;
            }

            const categoryId = t.category_id || `no-category-${t.type}`;
            if (!byCategory[categoryId]) {
                byCategory[categoryId] = {
                    id: categoryId,
                    name: t.category?.name || 'Без категории',
                    type: t.type,
                    amount: 0
                };
            }
            byCategory[categoryId].amount += amount;
        });

        const totalBalance = totalIncome - totalExpense;

        // Формируем период
        let periodLabel = 'Все операции';
        if (currentFilters.dateFrom && currentFilters.dateTo) {
            periodLabel = `${Utils.formatDate(currentFilters.dateFrom)} — ${Utils.formatDate(currentFilters.dateTo)}`;
        } else if (currentFilters.dateFrom) {
            periodLabel = `С ${Utils.formatDate(currentFilters.dateFrom)}`;
        } else if (currentFilters.dateTo) {
            periodLabel = `По ${Utils.formatDate(currentFilters.dateTo)}`;
        }

        if (currentFilters.type) {
            const typeLabel = currentFilters.type === 'income' ? ' (доходы)' : ' (расходы)';
            periodLabel += typeLabel;
        }

        if (currentFilters.categoryId) {
            const catSelect = document.getElementById('filter-category');
            const catName = catSelect?.options[catSelect.selectedIndex]?.text || '';
            if (catName && catName !== 'Все категории') {
                periodLabel += ` — ${catName}`;
            }
        }

        // Формируем HTML отчёта
        const incomeCategories = Object.values(byCategory).filter(c => c.type === 'income').sort((a, b) => b.amount - a.amount);
        const expenseCategories = Object.values(byCategory).filter(c => c.type === 'expense').sort((a, b) => b.amount - a.amount);
        const fmt = (amount) => Utils.formatAmount(amount, currency);

        const html = `
            <div style="margin-bottom:8px;">Период: ${Utils.escapeHtml(periodLabel)}</div>
            <br>
            <div style="margin-bottom:4px;"><b>Доходы:</b> ${fmt(totalIncome)}</div>
            <div style="margin-bottom:4px;"><b>Расходы:</b> ${fmt(totalExpense)}</div>
            <div style="margin-bottom:4px;"><b>Баланс:</b> ${fmt(totalBalance)}</div>
            <br>
            <div style="margin-bottom:4px;"><b>ДОХОДЫ: ${fmt(totalIncome)}</b></div>
            ${incomeCategories.length > 0 ? incomeCategories.map(cat =>
                `<div style="margin-bottom:2px; padding-left:12px; font-weight:normal;">${Utils.escapeHtml(cat.name)}: ${fmt(cat.amount)}</div>`
            ).join('') : '<div style="margin-bottom:2px; padding-left:12px; color:#999; font-weight:normal;">Нет данных</div>'}
            <br>
            <div style="margin-bottom:4px;"><b>РАСХОДЫ: ${fmt(totalExpense)}</b></div>
            ${expenseCategories.length > 0 ? expenseCategories.map(cat =>
                `<div style="margin-bottom:2px; padding-left:12px; font-weight:normal;">${Utils.escapeHtml(cat.name)}: ${fmt(cat.amount)}</div>`
            ).join('') : '<div style="margin-bottom:2px; padding-left:12px; color:#999; font-weight:normal;">Нет данных</div>'}
        `;

        const text = `Период: ${periodLabel}

Доходы: ${fmt(totalIncome)}
Расходы: ${fmt(totalExpense)}
Баланс: ${fmt(totalBalance)}

ДОХОДЫ: ${fmt(totalIncome)}
${incomeCategories.length > 0 ? incomeCategories.map(cat => `  ${cat.name}: ${fmt(cat.amount)}`).join('\n') : '  Нет данных'}

РАСХОДЫ: ${fmt(totalExpense)}
${expenseCategories.length > 0 ? expenseCategories.map(cat => `  ${cat.name}: ${fmt(cat.amount)}`).join('\n') : '  Нет данных'}`;

        try {
            const blob = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([text], { type: 'text/plain' })
            });
            await navigator.clipboard.write([blob]);
        } catch (err) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }

        App.showToast('Отчёт скопирован', 'success');
    } catch (error) {
        console.error('Copy report error:', error);
        App.showToast('Ошибка формирования отчёта', 'error');
    }
}
