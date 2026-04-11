-- ========================================
-- MyFin - Миграция: добавление display_name
-- ========================================
-- Выполните этот скрипт в SQL Editor в панели Supabase

-- Добавляем колонку display_name если её нет
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT NULL;

-- Обновляем триггер создания профиля
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
