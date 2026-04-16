// Páginas públicas (não exigem sessão e não redirecionam para login).
// - 'login':  tela de autenticação
// - 'painel': Painel do Cliente exibido na TV (v1.2) — read-only, role anon
const PUBLIC_PAGES = ['login', 'painel'];

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  // Whitelist de páginas públicas — o guard de sessão é completamente
  // ignorado para permitir que a TV abra painel.html sem login.
  if (PUBLIC_PAGES.includes(page) && page !== 'login') {
    return;
  }

  if (page !== 'login' && !App.isLoggedIn()) {
    window.location.replace('login.html');
    return;
  }

  if (page === 'login' && App.isLoggedIn()) {
    window.location.replace('inicio.html');
    return;
  }

  if (page === 'login') {
    const form = document.getElementById('login-form');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const senha = document.getElementById('login-password').value.trim();

      try {
        const { data, error } = await db.rpc('autenticar', { p_email: email, p_senha: senha });
        if (error || data?.erro) throw new Error(data?.erro || 'Erro ao autenticar');
        // Salvar sessao com TTL de 8 horas
        const sessao = { ...data, expira_em: Date.now() + (8 * 60 * 60 * 1000) };
        localStorage.setItem('sgc_user', JSON.stringify(sessao));
        App.showToast('Login realizado com sucesso!');
        setTimeout(() => window.location.replace('inicio.html'), 600);
      } catch (err) {
        App.showToast(err?.message || 'E-mail ou senha invalidos.', 'error');
      }
    });
  }
});
