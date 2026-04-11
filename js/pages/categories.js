// ========================================
// MyFin - Страница категорий
// ========================================

/**
 * Рендер страницы категорий
 */
async function renderCategories() {
    const mainContent = document.getElementById('main-content');
    const userId = Auth.getUserId();

    mainContent.innerHTML = `
        <!-- Мобильный хедер -->
        <div class="mobile-header">
            <svg class="mobile-header-logo" viewBox="0 0 120 100">
                <defs>
                    <linearGradient id="mobHeaderGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="120" height="100" rx="22" fill="url(#mobHeaderGrad5)"/>
                <text x="60" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="60" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
            </svg>
            <span class="mobile-header-title">Категории</span>
        </div>

        <div class="categories-page">
            <div class="flex justify-between items-center mb-lg">
                <button id="add-category-btn" class="btn btn-primary">+ Категория</button>
            </div>

            <!-- Расходы -->
            <div class="category-section">
                <h3 class="category-section-title">Расходы</h3>
                <div id="expense-categories-list" class="categories-list">
                    <div class="text-center text-secondary py-lg">Загрузка...</div>
                </div>
            </div>

            <!-- Доходы -->
            <div class="category-section">
                <h3 class="category-section-title">Доходы</h3>
                <div id="income-categories-list" class="categories-list">
                    <div class="text-center text-secondary py-lg">Загрузка...</div>
                </div>
            </div>
        </div>
    `;

    // Загружаем категории
    await loadCategories(userId);

    // Обработчик добавления категории
    document.getElementById('add-category-btn')?.addEventListener('click', () => {
        showCategoryModal(userId);
    });
}

/**
 * Загрузка категорий
 * @param {string} userId - ID пользователя
 */
async function loadCategories(userId) {
    try {
        const categories = await API.getCategories(userId);

        // Сохраняем в кэш
        Storage.setCategoriesCache(userId, categories);

        // Разделяем по типам
        const expenseCategories = categories.filter(c => c.type === TRANSACTION_TYPE.EXPENSE);
        const incomeCategories = categories.filter(c => c.type === TRANSACTION_TYPE.INCOME);

        // Рендерим списки
        renderCategoryList('expense-categories-list', expenseCategories, userId);
        renderCategoryList('income-categories-list', incomeCategories, userId);
    } catch (error) {
        console.error('Error loading categories:', error);

        // Пробуем из кэша
        const cached = Storage.getCategoriesCache(userId);
        if (cached) {
            const expenseCategories = cached.filter(c => c.type === TRANSACTION_TYPE.EXPENSE);
            const incomeCategories = cached.filter(c => c.type === TRANSACTION_TYPE.INCOME);
            renderCategoryList('expense-categories-list', expenseCategories, userId);
            renderCategoryList('income-categories-list', incomeCategories, userId);
        } else {
            document.getElementById('expense-categories-list').innerHTML =
                '<div class="text-center text-secondary py-lg">Ошибка загрузки</div>';
            document.getElementById('income-categories-list').innerHTML =
                '<div class="text-center text-secondary py-lg">Ошибка загрузки</div>';
        }
    }
}

/**
 * Рендер списка категорий
 * @param {string} containerId - ID контейнера
 * @param {Array} categories - категории
 * @param {string} userId - ID пользователя
 */
