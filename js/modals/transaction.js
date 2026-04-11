// ========================================
// MyFin - Модальное окно транзакции
// ========================================

/**
 * Показать модальное окно добавления/редактирования транзакции
 * @param {string} type - тип транзакции (income/expense) или null для выбора
 * @param {Object} transaction - транзакция для редактирования (опционально)
 */
async function showTransactionModal(type = null, transaction = null) {
    const userId = Auth.getUserId();
    const isEdit = !!transaction;
    
    // Получаем категории
    let expenseCategories = [];
    let incomeCategories = [];
    
    try {
        const categories = await API.getCategories(userId);
        expenseCategories = categories.filter(c => c.type === TRANSACTION_TYPE.EXPENSE);
        incomeCategories = categories.filter(c => c.type === TRANSACTION_TYPE.INCOME);
    } catch (error) {
        console.error('Error loading categories:', error);
        // Пробуем из кэша
        const cached = Storage.getCategoriesCache(userId);
        if (cached) {
            expenseCategories = cached.filter(c => c.type === TRANSACTION_TYPE.EXPENSE);
            incomeCategories = cached.filter(c => c.type === TRANSACTION_TYPE.INCOME);
        }
    }

    // Определяем текущий тип
    let selectedType = type;
    if (isEdit) {
        selectedType = transaction.type;
    } else if (!type) {
        selectedType = null; // Нет выбранного типа по умолчанию
    }

    const currentCategories = selectedType === TRANSACTION_TYPE.INCOME ? incomeCategories : expenseCategories;
    const selectedCategoryId = transaction?.category_id || null;

    const html = `
        <div class="modal-header">
            <h2 class="modal-title">${isEdit ? 'Редактировать транзакцию' : 'Новая транзакция'}</h2>
            <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">
            <form id="transaction-form">
                <input type="hidden" id="transaction-id" value="${transaction?.id || ''}">
                
                ${!isEdit ? `
                <div class="form-group">
                    <label class="form-label">Тип операции</label>
                    <div class="transaction-type-toggle">
                        <button type="button" class="type-toggle-btn expense ${selectedType === TRANSACTION_TYPE.EXPENSE ? 'active' : ''}"
                                data-type="expense">
                            Расход
                        </button>
                        <button type="button" class="type-toggle-btn income ${selectedType === TRANSACTION_TYPE.INCOME ? 'active' : ''}"
                                data-type="income">
                            Доход
                        </button>
                    </div>
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label class="form-label">Сумма</label>
                    <input type="number" id="transaction-amount" class="form-input" 
                           value="${transaction?.amount || ''}" 
                           placeholder="0" 
                           min="0.01"
                           step="0.01"
                           inputmode="decimal"
                           required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Категория</label>
                    <div id="category-selector" class="category-grid">
                        ${renderCategoryButtons(currentCategories, selectedCategoryId)}
                    </div>
                    ${currentCategories.length === 0 ? `
                        <p class="text-secondary text-sm mt-sm">
                            ${isEdit ? 'Нет категорий' : 'Сначала создайте категории в разделе "Категории"'}
                        </p>
                    ` : ''}
                    ${!isEdit && currentCategories.length === 0 ? `
                        <button type="button" class="btn btn-secondary mt-sm" onclick="App.closeModal(); setTimeout(() => Router.navigate('categories'), 100);">
                            Перейти к категориям
                        </button>
                    ` : ''}
                </div>
                
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <div class="date-picker-wrapper">
                        <div class="date-input-display" id="transaction-date-display">
                            <svg class="date-icon" viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                            </svg>
                            <span class="date-text" id="transaction-date-text">${Utils.formatDate(transaction?.transaction_date || new Date())}</span>
                        </div>
                        <input type="hidden" id="transaction-date" value="${Utils.formatDateForInput(transaction?.transaction_date || new Date())}">
                        <div class="date-picker-dropdown" id="transaction-date-picker"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Комментарий (необязательно)</label>
                    <textarea id="transaction-comment" class="form-textarea" 
                              placeholder="Добавьте заметку..." 
                              maxlength="200">${transaction?.comment || ''}</textarea>
                    <p class="text-secondary text-xs mt-sm" id="comment-length">0/200</p>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            ${isEdit ? `
                <button id="delete-transaction-btn" class="btn btn-danger">Удалить</button>
            ` : ''}
            <button class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
            <button id="save-transaction-btn" class="btn btn-primary">Сохранить</button>
        </div>
    `;

    App.showModal(html);

    // Инициализация кастомного календаря
    const initialDate = transaction?.transaction_date || Utils.getTodayDateString();
    CustomDatePicker.init('transaction-date-picker', initialDate, (selectedDate) => {
        document.getElementById('transaction-date').value = selectedDate;
        document.getElementById('transaction-date-text').textContent = Utils.formatDate(selectedDate);
        document.getElementById('transaction-date-text').classList.remove('empty');
    });

    // Открытие/закрытие календаря по клику
    document.getElementById('transaction-date-display')?.addEventListener('click', () => {
        CustomDatePicker.toggle('transaction-date-picker');
    });

    // Закрытие календаря при клике вне его
    document.addEventListener('click', (e) => {
        const wrapper = document.querySelector('.date-picker-wrapper');
        const dropdown = document.getElementById('transaction-date-picker');
        if (wrapper && dropdown && dropdown.classList.contains('open')) {
            if (!wrapper.contains(e.target)) {
                CustomDatePicker.hide('transaction-date-picker');
            }
        }
    });

    // Обработчики
    setupTransactionModalHandlers(userId, transaction, expenseCategories, incomeCategories, type);
}

/**
 * Рендер кнопок категорий
 * @param {Array} categories - категории
 * @param {string} selectedId - выбранная категория
 * @returns {string}
 */
function renderCategoryButtons(categories, selectedId) {
    let html = categories.map(cat => `
        <button type="button" class="category-btn ${cat.id === selectedId ? 'selected' : ''}" 
                data-id="${cat.id}">
            <span class="category-name">${Utils.escapeHtml(cat.name)}</span>
        </button>
    `).join('');
    
    // Кнопка добавления новой категории
    html += `
        <button type="button" class="category-btn add-category-btn" style="border: 2px dashed var(--border); background: transparent;">
            <span class="category-name">+ Новая</span>
        </button>
    `;
    
    return html;
}

/**
 * Настройка обработчиков модального окна транзакции
 * @param {string} userId - ID пользователя
 * @param {Object} transaction - транзакция для редактирования
 * @param {Array} expenseCategories - категории расходов
 * @param {Array} incomeCategories - категории доходов
 */
function setupTransactionModalHandlers(userId, transaction = null, expenseCategories = [], incomeCategories = [], preselectedType = null) {
    const isEdit = !!transaction;
    let selectedType = transaction?.type || preselectedType || null;
    let selectedCategoryId = transaction?.category_id || null;
    
    // Функция для обновления selectedCategoryId
    window._selectedCategoryId = selectedCategoryId;
    window._setSelectedCategory = (id) => {
        selectedCategoryId = id;
        window._selectedCategoryId = id;
    };

    // Переключение типа
    document.querySelectorAll('.type-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedType = e.target.dataset.type;

            // Обновляем список категорий
            const categories = selectedType === TRANSACTION_TYPE.INCOME ? incomeCategories : expenseCategories;
            selectedCategoryId = null;

            const selector = document.getElementById('category-selector');
            if (selector) {
                selector.innerHTML = renderCategoryButtons(categories, null);
                reattachCategoryHandlers(userId, selectedType, expenseCategories, incomeCategories);
            }
        });
    });

    // Выбор категории
    document.querySelectorAll('#category-selector .category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Если нажата кнопка "+ Новая"
            if (btn.classList.contains('add-category-btn')) {
                showInlineCategoryForm(userId, selectedType, expenseCategories, incomeCategories);
                return;
            }
            
            document.querySelectorAll('#category-selector .category-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCategoryId = btn.dataset.id;
        });
    });

    // Счётчик символов комментария
    const commentInput = document.getElementById('transaction-comment');
    const commentLength = document.getElementById('comment-length');
    if (commentInput && commentLength) {
        commentInput.addEventListener('input', () => {
            commentLength.textContent = `${commentInput.value.length}/200`;
        });
    }

    // Сохранение
    document.getElementById('save-transaction-btn')?.addEventListener('click', async () => {
        // Валидация
        const amountInput = document.getElementById('transaction-amount');
        const dateInput = document.getElementById('transaction-date');
        const commentInput = document.getElementById('transaction-comment');

        const amount = parseFloat(amountInput?.value);
        const date = dateInput?.value;
        const comment = commentInput?.value?.trim() || null;

        // Проверка типа (обязательный выбор)
        if (!isEdit && !selectedType) {
            App.showToast('Выберите тип операции', 'error');
            return;
        }

        // Проверка суммы
        if (!amount || amount <= 0) {
            App.showToast('Введите сумму больше 0', 'error');
            return;
        }

        // Проверка категории
        const currentSelectedCategory = window._selectedCategoryId || selectedCategoryId;
        if (!currentSelectedCategory) {
            App.showToast('Выберите категорию', 'error');
            return;
        }

        // Проверка даты
        if (!date) {
            App.showToast('Выберите дату', 'error');
            return;
        }

        try {
            const btn = document.getElementById('save-transaction-btn');
            btn.disabled = true;
            btn.textContent = 'Сохранение...';

            const transactionData = {
                amount,
                type: selectedType,
                category_id: currentSelectedCategory,
                transaction_date: date,
                comment
            };

            if (isEdit) {
                // Обновление
                await API.updateTransaction(transaction.id, transactionData);
                App.showToast('Транзакция обновлена', 'success');
            } else {
                // Создание
                await API.createTransaction(userId, transactionData);
                App.showToast('Транзакция добавлена', 'success');
            }

            App.closeModal();
            
            // Обновляем текущую страницу
            if (Router.currentRoute) {
                await Router.renderPage(Router.currentRoute.page);
            }
        } catch (error) {
            console.error('Transaction save error:', error);
            App.showToast('Ошибка сохранения', 'error');
            
            const btn = document.getElementById('save-transaction-btn');
            btn.disabled = false;
            btn.textContent = 'Сохранить';
        }
    });

    // Удаление (только при редактировании)
    if (isEdit) {
        document.getElementById('delete-transaction-btn')?.addEventListener('click', async () => {
            const confirmed = confirm('Удалить транзакцию?');
            if (!confirmed) return;

            try {
                await API.deleteTransaction(transaction.id);
                App.showToast('Транзакция удалена', 'success');
                App.closeModal();

                if (Router.currentRoute) {
                    await Router.renderPage(Router.currentRoute.page);
                }
            } catch (error) {
                console.error('Delete transaction error:', error);
                App.showToast('Ошибка удаления', 'error');
            }
        });
    }
}

/**
 * Показать inline форму для создания новой категории
 * @param {string} userId - ID пользователя
 * @param {string} selectedType - текущий тип транзакции
 * @param {Array} expenseCategories - категории расходов
 * @param {Array} incomeCategories - категории доходов
 */
function showInlineCategoryForm(userId, selectedType, expenseCategories, incomeCategories) {
    const selector = document.getElementById('category-selector');
    if (!selector) return;
    
    const currentType = selectedType || TRANSACTION_TYPE.EXPENSE;
    
    selector.innerHTML = `
        <div id="inline-category-form" style="grid-column: 1 / -1; background: var(--bg-primary); border-radius: var(--border-radius-sm); padding: var(--spacing-md); border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
                <span style="font-weight: 600; font-size: var(--font-size-sm);">Новая категория</span>
                <button type="button" id="cancel-inline-category" style="font-size: 18px; color: var(--text-secondary); cursor: pointer;">✕</button>
            </div>
            <div class="form-group" style="margin-bottom: var(--spacing-md);">
                <input type="text" id="new-category-name" class="form-input" placeholder="Название категории" maxlength="50" style="padding: var(--spacing-sm); font-size: var(--font-size-sm);">
            </div>
            <button type="button" id="save-inline-category" class="btn btn-primary" style="min-height: 36px; padding: var(--spacing-sm) var(--spacing-md); font-size: var(--font-size-sm);">Создать</button>
        </div>
    `;
    
    // Отмена
    document.getElementById('cancel-inline-category')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const categories = selectedType === TRANSACTION_TYPE.INCOME ? incomeCategories : expenseCategories;
        selector.innerHTML = renderCategoryButtons(categories, window._selectedCategoryId);
        reattachCategoryHandlers(userId, selectedType, expenseCategories, incomeCategories);
    });
    
    // Сохранение
    document.getElementById('save-inline-category')?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const nameInput = document.getElementById('new-category-name');

        const name = nameInput?.value?.trim();

        if (!name) {
            App.showToast('Введите название категории', 'error');
            return;
        }

        try {
            const btn = document.getElementById('save-inline-category');
            btn.disabled = true;
            btn.textContent = 'Создание...';

            const newCategory = await API.createCategory(userId, name, '', currentType);

            // Добавляем в массив
            if (currentType === TRANSACTION_TYPE.INCOME) {
                incomeCategories.push(newCategory);
            } else {
                expenseCategories.push(newCategory);
            }

            // Обновляем выбранную категорию
            if (window._setSelectedCategory) {
                window._setSelectedCategory(newCategory.id);
            }

            App.showToast('Категория создана', 'success');

            // Обновляем список категорий
            const categories = currentType === TRANSACTION_TYPE.INCOME ? incomeCategories : expenseCategories;
            selector.innerHTML = renderCategoryButtons(categories, newCategory.id);
            reattachCategoryHandlers(userId, selectedType, expenseCategories, incomeCategories);
        } catch (error) {
            console.error('Create category error:', error);

            if (error.code === '23505') {
                App.showToast('Категория с таким названием уже существует', 'error');
            } else {
                App.showToast('Ошибка создания категории', 'error');
            }

            const btn = document.getElementById('save-inline-category');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Создать';
            }
        }
    });
}

/**
 * Переназначить обработчики категорий после обновления списка
 * @param {string} userId - ID пользователя
 * @param {string} selectedType - текущий тип транзакции
 * @param {Array} expenseCategories - категории расходов
 * @param {Array} incomeCategories - категории доходов
 */
function reattachCategoryHandlers(userId, selectedType, expenseCategories, incomeCategories) {
    document.querySelectorAll('#category-selector .category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (btn.classList.contains('add-category-btn')) {
                showInlineCategoryForm(userId, selectedType, expenseCategories, incomeCategories);
                return;
            }

            document.querySelectorAll('#category-selector .category-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (window._setSelectedCategory) {
                window._setSelectedCategory(btn.dataset.id);
            }
        });
    });
}
