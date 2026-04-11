// ========================================
// MyFin - Авторизация
// ========================================

const Auth = {
    /**
     * Текущий пользователь
     */
    currentUser: null,

    /**
     * Текущая сессия
     */
    currentSession: null,

    /**
     * Инициализация авторизации
     */
    async init() {
        // Проверяем текущую сессию
        try {
            const session = await API.getSession();
            if (session) {
                this.currentUser = session.user;
                this.currentSession = session;
                
                // Получаем профиль пользователя
                try {
                    const profile = await API.getProfile(session.user.id);
                    this.currentUser.profile = profile;
                    
                    // Кэшируем профиль
                    Storage.setProfileCache(session.user.id, profile);
                } catch (error) {
                    console.error('Error fetching profile:', error);
                }
            }
        } catch (error) {
            console.error('Error getting session:', error);
        }

        // Слушаем изменения авторизации
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.currentSession = session;
                
                // Получаем профиль
                try {
                    const profile = await API.getProfile(session.user.id);
                    this.currentUser.profile = profile;
                    Storage.setProfileCache(session.user.id, profile);
                } catch (error) {
                    console.error('Error fetching profile after sign in:', error);
                }
                
                // Показываем приложение
                App.showApp();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.currentSession = null;
                
                // Очищаем кэш
                Storage.clearMyFinCache();
                
                // Показываем экран входа
                App.showLogin();
            }
        });

        // Если сессия есть, показываем приложение
        if (this.currentUser) {
            App.showApp();
        } else {
            App.showLogin();
        }
    },

    /**
     * Войти через Google
     */
    async signInWithGoogle() {
        console.log('Auth.signInWithGoogle called');
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });
            
            if (error) {
                console.error('Supabase OAuth error:', error);
                throw error;
            }
            
            console.log('OAuth redirect URL:', data?.url);
            // Перенаправление произойдёт автоматически
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    },

    /**
     * Выйти из системы
     */
    async signOut() {
        try {
            await API.signOut();
            // Auth state change обработает выход
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    },

    /**
     * Проверить авторизацию
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.currentUser !== null;
    },

    /**
     * Получить ID пользователя
     * @returns {string|null}
     */
    getUserId() {
        return this.currentUser?.id || null;
    },

    /**
     * Получить email пользователя
     * @returns {string|null}
     */
    getEmail() {
        return this.currentUser?.email || null;
    },

    /**
     * Получить имя пользователя
     * @returns {string|null}
     */
    getDisplayName() {
        return this.currentUser?.profile?.display_name || null;
    },

    /**
     * Получить профиль пользователя
     * @returns {Object|null}
     */
    getProfile() {
        return this.currentUser?.profile || null;
    },

    /**
     * Обновить профиль пользователя
     * @param {Object} updates - обновления
     */
    async updateProfile(updates) {
        if (!this.getUserId()) {
            throw new Error('User not authenticated');
        }

        const profile = await API.updateProfile(this.getUserId(), updates);
        this.currentUser.profile = profile;
        Storage.setProfileCache(this.getUserId(), profile);
        return profile;
    }
};
