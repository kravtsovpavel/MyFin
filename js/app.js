// ========================================
// MyFin - Главное приложение
// ========================================

const App = {
    /**
     * Инициализация приложения
     */
    async init() {
        console.log('MyFin initializing...');

        // Инициализация роутера
        Router.init();

        // Инициализация авторизации
        await Auth.init();
        
        // Инициализация страницы входа
        if (window.initLogin) {
            window.initLogin();
        }

        console.log('MyFin initialized');
    },

    /**
     * Показать экран входа
     */
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        
        // Очищаем хэш
        window.location.hash = '';
    },

    /**
     * Показать приложение
     */
    showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        // Показываем имя или email пользователя
        const displayName = Auth.getDisplayName();
        const email = Auth.getEmail();
        const displayText = displayName || email || '';
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = displayText;
        }

        // Если хэш пустой, перенаправляем на дашборд
        if (!window.location.hash) {
            window.location.hash = 'dashboard';
        } else {
            // Обрабатываем текущий маршрут
            Router.handleRoute();
        }
    },

    /**
     * Показать модальное окно
     * @param {string} content - HTML содержимое
     * @param {Function} onClose - callback при закрытии
     */
    showModal(content, onClose = null) {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        
        container.innerHTML = content;
        overlay.style.display = 'flex';
        
        // Обработчик закрытия по клику на overlay
        const closeHandler = (e) => {
            if (e.target === overlay) {
                this.closeModal();
                if (onClose) onClose();
            }
        };
        
        overlay.addEventListener('click', closeHandler, { once: true });
        
        // Закрытие по ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                if (onClose) onClose();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    /**
     * Закрыть модальное окно
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');

        // Очищаем состояния всех календарей в модалке
        CustomDatePicker.destroy('transaction-date-picker');

        overlay.style.display = 'none';
        container.innerHTML = '';
    },

    /**
     * Показать тост уведомление
     * @param {string} message - сообщение
     * @param {string} type - тип (success, error, warning)
     * @param {number} duration - длительность в мс
     */
    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Удаляем через указанное время
        setTimeout(() => {
            toast.style.animation = 'toast-in 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Показать уведомление о превышении бюджета
     * @param {number} percent - процент использования
     */
    showBudgetWarning(percent) {
        if (percent >= 100) {
            this.showToast(`⚠️ Бюджет превышен! Вы потратили ${Math.round(percent)}%`, 'error', 5000);
        } else if (percent >= 90) {
            this.showToast(`⚠️ Внимание! Вы потратили ${Math.round(percent)}% бюджета`, 'warning', 5000);
        }
    }
};

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
