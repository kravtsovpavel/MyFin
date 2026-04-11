-- ========================================
-- MyFin - SQL скрипт для настройки Supabase
-- ========================================
-- Выполните этот скрипт в SQL Editor в панели Supabase

-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Таблица профилей (расширение auth.users)
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Настройки пользователя
    currency TEXT DEFAULT 'RUB',
    week_start TEXT DEFAULT 'monday',
    monthly_budget NUMERIC(12, 2) DEFAULT NULL
);

-- Индекс для поиска по email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ========================================
-- Таблица категорий
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '📁',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничение уникальности имени категории для пользователя
    CONSTRAINT unique_category_name_per_user UNIQUE (user_id, name, type)
);

-- Индексы для категорий
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);

-- ========================================
-- Таблица транзакций
-- ========================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    comment TEXT DEFAULT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- ========================================
-- RLS (Row Level Security) - Политики безопасности
-- ========================================

-- Включаем RLS для всех таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Политики для profiles
-- ========================================
-- Пользователь может видеть только свой профиль
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Пользователь может обновлять только свой профиль
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Пользователь может создать свой профиль при регистрации
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ========================================
-- Политики для categories
-- ========================================
-- Пользователь может видеть только свои категории
CREATE POLICY "Users can view own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

-- Пользователь может создавать только свои категории
CREATE POLICY "Users can insert own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять только свои категории
CREATE POLICY "Users can update own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id);

-- Пользователь может удалять только свои категории
CREATE POLICY "Users can delete own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- ========================================
-- Политики для transactions
-- ========================================
-- Пользователь может видеть только свои транзакции
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Пользователь может создавать только свои транзакции
CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять только свои транзакции
CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

-- Пользователь может удалять только свои транзакции
CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- ========================================
-- Триггеры для updated_at
-- ========================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для categories
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для transactions
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Триггер для создания профиля при регистрации
-- ========================================
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name, currency, week_start)
    VALUES (NEW.id, NEW.email, NULL, 'RUB', 'monday')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_new_user();

-- ========================================
-- Функции для аналитики
-- ========================================

-- Функция для получения статистики по месяцам
CREATE OR REPLACE FUNCTION get_monthly_stats(
    p_user_id UUID,
    p_year INT,
    p_month INT
)
RETURNS TABLE (
    total_income NUMERIC,
    total_expense NUMERIC,
    balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS balance
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND EXTRACT(YEAR FROM t.transaction_date) = p_year
      AND EXTRACT(MONTH FROM t.transaction_date) = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Проверка после создания скрипта
-- ========================================
-- После выполнения скрипта проверьте:
-- 1. Все таблицы созданы: profiles, categories, transactions
-- 2. RLS включен для всех таблиц
-- 3. Политики безопасности настроены
-- 4. Триггеры работают
