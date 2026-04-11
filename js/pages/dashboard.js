// ========================================
// MyFin - Страница дашборда
// ========================================

/**
 * Рендер страницы дашборда
 */
async function renderDashboard() {
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
                    <linearGradient id="mobHeaderGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="120" height="100" rx="22" fill="url(#mobHeaderGrad1)"/>
                <text x="60" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="60" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
                
            </svg>
            <span class="mobile-header-title">Главная</span>
        </div>
        
        <div class="dashboard-page">
            <!-- Шапка с балансом -->
            <div class="dashboard-header">
                <div class="income-expense-row">
                    <div class="income-box">
                        <div class="label">Доходы</div>
                        <div id="income-amount" class="value">₽ 0</div>
                    </div>
                    <div class="expense-box">
                        <div class="label">Расходы</div>
                        <div id="expense-amount" class="value">₽ 0</div>
                    </div>
                </div>
                <div class="balance-label" style="margin-top: var(--spacing-md);">Баланс</div>
                <div id="balance-amount" class="balance-amount">₽ 0</div>
            </div>

            <!-- Быстрые действия -->
            <div class="quick-actions">
                <button id="add-income-btn" class="quick-action-btn primary">
                    <svg class="quick-action-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    Доход
                </button>
                <button id="add-expense-btn" class="quick-action-btn danger">
                    <svg class="quick-action-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
                    </svg>
                    Расход
                </button>
            </div>

            <!-- Бюджет -->
            <div id="budget-section" class="budget-card">
                ${renderBudgetSection(profile)}
            </div>

            <!-- Детализация по категориям -->
            <div id="category-breakdown-section" class="card">
                <h2 class="card-title">Детализация за месяц</h2>
                <div id="category-breakdown">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                </div>
            </div>

            <!-- Последние операции -->
            <div class="transactions-section">
                <div class="transactions-header">
                    <h2 class="transactions-title">Последние операции</h2>
                    <a href="#/transactions" class="transactions-link">Все →</a>
                </div>
                <div id="recent-transactions" class="transaction-list">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                </div>
            </div>
        </div>
    `;

    // Обработчики — ставим ДО загрузки данных
    setupDashboardHandlers();

    // Загружаем данные
    await loadDashboardData(userId, currency, year, month);
}

/**
 * Рендер секции бюджета
 * @param {Object} profile - профиль пользователя
 * @returns {string}
 */
function renderBudgetSection(profile) {
    const monthlyBudget = profile?.monthly_budget;

    if (!monthlyBudget) {
        return `
            <div class="budget-header">
                <span class="budget-title">Бюджет</span>
                <button id="set-budget-btn" class="btn btn-secondary" style="min-height: 36px; padding: 8px 16px;">
                    Установить
                </button>
            </div>
            <p class="text-secondary text-sm">Настройте месячный бюджет для контроля расходов</p>
        `;
    }

    return `
        <div class="budget-header">
            <span class="budget-title">Бюджет</span>
            <button id="edit-budget-btn" class="btn btn-secondary" style="min-height: 36px; padding: 8px 16px;">
                Изменить
            </button>
        </div>
        <div class="budget-progress">
            <div id="budget-progress-bar" class="budget-progress-bar" style="width: 0%"></div>
        </div>
        <div class="budget-footer">
            <span id="budget-amount">0 / ${Utils.formatAmount(monthlyBudget, profile.currency)}</span>
        </div>
    `;
}

/**
 * Загрузка данных дашборда
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 * @param {number} year - год
 * @param {number} month - месяц
 */
async function loadDashboardData(userId, currency, year, month) {
    try {
        // Получаем статистику за текущий месяц
        const currentStats = await API.getMonthlyStats(userId, year, month);
        
        // Получаем статистику за предыдущий месяц
        const { year: prevYear, month: prevMonth } = Utils.getPreviousMonth(year, month);
        const prevStats = await API.getPreviousMonthStats(userId, year, month);
        
        // Кэшируем транзакции
        const transactions = await API.getTransactions(userId, 100);
        Storage.setTransactionsCache(userId, transactions);
        
        // Обновляем шапку с балансом
        updateDashboardHeader(currentStats, currency);
        
        // Рендерим бюджет
        await renderBudget(userId, currency);
        
        // Рендерим детализацию по категориям
        renderCategoryBreakdown(currentStats, currency);
        
        // Рендерим последние транзакции
        renderRecentTransactions(transactions.slice(0, 10), currency);
        
        // Проверяем бюджет для уведомлений
        checkBudgetNotification(currentStats.expense, Auth.getProfile()?.monthly_budget);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Пробуем из кэша
        const cached = Storage.getTransactionsCache(userId);
        if (cached && cached.data) {
            renderRecentTransactions(cached.data.slice(0, 10), currency);
        }
        
        App.showToast('Ошибка загрузки данных', 'error');
    }
}

/**
 * Обновление шапки с балансом
 * @param {Object} stats - статистика
 * @param {string} currency - валюта
 */
function updateDashboardHeader(stats, currency) {
    const balanceEl = document.getElementById('balance-amount');
    const incomeEl = document.getElementById('income-amount');
    const expenseEl = document.getElementById('expense-amount');
    
    if (balanceEl) balanceEl.textContent = Utils.formatAmount(stats.balance, currency);
    if (incomeEl) incomeEl.textContent = Utils.formatAmount(stats.income, currency);
    if (expenseEl) expenseEl.textContent = Utils.formatAmount(stats.expense, currency);
}

/**
 * Рендер метрик
 * @param {Object} current - текущая статистика
 * @param {Object} previous - предыдущая статистика
 * @param {string} currency - валюта
 */
function renderMetrics(current, previous, currency) {
    const container = document.getElementById('metrics-section');
    
    // Доходы
    const incomeDelta = Utils.calculateDelta(current.income, previous.income);
    const incomeDirection = Utils.getDeltaDirection(current.income, previous.income, false);
    
    // Расходы
    const expenseDelta = Utils.calculateDelta(current.expense, previous.expense);
    const expenseDirection = Utils.getDeltaDirection(current.expense, previous.expense, true);
    
    // Баланс
    const balanceDelta = Utils.calculateDelta(current.balance, previous.balance);
    const balanceDirection = Utils.getDeltaDirection(current.balance, previous.balance, false);
    
    container.innerHTML = `
        <div class="metric-card">
            <div class="metric-label">Доходы</div>
            <div class="metric-value income">${Utils.formatAmount(current.income, currency)}</div>
            ${renderDelta(incomeDelta, incomeDirection)}
        </div>
        <div class="metric-card">
            <div class="metric-label">Расходы</div>
            <div class="metric-value expense">${Utils.formatAmount(current.expense, currency)}</div>
            ${renderDelta(expenseDelta, expenseDirection)}
        </div>
        <div class="metric-card">
            <div class="metric-label">Баланс</div>
            <div class="metric-value balance">${Utils.formatAmount(current.balance, currency)}</div>
            ${renderDelta(balanceDelta, balanceDirection)}
        </div>
    `;
}

/**
 * Рендер дельты
 * @param {number} delta - значение в процентах
 * @param {string} direction - направление
 * @returns {string}
 */
function renderDelta(delta, direction) {
    if (delta === null || delta === undefined) {
        return '<div class="metric-delta">—</div>';
    }
    
    const icon = Utils.getDeltaIcon(direction);
    const className = direction === 'up' ? 'up' : 'down';
    
    return `
        <div class="metric-delta ${className}">
            ${icon} ${Math.abs(delta)}%
        </div>
    `;
}

/**
 * Рендер бюджета
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 */
async function renderBudget(userId, currency) {
    const profile = Auth.getProfile();
    const monthlyBudget = profile?.monthly_budget;
    
    if (!monthlyBudget) {
        return;
    }
    
    const { year, month } = Utils.getCurrentYearMonth();
    const stats = await API.getMonthlyStats(userId, year, month);
    
    const percent = Utils.calculatePercent(stats.expense, monthlyBudget);
    const spent = Utils.formatAmount(stats.expense, currency);
    const limit = Utils.formatAmount(monthlyBudget, currency);
    
    const progressBar = document.getElementById('budget-progress-bar');
    const budgetAmount = document.getElementById('budget-amount');
    
    if (progressBar) {
        progressBar.style.width = `${Math.min(percent, 100)}%`;
        progressBar.classList.toggle('warning', percent >= 90 && percent < 100);
        progressBar.classList.toggle('danger', percent >= 100);
    }
    
    if (budgetAmount) {
        budgetAmount.textContent = `${spent} / ${limit}`;
    }
}

/**
 * Рендер детализации по категориям
 * @param {Object} stats - статистика за месяц
 * @param {string} currency - валюта
 */
function renderCategoryBreakdown(stats, currency) {
    const container = document.getElementById('category-breakdown');
    if (!container) return;
    
    const expenseCategories = Object.values(stats.byCategory).filter(c => c.type === TRANSACTION_TYPE.EXPENSE);
    const incomeCategories = Object.values(stats.byCategory).filter(c => c.type === TRANSACTION_TYPE.INCOME);
    
    if (expenseCategories.length === 0 && incomeCategories.length === 0) {
        container.innerHTML = `
            <div class="text-center text-secondary py-lg">
                Нет транзакций за этот месяц
            </div>
        `;
        return;
    }
    
    let html = '';

    // Доходы
    if (incomeCategories.length > 0) {
        html += `
            <div class="category-breakdown-header income" style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M7 14l5-5 5 5z"/>
                </svg>
                Доходы: ${Utils.formatAmount(stats.income, currency)}
            </div>
            <div class="category-breakdown-list">
                ${incomeCategories
                    .sort((a, b) => b.amount - a.amount)
                    .map(cat => {
                        const percent = Utils.calculatePercent(cat.amount, stats.income);
                        return `
                            <div class="category-breakdown-item">
                                <div class="category-breakdown-info">
                                    <div class="category-breakdown-name">${Utils.escapeHtml(cat.name)}</div>
                                    <div class="category-breakdown-percent">${percent}%</div>
                                </div>
                                <div class="category-breakdown-amount income">
                                    ${Utils.formatAmount(cat.amount, currency)}
                                </div>
                            </div>
                        `;
                    }).join('')}
            </div>
        `;
    }

    // Расходы
    if (expenseCategories.length > 0) {
        html += `
            <div class="category-breakdown-header expense" style="display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-lg); margin-bottom: var(--spacing-md);">
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                </svg>
                Расходы: ${Utils.formatAmount(stats.expense, currency)}
            </div>
            <div class="category-breakdown-list">
                ${expenseCategories
                    .sort((a, b) => b.amount - a.amount)
                    .map(cat => {
                        const percent = Utils.calculatePercent(cat.amount, stats.expense);
                        return `
                            <div class="category-breakdown-item">
                                <div class="category-breakdown-info">
                                    <div class="category-breakdown-name">${Utils.escapeHtml(cat.name)}</div>
                                    <div class="category-breakdown-percent">${percent}%</div>
                                </div>
                                <div class="category-breakdown-amount expense">
                                    ${Utils.formatAmount(cat.amount, currency)}
                                </div>
                            </div>
                        `;
                    }).join('')}
            </div>
        `;
    }

    container.innerHTML = html;
}

/**
 * Проверка бюджета для уведомлений
 * @param {number} expense - расходы
 * @param {number} budget - бюджет
 */
function checkBudgetNotification(expense, budget) {
    if (!budget) return;
    
    const percent = (expense / budget) * 100;
    
    if (percent >= 90) {
        App.showBudgetWarning(percent);
    }
}

/**
 * Рендер последних транзакций
 * @param {Array} transactions - транзакции
 * @param {string} currency - валюта
 */
function renderRecentTransactions(transactions, currency) {
    const container = document.getElementById('recent-transactions');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="text-center text-secondary py-lg">
                Нет транзакций. Добавьте первую!
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(t => {
        const isIncome = t.type === TRANSACTION_TYPE.INCOME;
        const amountClass = isIncome ? 'income' : 'expense';
        const sign = isIncome ? '+' : '-';
        
        return `
            <div class="transaction-item" data-id="${t.id}" data-type="${t.type}">
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
    
    // Обработчики кликов
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', () => {
            const transactionId = item.dataset.id;
            const transaction = transactions.find(t => t.id === transactionId);
            if (transaction) {
                showTransactionModal(null, transaction);
            }
        });
    });
}

