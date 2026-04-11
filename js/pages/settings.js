// ========================================
// MyFin - Страница настроек
// ========================================

/**
 * Рендер страницы настроек
 */
async function renderSettings() {
    const mainContent = document.getElementById('main-content');
    const userId = Auth.getUserId();
    const profile = Auth.getProfile();

    // Получаем актуальный профиль из API если нет в кэше
    let userProfile = profile;
    if (!userProfile) {
        try {
            userProfile = await API.getProfile(userId);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    const displayName = userProfile?.display_name || '';
    const email = Auth.getEmail();
    const currency = userProfile?.currency || 'RUB';
    const weekStart = userProfile?.week_start || 'monday';
    const monthlyBudget = userProfile?.monthly_budget;

    mainContent.innerHTML = `
        <!-- Мобильный хедер -->
        <div class="mobile-header">
            <svg class="mobile-header-logo" viewBox="0 0 120 100">
                <defs>
                    <linearGradient id="mobHeaderGradSettings" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="120" height="100" rx="22" fill="url(#mobHeaderGradSettings)"/>
                <text x="60" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="60" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
            </svg>
            <span class="mobile-header-title">Настройки</span>
        </div>
        
        <div class="settings-page">
            <!-- Профиль -->
            <div class="card settings-section">
                <h2 class="card-title">Профиль</h2>
                <div class="form-group">
                    <label class="form-label">Имя</label>
                    <input type="text" id="display-name-input" class="form-input" 
                           value="${Utils.escapeHtml(displayName)}" 
                           placeholder="Введите ваше имя" 
                           maxlength="50">
                </div>
                <div class="settings-item" style="border-top: 1px solid var(--border); padding-top: var(--spacing-md);">
                    <span class="settings-label">Email</span>
                    <span class="settings-value">${email || ''}</span>
                </div>
                <div style="margin-top: var(--spacing-md);">
                    <button id="save-name-btn" class="btn btn-primary">Сохранить имя</button>
                </div>
                <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border);">
                    <button id="logout-btn-settings" class="btn btn-danger">Выйти</button>
                </div>
            </div>
            
            <!-- Валюта -->
            <div class="card settings-section">
                <h2 class="card-title">Валюта</h2>
                <div class="form-group" style="margin-bottom: 0;">
                    <select id="currency-select" class="form-select">
                        ${APP_CONFIG.CURRENCIES.map(c => `
                            <option value="${c.code}" ${c.code === currency ? 'selected' : ''}>
                                ${c.symbol} — ${c.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <!-- Первый день недели -->
            <div class="card settings-section">
                <h2 class="card-title">Первый день недели</h2>
                <div class="form-group" style="margin-bottom: 0;">
                    <select id="week-start-select" class="form-select">
                        <option value="monday" ${weekStart === 'monday' ? 'selected' : ''}>Понедельник</option>
                        <option value="sunday" ${weekStart === 'sunday' ? 'selected' : ''}>Воскресенье</option>
                    </select>
                </div>
            </div>
            
            <!-- Месячный бюджет -->
            <div class="card settings-section">
                <h2 class="card-title">Месячный бюджет на расходы</h2>
                <div class="form-group">
                    <input
                        type="number"
                        id="monthly-budget-input"
                        class="form-input"
                        placeholder="0"
                        value="${monthlyBudget || ''}"
                        min="0"
                        step="0.01"
                    >
                    <p class="text-secondary text-sm mt-sm">
                        Общий лимит расходов на месяц. При достижении 90% и 100% вы получите уведомление.
                    </p>
                </div>
                <button id="save-budget-btn" class="btn btn-primary">Сохранить бюджет</button>
            </div>

            <!-- Категории -->
            <div class="card settings-section" style="cursor: pointer;" onclick="Router.navigate('categories')">
                <div class="flex justify-between items-center">
                    <h2 class="card-title" style="margin-bottom: 0;">Категории</h2>
                    <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">→</span>
                </div>
                <p class="text-secondary text-sm" style="margin-top: var(--spacing-xs);">
                    Управление категориями доходов и расходов
                </p>
            </div>

            <!-- Экспорт данных -->
            <div class="card settings-section">
                <h2 class="card-title">Экспорт данных</h2>
                <p class="text-secondary mb-md">Выгрузите все свои транзакции в формате Excel</p>
                <button id="export-all-btn" class="btn btn-secondary">Экспорт в Excel</button>
            </div>
            
            <!-- Опасная зона -->
            <div class="danger-zone">
                <h3 class="danger-zone-title">⚠️ Опасная зона</h3>
                <p class="text-secondary mb-md">
                    Это действие необратимо удалит все ваши транзакции и категории.
                </p>
                <button id="delete-all-data-btn" class="btn btn-danger">Удалить все данные</button>
            </div>
        </div>
    `;

    // Навешиваем обработчики
    setupSettingsHandlers(userId);
}

/**
 * Настройка обработчиков событий на странице настроек
 * @param {string} userId - ID пользователя
 */
function setupSettingsHandlers(userId) {
    // Сохранение имени
    document.getElementById('save-name-btn')?.addEventListener('click', async () => {
        const nameInput = document.getElementById('display-name-input');
        const displayName = nameInput?.value?.trim() || null;
        
        try {
            await Auth.updateProfile({ display_name: displayName });
            App.showToast('Имя сохранено', 'success');
            updateHeaderDisplayName(displayName);
        } catch (error) {
            console.error('Error saving name:', error);
            App.showToast('Ошибка сохранения', 'error');
        }
    });

    // Выход
    document.getElementById('logout-btn-settings')?.addEventListener('click', async () => {
        await Auth.signOut();
    });

    // Смена валюты
    document.getElementById('currency-select')?.addEventListener('change', async (e) => {
        try {
            await Auth.updateProfile({ currency: e.target.value });
            App.showToast('Валюта сохранена', 'success');
        } catch (error) {
            console.error('Error saving currency:', error);
            App.showToast('Ошибка сохранения', 'error');
        }
    });

    // Смена первого дня недели
    document.getElementById('week-start-select')?.addEventListener('change', async (e) => {
        try {
            await Auth.updateProfile({ week_start: e.target.value });
            App.showToast('Настройка сохранена', 'success');
        } catch (error) {
            console.error('Error saving week start:', error);
            App.showToast('Ошибка сохранения', 'error');
        }
    });

    // Сохранение бюджета
    document.getElementById('save-budget-btn')?.addEventListener('click', async () => {
        const budgetInput = document.getElementById('monthly-budget-input');
        const budgetValue = budgetInput?.value;
        
        try {
            const budget = budgetValue ? parseFloat(budgetValue) : null;
            await Auth.updateProfile({ monthly_budget: budget });
            App.showToast('Бюджет сохранён', 'success');
        } catch (error) {
            console.error('Error saving budget:', error);
            App.showToast('Ошибка сохранения', 'error');
        }
    });

    // Экспорт всех данных
    document.getElementById('export-all-btn')?.addEventListener('click', async () => {
        try {
            const btn = document.getElementById('export-all-btn');
            btn.disabled = true;
            btn.textContent = 'Экспорт...';

            const transactions = await API.exportAllTransactions(userId);
            exportToExcel(transactions, 'myfin-all-transactions');
            
            App.showToast('Данные экспортированы', 'success');
        } catch (error) {
            console.error('Export error:', error);
            App.showToast('Ошибка экспорта', 'error');
        } finally {
            const btn = document.getElementById('export-all-btn');
            btn.disabled = false;
            btn.textContent = 'Экспорт в Excel';
        }
    });

    // Удаление всех данных
    document.getElementById('delete-all-data-btn')?.addEventListener('click', async () => {
        await showDeleteAllDataConfirm(userId);
    });
}

/**
 * Показать модальное окно подтверждения удаления всех данных
 * @param {string} userId - ID пользователя
 */
async function showDeleteAllDataConfirm(userId) {
    const html = `
        <div class="modal-header">
            <h2 class="modal-title">Удалить все данные</h2>
            <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="delete-warning-box">
                <svg class="warning-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#F44336" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <p>Это действие <strong>необратимо</strong> удалит все транзакции и категории. Данные нельзя будет восстановить.</p>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
            <button id="confirm-delete-all-btn" class="btn btn-danger">Удалить всё</button>
        </div>
    `;

    App.showModal(html);

    document.getElementById('confirm-delete-all-btn')?.addEventListener('click', async () => {
        App.closeModal();
        await deleteAllUserData(userId);
    });
}

/**
 * Удалить все данные пользователя
 * @param {string} userId - ID пользователя
 */
async function deleteAllUserData(userId) {
    try {
        const btn = document.getElementById('delete-all-data-btn');
        btn.disabled = true;
        btn.textContent = 'Удаление...';

        await API.deleteAllUserData(userId);

        // Очищаем кэш
        Storage.remove(APP_CONFIG.CACHE_TRANSACTIONS_KEY(userId));
        Storage.remove(APP_CONFIG.CACHE_CATEGORIES_KEY(userId));

        App.showToast('Все данные удалены', 'success');

        // Перезагружаем страницу
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Delete all data error:', error);
        App.showToast('Ошибка удаления', 'error');
        const btn = document.getElementById('delete-all-data-btn');
        btn.disabled = false;
        btn.textContent = 'Удалить все данные';
    }
}

/**
 * Обновить отображение имени в хедере
 */
function updateHeaderDisplayName(displayName) {
    // Обновляем в auth
    if (Auth.currentUser) {
        Auth.currentUser.profile = Auth.currentUser.profile || {};
        Auth.currentUser.profile.display_name = displayName;
    }
    
    // Обновляем в верхнем хедере десктопа
    const userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
        userEmailEl.textContent = displayName || Auth.getEmail() || '';
    }
}

/**
 * Экспорт в Excel
 * @param {Array} data - данные
 * @param {string} filename - имя файла
 */
function exportToExcel(data, filename) {
    // Преобразуем данные для экспорта
    const exportData = data.map(t => ({
        'Дата': Utils.formatDate(t.transaction_date),
        'Тип': t.type === 'income' ? 'Доход' : 'Расход',
        'Категория': t.category?.name || 'Без категории',
        'Сумма': t.amount,
        'Комментарий': t.comment || ''
    }));

    // Создаём workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Добавляем worksheet
    XLSX.utils.book_append_sheet(wb, ws, 'Транзакции');

    // Сохраняем файл
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
