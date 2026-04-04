document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'historico-dia') return;

  async function renderHistorico() {
    const tbody = document.getElementById('historico-body');
    const totalEl = document.getElementById('historico-total');
    const lucroEl = document.getElementById('historico-lucro');

    const hoje = App.today();
    const { data: vendas, error } = await db
      .from('vendas')
      .select('id, total, lucro, criado_em, itens_venda(quantidade, produtos(nome))')
      .gte('data', hoje)
      .lte('data', hoje)
      .order('criado_em', { ascending: false });

    if (error) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Erro ao carregar historico.</td></tr>';
      App.showToast('Erro ao carregar historico.', 'error');
      return;
    }

    let totalDia = 0;
    let lucroDia = 0;

    tbody.innerHTML = (vendas || []).length ? (vendas || []).map((venda) => {
      totalDia += Number(venda.total);
      lucroDia += Number(venda.lucro);
      const itensStr = (venda.itens_venda || []).map((i) => `${App.escapeHtml(i.produtos?.nome || '?')} x${i.quantidade}`).join(', ');
      return `
        <tr>
          <td>${new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${itensStr || '-'}</td>
          <td>${App.formatCurrency(venda.total)}</td>
          <td class="metric-positive">${App.formatCurrency(venda.lucro)}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="4" class="empty-state">Nenhuma venda registrada hoje.</td></tr>';

    if (totalEl) totalEl.textContent = App.formatCurrency(totalDia);
    if (lucroEl) lucroEl.textContent = App.formatCurrency(lucroDia);
  }

  renderHistorico();
});
