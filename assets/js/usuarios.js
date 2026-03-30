document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'usuarios') return;

  const EMAILS_PROTEGIDOS = ['admin@admin.com', 'financeiro@admin.com', 'estoque@admin.com', 'operador@admin.com'];
  const form = document.getElementById('usuario-form');
  const idInput = document.getElementById('usuario-id');

  async function renderTable() {
    const tbody = document.getElementById('usuarios-body');
    const { data: lista, error } = await db.from('usuarios').select('id, nome, email, perfil, ativo').order('nome');
    if (error) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Erro ao carregar usuarios.</td></tr>';
      return;
    }
    const usuario = App.getUsuario();
    tbody.innerHTML = (lista || []).map((u) => `
      <tr>
        <td>${u.nome}</td>
        <td>${u.email}</td>
        <td><span class="badge normal">${u.perfil}</span></td>
        <td><span class="badge ${u.ativo ? 'normal' : 'danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary" data-edit="${u.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${u.id}"
              ${u.id === usuario?.id || EMAILS_PROTEGIDOS.includes(u.email) ? 'disabled' : ''}>
              Desativar
            </button>
          </div>
        </td>
      </tr>
    `).join('');
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
    const nome   = document.getElementById('usuario-nome').value.trim();
    const email  = document.getElementById('usuario-email').value.trim().toLowerCase();
    const senha  = document.getElementById('usuario-senha').value.trim();
    const perfil = document.getElementById('usuario-perfil').value;

    try {
      if (id) {
        const { error } = await db.from('usuarios').update({ nome, email, perfil }).eq('id', id);
        if (error) throw error;
        if (senha) {
          const { data: result } = await db.rpc('alterar_senha', { p_usuario_id: id, p_nova_senha: senha });
          if (result?.erro) throw new Error(result.erro);
        }
        App.showToast('Usuario atualizado com sucesso.');
      } else {
        if (!senha) { App.showToast('Senha e obrigatoria para novo usuario.', 'error'); return; }
        const { data: result } = await db.rpc('criar_usuario', { p_nome: nome, p_email: email, p_senha: senha, p_perfil: perfil });
        if (result?.erro) throw new Error(result.erro);
        App.showToast('Usuario cadastrado com sucesso.');
      }
      resetForm();
      renderTable();
    } catch (err) {
      App.showToast(err?.message || 'Erro ao salvar usuario.', 'error');
    }
  });

  document.getElementById('usuarios-body')?.addEventListener('click', async (event) => {
    const editId   = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const { data: u } = await db.from('usuarios').select('id, nome, email, perfil').eq('id', editId).single();
      if (!u) return;
      idInput.value = u.id;
      document.getElementById('usuario-nome').value  = u.nome;
      document.getElementById('usuario-email').value = u.email;
      document.getElementById('usuario-senha').value = '';
      document.getElementById('usuario-perfil').value = u.perfil;
      const senhaLabel = document.querySelector('label[for="usuario-senha"] span');
      if (senhaLabel) senhaLabel.textContent = 'Nova senha (deixe em branco para manter)';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteId) {
      const { error } = await db.from('usuarios').update({ ativo: false }).eq('id', deleteId);
      if (error) { App.showToast('Erro ao desativar usuario.', 'error'); return; }
      App.showToast('Usuario desativado com sucesso.', 'warning');
      renderTable();
    }
  });

  document.getElementById('cancelar-edicao-usuario')?.addEventListener('click', resetForm);
  renderTable();
});
