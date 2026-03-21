document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  const session = sessionStorage.getItem(App.StorageKeys.session);

  if (page !== 'login' && !session) {
    window.location.replace('login.html');
    return;
  }

  if (page === 'login' && session) {
    window.location.replace('dashboard.html');
    return;
  }

  if (page === 'login') {
    const form = document.getElementById('login-form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const senha = document.getElementById('login-password').value.trim();
      const user = App.getUsers().find((item) => item.email.toLowerCase() === email && item.senha === senha);

      if (!user) {
        App.showToast('E-mail ou senha inválidos.', 'error');
        return;
      }

      sessionStorage.setItem(App.StorageKeys.session, JSON.stringify(user));
      App.showToast('Login realizado com sucesso!');
      setTimeout(() => window.location.replace('dashboard.html'), 600);
    });
  }
});
