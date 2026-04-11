// ========================================
// MyFin - Конфигурация Supabase
// ========================================
// ВНИМАНИЕ: Замените значения ниже на ваши данные из Supabase
// Получить можно в Settings > API в панели Supabase
const SUPABASE_CONFIG = {
    url: 'https://mpvsgdxiudamcfufrwhi.supabase.co',
    anonKey: 'sb_publishable_7leaCso_inup7WSC_QiOcg_Cq6GRHGz'
};

// Инициализация Supabase клиента
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// Константы приложения
const APP_CONFIG = {
    // Лимиты категорий
    MAX_EXPENSE_CATEGORIES: 30,
    MAX_INCOME_CATEGORIES: 30,
    
    // Пагинация транзакций
    TRANSACTIONS_PER_PAGE: 25,
    
    // Сессия (30 дней)
    SESSION_EXPIRY_DAYS: 30,
    
    // Кэш
    CACHE_PREFIX: 'myfin_',
    CACHE_TRANSACTIONS_KEY: (userId) => `${APP_CONFIG.CACHE_PREFIX}transactions_${userId}`,
    CACHE_CATEGORIES_KEY: (userId) => `${APP_CONFIG.CACHE_PREFIX}categories_${userId}`,
    CACHE_PROFILE_KEY: (userId) => `${APP_CONFIG.CACHE_PREFIX}profile_${userId}`,
    
    // Валюты
    CURRENCIES: [
        { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
        { code: 'USD', symbol: '$', name: 'Доллар США' },
        { code: 'EUR', symbol: '€', name: 'Евро' },
        { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге' },
        { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль' }
    ],
    
    // Дни недели
    WEEK_START: {
        MONDAY: 'monday',
        SUNDAY: 'sunday'
    }
};

// Типы транзакций
const TRANSACTION_TYPE = {
    INCOME: 'income',
    EXPENSE: 'expense'
};
