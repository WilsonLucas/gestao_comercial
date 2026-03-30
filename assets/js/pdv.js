document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'pdv') return;

  let carrinho = [];
  let produtosCache = [];

  async function carregarProdutos() {
    try {
      produtosCache = await API.get('/produtos');
      const select = document.getElementById('pdv-produto');
      if (select) {
        select.innerHTML = '<option value="">Selecione um produto</option>' +
          produtosCache.map((p) => `<option value="${p.id}">${p.nome} - ${App.formatCurrency(p.preco_venda)}</option>`).join('');
      }
    } catch (err) {
      App.showToast('Erro ao carregar produtos.', 'error');
    }
  }

  function renderCarrinho() {
    const tbody = document.getElementById('carrinho-body');
    const totalEl = document.getElementById('carrinho-total');
    if (!tbody) return;

    if (carrinho.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Carrinho vazio.</td></tr>';
      if (totalEl) totalEl.textContent = App.formatCurrency(0);
      return;
    }

    tbody.innerHTML = carrinho.map((item, idx) => `
      <tr>
        <td>${item.nome}</td>
        <td>${item.quantidade}</td>
        <td>${App.formatCurrency(item.preco_venda)}</td>
        <td>
          <button class="btn btn-danger btn-sm" data-remove="${idx}">Remover</button>
        </td>
      </tr>
    `).join('');

    const total = carrinho.reduce((sum, item) => sum + (item.preco_venda * item.quantidade), 0);
    if (totalEl) totalEl.textContent = App.formatCurrency(total);
  }

  document.getElementById('pdv-adicionar')?.addEventListener('click', () => {
    const select = document.getElementById('pdv-produto');
    const qtdInput = document.getElementById('pdv-quantidade');
    const produtoId = select?.value;
    const quantidade = Number(qtdInput?.value) || 1;

    if (!produtoId) {
      App.showToast('Selecione um produto.', 'error');
      return;
    }

    const produto = produtosCache.find((p) => p.id === produtoId);
    if (!produto) return;

    const existente = carrinho.find((item) => item.produto_id === produtoId);
    if (existente) {
      existente.quantidade += quantidade;
    } else {
      carrinho.push({ produto_id: produto.id, nome: produto.nome, preco_venda: Number(produto.preco_venda), quantidade });
    }

    if (select) select.value = '';
    if (qtdInput) qtdInput.value = 1;
    renderCarrinho();
  });

  document.getElementById('carrinho-body')?.addEventListener('click', (event) => {
    const removeIdx = event.target.dataset.remove;
    if (removeIdx != null) {
      carrinho.splice(Number(removeIdx), 1);
      renderCarrinho();
    }
  });

  document.getElementById('pdv-limpar')?.addEventListener('click', () => {
    carrinho = [];
    renderCarrinho();
  });

  document.getElementById('pdv-finalizar')?.addEventListener('click', async () => {
    if (carrinho.length === 0) {
      App.showToast('Adicione itens ao carrinho antes de finalizar.', 'error');
      return;
    }

    const itens = carrinho.map((item) => ({ produto_id: item.produto_id, quantidade: item.quantidade }));

    try {
      await API.post('/vendas', { itens });
      App.showToast('Venda finalizada com sucesso!');
      carrinho = [];
      renderCarrinho();
    } catch (err) {
      App.showToast(err?.erro || 'Erro ao finalizar venda.', 'error');
    }
  });

  await carregarProdutos();
  renderCarrinho();
});
