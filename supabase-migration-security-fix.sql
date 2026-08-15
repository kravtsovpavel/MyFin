-- MyFin: закрытие доступа к статистике других пользователей
-- Выполните один раз в SQL Editor проекта Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_monthly_stats(
    p_user_id UUID,
    p_year INT,
    p_month INT
)
RETURNS TABLE (
    total_income NUMERIC,
    total_expense NUMERIC,
    balance NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)
    FROM public.transactions AS t
    WHERE t.user_id = p_user_id
      AND EXTRACT(YEAR FROM t.transaction_date) = p_year
      AND EXTRACT(MONTH FROM t.transaction_date) = p_month;
END;
$$;

COMMIT;
