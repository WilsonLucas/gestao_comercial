const StorageKeys = {
  users: 'sgc_users',
  session: 'sgc_session',
  purchases: 'sgc_purchases',
  sales: 'sgc_sales',
  products: 'sgc_products',
  seeded: 'sgc_seeded'
};

const App = (() => {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

  const read = (key, fallback = []) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const today = () => new Date().toISOString().split('T')[0];
  const formatCurrency = (value) => currency.format(Number(value || 0));
  const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  const monthKey = (date) => `${new Date(`${date}T00:00:00`).getFullYear()}-${String(new Date(`${date}T00:00:00`).getMonth() + 1).padStart(2, '0')}`;
  const formatMonth = (key) => monthFormatter.format(new Date(`${key}-01T00:00:00`));

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function seedData() {
    if (localStorage.getItem(StorageKeys.seeded)) return;
    const users = [{ id: uid('user'), nome: 'Administrador', email: 'admin@admin.com', senha: '123456', perfil: 'Administrador' }];
    const purchases = [
      { id: uid('cmp'), produto: 'Café Especial 250g', categoria: 'Alimentos', valorUnitario: 18.5, quantidade: 40, estoqueMinimo: 8, data: '2026-02-05', total: 740 },
      { id: uid('cmp'), produto: 'Caneca Térmica', categoria: 'Acessórios', valorUnitario: 25, quantidade: 20, estoqueMinimo: 5, data: '2026-02-13', total: 500 },
      { id: uid('cmp'), produto: 'Bolo no Pote', categoria: 'Sobremesas', valorUnitario: 7.5, quantidade: 35, estoqueMinimo: 10, data: '2026-03-02', total: 262.5 }
    ];
    const products = [
      { id: uid('prd'), nome: 'Café Especial 250g', categoria: 'Alimentos', estoqueAtual: 28, estoqueMinimo: 8, valorCompra: 18.5, ultimaCompra: '2026-02-05' },
      { id: uid('prd'), nome: 'Caneca Térmica', categoria: 'Acessórios', estoqueAtual: 14, estoqueMinimo: 5, valorCompra: 25, ultimaCompra: '2026-02-13' },
      { id: uid('prd'), nome: 'Bolo no Pote', categoria: 'Sobremesas', estoqueAtual: 21, estoqueMinimo: 10, valorCompra: 7.5, ultimaCompra: '2026-03-02' }
    ];
    const sales = [
      { id: uid('vnd'), produtoId: products[0].id, produto: 'Café Especial 250g', quantidade: 12, valorUnitario: 29.9, valorCompra: 18.5, data: '2026-03-06', total: 358.8, lucro: 136.8 },
      { id: uid('vnd'), produtoId: products[1].id, produto: 'Caneca Térmica', quantidade: 6, valorUnitario: 44.9, valorCompra: 25, data: '2026-03-12', total: 269.4, lucro: 119.4 },
      { id: uid('vnd'), produtoId: products[2].id, produto: 'Bolo no Pote', quantidade: 14, valorUnitario: 14, valorCompra: 7.5, data: '2026-03-15', total: 196, lucro: 91 }
    ];
    write(StorageKeys.users, users);
    write(StorageKeys.purchases, purchases);
    write(StorageKeys.products, products);
    write(StorageKeys.sales, sales);
    localStorage.setItem(StorageKeys.seeded, 'true');
  }

  function ensureAdminUser() {
    const users = read(StorageKeys.users, []);
    if (!users.length) {
      users.push({ id: uid('user'), nome: 'Administrador', email: 'admin@admin.com', senha: '123456', perfil: 'Administrador' });
      write(StorageKeys.users, users);
    }
  }

  function getUsers() { ensureAdminUser(); return read(StorageKeys.users, []); }
  function getProducts() { return read(StorageKeys.products, []); }
  function getPurchases() { return read(StorageKeys.purchases, []); }
  function getSales() { return read(StorageKeys.sales, []); }

  function saveUsers(data) { write(StorageKeys.users, data); }
  function saveProducts(data) { write(StorageKeys.products, data); }
  function savePurchases(data) { write(StorageKeys.purchases, data); }
  function saveSales(data) { write(StorageKeys.sales, data); }

  function getProductStatus(product) {
    if (product.estoqueAtual <= product.estoqueMinimo) return { label: 'Acabando', className: 'danger' };
    if (product.estoqueAtual <= product.estoqueMinimo + Math.max(2, Math.ceil(product.estoqueMinimo * 0.5))) return { label: 'Atenção', className: 'warning' };
    return { label: 'Normal', className: 'normal' };
  }

  function buildMonthlySummary() {
    const map = new Map();
    getPurchases().forEach((purchase) => {
      const key = monthKey(purchase.data);
      const current = map.get(key) || { month: key, gasto: 0, vendido: 0, lucro: 0 };
      current.gasto += Number(purchase.total);
      map.set(key, current);
    });
    getSales().forEach((sale) => {
      const key = monthKey(sale.data);
      const current = map.get(key) || { month: key, gasto: 0, vendido: 0, lucro: 0 };
      current.vendido += Number(sale.total);
      current.lucro += Number(sale.lucro);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  function getMetrics() {
    const purchases = getPurchases();
    const sales = getSales();
    const products = getProducts();
    const totalGasto = purchases.reduce((sum, item) => sum + Number(item.total), 0);
    const totalVendido = sales.reduce((sum, item) => sum + Number(item.total), 0);
    const lucroTotal = sales.reduce((sum, item) => sum + Number(item.lucro), 0);
    const currentMonth = monthKey(today());
    const lucroMes = sales.filter((item) => monthKey(item.data) === currentMonth).reduce((sum, item) => sum + Number(item.lucro), 0);
    const estoqueBaixo = products.filter((product) => getProductStatus(product).className !== 'normal').length;
    return { totalGasto, totalVendido, lucroTotal, lucroMes, quantidadeVendas: sales.length, estoqueBaixo };
  }

  function renderAppShell() {
    const page = document.body.dataset.page;
    if (page === 'login') return;
    const user = JSON.parse(sessionStorage.getItem(StorageKeys.session) || 'null');
    const menu = [
      ['dashboard', 'Dashboard', '🏠', 'dashboard.html'],
      ['compras', 'Compras', '🛒', 'compras.html'],
      ['vendas', 'Vendas', '💰', 'vendas.html'],
      ['estoque', 'Estoque', '📦', 'estoque.html'],
      ['financeiro', 'Financeiro', '📈', 'financeiro.html'],
      ['usuarios', 'Usuários', '👥', 'usuarios.html']
    ];
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="sidebar-brand">
          <span class="eyebrow">Admin</span>
          <h2>Gestão Comercial</h2>
          <p>Compras, vendas e estoque</p>
        </div>
        <nav class="sidebar-nav">
          ${menu.map(([key, label, icon, href]) => `<a class="nav-link ${page === key ? 'active' : ''}" href="${href}"><span>${icon}</span><span>${label}</span></a>`).join('')}
        </nav>
      `;
    }
    if (topbar) {
      const initials = user?.nome?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AD';
      topbar.innerHTML = `
        <div>
          <strong>${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</strong>
        </div>
        <div class="topbar-user">
          <div>
            <strong>${user?.nome || 'Usuário'}</strong><br>
            <small>${user?.perfil || 'Perfil'}</small>
          </div>
          <div class="avatar">${initials}</div>
          <button class="btn btn-secondary" id="logout-button" type="button">Sair</button>
        </div>
      `;
      document.getElementById('logout-button')?.addEventListener('click', () => {
        sessionStorage.removeItem(StorageKeys.session);
        window.location.href = 'login.html';
      });
    }
  }

  seedData();
  ensureAdminUser();

  return {
    StorageKeys,
    uid,
    today,
    read,
    write,
    showToast,
    formatCurrency,
    formatDate,
    formatMonth,
    monthKey,
    getUsers,
    saveUsers,
    getProducts,
    saveProducts,
    getPurchases,
    savePurchases,
    getSales,
    saveSales,
    getMetrics,
    getProductStatus,
    buildMonthlySummary,
    renderAppShell
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.renderAppShell();
});
