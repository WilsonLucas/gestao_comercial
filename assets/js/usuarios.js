document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'usuarios') return;

  const form = document.getElementById('usuario-form');
  const idInput = document.getElementById('usuario-id');

  function renderTable() {
    const tbody = document.getElementById('usuarios-body');
    const session = JSON.parse(sessionStorage.getItem(App.StorageKeys.session) || 'null');
    tbody.innerHTML = App.getUsers().map((user) => `
      <tr>
        <td>${user.nome}</td>
        <td>${user.email}</td>
        <td><span class="badge normal">${user.perfil}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary" data-edit="${user.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${user.id}" ${session?.id === user.id ? 'disabled' : ''}>Excluir</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const users = App.getUsers();
    const payload = {
      id: idInput.value || App.uid('user'),
      nome: document.getElementById('usuario-nome').value.trim(),
      email: document.getElementById('usuario-email').value.trim().toLowerCase(),
      senha: document.getElementById('usuario-senha').value.trim(),
      perfil: document.getElementById('usuario-perfil').value
    };

    const duplicate = users.find((user) => user.email === payload.email && user.id !== payload.id);
    if (duplicate) {
      App.showToast('Já existe um usuário com este e-mail.', 'error');
      return;
    }

    const index = users.findIndex((user) => user.id === payload.id);
    if (index >= 0) users[index] = payload; else users.push(payload);
    App.saveUsers(users);
    renderTable();
    resetForm();
    App.showToast(index >= 0 ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.');
  });

  document.getElementById('usuarios-body').addEventListener('click', (event) => {
    const users = App.getUsers();
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const user = users.find((item) => item.id === editId);
      if (!user) return;
      idInput.value = user.id;
      document.getElementById('usuario-nome').value = user.nome;
      document.getElementById('usuario-email').value = user.email;
      document.getElementById('usuario-senha').value = user.senha;
      document.getElementById('usuario-perfil').value = user.perfil;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteId) {
      App.saveUsers(users.filter((user) => user.id !== deleteId));
      renderTable();
      App.showToast('Usuário excluído com sucesso.', 'warning');
    }
  });

  document.getElementById('cancelar-edicao-usuario').addEventListener('click', resetForm);
  renderTable();
});