/**
 * Настройка свайпа для удаления
 * @param {HTMLElement} container - контейнер
 */
function setupSwipeDelete(container) {
    let startX, currentX;
    let currentElement = null;
    
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentElement = item;
        });
        
        item.addEventListener('touchmove', (e) => {
            if (!currentElement) return;
            currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            
            if (diff > 50) {
                currentElement.classList.add('swiped');
            } else {
                currentElement.classList.remove('swiped');
            }
        });
        
        item.addEventListener('touchend', () => {
            if (currentElement && currentElement.classList.contains('swiped')) {
                const transactionId = currentElement.dataset.id;
                handleDeleteTransaction(transactionId);
            }
            currentElement = null;
        });
    });
}

/**
 * Обработка удаления транзакции
 * @param {string} transactionId - ID транзакции
 */
async function handleDeleteTransaction(transactionId) {
    const confirmed = confirm('Удалить транзакцию?');
    if (!confirmed) return;
    
    try {
        await API.deleteTransaction(transactionId);
        App.showToast('Транзакция удалена', 'success');
        await renderDashboard();
    } catch (error) {
        console.error('Delete transaction error:', error);
        App.showToast('Ошибка удаления', 'error');
    }
}

/**
 * Настройка обработчиков дашборда
 */
function setupDashboardHandlers() {
    // Используем делегирование событий на main-content
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    mainContent.addEventListener('click', (e) => {
        const expenseBtn = e.target.closest('#add-expense-btn');
        if (expenseBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Expense button clicked');
            showTransactionModal(TRANSACTION_TYPE.EXPENSE);
            return;
        }
        
        const incomeBtn = e.target.closest('#add-income-btn');
        if (incomeBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Income button clicked');
            showTransactionModal(TRANSACTION_TYPE.INCOME);
            return;
        }
        
        const setBudgetBtn = e.target.closest('#set-budget-btn');
        if (setBudgetBtn) {
            Router.navigate('settings');
            return;
        }
        
        const editBudgetBtn = e.target.closest('#edit-budget-btn');
        if (editBudgetBtn) {
            Router.navigate('settings');
            return;
        }
    });
}
