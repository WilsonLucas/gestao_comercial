document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'cozinha') return;

  const usuario = App.getUsuario();
  if (!usuario) {
    window.location.replace('login.html');
    return;
  }

  const estabelecimentoEl = document.getElementById('cozinha-estabelecimento');
  if (estabelecimentoEl) {
    estabelecimentoEl.textContent = App.escapeHtml(APP_CONFIG.nome);
  }

  document.getElementById('cozinha-sair')?.addEventListener('click', App.logout);

  function atualizarRelogio() {
    const el = document.getElementById('cozinha-relogio');
    if (!el) return;
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, '0');
    const mm = String(agora.getMinutes()).padStart(2, '0');
    const ss = String(agora.getSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss}`;
  }

  function tempoDecorrido(criado_em) {
    const agora = Date.now();
    const criado = new Date(criado_em).getTime();
    const diffMs = agora - criado;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) {
      return `${diffMin}min`;
    }
    const horas = Math.floor(diffMin / 60);
    const minutos = diffMin % 60;
    return `${horas}h ${minutos}min`;
  }

  function classeTempo(criado_em) {
    const agora = Date.now();
    const criado = new Date(criado_em).getTime();
    const diffMin = Math.floor((agora - criado) / 60000);
    if (diffMin < 5) return 'normal';
    if (diffMin < 15) return 'normal';
    if (diffMin < 30) return 'atencao';
    return 'urgente';
  }

  function classeCard(criado_em) {
    const agora = Date.now();
    const criado = new Date(criado_em).getTime();
    const diffMin = Math.floor((agora - criado) / 60000);
    if (diffMin < 5) return 'novo';
    if (diffMin >= 30) return 'urgente';
    return '';
  }

  function ehNovo(criado_em) {
    const agora = Date.now();
    const criado = new Date(criado_em).getTime();
    return Math.floor((agora - criado) / 60000) < 5;
  }

  function renderCard(venda, numero) {
    const cardClasse = classeCard(venda.criado_em);
    const tempoStr = tempoDecorrido(venda.criado_em);
    const classeT = classeTempo(venda.criado_em);
    const novo = ehNovo(venda.criado_em);

    const horario = new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeOperador = App.escapeHtml(venda.usuarios?.nome || 'Operador');

    const itensHtml = (venda.itens_venda || []).map((item) => {
      const nomeItem = App.escapeHtml(item.produtos?.nome || 'Produto');
      const obsHtml = item.observacao
        ? `<div class="cozinha-obs">&#x26A0; ${App.escapeHtml(item.observacao)}</div>`
        : '';
      return `
        <div class="cozinha-item">
          <div class="cozinha-item-linha">
            <div class="cozinha-qtd">${item.quantidade}</div>
            <span>${nomeItem}</span>
          </div>
          ${obsHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="cozinha-card ${cardClasse}">
        <div class="cozinha-card-header">
          <div class="cozinha-card-top">
            <span class="cozinha-num">#${numero}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              ${novo ? '<span class="cozinha-badge-novo">NOVO</span>' : ''}
              <span class="cozinha-tempo ${classeT}">${App.escapeHtml(tempoStr)}</span>
            </div>
          </div>
          <div class="cozinha-card-meta">
            <span>${horario}</span>
            <span>${nomeOperador}</span>
          </div>
        </div>
        <div class="cozinha-card-body">
          ${itensHtml || '<span class="cozinha-vazio">Sem itens</span>'}
        </div>
      </div>
    `;
  }

  function renderGrid(vendas) {
    const grid = document.getElementById('cozinha-grid');
    const contador = document.getElementById('cozinha-contador');
    if (!grid) return;

    if (!vendas || vendas.length === 0) {
      grid.innerHTML = '<div class="cozinha-vazio">Nenhum pedido registrado hoje.</div>';
      if (contador) contador.textContent = '0 pedidos';
      return;
    }

    if (contador) {
      const label = vendas.length === 1 ? '1 pedido' : `${vendas.length} pedidos`;
      contador.textContent = label;
    }

    grid.innerHTML = vendas.map((venda, i) => renderCard(venda, i + 1)).join('');
  }

  async function buscarVendas() {
    const hoje = App.today();
    const { data: vendas, error } = await db
      .from('vendas')
      .select('id, criado_em, operador_id, usuarios(nome), itens_venda(quantidade, observacao, produtos(nome))')
      .eq('data', hoje)
      .order('criado_em', { ascending: true });

    if (error) {
      const grid = document.getElementById('cozinha-grid');
      if (grid) grid.innerHTML = '<div class="cozinha-vazio">Erro ao carregar pedidos.</div>';
      return;
    }

    renderGrid(vendas);
  }

  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);

  await buscarVendas();
  setInterval(buscarVendas, 30000);
});
