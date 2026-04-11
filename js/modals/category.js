// ========================================
// MyFin - Модальное окно категории
// ========================================

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
                            💸 Расход
                        </button>
                        <button type="button" class="type-toggle-btn income ${!isExpense ? 'active' : ''}"
                                data-type="income">
                            💰 Доход
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
                document.getElementById('category-type').value = selectedType;
            });
        });
    }

    // Сохранение
    document.getElementById('save-category-btn')?.addEventListener('click', async () => {
        const nameInput = document.getElementById('category-name');
        const typeInput = document.getElementById('category-type');

        const name = nameInput?.value?.trim();
        const type = isEdit ? category.type : (typeInput?.value || selectedType);

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
                const count = await API.getCategoryCount(userId, type);
                if (count >= APP_CONFIG.MAX_EXPENSE_CATEGORIES) {
                    App.showToast(`Максимум ${APP_CONFIG.MAX_EXPENSE_CATEGORIES} категорий`, 'error');
                    return;
                }

                await API.createCategory(userId, name, '', type);
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

/**
 * Показать модальное окно подтверждения удаления категории
 * @param {Object} category - категория
 * @param {string} userId - ID пользователя
 */
window.showDeleteCategoryConfirm = async function(category, userId) {
    // Проверяем наличие транзакций по этой категории
    const allTransactions = await API.getTransactions(userId, 10000);
    const relatedTransactions = allTransactions.filter(t => t.category_id === category.id);
    const hasTransactions = relatedTransactions.length > 0;

    const html = `
        <div class="modal-header">
            <h2 class="modal-title">Удалить категорию</h2>
            <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">
            <p class="delete-confirm-text">Вы действительно хотите удалить категорию <strong>${Utils.escapeHtml(category.name)}</strong>?</p>
            ${hasTransactions ? `
                <div class="delete-warning-box">
                    <svg class="warning-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#F57C00" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <p>С этой категорией связано <strong>${relatedTransactions.length} опер.</strong>. После удаления они будут помечены как <strong>«Без категории»</strong>.</p>
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
            <button id="confirm-delete-btn" class="btn btn-danger">Удалить</button>
        </div>
    `;

    App.showModal(html, () => {
        if (Router.currentRoute?.page === 'categories') {
            renderCategories();
        }
    });

    document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
        await deleteCategory(category.id, userId);
    });
}

/**
 * Удалить категорию
 * @param {string} categoryId - ID категории
 * @param {string} userId - ID пользователя
 */
async function deleteCategory(categoryId, userId) {
    try {
        await API.deleteCategory(categoryId);
        App.showToast('Категория удалена', 'success');
        App.closeModal();

        // Обновляем страницу категорий
        if (Router.currentRoute?.page === 'categories') {
            await renderCategories();
        }
    } catch (error) {
        console.error('Delete category error:', error);
        App.showToast('Ошибка удаления', 'error');
    }
}
