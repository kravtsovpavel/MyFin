// ========================================
// MyFin - API для работы с Supabase
// ========================================

const API = {
    /**
     * Получить текущую сессию
     */
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    /**
     * Войти через Google OAuth
     */
    async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) throw error;
        return data;
    },

    /**
     * Выйти из системы
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /**
     * Получить профиль пользователя
     */
    async getProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    /**
     * Обновить профиль пользователя
     */
    async updateProfile(userId, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    /**
     * Получить все категории пользователя
     */
    async getCategories(userId) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId)
            .order('name');
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Получить категории по типу
     */
    async getCategoriesByType(userId, type) {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', userId)
            .eq('type', type)
            .order('name');
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Создать категорию
     */
    async createCategory(userId, name, emoji, type) {
        const { data, error } = await supabase
            .from('categories')
            .insert({
                user_id: userId,
                name,
                emoji: emoji || '📁',
                type
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    /**
     * Обновить категорию
     */
    async updateCategory(categoryId, updates) {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', categoryId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    /**
     * Удалить категорию
     */
    async deleteCategory(categoryId) {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);
        
        if (error) throw error;
    },

    /**
     * Получить количество категорий по типу
     */
    async getCategoryCount(userId, type) {
        const { data, error } = await supabase
            .from('categories')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', type);
        
        if (error) throw error;
        return data;
    },

    /**
     * Проверить, есть ли транзакции у категории
     * @param {string} userId - ID пользователя
     * @param {string} categoryId - ID категории
     * @returns {boolean}
     */
    async hasTransactionsForCategory(userId, categoryId) {
        console.log(`[API] Checking transactions for category: ${categoryId}, user: ${userId}`);
        
        const { count, error } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('category_id', categoryId);

        if (error) {
            console.error('Error checking transactions:', error);
            return false;
        }

        console.log(`[API] Transactions count: ${count}`);
        return (count || 0) > 0;
    },

    /**
     * Получить все транзакции пользователя
     */
    async getTransactions(userId, limit = 1000) {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                category:categories (
                    id,
                    name,
                    emoji,
                    type
                )
            `)
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Получить транзакции с пагинацией и фильтрами
     */
    async getTransactionsPaginated(userId, options = {}) {
        const {
            page = 1,
            perPage = APP_CONFIG.TRANSACTIONS_PER_PAGE,
            type = null,
            categoryId = null,
            dateFrom = null,
            dateTo = null
        } = options;

        let query = supabase
            .from('transactions')
            .select(`
                *,
                category:categories (
                    id,
                    name,
                    emoji,
                    type
                )
            `, { count: 'exact' })
            .eq('user_id', userId);

        if (type) {
            query = query.eq('type', type);
        }

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (dateFrom) {
            query = query.gte('transaction_date', dateFrom);
        }

        if (dateTo) {
            query = query.lte('transaction_date', dateTo);
        }

        const offset = (page - 1) * perPage;
        const { data, error } = await query
            .order('transaction_date', { ascending: false })
            .range(offset, offset + perPage - 1);

        if (error) throw error;
        return {
            data: data || [],
            total: error?.details?.total || 0
        };
    },

    /**
     * Получить транзакции за период
     */
    async getTransactionsByPeriod(userId, startDate, endDate) {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                category:categories (
                    id,
                    name,
                    emoji,
                    type
                )
            `)
            .eq('user_id', userId)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Получить транзакции по дням для графика
     */
    async getTransactionsByDay(userId, startDate, endDate) {
        const transactions = await this.getTransactionsByPeriod(userId, startDate, endDate);
        
        // Группировка по дням
        const byDay = {};
        transactions.forEach(t => {
            const date = t.transaction_date;
            if (!byDay[date]) {
                byDay[date] = { income: 0, expense: 0, transactions: [] };
            }
            if (t.type === TRANSACTION_TYPE.INCOME) {
                byDay[date].income += parseFloat(t.amount);
            } else {
                byDay[date].expense += parseFloat(t.amount);
            }
            byDay[date].transactions.push(t);
        });

        return byDay;
    },

    /**
     * Создать транзакцию
     */
    async createTransaction(userId, transactionData) {
        const { data, error } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                ...transactionData
            })
            .select(`
                *,
                category:categories (
                    id,
                    name,
                    emoji,
                    type
                )
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Обновить транзакцию
     */
    async updateTransaction(transactionId, updates) {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', transactionId)
            .select(`
                *,
                category:categories (
                    id,
                    name,
                    emoji,
                    type
                )
            `)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Удалить транзакцию
     */
    async deleteTransaction(transactionId) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId);

        if (error) throw error;
    },

    /**
     * Получить статистику за месяц
     */
    async getMonthlyStats(userId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const transactions = await this.getTransactionsByPeriod(userId, startDate, endDate);

        const stats = {
            income: 0,
            expense: 0,
            balance: 0,
            byCategory: {}
        };

        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            if (t.type === TRANSACTION_TYPE.INCOME) {
                stats.income += amount;
            } else {
                stats.expense += amount;
            }

            // Группировка по категориям (включая "Без категории")
            // Для транзакций без категории создаём отдельную запись для каждого типа
            const categoryId = t.category_id || `no-category-${t.type}`;
            if (!stats.byCategory[categoryId]) {
                stats.byCategory[categoryId] = {
                    id: categoryId,
                    name: t.category?.name || 'Без категории',
                    emoji: t.category?.emoji || '📁',
                    type: t.type,
                    amount: 0
                };
            }
            stats.byCategory[categoryId].amount += amount;
        });

        stats.balance = stats.income - stats.expense;

        return stats;
    },

    /**
     * Получить статистику за предыдущий месяц
     */
    async getPreviousMonthStats(userId, year, month) {
        let prevYear = year;
        let prevMonth = month - 1;

        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }

        return this.getMonthlyStats(userId, prevYear, prevMonth);
    },

    /**
     * Удалить все данные пользователя
     */
    async deleteAllUserData(userId) {
        // Удаляем все транзакции
        const { error: transactionsError } = await supabase
            .from('transactions')
            .delete()
            .eq('user_id', userId);

        if (transactionsError) throw transactionsError;

        // Удаляем все категории
        const { error: categoriesError } = await supabase
            .from('categories')
            .delete()
            .eq('user_id', userId);

        if (categoriesError) throw categoriesError;

        // Сбрасываем бюджет в профиле
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ monthly_budget: null })
            .eq('id', userId);

        if (profileError) throw profileError;
    },

    /**
     * Экспорт всех транзакций пользователя
     */
    async exportAllTransactions(userId) {
        const transactions = await this.getTransactions(userId, 10000);
        return transactions;
    },

    /**
     * Экспорт транзакций с фильтрами
     */
    async exportFilteredTransactions(userId, filters) {
        const { data } = await this.getTransactionsPaginated(userId, {
            ...filters,
            page: 1,
            perPage: 10000
        });
        return data;
    }
};
