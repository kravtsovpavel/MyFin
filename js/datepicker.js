// ========================================
// MyFin - Кастомный календарь для выбора даты
// Поддержка нескольких независимых инстансов
// ========================================

const CustomDatePicker = (function () {
    /**
     * Хранилище состояний по containerId
     */
    const instances = new Map();

    /**
     * Получить или создать состояние инстанса
     */
    function getInstance(containerId) {
        if (!instances.has(containerId)) {
            instances.set(containerId, {
                selectedDate: null,
                currentMonth: new Date().getMonth() + 1,
                currentYear: new Date().getFullYear(),
                onSelect: null,
                containerId: containerId
            });
        }
        return instances.get(containerId);
    }

    /**
     * Удалить инстанс
     */
    function removeInstance(containerId) {
        instances.delete(containerId);
    }

    /**
     * Ренер одного дня
     */
    function renderDay(day, state) {
        if (!day.day) {
            return '<div class="date-picker-day empty"></div>';
        }

        const dateStr = day.date;
        const isToday = day.isToday;
        const isSelected = dateStr === state.selectedDate;

        let classes = 'date-picker-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (day.otherMonth) classes += ' other-month';

        return `<div class="${classes}" data-date="${dateStr}">${day.day}</div>`;
    }

    /**
     * Получить дни календаря
     */
    function getCalendarDays(state) {
        const firstDay = new Date(state.currentYear, state.currentMonth - 1, 1);
        const lastDay = new Date(state.currentYear, state.currentMonth, 0);
        const days = [];

        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push({ day: null, date: null });
        }

        const today = new Date();
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(state.currentYear, state.currentMonth - 1, day);
            days.push({
                day,
                date: Utils.formatDateForInput(date),
                isToday: date.toDateString() === today.toDateString(),
                otherMonth: false
            });
        }

        const remaining = 7 - (days.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                days.push({ day: null, date: null });
            }
        }

        return days;
    }

    /**
     * Рендер календаря
     */
    function render(containerId) {
        const state = getInstance(containerId);
        const container = document.getElementById(containerId);
        if (!container) return;

        const monthName = Utils.getMonthName(state.currentMonth);
        const days = getCalendarDays(state);

        container.innerHTML = `
            <div class="date-picker-header">
                <div class="date-picker-month-year">${monthName} ${state.currentYear}</div>
                <div class="date-picker-nav">
                    <button type="button" class="date-picker-nav-btn" data-action="prev-month">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    <button type="button" class="date-picker-nav-btn" data-action="next-month">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="date-picker-weekdays">
                <div class="date-picker-weekday">Пн</div>
                <div class="date-picker-weekday">Вт</div>
                <div class="date-picker-weekday">Ср</div>
                <div class="date-picker-weekday">Чт</div>
                <div class="date-picker-weekday">Пт</div>
                <div class="date-picker-weekday">Сб</div>
                <div class="date-picker-weekday">Вс</div>
            </div>
            <div class="date-picker-days">
                ${days.map(day => renderDay(day, state)).join('')}
            </div>
            <div class="date-picker-footer">
                <button type="button" class="date-picker-today-btn" data-action="today">Сегодня</button>
            </div>
        `;
    }

    /**
     * Навешивание обработчиков
     */
    function attachHandlers(containerId) {
        const state = getInstance(containerId);
        const container = document.getElementById(containerId);
        if (!container) return;

        // Навигация
        container.querySelectorAll('.date-picker-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = e.currentTarget.dataset.action;

                if (action === 'prev-month') {
                    state.currentMonth--;
                    if (state.currentMonth === 0) {
                        state.currentMonth = 12;
                        state.currentYear--;
                    }
                } else if (action === 'next-month') {
                    state.currentMonth++;
                    if (state.currentMonth === 13) {
                        state.currentMonth = 1;
                        state.currentYear++;
                    }
                }

                render(containerId);
                attachHandlers(containerId);
            });
        });

        // Выбор дня
        container.querySelectorAll('.date-picker-day[data-date]').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                state.selectedDate = dayEl.dataset.date;

                if (state.onSelect) {
                    state.onSelect(state.selectedDate);
                }

                hide(containerId);
            });
        });

        // Кнопка "Сегодня"
        container.querySelector('.date-picker-today-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const today = Utils.getTodayDateString();
            state.selectedDate = today;
            state.currentMonth = new Date().getMonth() + 1;
            state.currentYear = new Date().getFullYear();

            if (state.onSelect) {
                state.onSelect(state.selectedDate);
            }

            hide(containerId);
        });
    }

    /**
     * Показать календарь
     */
    function show(containerId) {
        const dropdown = document.getElementById(containerId);
        if (dropdown) {
            dropdown.classList.add('open');
        }
    }

    /**
     * Скрыть календарь
     */
    function hide(containerId) {
        const dropdown = document.getElementById(containerId);
        if (dropdown) {
            dropdown.classList.remove('open');
        }
    }

    /**
     * Переключить видимость
     */
    function toggle(containerId) {
        const dropdown = document.getElementById(containerId);
        if (dropdown) {
            dropdown.classList.toggle('open');
        }
    }

    /**
     * Инициализация календаря
     */
    function init(containerId, initialValue = null, callback = null) {
        const state = getInstance(containerId);
        state.selectedDate = initialValue;
        state.onSelect = callback;
        state.currentMonth = new Date().getMonth() + 1;
        state.currentYear = new Date().getFullYear();

        render(containerId);
        attachHandlers(containerId);
    }

    /**
     * Уничтожить инстанс
     */
    function destroy(containerId) {
        hide(containerId);
        removeInstance(containerId);
    }

    return {
        init,
        show,
        hide,
        toggle,
        destroy,
        getInstance
    };
})();