function renderCategoryList(containerId, categories, userId) {
    const container = document.getElementById(containerId);

    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <div class="text-center text-secondary py-lg">
                Нет категорий. Создайте первую.
            </div>
        `;
        return;
    }

    container.innerHTML = categories.map(cat => `
        <div class="category-item">
            <div class="category-item-info">
                <span class="category-name">${Utils.escapeHtml(cat.name)}</span>
            </div>
            <div class="category-item-actions">
                <button class="category-action-btn edit-category" data-id="${cat.id}">Изм.</button>
                <button class="category-action-btn delete-category" data-id="${cat.id}">Удал.</button>
            </div>
        </div>
    `).join('');

    // Обработчики
    container.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.target.dataset.id;
            const category = categories.find(c => c.id === categoryId);
            if (category) {
                showCategoryModal(userId, category);
            }
        });
    });

    container.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const categoryId = e.target.dataset.id;
            const category = categories.find(c => c.id === categoryId);
            if (category) {
                await showDeleteCategoryConfirm(category, userId);
            }
        });
    });
}

/**
 * Показать модальное окно добавления/редактирования категории
 * @param {string} userId - ID пользователя
 * @param {Object} category - категория для редактирования (опционально)
 */
function showCategoryModal(userId, category = null) {
    const isEdit = !!category;
    const isExpense = category ? category.type === TRANSACTION_TYPE.EXPENSE : true;

    const html = `
        <div class="modal-header">
            <h2 class="modal-title">${isEdit ? 'Редактировать категорию' : 'Новая категория'}</h2>
            <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="category-form">
                <input type="hidden" id="category-id" value="${category?.id || ''}">
                <input type="hidden" id="category-type" value="${category?.type || TRANSACTION_TYPE.EXPENSE}">

                ${!isEdit ? `
                <div class="form-group">
                    <label class="form-label">Тип категории</label>
                    <div class="transaction-type-toggle">
                        <button type="button" class="type-toggle-btn expense ${isExpense ? 'active' : ''}"
                                data-type="expense">
                            Расход
                        </button>
                        <button type="button" class="type-toggle-btn income ${!isExpense ? 'active' : ''}"
                                data-type="income">
                            Доход
                        </button>
                    </div>
                </div>
                ` : `
                <div class="form-group">
                    <label class="form-label">Тип категории</label>
                    <div class="category-type-display ${category?.type === 'income' ? 'income' : 'expense'}">
                        ${category?.type === 'income' ? 'Доход' : 'Расход'}
                    </div>
                </div>
                `}

                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" id="category-name" class="form-input"
                           value="${Utils.escapeHtml(category?.name || '')}"
                           placeholder="Например: Продукты"
                           maxlength="50"
                           required>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            ${isEdit ? `
                <button id="delete-category-btn" class="btn btn-danger">Удалить</button>
            ` : ''}
            <button class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
            <button id="save-category-btn" class="btn btn-primary">Сохранить</button>
        </div>
    `;

    App.showModal(html, () => {
        if (Router.currentRoute?.page === 'categories') {
            renderCategories();
        }
    });

    setupCategoryModalHandlers(userId, category);
}

/**
 * Настройка обработчиков модального окна категории
 * @param {string} userId - ID пользователя
 * @param {Object} category - категория для редактирования
 */
function setupCategoryModalHandlers(userId, category = null) {
    const isEdit = !!category;
    let selectedType = category?.type || TRANSACTION_TYPE.EXPENSE;

    // Выбор типа (только при создании)
    if (!isEdit) {
        document.querySelectorAll('.type-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedType = e.target.dataset.type;
            });
        });
    }

    // Сохранение
    document.getElementById('save-category-btn')?.addEventListener('click', async () => {
        const nameInput = document.getElementById('category-name');

        const name = nameInput?.value?.trim();

        if (!name) {
            App.showToast('Введите название категории', 'error');
            return;
        }

        try {
            const btn = document.getElementById('save-category-btn');
            btn.disabled = true;
            btn.textContent = 'Сохранение...';

            if (isEdit) {
                await API.updateCategory(category.id, { name });
                App.showToast('Категория обновлена', 'success');
            } else {
                const count = await API.getCategoryCount(userId, selectedType);
                if (count >= APP_CONFIG.MAX_EXPENSE_CATEGORIES) {
                    App.showToast(`Максимум ${APP_CONFIG.MAX_EXPENSE_CATEGORIES} категорий`, 'error');
                    return;
                }

                await API.createCategory(userId, name, '', selectedType);
                App.showToast('Категория создана', 'success');
            }

            App.closeModal();

            if (Router.currentRoute?.page === 'categories') {
                await renderCategories();
            }
        } catch (error) {
            console.error('Category save error:', error);

            if (error.code === '23505') {
                App.showToast('Категория с таким названием уже существует', 'error');
            } else {
                App.showToast('Ошибка сохранения', 'error');
            }

            const btn = document.getElementById('save-category-btn');
            btn.disabled = false;
            btn.textContent = 'Сохранить';
        }
    });

    // Удаление (только при редактировании)
    if (isEdit) {
        document.getElementById('delete-category-btn')?.addEventListener('click', async () => {
            await showDeleteCategoryConfirm(category, userId);
        });
    }
}
