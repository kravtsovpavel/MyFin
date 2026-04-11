// ========================================
// MyFin - Хранение данных (localStorage)
// ========================================

const Storage = {
    /**
     * Получить данные из localStorage
     * @param {string} key - ключ
     * @returns {*} данные или null
     */
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage.get error:', error);
            return null;
        }
    },

    /**
     * Сохранить данные в localStorage
     * @param {string} key - ключ
     * @param {*} value - значение
     * @returns {boolean} успех
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage.set error:', error);
            return false;
        }
    },

    /**
     * Удалить данные из localStorage
     * @param {string} key - ключ
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage.remove error:', error);
        }
    },

    /**
     * Очистить весь кэш MyFin
     */
    clearMyFinCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(APP_CONFIG.CACHE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Storage.clearMyFinCache error:', error);
        }
    },

    /**
     * Получить кэш транзакций
     * @param {string} userId - ID пользователя
     * @returns {Array|null}
     */
    getTransactionsCache(userId) {
        return this.get(APP_CONFIG.CACHE_TRANSACTIONS_KEY(userId));
    },

    /**
     * Сохранить кэш транзакций
     * @param {string} userId - ID пользователя
     * @param {Array} transactions - транзакции
     */
    setTransactionsCache(userId, transactions) {
        this.set(APP_CONFIG.CACHE_TRANSACTIONS_KEY(userId), {
            data: transactions,
            timestamp: Date.now()
        });
    },

    /**
     * Получить кэш категорий
     * @param {string} userId - ID пользователя
     * @returns {Array|null}
     */
    getCategoriesCache(userId) {
        return this.get(APP_CONFIG.CACHE_CATEGORIES_KEY(userId));
    },

    /**
     * Сохранить кэш категорий
     * @param {string} userId - ID пользователя
     * @param {Array} categories - категории
     */
    setCategoriesCache(userId, categories) {
        this.set(APP_CONFIG.CACHE_CATEGORIES_KEY(userId), {
            data: categories,
            timestamp: Date.now()
        });
    },

    /**
     * Получить кэш профиля
     * @param {string} userId - ID пользователя
     * @returns {Object|null}
     */
    getProfileCache(userId) {
        return this.get(APP_CONFIG.CACHE_PROFILE_KEY(userId));
    },

    /**
     * Сохранить кэш профиля
     * @param {string} userId - ID пользователя
     * @param {Object} profile - профиль
     */
    setProfileCache(userId, profile) {
        this.set(APP_CONFIG.CACHE_PROFILE_KEY(userId), {
            data: profile,
            timestamp: Date.now()
        });
    }
};
