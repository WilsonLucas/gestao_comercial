document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page !== 'login' && !App.isLoggedIn()) {
    window.location.replace('login.html');
    return;
  }

  if (page === 'login' && App.isLoggedIn()) {
    window.location.replace('dashboard.html');
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
        localStorage.setItem('sgc_user', JSON.stringify(data));
        App.showToast('Login realizado com sucesso!');
        setTimeout(() => window.location.replace('dashboard.html'), 600);
      } catch (err) {
        App.showToast(err?.message || 'E-mail ou senha invalidos.', 'error');
      }
    });
  }
});
