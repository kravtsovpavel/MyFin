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
            <svg class="mobile-header-logo" viewBox="0 0 100 100">
                <defs>
                    <linearGradient id="mobHeaderGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#1E88E5"/>
                        <stop offset="100%" style="stop-color:#0D47A1"/>
                    </linearGradient>
                </defs>
                <rect width="100" height="100" rx="22" fill="url(#mobHeaderGrad5)"/>
                <text x="50" y="44" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#FFC107" text-anchor="middle">My</text>
                <text x="50" y="74" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Fin</text>
            </svg>
            <span class="mobile-header-title">Категории</span>
        </div>

        <div class="categories-page">
            <div class="flex justify-between items-center mb-lg">
                <button id="add-category-btn" class="btn btn-primary">+ Категория</button>
            </div>

            <!-- Доходы -->
            <div class="category-section">
                <h3 class="category-section-title">Доходы</h3>
                <div id="income-categories-list" class="categories-list">
                    <div class="text-center text-secondary py-lg">Загрузка...</div>
                </div>
            </div>

            <!-- Расходы -->
            <div class="category-section">
                <h3 class="category-section-title">Расходы</h3>
                <div id="expense-categories-list" class="categories-list">
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
        if (cached?.data) {
            const expenseCategories = cached.data.filter(c => c.type === TRANSACTION_TYPE.EXPENSE);
            const incomeCategories = cached.data.filter(c => c.type === TRANSACTION_TYPE.INCOME);
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
