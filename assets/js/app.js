const MENU_POR_PERFIL = {
  administrador: [
    ['dashboard',     'Dashboard',        'dashboard.html'],
    ['ingredientes',  'Ingredientes',     'ingredientes.html'],
    ['produtos',      'Produtos',         'produtos.html'],
    ['compras',       'Compras',          'compras.html'],
    ['lista-compras', 'Lista de Compras', 'lista-compras.html'],
    ['pdv',           'PDV',              'pdv.html'],
    ['financeiro',    'Financeiro',       'financeiro.html'],
    ['usuarios',      'Usuarios',         'usuarios.html'],
  ],
  financeiro: [
    ['compras',    'Compras',    'compras.html'],
    ['financeiro', 'Financeiro', 'financeiro.html'],
  ],
  estoque: [
    ['ingredientes',  'Ingredientes',     'ingredientes.html'],
    ['produtos',      'Produtos',         'produtos.html'],
    ['compras',       'Compras',          'compras.html'],
    ['lista-compras', 'Lista de Compras', 'lista-compras.html'],
  ],
  operador: [
    ['pdv',           'PDV',              'pdv.html'],
    ['historico-dia', 'Historico do Dia', 'historico-dia.html'],
  ],
};

const App = (() => {
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

  // ── Segurança: escape de HTML para prevenir XSS ───────────────────────────
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function getUsuario() {
    try {
      return JSON.parse(localStorage.getItem('sgc_user') || 'null');
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('sgc_user');
    window.location.href = 'login.html';
  }

  function isLoggedIn() {
    const usuario = getUsuario();
    if (!usuario) return false;
    // Verificar TTL da sessao (8 horas)
    if (usuario.expira_em && Date.now() > usuario.expira_em) {
      localStorage.removeItem('sgc_user');
      return false;
    }
    return true;
  }

  // ── Modal de confirmacao para acoes destrutivas ────────────────────────────
  function confirmar(mensagem) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>${escapeHtml(mensagem)}</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="confirm-cancelar">Cancelar</button>
            <button class="btn btn-danger" id="confirm-ok">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const fechar = (resultado) => { overlay.remove(); resolve(resultado); };
      overlay.querySelector('#confirm-ok').addEventListener('click', () => fechar(true));
      overlay.querySelector('#confirm-cancelar').addEventListener('click', () => fechar(false));
    });
  }

  // ── Loading state em botoes de submit ─────────────────────────────────────
  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Aguarde...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  const today = () => new Date().toISOString().split('T')[0];
  const formatCurrency = (value) => currency.format(Number(value || 0));
  const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  const monthKey = (date) => date?.slice(0, 7) || '';
  const formatMonth = (key) => {
    const [year, month] = key.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function calcularStatus({ estoque_atual, estoque_minimo }) {
    const atual = Number(estoque_atual);
    const minimo = Number(estoque_minimo);
    if (atual <= minimo) return { label: 'Critico', className: 'danger', status: 'critico' };
    if (atual <= minimo * 1.5) return { label: 'Atencao', className: 'warning', status: 'atencao' };
    return { label: 'Normal', className: 'normal', status: 'normal' };
  }

  function renderAppShell() {
    const page = document.body.dataset.page;
    if (page === 'login') return;

    const usuario = getUsuario();
    if (!usuario) {
      window.location.replace('login.html');
      return;
    }

    const perfil = usuario.perfil;
    const menu = MENU_POR_PERFIL[perfil] || [];
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar');

    if (sidebar) {
      sidebar.innerHTML = `
        <div class="sidebar-brand">
          <span class="eyebrow">${escapeHtml(perfil)}</span>
          <h2>Gestao Comercial</h2>
          <p>Compras, vendas e estoque</p>
        </div>
        <nav class="sidebar-nav">
          ${menu.map(([key, label, href]) => `<a class="nav-link ${page === key ? 'active' : ''}" href="${escapeHtml(href)}"><span>${escapeHtml(label)}</span></a>`).join('')}
        </nav>
      `;
    }

    if (topbar) {
      const initials = usuario.nome?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'AD';
      const homePage = menu[0]?.[2] || 'dashboard.html';
      const isHome = page === (menu[0]?.[0] || 'dashboard');
      topbar.innerHTML = `
        <div>
          <strong>${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</strong>
        </div>
        <div class="topbar-user">
          ${!isHome ? `<a class="btn btn-secondary" href="${escapeHtml(homePage)}" title="Voltar para o inicio">&#8962;</a>` : ''}
          <div>
            <strong>${escapeHtml(usuario.nome || 'Usuario')}</strong><br>
            <small>${escapeHtml(perfil)}</small>
          </div>
          <div class="avatar">${escapeHtml(initials)}</div>
          <button class="btn btn-secondary" id="logout-button" type="button">Sair</button>
        </div>
      `;
      document.getElementById('logout-button')?.addEventListener('click', logout);
    }
  }

  return {
    today,
    formatCurrency,
    formatDate,
    monthKey,
    formatMonth,
    showToast,
    calcularStatus,
    getUsuario,
    isLoggedIn,
    logout,
    renderAppShell,
    escapeHtml,
    confirmar,
    setLoading,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.renderAppShell();
});
