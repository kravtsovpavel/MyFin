// ========================================
// MyFin - Модальное окно бюджета
// ========================================

/**
 * Показать модальное окно установки/изменения бюджета
 * @param {string} userId - ID пользователя
 * @param {Object} profile - профиль пользователя
 */
function showBudgetModal(userId, profile) {
    const currentBudget = profile?.monthly_budget;
    const currency = profile?.currency || 'RUB';
    
    const html = `
        <div class="modal-header">
            <h2 class="modal-title">${currentBudget ? 'Изменить бюджет' : 'Установить бюджет'}</h2>
            <button class="modal-close" onclick="App.closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">Месячный бюджет на расходы</label>
                <input type="number" id="budget-amount" class="form-input" 
                       value="${currentBudget || ''}" 
                       placeholder="0" 
                       min="0"
                       step="0.01"
                       inputmode="decimal">
                <p class="text-secondary text-sm mt-sm">
                    При достижении 90% и 100% от бюджета вы получите уведомление
                </p>
            </div>
        </div>
        <div class="modal-footer">
            ${currentBudget ? `
                <button id="clear-budget-btn" class="btn btn-secondary">Очистить</button>
            ` : ''}
            <button class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
            <button id="save-budget-btn" class="btn btn-primary">Сохранить</button>
        </div>
    `;
    
    App.showModal(html);
    
    // Обработчики
    setupBudgetModalHandlers(userId, currency);
}

/**
 * Настройка обработчиков модального окна бюджета
 * @param {string} userId - ID пользователя
 * @param {string} currency - валюта
 */
function setupBudgetModalHandlers(userId, currency) {
    // Сохранение
    document.getElementById('save-budget-btn')?.addEventListener('click', async () => {
        const amountInput = document.getElementById('budget-amount');
        const amount = amountInput?.value ? parseFloat(amountInput.value) : null;
        
        if (amount !== null && amount <= 0) {
            App.showToast('Бюджет должен быть больше 0', 'error');
            return;
        }
        
        try {
            const btn = document.getElementById('save-budget-btn');
            btn.disabled = true;
            btn.textContent = 'Сохранение...';
            
            await Auth.updateProfile({ monthly_budget: amount });
            
            App.showToast('Бюджет сохранён', 'success');
            App.closeModal();
            
            // Обновляем дашборд если мы на нём
            if (Router.currentRoute?.page === 'dashboard') {
                await renderDashboard();
            }
        } catch (error) {
            console.error('Budget save error:', error);
            App.showToast('Ошибка сохранения', 'error');
            
            const btn = document.getElementById('save-budget-btn');
            btn.disabled = false;
            btn.textContent = 'Сохранить';
        }
    });
    
    // Очистка
    document.getElementById('clear-budget-btn')?.addEventListener('click', async () => {
        const confirmed = confirm('Удалить установленный бюджет?');
        if (!confirmed) return;
        
        try {
            await Auth.updateProfile({ monthly_budget: null });
            App.showToast('Бюджет удалён', 'success');
            App.closeModal();
            
            if (Router.currentRoute?.page === 'dashboard') {
                await renderDashboard();
            }
        } catch (error) {
            console.error('Budget clear error:', error);
            App.showToast('Ошибка', 'error');
        }
    });
}
