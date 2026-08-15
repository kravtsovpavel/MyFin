const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadApi(supabase) {
    const context = {
        supabase,
        APP_CONFIG: { TRANSACTIONS_PER_PAGE: 25 },
        TRANSACTION_TYPE: { INCOME: 'income', EXPENSE: 'expense' },
        console
    };
    vm.createContext(context);
    vm.runInContext(`${read('js/api.js')}\n;globalThis.testApi = API;`, context);
    return context.testApi;
}

async function testPaginationUsesSupabaseCount() {
    const builder = {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        range() {
            return Promise.resolve({ data: [{ id: 'tx-26' }], count: 51, error: null });
        }
    };
    const api = loadApi({ from: () => builder });
    const result = await api.getTransactionsPaginated('user-1', { page: 2 });
    assert.equal(result.total, 51);
    assert.equal(result.data[0].id, 'tx-26');
}

async function testCategoryLimitUsesSupabaseCount() {
    const builder = {
        select() { return this; },
        eq() { return this; },
        then(resolve, reject) {
            return Promise.resolve({ data: null, count: 30, error: null }).then(resolve, reject);
        }
    };
    const api = loadApi({ from: () => builder });
    assert.equal(await api.getCategoryCount('user-1', 'income'), 30);
}

async function testMissingProfileIsCreated() {
    let insertedProfile = null;
    const builder = {
        select() { return this; },
        eq() { return this; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); },
        upsert(profile) { insertedProfile = profile; return this; },
        single() {
            return Promise.resolve({
                data: { ...insertedProfile, currency: 'RUB', week_start: 'monday' },
                error: null
            });
        }
    };
    const api = loadApi({ from: () => builder });
    const profile = await api.getOrCreateProfile({ id: 'user-2', email: 'new@example.test' });
    assert.equal(insertedProfile.id, 'user-2');
    assert.equal(profile.email, 'new@example.test');
}

function testBugReportMarkup() {
    const index = read('index.html');
    const calendar = read('js/pages/calendar.js');
    const categories = read('js/pages/categories.js');
    const categoryModal = read('js/modals/category.js');
    const styles = read('css/styles.css');
    const transactionModal = read('js/modals/transaction.js');

    assert.doesNotMatch(index, /viewBox="0 0 120 100"/);
    assert.doesNotMatch(calendar, /formatDate\(t\.transaction_date, true\)/);
    assert.ok(categories.indexOf('<!-- Доходы -->') < categories.indexOf('<!-- Расходы -->'));
    assert.match(categoryModal, /category\?\.type \|\| TRANSACTION_TYPE\.INCOME/);
    assert.match(styles, /\.bottom-nav-item\.active\s*{[^}]*color:\s*#FFFFFF;/s);
    assert.match(styles, /#comparison-table-container\s*{[^}]*padding-bottom:/s);
    assert.match(index, /data-page="transactions"/);
    assert.match(transactionModal, /window\._setSelectedCategory\(null\)/);
    assert.doesNotMatch(transactionModal, /window\._selectedCategoryId \|\| selectedCategoryId/);
    assert.equal((`${categories}\n${categoryModal}`.match(/function showCategoryModal\(/g) || []).length, 1);
}

function testDateOnlyStringsStayLocal() {
    const context = {
        APP_CONFIG: { CURRENCIES: [] },
        console
    };
    vm.createContext(context);
    vm.runInContext(`${read('js/utils.js')}\n;globalThis.testUtils = Utils;`, context);
    const parsed = context.testUtils.parseDate('2026-01-02');
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 0);
    assert.equal(parsed.getDate(), 2);
    assert.equal(parsed.getHours(), 0);
}

(async () => {
    await testPaginationUsesSupabaseCount();
    await testCategoryLimitUsesSupabaseCount();
    await testMissingProfileIsCreated();
    testBugReportMarkup();
    testDateOnlyStringsStayLocal();
    console.log('Regression tests passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
