// ========================================
// MyFin - Страница аналитики
// ========================================

let analyticsLineChart = null;
let analyticsExpensePieChart = null;
let analyticsIncomePieChart = null;

// Текущий период и дата
let currentPeriod = 'month'; // 'day', 'week', 'month', 'year'
let currentDate = new Date();

/**
 * Рендер страницы аналитики
 */
async function renderAnalytics() {
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
        <!-- Мобильный хедер -->
        <div class="mobile-header">
            <svg class="mobile-header-logo" viewBox="0 0 120 100">
                <defs>
                    <linearGradient id="mobHeaderGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="120" height="100" rx="22" fill="url(#mobHeaderGrad2)"/>
                <text x="60" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="60" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
            </svg>
            <span class="mobile-header-title">Аналитика</span>
        </div>
        
        <div class="analytics-page">
            <!-- Выбор периода -->
            <div class="analytics-period-selector">
                <div class="period-buttons">
                    <button class="period-btn" data-period="week" onclick="switchPeriod('week')">Неделя</button>
                    <button class="period-btn active" data-period="month" onclick="switchPeriod('month')">Месяц</button>
                    <button class="period-btn" data-period="year" onclick="switchPeriod('year')">Год</button>
                </div>
            </div>

            <!-- Навигация по периодам -->
            <div class="period-navigation">
                <button id="prev-period-btn" class="period-nav-btn" onclick="navigatePeriodAndLoad(-1)">←</button>
                <div id="period-title" class="period-title"></div>
                <button id="next-period-btn" class="period-nav-btn" onclick="navigatePeriodAndLoad(1)">→</button>
            </div>

            <!-- Линейный график -->
            <div class="chart-wrapper mb-lg">
                <h2 class="chart-title">Динамика доходов и расходов</h2>
                <canvas id="analytics-line-chart"></canvas>
            </div>

            <!-- Круговые диаграммы -->
            <div class="analytics-charts">
                <!-- Доходы -->
                <div class="chart-wrapper pie-chart-wrapper">
                    <h2 class="chart-title">Доходы</h2>
                    <div class="chart-canvas-container">
                        <canvas id="analytics-income-pie-chart"></canvas>
                    </div>
                    <div id="income-legend" class="chart-legend"></div>
                </div>

                <!-- Расходы -->
                <div class="chart-wrapper pie-chart-wrapper">
                    <h2 class="chart-title">Расходы</h2>
                    <div class="chart-canvas-container">
                        <canvas id="analytics-expense-pie-chart"></canvas>
                    </div>
                    <div id="expense-legend" class="chart-legend"></div>
                </div>
            </div>

            <!-- Сравнение с прошлым периодом -->
            <div class="card analytics-comparison mt-lg">
                <h2 class="card-title" id="comparison-title">Сравнение</h2>
                <div id="comparison-table-container"></div>
            </div>

            <!-- Копирование отчёта -->
            <div class="card analytics-report mt-lg">
                <div class="flex justify-between items-center">
                    <h2 class="card-title" style="margin-bottom: 0;">Отчёт</h2>
                    <button id="copy-report-btn" class="btn btn-secondary" style="min-height: 36px; padding: 6px 16px; font-size: var(--font-size-sm);">Копировать</button>
                </div>
                <div id="report-preview" style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--bg-primary); border-radius: var(--border-radius-sm); font-size: var(--font-size-xs); color: var(--text-primary); line-height: 1.6; white-space: pre-line; max-height: 300px; overflow-y: auto;"></div>
            </div>
        </div>
    `;

    // Загружаем данные
    const userId = Auth.getUserId();
    const profile = Auth.getProfile();
    const currency = profile?.currency || 'RUB';
    
    await loadAnalyticsData(userId, currency);
}

/**
 * Получить даты начала и конца периода
 */
function getPeriodDates(period, date) {
    const d = new Date(date);
    let startDate, endDate, prevStartDate, prevEndDate;

    switch (period) {
        case 'week': {
            const dayOfWeek = d.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(d);
            monday.setDate(monday.getDate() + mondayOffset);

            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);

            startDate = Utils.formatDateForInput(monday);
            endDate = Utils.formatDateForInput(sunday);

            const prevMonday = new Date(monday);
            prevMonday.setDate(prevMonday.getDate() - 7);
            const prevSunday = new Date(sunday);
            prevSunday.setDate(prevSunday.getDate() - 7);

            prevStartDate = Utils.formatDateForInput(prevMonday);
            prevEndDate = Utils.formatDateForInput(prevSunday);
            break;
        }
        case 'month': {
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            startDate = Utils.getFirstDayOfMonth(year, month);
            endDate = Utils.getLastDayOfMonth(year, month);

            const { year: prevYear, month: prevMonth } = Utils.getPreviousMonth(year, month);
            prevStartDate = Utils.getFirstDayOfMonth(prevYear, prevMonth);
            prevEndDate = Utils.getLastDayOfMonth(prevYear, prevMonth);
            break;
        }
        case 'year': {
            const year = d.getFullYear();
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;

            prevStartDate = `${year - 1}-01-01`;
            prevEndDate = `${year - 1}-12-31`;
            break;
        }
    }

    return { startDate, endDate, prevStartDate, prevEndDate };
}

/**
 * Получить заголовок периода
 */
function getPeriodTitle(period, date) {
    const d = new Date(date);

    switch (period) {
        case 'week': {
            const dayOfWeek = d.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(d);
            monday.setDate(monday.getDate() + mondayOffset);
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            return `${Utils.formatDate(monday)} — ${Utils.formatDate(sunday)}`;
        }
        case 'month':
            return `${Utils.getMonthName(d.getMonth() + 1)} ${d.getFullYear()}`;
        case 'year':
            return `${d.getFullYear()}`;
    }
}

/**
 * Получить заголовок сравнения
 */
function getComparisonTitle(period) {
    switch (period) {
        case 'week': return 'Сравнение с предыдущей неделей';
        case 'month': return 'Сравнение с прошлым месяцем';
        case 'year': return 'Сравнение с прошлым годом';
    }
}

/**
 * Загрузка данных аналитики
 */
async function loadAnalyticsData(userId, currency) {
    try {
        const { startDate, endDate, prevStartDate, prevEndDate } = getPeriodDates(currentPeriod, currentDate);

        // Получаем транзакции за период
        const transactions = await API.getTransactionsByPeriod(userId, startDate, endDate);
        const stats = calculateStats(transactions);

        // Получаем транзакции за предыдущий период
        const prevTransactions = await API.getTransactionsByPeriod(userId, prevStartDate, prevEndDate);
        const prevStats = calculateStats(prevTransactions);

        // Обновляем заголовки
        const titleEl = document.getElementById('period-title');
        if (titleEl) titleEl.textContent = getPeriodTitle(currentPeriod, currentDate);

        const compTitleEl = document.getElementById('comparison-title');
        if (compTitleEl) compTitleEl.textContent = getComparisonTitle(currentPeriod);

        // Обновляем активную кнопку периода
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.period-btn[data-period="${currentPeriod}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Рендерим графики
        await renderLineChart(userId);
        renderPieCharts(stats, currency);
        renderComparisonTable(stats, prevStats, currency);
        renderReportPreview(stats, currency);
        setupReportCopyHandler(stats, currency);
    } catch (error) {
        console.error('Error loading analytics data:', error);
        App.showToast('Ошибка загрузки данных', 'error');
    }
}

/**
 * Подсчитать статистику из транзакций
 */
function calculateStats(transactions) {
    const stats = { income: 0, expense: 0, balance: 0, byCategory: {} };

    transactions.forEach(t => {
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
            stats.income += amount;
        } else {
            stats.expense += amount;
        }

        // Группируем по категориям (включая "Без категории")
        // Для транзакций без категории создаём отдельную запись для каждого типа
        const categoryId = t.category_id || `no-category-${t.type}`;
        if (!stats.byCategory[categoryId]) {
            stats.byCategory[categoryId] = {
                id: categoryId,
                name: t.category?.name || 'Без категории',
                type: t.type,
                amount: 0
            };
        }
        stats.byCategory[categoryId].amount += amount;
    });

    stats.balance = stats.income - stats.expense;
    return stats;
}

/**
 * Рендер линейного графика
 */
async function renderLineChart(userId) {
    const ctx = document.getElementById('analytics-line-chart');
    if (!ctx) return;

    const { startDate, endDate } = getPeriodDates(currentPeriod, currentDate);

    // Определяем количество точек и настройки оси X в зависимости от периода
    let labels, incomeData, expenseData;
    let xTicksConfig = {};

    // Для годового периода - данные по месяцам
    if (currentPeriod === 'year') {
        const year = new Date(startDate).getFullYear();
        labels = [];
        incomeData = [];
        expenseData = [];

        for (let month = 1; month <= 12; month++) {
            labels.push(Utils.getMonthName(month, false));

            const monthStart = Utils.getFirstDayOfMonth(year, month);
            const monthEnd = Utils.getLastDayOfMonth(year, month);

            const monthTx = await API.getTransactionsByPeriod(userId, monthStart, monthEnd);
            const monthStats = calculateStats(monthTx);

            incomeData.push(monthStats.income);
            expenseData.push(monthStats.expense);
        }

        xTicksConfig = {
            maxRotation: 0,
            autoSkip: false,
            padding: 4,
            font: { size: 10 }
        };
    } else {
        // Для месяца и недели - данные по дням
        const byDay = await API.getTransactionsByDay(userId, startDate, endDate);

        const start = new Date(startDate);
        const end = new Date(endDate);
        labels = [];
        incomeData = [];
        expenseData = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = Utils.formatDateForInput(d);
            labels.push(d.getDate().toString());
            incomeData.push(byDay[dateStr]?.income || 0);
            expenseData.push(byDay[dateStr]?.expense || 0);
        }

        // Для недели показываем все дни, для месяца - с ограничением
        if (currentPeriod === 'week') {
            xTicksConfig = {
                maxRotation: 0,
                autoSkip: false,
                padding: 4,
                font: { size: 11 }
            };
        } else {
            xTicksConfig = {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 15,
                padding: 4,
                font: { size: 10 }
            };
        }
    }

    if (analyticsLineChart) analyticsLineChart.destroy();

    analyticsLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Доходы',
                    data: incomeData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: currentPeriod === 'year' ? 3 : 2,
                    pointHoverRadius: currentPeriod === 'year' ? 6 : 5
                },
                {
                    label: 'Расходы',
                    data: expenseData,
                    borderColor: '#F44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: currentPeriod === 'year' ? 3 : 2,
                    pointHoverRadius: currentPeriod === 'year' ? 6 : 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: {
                padding: {
                    bottom: 32
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#5C6BC0',
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#FFFFFF',
                    titleColor: '#1A237E',
                    bodyColor: '#5C6BC0',
                    borderColor: '#BBDEFB',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    displayColors: true,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { color: '#E3F2FD', drawBorder: false },
                    ticks: {
                        color: '#5C6BC0',
                        display: true,
                        ...xTicksConfig
                    }
                },
                y: {
                    grid: { color: '#E3F2FD', drawBorder: false },
                    ticks: {
                        color: '#5C6BC0',
                        display: true,
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

/**
 * Рендер круговых диаграмм
 */
function renderPieCharts(stats, currency) {
    const expenseCategories = Object.values(stats.byCategory).filter(c => c.type === 'expense');
    const incomeCategories = Object.values(stats.byCategory).filter(c => c.type === 'income');

    renderPieChart('analytics-income-pie-chart', incomeCategories, currency, 'income');
    renderPieChart('analytics-expense-pie-chart', expenseCategories, currency, 'expense');

    renderLegend('income-legend', incomeCategories, currency, 'income');
    renderLegend('expense-legend', expenseCategories, currency, 'expense');
}

/**
 * Рендер круговой диаграммы
 */
function renderPieChart(canvasId, categories, currency, type) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (categories.length === 0) {
        const chart = Chart.getChart(canvasId);
        if (chart) chart.destroy();
        return;
    }

    // Сортируем по убыванию суммы — порядок должен совпадать с легендой
    const sorted = [...categories].sort((a, b) => b.amount - a.amount);

    const labels = sorted.map(c => c.name);
    const data = sorted.map(c => c.amount);
    const { backgroundColors, borderColors } = Utils.getChartColors(sorted.length, type);

    const existingChart = Chart.getChart(canvasId);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#FFFFFF',
                    titleColor: '#1A237E',
                    bodyColor: '#5C6BC0',
                    borderColor: '#BBDEFB',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = Math.round((value / total) * 100);
                            return `${Utils.formatAmount(value, currency)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Рендер легенды
 */
function renderLegend(containerId, categories, currency, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (categories.length === 0) {
        container.innerHTML = '<p class="text-secondary text-center">Нет данных</p>';
        return;
    }

    const total = categories.reduce((sum, c) => sum + c.amount, 0);
    // Сортируем ДО генерации цветов — порядок должен совпадать с диаграммой
    const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount);
    const colors = Utils.getChartColors(sortedCategories.length, type);

    const totalLabel = type === 'income' ? 'Итого доходов' : 'Итого расходов';

    const html = `
        <div class="chart-legend-total">
            <span class="chart-legend-total-label">${totalLabel}</span>
            <span class="chart-legend-total-amount ${type}">${Utils.formatAmount(total, currency)}</span>
        </div>
    ` + sortedCategories.map((cat, index) => {
        const percent = Utils.calculatePercent(cat.amount, total);
        const color = colors.backgroundColors[index] || '#BBDEFB';

        return `
            <div class="chart-legend-item" style="cursor: pointer;" data-category-id="${cat.id}">
                <div class="chart-legend-info">
                    <div class="chart-legend-color" style="background-color: ${color};"></div>
                    <span class="chart-legend-name">${Utils.escapeHtml(cat.name)}</span>
                </div>
                <div class="chart-legend-values">
                    <div class="chart-legend-amount">${Utils.formatAmount(cat.amount, currency)}</div>
                    <div class="chart-legend-percent">${percent}%</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Рендер таблицы сравнения
 */
function renderComparisonTable(current, previous, currency) {
    const container = document.getElementById('comparison-table-container');
    if (!container) return;

    const incomeDelta = Utils.calculateDelta(current.income, previous.income);
    const expenseDelta = Utils.calculateDelta(current.expense, previous.expense);
    const balanceDelta = Utils.calculateDelta(current.balance, previous.balance);

    container.innerHTML = `
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Показатель</th>
                    <th>Предыдущий</th>
                    <th>Текущий</th>
                    <th>Изменение</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Доходы</td>
                    <td>${Utils.formatAmount(previous.income, currency)}</td>
                    <td>${Utils.formatAmount(current.income, currency)}</td>
                    <td>${renderComparisonDelta(incomeDelta, true)}</td>
                </tr>
                <tr>
                    <td>Расходы</td>
                    <td>${Utils.formatAmount(previous.expense, currency)}</td>
                    <td>${Utils.formatAmount(current.expense, currency)}</td>
                    <td>${renderComparisonDelta(expenseDelta, false)}</td>
                </tr>
                <tr>
                    <td>Баланс</td>
                    <td>${Utils.formatAmount(previous.balance, currency)}</td>
                    <td>${Utils.formatAmount(current.balance, currency)}</td>
                    <td>${renderComparisonDelta(balanceDelta, true)}</td>
                </tr>
            </tbody>
        </table>
    `;
}

/**
 * Рендер дельты в таблице сравнения
 */
function renderComparisonDelta(delta, positiveIsGood) {
    if (delta === null || delta === undefined) return '—';
    const icon = delta >= 0 ? '▲' : '▼';
    const isGood = (delta >= 0) === positiveIsGood;
    const className = isGood ? 'text-income' : 'text-expense';
    return `<span class="${className}">${icon} ${Math.abs(delta)}%</span>`;
}

/**
 * Сформировать текст отчёта (plain text для буфера обмена)
 */
function generateReportText(stats, currency) {
    const periodLabel = getPeriodTitle(currentPeriod, currentDate);
    const lines = [];

    lines.push(`Период: ${periodLabel}`);
    lines.push('');

    lines.push(`Доходы: ${Utils.formatAmount(stats.income, currency)}`);
    lines.push(`Расходы: ${Utils.formatAmount(stats.expense, currency)}`);
    lines.push(`Баланс: ${Utils.formatAmount(stats.balance, currency)}`);
    lines.push('');

    lines.push(`ДОХОДЫ: ${Utils.formatAmount(stats.income, currency)}`);
    const incomeCategories = Object.values(stats.byCategory).filter(c => c.type === 'income').sort((a, b) => b.amount - a.amount);
    if (incomeCategories.length > 0) {
        incomeCategories.forEach(cat => {
            lines.push(`  ${cat.name}: ${Utils.formatAmount(cat.amount, currency)}`);
        });
    } else {
        lines.push('  Нет данных');
    }
    lines.push('');

    lines.push(`РАСХОДЫ: ${Utils.formatAmount(stats.expense, currency)}`);
    const expenseCategories = Object.values(stats.byCategory).filter(c => c.type === 'expense').sort((a, b) => b.amount - a.amount);
    if (expenseCategories.length > 0) {
        expenseCategories.forEach(cat => {
            lines.push(`  ${cat.name}: ${Utils.formatAmount(cat.amount, currency)}`);
        });
    } else {
        lines.push('  Нет данных');
    }

    return lines.join('\n');
}

/**
 * Сформировать HTML отчёта (для превью и копирования с форматированием)
 */
function generateReportHTML(stats, currency) {
    const periodLabel = getPeriodTitle(currentPeriod, currentDate);
    const fmt = (amount) => Utils.formatAmount(amount, currency);

    const incomeCategories = Object.values(stats.byCategory).filter(c => c.type === 'income').sort((a, b) => b.amount - a.amount);
    const expenseCategories = Object.values(stats.byCategory).filter(c => c.type === 'expense').sort((a, b) => b.amount - a.amount);

    let html = '';
    html += `<div style="margin-bottom:8px;">Период: ${periodLabel}</div>`;
    html += '<br>';
    html += `<div style="margin-bottom:4px;"><b>Доходы:</b> ${fmt(stats.income)}</div>`;
    html += `<div style="margin-bottom:4px;"><b>Расходы:</b> ${fmt(stats.expense)}</div>`;
    html += `<div style="margin-bottom:4px;"><b>Баланс:</b> ${fmt(stats.balance)}</div>`;
    html += '<br>';

    html += `<div style="margin-bottom:4px;"><b>ДОХОДЫ: ${fmt(stats.income)}</b></div>`;
    if (incomeCategories.length > 0) {
        incomeCategories.forEach(cat => {
            html += `<div style="margin-bottom:2px; padding-left:12px; font-weight:normal;">${Utils.escapeHtml(cat.name)}: ${fmt(cat.amount)}</div>`;
        });
    } else {
        html += '<div style="margin-bottom:2px; padding-left:12px; color:#999; font-weight:normal;">Нет данных</div>';
    }
    html += '<br>';

    html += `<div style="margin-bottom:4px;"><b>РАСХОДЫ: ${fmt(stats.expense)}</b></div>`;
    if (expenseCategories.length > 0) {
        expenseCategories.forEach(cat => {
            html += `<div style="margin-bottom:2px; padding-left:12px; font-weight:normal;">${Utils.escapeHtml(cat.name)}: ${fmt(cat.amount)}</div>`;
        });
    } else {
        html += '<div style="margin-bottom:2px; padding-left:12px; color:#999; font-weight:normal;">Нет данных</div>';
    }

    return html;
}

/**
 * Показать превью отчёта
 */
function renderReportPreview(stats, currency) {
    const container = document.getElementById('report-preview');
    if (container) {
        container.innerHTML = generateReportHTML(stats, currency);
    }
}

/**
 * Настройка обработчика копирования отчёта
 */
function setupReportCopyHandler(stats, currency) {
    const btn = document.getElementById('copy-report-btn');
    if (!btn) return;

    btn.onclick = async () => {
        const reportHTML = generateReportHTML(stats, currency);
        const reportText = generateReportText(stats, currency);

        try {
            // Копируем HTML для жирного шрифта в Google Sheets
            const blob = new ClipboardItem({
                'text/html': new Blob([reportHTML], { type: 'text/html' }),
                'text/plain': new Blob([reportText], { type: 'text/plain' })
            });
            await navigator.clipboard.write([blob]);
            App.showToast('Отчёт скопирован', 'success');
        } catch (err) {
            // Fallback: копируем plain text
            try {
                await navigator.clipboard.writeText(reportText);
                App.showToast('Отчёт скопирован', 'success');
            } catch (err2) {
                const textarea = document.createElement('textarea');
                textarea.value = reportText;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                App.showToast('Отчёт скопирован', 'success');
            }
        }
    };
}

// Глобальные функции для inline onclick
window.switchPeriod = function(period) {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.period-btn[data-period="${period}"]`)?.classList.add('active');
    currentPeriod = period;
    currentDate = new Date();
    if (window.analyticsState) {
        window.analyticsState.period = period;
        window.analyticsState.date = currentDate;
    }
    loadAnalyticsData(Auth.getUserId(), Auth.getProfile()?.currency || 'RUB');
};

window.navigatePeriodAndLoad = function(direction) {
    navigatePeriod(direction);
    // Сохраняем состояние после навигации
    if (window.analyticsState) {
        window.analyticsState.period = currentPeriod;
        window.analyticsState.date = currentDate;
    }
    loadAnalyticsData(Auth.getUserId(), Auth.getProfile()?.currency || 'RUB');
};

// Восстанавливаем состояние при повторном входе на страницу
window.analyticsState = window.analyticsState || { period: 'month', date: new Date() };
currentPeriod = window.analyticsState.period;
currentDate = window.analyticsState.date;

/**
 * Навигация по периодам
 */
function navigatePeriod(direction) {
    const d = new Date(currentDate);
    
    switch (currentPeriod) {
        case 'week': d.setDate(d.getDate() + (direction * 7)); break;
        case 'month': d.setMonth(d.getMonth() + direction); break;
        case 'year': d.setFullYear(d.getFullYear() + direction); break;
    }
    
    const now = new Date();
    currentDate = d > now ? new Date(now) : d;
    
    // Сохраняем состояние
    if (window.analyticsState) {
        window.analyticsState.period = currentPeriod;
        window.analyticsState.date = currentDate;
    }
}
