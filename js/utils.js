// ========================================
// MyFin - Вспомогательные функции
// ========================================

const Utils = {
    /**
     * Форматирование суммы
     * @param {number} amount - сумма
     * @param {string} currency - валюта
     * @returns {string}
     */
    formatAmount(amount, currency = 'RUB') {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0';

        const currencyConfig = APP_CONFIG.CURRENCIES.find(c => c.code === currency);
        const symbol = currencyConfig?.symbol || '₽';

        return `${num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
    },

    /**
     * Форматирование даты
     * @param {string|Date} date - дата
     * @param {boolean} withTime - с временем
     * @returns {string}
     */
    formatDate(date, withTime = false) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        if (withTime) {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}.${month}.${year} ${hours}:${minutes}`;
        }

        return `${day}.${month}.${year}`;
    },

    /**
     * Форматирование даты для input type="date"
     * @param {string|Date} date - дата
     * @returns {string}
     */
    formatDateForInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Получить текущую дату в формате для input
     * @returns {string}
     */
    getTodayDateString() {
        return this.formatDateForInput(new Date());
    },

    /**
     * Получить первый день месяца
     * @param {number} year - год
     * @param {number} month - месяц (1-12)
     * @returns {string}
     */
    getFirstDayOfMonth(year, month) {
        return `${year}-${String(month).padStart(2, '0')}-01`;
    },

    /**
     * Получить последний день месяца
     * @param {number} year - год
     * @param {number} month - месяц (1-12)
     * @returns {string}
     */
    getLastDayOfMonth(year, month) {
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    },

    /**
     * Получить текущий год и месяц
     * @returns {{year: number, month: number}}
     */
    getCurrentYearMonth() {
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1
        };
    },

    /**
     * Получить предыдущий месяц
     * @param {number} year - год
     * @param {number} month - месяц (1-12)
     * @returns {{year: number, month: number}}
     */
    getPreviousMonth(year, month) {
        let prevYear = year;
        let prevMonth = month - 1;

        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }

        return { year: prevYear, month: prevMonth };
    },

    /**
     * Получить следующий месяц
     * @param {number} year - год
     * @param {number} month - месяц (1-12)
     * @returns {{year: number, month: number}}
     */
    getNextMonth(year, month) {
        let nextYear = year;
        let nextMonth = month + 1;

        if (nextMonth === 13) {
            nextMonth = 1;
            nextYear = year + 1;
        }

        return { year: nextYear, month: nextMonth };
    },

    /**
     * Получить название месяца
     * @param {number} month - месяц (1-12)
     * @param {boolean} full - полное название
     * @returns {string}
     */
    getMonthName(month, full = true) {
        const names = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        const shortNames = [
            'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
            'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
        ];

        return full ? names[month - 1] : shortNames[month - 1];
    },

    /**
     * Получить название месяца в родительном падеже
     * @param {number} month - месяц (1-12)
     * @returns {string}
     */
    getMonthNameGenitive(month) {
        const names = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        return names[month - 1];
    },

    /**
     * Получить дни недели
     * @param {string} weekStart - первый день недели
     * @returns {string[]}
     */
    getWeekDays(weekStart = 'monday') {
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        if (weekStart === 'sunday') {
            days.push(days.shift());
        }
        return days;
    },

    /**
     * Получить календарь месяца
     * @param {number} year - год
     * @param {number} month - месяц (1-12)
     * @param {string} weekStart - первый день недели
     * @returns {Array}
     */
    getCalendarDays(year, month, weekStart = 'monday') {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const days = [];

        // Определяем день недели первого дня месяца (0-6, где 0 - воскресенье)
        let firstDayOfWeek = firstDay.getDay();
        if (weekStart === 'monday') {
            firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        }

        // Пустые ячейки до первого дня
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push({ day: null, date: null });
        }

        // Дни месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month - 1, day);
            days.push({
                day,
                date: this.formatDateForInput(date),
                isToday: this.isToday(date)
            });
        }

        return days;
    },

    /**
     * Проверить, является ли дата сегодня
     * @param {Date|string} date - дата
     * @returns {boolean}
     */
    isToday(date) {
        const d = new Date(date);
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    },

    /**
     * Проверить, является ли дата в прошлом месяце
     * @param {string} date - дата
     * @param {number} year - год
     * @param {number} month - месяц
     * @returns {boolean}
     */
    isPreviousMonth(date, year, month) {
        const d = new Date(date);
        const { year: prevYear, month: prevMonth } = this.getPreviousMonth(year, month);
        return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonth;
    },

    /**
     * Получить процент
     * @param {number} value - значение
     * @param {number} total - общее значение
     * @returns {number}
     */
    calculatePercent(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    },

    /**
     * Получить дельту в процентах
     * @param {number} current - текущее значение
     * @param {number} previous - предыдущее значение
     * @returns {number|null}
     */
    calculateDelta(current, previous) {
        if (previous === 0) return current > 0 ? 100 : null;
        return Math.round(((current - previous) / previous) * 100);
    },

    /**
     * Получить направление дельты
     * @param {number} current - текущее значение
     * @param {number} previous - предыдущее значение
     * @param {boolean} inverse - инвертировать (для расходов)
     * @returns {'up' | 'down' | null}
     */
    getDeltaDirection(current, previous, inverse = false) {
        if (previous === 0) return current > 0 ? 'up' : null;
        
        const isGrowth = current > previous;
        const direction = isGrowth ? 'up' : 'down';
        
        return inverse ? (direction === 'up' ? 'down' : 'up') : direction;
    },

    /**
     * Получить иконку стрелки
     * @param {string} direction - направление
     * @returns {string}
     */
    getDeltaIcon(direction) {
        return direction === 'up' ? '▲' : '▼';
    },

    /**
     * Дебаунс функции
     * @param {Function} func - функция
     * @param {number} wait - задержка
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Генерация UUID
     * @returns {string}
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Экранирование HTML
     * @param {string} text - текст
     * @returns {string}
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Получить Material Icon для категории
     * @param {string} categoryName - название категории
     * @returns {string} - название Material Icon
     */
    getCategoryIcon(categoryName) {
        const iconMap = {
            'продукты': 'restaurant',
            'еда': 'restaurant',
            'покупки': 'shopping_cart',
            'транспорт': 'directions_bus',
            'автомобиль': 'directions_car',
            'здоровье': 'local_hospital',
            'красота': 'face',
            'развлечения': 'movie',
            'образование': 'school',
            'путешествия': 'flight',
            'дом': 'home',
            'одежда': 'checkroom',
            'электроника': 'tv',
            'спорт': 'fitness_center',
            'подарки': 'card_giftcard',
            'ремонт': 'build',
            'животные': 'pets',
            'телефон': 'smartphone',
            'вино': 'wine_bar',
            'сигареты': 'smoking_rooms',
            'лотерея': 'confirmation_number',
            'закуски': 'bakery_dining',
            'малыш': 'child_care',
            'пожертвования': 'favorite',
            'зарплата': 'payments',
            'доход': 'payments',
            'бизнес': 'business_center',
            'инвестиции': 'trending_up',
            'кэшбэк': 'redeem'
        };
        
        const name = categoryName?.toLowerCase() || '';
        for (const [key, icon] of Object.entries(iconMap)) {
            if (name.includes(key)) return icon;
        }
        return 'category'; // default icon
    },

    /**
     * Получить цвет для категории
     * @param {string} categoryName - название категории
     * @returns {string} - HEX цвет
     */
    getCategoryColor(categoryName) {
        const colorMap = {
            'продукты': '#FF9800',
            'еда': '#FF9800',
            'покупки': '#4CAF50',
            'транспорт': '#607D8B',
            'автомобиль': '#2196F3',
            'здоровье': '#F44336',
            'красота': '#9C27B0',
            'развлечения': '#E91E63',
            'образование': '#673AB7',
            'путешествия': '#3F51B5',
            'дом': '#795548',
            'одежда': '#FF5722',
            'электроника': '#FFEB3B',
            'спорт': '#8BC34A',
            'подарки': '#E91E63',
            'ремонт': '#FF9800',
            'животные': '#009688',
            'телефон': '#00BCD4',
            'вино': '#9C27B0',
            'сигареты': '#795548',
            'лотерея': '#FFD700',
            'закуски': '#FF9800',
            'малыш': '#FF4081',
            'пожертвования': '#F44336',
            'зарплата': '#4CAF50',
            'доход': '#4CAF50',
            'бизнес': '#2196F3',
            'инвестиции': '#4CAF50',
            'кэшбэк': '#FF9800'
        };
        
        const name = categoryName?.toLowerCase() || '';
        for (const [key, color] of Object.entries(colorMap)) {
            if (name.includes(key)) return color;
        }
        return '#757575'; // default color
    },

    /**
     * Получить цвета для Chart.js
     * @param {number} count - количество
     * @param {string} type - тип: 'income' или 'expense'
     * @returns {{backgroundColors: string[], borderColors: string[]}}
     */
    getChartColors(count, type = null) {
        // Палитра для расходов (тёплые цвета)
        const expenseColors = [
            '#EF4444', '#F97316', '#F59E0B', '#EAB308',
            '#EC4899', '#D946EF', '#F43F5E', '#DC2626',
            '#EA580C', '#CA8A04', '#DB2777', '#C026D3'
        ];

        // Палитра для доходов (холодные/зелёные цвета)
        const incomeColors = [
            '#10B981', '#3B82F6', '#06B6D4', '#14B8A6',
            '#84CC16', '#22D3EE', '#6366F1', '#059669',
            '#2563EB', '#0891B2', '#0D9488', '#4F46E5'
        ];

        // Общая палитра (без указания типа)
        const defaultColors = [
            '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
            '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
            '#14B8A6', '#A855F7', '#D946EF', '#F43F5E', '#22D3EE'
        ];

        const colors = type === 'expense' ? expenseColors
            : type === 'income' ? incomeColors
            : defaultColors;

        const backgroundColors = colors.slice(0, count).map(c => c + '80');
        const borderColors = colors.slice(0, count);

        return { backgroundColors, borderColors };
    },

    /**
     * Проверка на мобильное устройство
     * @returns {boolean}
     */
    isMobile() {
        return window.innerWidth < 768;
    },

    /**
     * Склонение слов
     * @param {number} number - число
     * @param {string[]} forms - формы [один, два, пять]
     * @returns {string}
     */
    declension(number, forms) {
        const cases = [2, 0, 1, 1, 1, 2];
        const n = Math.abs(number) % 100;
        const n1 = n % 10;
        
        if (n > 10 && n < 20) return forms[cases[2]];
        if (n1 > 1 && n1 < 5) return forms[cases[4]];
        if (n1 === 1) return forms[cases[1]];
        return forms[cases[0]];
    }
};
