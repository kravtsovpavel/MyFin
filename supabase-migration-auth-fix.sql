-- MyFin: восстановление автоматического создания профилей OAuth-пользователей
-- Выполните один раз в SQL Editor проекта Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, currency, week_start)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email', ''),
        NULL,
        'RUB',
        'monday'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_for_new_user();

-- Восстанавливаем профили пользователей, зарегистрированных до исправления.
INSERT INTO public.profiles (id, email, display_name, currency, week_start)
SELECT
    users.id,
    COALESCE(users.email, users.raw_user_meta_data ->> 'email', ''),
    NULL,
    'RUB',
    'monday'
FROM auth.users AS users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    updated_at = NOW();

COMMIT;
