document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'estoque') return;

  const searchInput = document.getElementById('estoque-busca');
  const categorySelect = document.getElementById('estoque-categoria');

  function fillCategories() {
    const categories = [...new Set(App.getProducts().map((product) => product.categoria))].sort();
    categorySelect.innerHTML = '<option value="">Todas</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join('');
  }

  function renderTable() {
    const search = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const tbody = document.getElementById('estoque-body');
    const filtered = App.getProducts().filter((product) => {
      const matchesSearch = product.nome.toLowerCase().includes(search);
      const matchesCategory = !category || product.categoria === category;
      return matchesSearch && matchesCategory;
    });

    tbody.innerHTML = filtered.length ? filtered.map((product) => {
      const status = App.getProductStatus(product);
      return `
        <tr class="${status.className === 'danger' ? 'table-row-critical' : ''}">
          <td>${product.nome}</td>
          <td>${product.categoria}</td>
          <td>${product.estoqueAtual}</td>
          <td>${product.estoqueMinimo}</td>
          <td><span class="badge ${status.className}">${status.label}</span></td>
          <td>${product.ultimaCompra ? App.formatDate(product.ultimaCompra) : '-'}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="6" class="empty-state">Nenhum produto encontrado para os filtros informados.</td></tr>';
  }

  [searchInput, categorySelect].forEach((field) => field.addEventListener('input', renderTable));
  fillCategories();
  renderTable();
});
