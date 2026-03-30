document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'usuarios') return;

  const form = document.getElementById('usuario-form');
  const idInput = document.getElementById('usuario-id');

  async function renderTable() {
    const tbody = document.getElementById('usuarios-body');
    try {
      const lista = await API.get('/usuarios');
      const usuario = App.getUsuario();
      tbody.innerHTML = lista.map((u) => `
        <tr>
          <td>${u.nome}</td>
          <td>${u.email}</td>
          <td><span class="badge normal">${u.perfil}</span></td>
          <td><span class="badge ${u.ativo ? 'normal' : 'danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-secondary" data-edit="${u.id}">Editar</button>
              <button class="btn btn-danger" data-delete="${u.id}" ${u.id === usuario?.id ? 'disabled' : ''}>Desativar</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao carregar usuarios.</td></tr>';
      App.showToast(err?.erro || 'Erro ao carregar usuarios.', 'error');
    }
  }

  function resetForm() {
    form?.reset();
    idInput.value = '';
    const senhaLabel = document.querySelector('label[for="usuario-senha"] span');
    if (senhaLabel) senhaLabel.textContent = 'Senha';
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = idInput.value;
    const senhaVal = document.getElementById('usuario-senha').value.trim();
    const payload = {
      nome: document.getElementById('usuario-nome').value.trim(),
      email: document.getElementById('usuario-email').value.trim().toLowerCase(),
      perfil: document.getElementById('usuario-perfil').value
    };
    if (senhaVal) payload.senha = senhaVal;

    try {
      if (id) {
        await API.put(`/usuarios/${id}`, payload);
        App.showToast('Usuario atualizado com sucesso.');
      } else {
        if (!senhaVal) {
          App.showToast('Senha e obrigatoria para novo usuario.', 'error');
          return;
        }
        payload.senha = senhaVal;
        await API.post('/usuarios', payload);
        App.showToast('Usuario cadastrado com sucesso.');
      }
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.erro || 'Erro ao salvar usuario.', 'error');
    }
  });

  document.getElementById('usuarios-body')?.addEventListener('click', async (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      try {
        const lista = await API.get('/usuarios');
        const u = lista.find((item) => item.id === editId);
        if (!u) return;
        idInput.value = u.id;
        document.getElementById('usuario-nome').value = u.nome;
        document.getElementById('usuario-email').value = u.email;
        document.getElementById('usuario-senha').value = '';
        document.getElementById('usuario-perfil').value = u.perfil;
        const senhaLabel = document.querySelector('label[for="usuario-senha"] span');
        if (senhaLabel) senhaLabel.textContent = 'Nova senha (deixe em branco para manter)';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        App.showToast('Erro ao carregar usuario.', 'error');
      }
    }

    if (deleteId) {
      try {
        await API.delete(`/usuarios/${deleteId}`);
        App.showToast('Usuario desativado com sucesso.', 'warning');
        renderTable();
      } catch (err) {
        App.showToast(err?.erro || 'Erro ao desativar usuario.', 'error');
      }
    }
  });

  document.getElementById('cancelar-edicao-usuario')?.addEventListener('click', resetForm);
  renderTable();
});
