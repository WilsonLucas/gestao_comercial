document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'vendas') return;

  const form = document.getElementById('venda-form');
  const productSelect = document.getElementById('venda-produto');
  const quantityInput = document.getElementById('venda-quantidade');
  const priceInput = document.getElementById('venda-valor');
  const stockInput = document.getElementById('venda-estoque');
  const totalInput = document.getElementById('venda-total');
  const lucroInput = document.getElementById('venda-lucro');
  const idInput = document.getElementById('venda-id');

  function restoreSaleStock(sale) {
    const products = App.getProducts();
    const product = products.find((item) => item.id === sale.produtoId);
    if (product) {
      product.estoqueAtual += Number(sale.quantidade);
      App.saveProducts(products);
    }
  }

  function populateProducts() {
    const products = App.getProducts();
    productSelect.innerHTML = '<option value="">Selecione um produto</option>' + products.map((product) => `
      <option value="${product.id}">${product.nome} (${product.estoqueAtual} disponíveis)</option>
    `).join('');
  }

  function updatePreview() {
    const product = App.getProducts().find((item) => item.id === productSelect.value);
    const quantity = Number(quantityInput.value) || 0;
    const price = Number(priceInput.value) || 0;
    const previous = App.getSales().find((item) => item.id === idInput.value);
    const available = product
      ? product.estoqueAtual + (previous && previous.produtoId === product.id ? Number(previous.quantidade) : 0)
      : 0;

    stockInput.value = product ? `${available} unidades` : '-';
    totalInput.value = App.formatCurrency(quantity * price);
    lucroInput.value = product ? App.formatCurrency((price - Number(product.valorCompra)) * quantity) : App.formatCurrency(0);
  }

  function renderTable() {
    const tbody = document.getElementById('vendas-body');
    const sales = [...App.getSales()].sort((a, b) => b.data.localeCompare(a.data));
    tbody.innerHTML = sales.length ? sales.map((item) => `
      <tr>
        <td>${App.formatDate(item.data)}</td>
        <td>${item.produto}</td>
        <td>${item.quantidade}</td>
        <td>${App.formatCurrency(item.valorUnitario)}</td>
        <td>${App.formatCurrency(item.total)}</td>
        <td class="${item.lucro >= 0 ? 'metric-positive' : 'metric-negative'}">${App.formatCurrency(item.lucro)}</td>
        <td>
          <div class="actions">
            <button class="btn btn-secondary" data-edit="${item.id}">Editar</button>
            <button class="btn btn-danger" data-delete="${item.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="empty-state">Nenhuma venda cadastrada.</td></tr>';
  }

  function resetForm() {
    form.reset();
    idInput.value = '';
    document.getElementById('venda-data').value = App.today();
    populateProducts();
    updatePreview();
  }

  [productSelect, quantityInput, priceInput].forEach((field) => field.addEventListener('input', updatePreview));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const products = App.getProducts();
    const sales = App.getSales();
    const selected = products.find((item) => item.id === productSelect.value);
    const quantity = Number(quantityInput.value);
    const value = Number(priceInput.value);
    if (!selected) {
      App.showToast('Selecione um produto válido.', 'error');
      return;
    }

    const existingIndex = sales.findIndex((item) => item.id === idInput.value);
    const previous = existingIndex >= 0 ? sales[existingIndex] : null;
    const available = selected.estoqueAtual + (previous && previous.produtoId === selected.id ? Number(previous.quantidade) : 0);

    if (quantity > available) {
      App.showToast('Quantidade vendida maior que o estoque disponível.', 'error');
      updatePreview();
      return;
    }

    if (previous && previous.produtoId !== selected.id) {
      const oldProduct = products.find((item) => item.id === previous.produtoId);
      if (oldProduct) oldProduct.estoqueAtual += Number(previous.quantidade);
    }

    selected.estoqueAtual = available - quantity;
    App.saveProducts(products);

    const payload = {
      id: idInput.value || App.uid('vnd'),
      produtoId: selected.id,
      produto: selected.nome,
      quantidade: quantity,
      valorUnitario: value,
      valorCompra: Number(selected.valorCompra),
      data: document.getElementById('venda-data').value,
      total: quantity * value,
      lucro: (value - Number(selected.valorCompra)) * quantity
    };

    if (existingIndex >= 0) sales[existingIndex] = payload; else sales.push(payload);
    App.saveSales(sales);
    renderTable();
    resetForm();
    App.showToast(existingIndex >= 0 ? 'Venda atualizada com sucesso.' : 'Venda registrada com sucesso.');
  });

  document.getElementById('vendas-body').addEventListener('click', (event) => {
    const sales = App.getSales();
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const item = sales.find((sale) => sale.id === editId);
      if (!item) return;
      populateProducts();
      idInput.value = item.id;
      productSelect.value = item.produtoId;
      quantityInput.value = item.quantidade;
      priceInput.value = item.valorUnitario;
      document.getElementById('venda-data').value = item.data;
      updatePreview();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteId) {
      const item = sales.find((sale) => sale.id === deleteId);
      if (item) restoreSaleStock(item);
      App.saveSales(sales.filter((sale) => sale.id !== deleteId));
      renderTable();
      populateProducts();
      updatePreview();
      App.showToast('Venda excluída com sucesso.', 'warning');
    }
  });

  document.getElementById('cancelar-edicao-venda').addEventListener('click', resetForm);

  resetForm();
  renderTable();
});
