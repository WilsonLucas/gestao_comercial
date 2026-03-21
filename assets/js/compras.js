document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'compras') return;

  const form = document.getElementById('compra-form');
  const totalInput = document.getElementById('total-compra');
  const idInput = document.getElementById('compra-id');
  const quantityInput = document.getElementById('quantidade-compra');
  const priceInput = document.getElementById('valor-compra');

  const updateTotal = () => {
    totalInput.value = App.formatCurrency((Number(quantityInput.value) || 0) * (Number(priceInput.value) || 0));
  };
  [quantityInput, priceInput].forEach((input) => input.addEventListener('input', updateTotal));

  function upsertProduct({ produto, categoria, valorUnitario, quantidade, estoqueMinimo, data, previous }) {
    const products = App.getProducts();
    const existing = products.find((item) => item.nome.toLowerCase() === produto.toLowerCase());
    if (existing) {
      if (previous) {
        existing.estoqueAtual -= Number(previous.quantidade);
      }
      existing.categoria = categoria;
      existing.valorCompra = Number(valorUnitario);
      existing.estoqueMinimo = Number(estoqueMinimo);
      existing.estoqueAtual += Number(quantidade);
      existing.ultimaCompra = data;
    } else {
      products.push({
        id: App.uid('prd'),
        nome: produto,
        categoria,
        estoqueAtual: Number(quantidade),
        estoqueMinimo: Number(estoqueMinimo),
        valorCompra: Number(valorUnitario),
        ultimaCompra: data
      });
    }
    App.saveProducts(products.filter((item) => item.estoqueAtual >= 0));
  }

  function revertPurchaseStock(purchase) {
    const products = App.getProducts();
    const product = products.find((item) => item.nome.toLowerCase() === purchase.produto.toLowerCase());
    if (product) {
      product.estoqueAtual -= Number(purchase.quantidade);
      if (product.estoqueAtual < 0) product.estoqueAtual = 0;
      App.saveProducts(products);
    }
  }

  function renderTable() {
    const tbody = document.getElementById('compras-body');
    const purchases = [...App.getPurchases()].sort((a, b) => b.data.localeCompare(a.data));
    tbody.innerHTML = purchases.length ? purchases.map((item) => `
      <tr>
        <td>${App.formatDate(item.data)}</td>
        <td>${item.produto}</td>
        <td>${item.categoria}</td>
        <td>${item.quantidade}</td>
        <td>${App.formatCurrency(item.valorUnitario)}</td>
        <td>${App.formatCurrency(item.total)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary" data-edit="${item.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${item.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="empty-state">Nenhuma compra cadastrada.</td></tr>';
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
    document.getElementById('data-compra').value = App.today();
    updateTotal();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const purchases = App.getPurchases();
    const payload = {
      id: idInput.value || App.uid('cmp'),
      produto: document.getElementById('produto-nome').value.trim(),
      categoria: document.getElementById('produto-categoria').value.trim(),
      valorUnitario: Number(document.getElementById('valor-compra').value),
      quantidade: Number(document.getElementById('quantidade-compra').value),
      estoqueMinimo: Number(document.getElementById('estoque-minimo').value),
      data: document.getElementById('data-compra').value,
      total: Number(document.getElementById('valor-compra').value) * Number(document.getElementById('quantidade-compra').value)
    };

    const index = purchases.findIndex((item) => item.id === payload.id);
    const previous = index >= 0 ? purchases[index] : null;
    if (previous) revertPurchaseStock(previous);
    upsertProduct({ ...payload, previous });
    if (index >= 0) purchases[index] = payload; else purchases.push(payload);
    App.savePurchases(purchases);
    renderTable();
    resetForm();
    App.showToast(index >= 0 ? 'Compra atualizada com sucesso.' : 'Compra cadastrada com sucesso.');
  });

  document.getElementById('compras-body').addEventListener('click', (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;
    const purchases = App.getPurchases();

    if (editId) {
      const item = purchases.find((purchase) => purchase.id === editId);
      if (!item) return;
      idInput.value = item.id;
      document.getElementById('produto-nome').value = item.produto;
      document.getElementById('produto-categoria').value = item.categoria;
      document.getElementById('valor-compra').value = item.valorUnitario;
      document.getElementById('quantidade-compra').value = item.quantidade;
      document.getElementById('estoque-minimo').value = item.estoqueMinimo;
      document.getElementById('data-compra').value = item.data;
      updateTotal();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteId) {
      const item = purchases.find((purchase) => purchase.id === deleteId);
      const filtered = purchases.filter((purchase) => purchase.id !== deleteId);
      if (item) revertPurchaseStock(item);
      App.savePurchases(filtered);
      renderTable();
      App.showToast('Compra excluída com sucesso.', 'warning');
    }
  });

  document.getElementById('cancelar-edicao-compra').addEventListener('click', resetForm);
  resetForm();
  renderTable();
});
