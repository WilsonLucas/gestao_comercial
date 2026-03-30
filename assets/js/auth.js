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
        const resposta = await API.post('/auth/login', { email, senha });
        localStorage.setItem('sgc_token', resposta.token);
        localStorage.setItem('sgc_usuario', JSON.stringify(resposta.usuario));
        App.showToast('Login realizado com sucesso!');
        setTimeout(() => window.location.replace('dashboard.html'), 600);
      } catch (err) {
        App.showToast(err?.erro || 'E-mail ou senha invalidos.', 'error');
      }
    });
  }
});
