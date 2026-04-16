const MENU_POR_PERFIL = {
  administrador: [
    ['inicio',        'Inicio',           'inicio.html'],
    ['ingredientes',  'Ingredientes',     'ingredientes.html'],
    ['produtos',      'Produtos',         'produtos.html'],
    ['lista-compras', 'Lista de Compras', 'lista-compras.html'],
    ['compras',       'Compras',          'compras.html'],
    ['pdv',           'PDV',              'pdv.html'],
    ['cozinha',       'Cozinha',          'cozinha.html'],
    ['financeiro',    'Financeiro',       'financeiro.html'],
    ['usuarios',      'Usuarios',         'usuarios.html'],
  ],
  gerente: [
    ['inicio',        'Inicio',           'inicio.html'],
    ['ingredientes',  'Ingredientes',     'ingredientes.html'],
    ['produtos',      'Produtos',         'produtos.html'],
    ['lista-compras', 'Lista de Compras', 'lista-compras.html'],
    ['compras',       'Compras',          'compras.html'],
    ['financeiro',    'Financeiro',       'financeiro.html'],
  ],
  operador: [
    ['inicio',        'Inicio',           'inicio.html'],
    ['pdv',           'PDV',              'pdv.html'],
    ['cozinha',       'Cozinha',          'cozinha.html'],
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

  const PERFIS_VALIDOS = new Set(['administrador', 'gerente', 'operador']);

  function isLoggedIn() {
    const usuario = getUsuario();
    if (!usuario) return false;
    if (!PERFIS_VALIDOS.has(usuario.perfil)) {
      localStorage.removeItem('sgc_user');
      return false;
    }
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
    if (page === 'cozinha') return;
    if (page === 'painel') return; // Painel TV v1.2 — página pública, sem shell

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
      const nomeParts = APP_CONFIG.nome.split(' ');
      const nomeL1 = escapeHtml(nomeParts[0] || APP_CONFIG.nome);
      const nomeL2 = escapeHtml(nomeParts.slice(1).join(' '));
      const logoHtml = APP_CONFIG.logo
        ? `<img src="${escapeHtml(APP_CONFIG.logo)}" alt="${escapeHtml(APP_CONFIG.nome)}" style="max-height:${APP_CONFIG.logoAlturaSidebar}px; max-width:100%; object-fit:contain;">`
        : `<div class="sidebar-nome"><span class="sidebar-nome-l1">${nomeL1}</span><span class="sidebar-nome-l2">${nomeL2}</span></div>`;
      sidebar.innerHTML = `
        <div class="sidebar-brand">
          ${logoHtml}
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
