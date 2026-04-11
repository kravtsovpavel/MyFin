// ========================================
// MyFin - Роутер
// ========================================

const Router = {
    /**
     * Текущий маршрут
     */
    currentRoute: null,

    /**
     * Карта маршрутов
     */
    routes: {
        'dashboard': { page: 'dashboard', title: 'Главная' },
        'analytics': { page: 'analytics', title: 'Аналитика' },
        'calendar': { page: 'calendar', title: 'Календарь' },
        'transactions': { page: 'transactions', title: 'Все операции' },
        'categories': { page: 'categories', title: 'Категории' },
        'settings': { page: 'settings', title: 'Настройки' }
    },

    /**
     * Инициализация роутера
     */
    init() {
        // Слушаем изменения hash
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    },

    /**
     * Обработка маршрута
     */
    async handleRoute() {
        // Получаем hash без # и убираем возможный слэш
        let hash = window.location.hash.slice(1).replace('/', '');
        
        // Если пусто — дашборд
        if (!hash) hash = 'dashboard';

        // Проверяем маршрут
        const route = this.routes[hash];

        if (!route) {
            // Маршрут не найден, перенаправляем на дашборд
            this.navigate('dashboard');
            return;
        }

        // Проверяем авторизацию
        if (!Auth.isAuthenticated()) {
            // Если не авторизован, показываем экран входа
            App.showLogin();
            return;
        }

        // Обновляем текущий маршрут
        this.currentRoute = route;

        // Обновляем заголовок страницы
        document.title = `MyFin — ${route.title}`;

        // Обновляем активный пункт меню
        this.updateNavActive(hash);

        // Рендерим страницу
        await this.renderPage(route.page);
    },

    /**
     * Навигация к маршруту
     * @param {string} route - название маршрута
     */
    navigate(route) {
        window.location.hash = route;
    },

    /**
     * Обновить активный пункт меню
     * @param {string} currentRoute - текущий маршрут
     */
    updateNavActive(currentRoute) {
        // Top nav
        document.querySelectorAll('.top-nav .nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === currentRoute);
        });

        // Bottom nav
        document.querySelectorAll('.bottom-nav .bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === currentRoute);
        });
    },

    /**
     * Рендер страницы
     * @param {string} pageName - название страницы
     */
    async renderPage(pageName) {
        console.log(`[Router] Rendering page: ${pageName}`);
        const mainContent = document.getElementById('main-content');

        // Показываем skeleton при загрузке
        mainContent.innerHTML = this.getSkeletonHTML();

        try {
            // Импортируем и вызываем функцию рендера страницы
            const renderFunction = window[`render${this.capitalize(pageName)}`];

            if (!renderFunction) {
                console.error(`[Router] Render function for page "${pageName}" not found`);
                mainContent.innerHTML = '<div class="text-center">Страница не найдена</div>';
                return;
            }

            console.log(`[Router] Calling render${this.capitalize(pageName)}...`);
            await renderFunction();
            console.log(`[Router] Page ${pageName} rendered successfully`);
        } catch (error) {
            console.error(`[Router] Error rendering page "${pageName}":`, error);
            console.error('[Router] Error stack:', error.stack);
            mainContent.innerHTML = `
                <div class="text-center">
                    <p class="text-expense">Ошибка загрузки страницы</p>
                    <p class="text-secondary text-sm" style="margin-top: 8px;">${Utils.escapeHtml(error.message)}</p>
                    <button class="btn btn-primary mt-md" onclick="Router.handleRoute()">Обновить</button>
                </div>
            `;
        }
    },

    /**
     * Получить skeleton HTML
     * @returns {string}
     */
    getSkeletonHTML() {
        return `
            <div class="skeleton-container">
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
            </div>
        `;
    },

    /**
     * Капитализация строки
     * @param {string} str - строка
     * @returns {string}
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};
