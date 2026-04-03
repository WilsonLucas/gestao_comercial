document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'cozinha') return;

  const usuario = App.getUsuario();
  if (!usuario) { window.location.replace('login.html'); return; }

  const estabelecimentoEl = document.getElementById('cozinha-estabelecimento');
  if (estabelecimentoEl) estabelecimentoEl.textContent = APP_CONFIG.nome;

  document.getElementById('cozinha-sair')?.addEventListener('click', App.logout);

  // ── Relógio ──────────────────────────────────────────────────────
  function atualizarRelogio() {
    const el = document.getElementById('cozinha-relogio');
    if (!el) return;
    const n = new Date();
    el.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()]
      .map(v => String(v).padStart(2, '0')).join(':');
  }

  // ── Tempo decorrido ──────────────────────────────────────────────
  function tempoDecorrido(criado_em) {
    const diff = Math.floor((Date.now() - new Date(criado_em).getTime()) / 60000);
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }

  function classeTempo(criado_em) {
    const diff = Math.floor((Date.now() - new Date(criado_em).getTime()) / 60000);
    if (diff < 15) return 'normal';
    if (diff < 30) return 'atencao';
    return 'urgente';
  }

  function classeCard(criado_em) {
    const diff = Math.floor((Date.now() - new Date(criado_em).getTime()) / 60000);
    if (diff < 5) return 'novo';
    if (diff >= 30) return 'urgente';
    return '';
  }

  // ── Render card fila (pendente) ──────────────────────────────────
  function renderCardPendente(venda, posicao) {
    const cardClasse = classeCard(venda.criado_em);
    const ehNovo = cardClasse === 'novo';
    const tempo = tempoDecorrido(venda.criado_em);
    const classeT = classeTempo(venda.criado_em);
    const horario = new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const operador = App.escapeHtml(venda.usuarios?.nome || 'Operador');

    const itensHtml = (venda.itens_venda || []).map(item => {
      const obs = item.observacao
        ? `<div class="cozinha-obs">&#x26A0; ${App.escapeHtml(item.observacao)}</div>` : '';
      return `<div class="cozinha-item">
        <div class="cozinha-item-linha">
          <div class="cozinha-qtd">${item.quantidade}</div>
          <span>${App.escapeHtml(item.produtos?.nome || 'Produto')}</span>
        </div>${obs}
      </div>`;
    }).join('');

    return `<div class="cozinha-card ${cardClasse}" data-id="${venda.id}">
      <div class="cozinha-card-header">
        <div class="cozinha-card-top">
          <span class="cozinha-num">#${posicao}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            ${ehNovo ? '<span class="cozinha-badge-novo">NOVO</span>' : ''}
            <span class="cozinha-tempo ${classeT}">${App.escapeHtml(tempo)}</span>
          </div>
        </div>
        <div class="cozinha-card-meta">
          <span>${horario}</span>
          <span>${operador}</span>
        </div>
        <span class="cozinha-status">Aguardando</span>
      </div>
      <div class="cozinha-card-body">${itensHtml || '<span class="cozinha-vazio">Sem itens</span>'}</div>
      <div class="cozinha-card-footer">
        <button class="btn-entregar" data-venda-id="${venda.id}" type="button">Entregar</button>
      </div>
    </div>`;
  }

  // ── Render card entregue ─────────────────────────────────────────
  function renderCardEntregue(venda, numero) {
    const horarioPedido = new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horarioEntrega = venda.entregue_em
      ? new Date(venda.entregue_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const operador = App.escapeHtml(venda.usuarios?.nome || 'Operador');

    const itensHtml = (venda.itens_venda || []).map(item => {
      return `<div class="cozinha-item">
        <div class="cozinha-item-linha">
          <div class="cozinha-qtd">${item.quantidade}</div>
          <span>${App.escapeHtml(item.produtos?.nome || 'Produto')}</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="cozinha-card cozinha-card--entregue" data-id="${venda.id}">
      <div class="cozinha-card-header">
        <div class="cozinha-card-top">
          <span class="cozinha-num" style="font-size:1.5rem">#${numero}</span>
          <span class="cozinha-entregue-hora">Entregue às ${horarioEntrega}</span>
        </div>
        <div class="cozinha-card-meta">
          <span>${horarioPedido}</span>
          <span>${operador}</span>
        </div>
      </div>
      <div class="cozinha-card-body">${itensHtml || '<span class="cozinha-vazio">Sem itens</span>'}</div>
    </div>`;
  }

  // ── Render grids ─────────────────────────────────────────────────
  function renderGrids(pendentes, entregues) {
    const gridFila = document.getElementById('cozinha-grid');
    const gridEntregues = document.getElementById('cozinha-grid-entregues');
    const contador = document.getElementById('cozinha-contador');
    const tabFilaCount = document.getElementById('tab-fila-count');
    const tabEntreguesCount = document.getElementById('tab-entregues-count');

    if (tabFilaCount) tabFilaCount.textContent = pendentes.length;
    if (tabEntreguesCount) tabEntreguesCount.textContent = entregues.length;
    if (contador) {
      contador.textContent = pendentes.length === 1 ? '1 na fila' : `${pendentes.length} na fila`;
    }

    // Grid fila
    if (gridFila) {
      if (pendentes.length > 8) gridFila.classList.add('cozinha-grid--denso');
      else gridFila.classList.remove('cozinha-grid--denso');

      gridFila.innerHTML = pendentes.length
        ? pendentes.map((v, i) => renderCardPendente(v, i + 1)).join('')
        : '<div class="cozinha-vazio">Nenhum pedido aguardando.</div>';
    }

    // Grid entregues
    if (gridEntregues) {
      gridEntregues.innerHTML = entregues.length
        ? entregues.map((v, i) => renderCardEntregue(v, i + 1)).join('')
        : '<div class="cozinha-vazio">Nenhum pedido entregue hoje.</div>';
    }
  }

  // ── Buscar vendas do dia ─────────────────────────────────────────
  async function buscarVendas() {
    const { data, error } = await db
      .from('vendas')
      .select('id, criado_em, status, entregue_em, operador_id, usuarios(nome), itens_venda(quantidade, observacao, produtos(nome))')
      .eq('data', App.today())
      .order('criado_em', { ascending: true });

    if (error) {
      const g = document.getElementById('cozinha-grid');
      if (g) g.innerHTML = '<div class="cozinha-vazio">Erro ao carregar pedidos.</div>';
      return;
    }

    const pendentes = (data || []).filter(v => v.status !== 'entregue');
    const entregues = (data || []).filter(v => v.status === 'entregue').reverse();
    renderGrids(pendentes, entregues);
  }

  // ── Entregar pedido ──────────────────────────────────────────────
  document.getElementById('cozinha-grid')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-entregar');
    if (!btn) return;

    const vendaId = btn.dataset.vendaId;
    const card = btn.closest('.cozinha-card');
    btn.disabled = true;

    const { error } = await db
      .from('vendas')
      .update({ status: 'entregue', entregue_em: new Date().toISOString() })
      .eq('id', vendaId);

    if (error) {
      App.showToast('Erro ao atualizar pedido.', 'error');
      btn.disabled = false;
      return;
    }

    if (card) {
      card.classList.add('cozinha-card--saindo');
      card.addEventListener('animationend', () => buscarVendas(), { once: true });
    } else {
      buscarVendas();
    }
  });

  // ── Tabs ─────────────────────────────────────────────────────────
  document.getElementById('tab-fila')?.addEventListener('click', () => {
    document.getElementById('cozinha-grid').style.display = 'grid';
    document.getElementById('cozinha-grid-entregues').style.display = 'none';
    document.getElementById('tab-fila').classList.add('ativo');
    document.getElementById('tab-entregues').classList.remove('ativo');
  });

  document.getElementById('tab-entregues')?.addEventListener('click', () => {
    document.getElementById('cozinha-grid').style.display = 'none';
    document.getElementById('cozinha-grid-entregues').style.display = 'grid';
    document.getElementById('tab-fila').classList.remove('ativo');
    document.getElementById('tab-entregues').classList.add('ativo');
  });

  // ── Init ─────────────────────────────────────────────────────────
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
  await buscarVendas();
  setInterval(buscarVendas, 30000);
});
