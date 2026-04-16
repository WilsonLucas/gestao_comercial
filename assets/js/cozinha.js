// ============================================================
// cozinha.js — FSM de Cozinha (v1.2)
// Estados: pendente → em_preparo → pronto → entregue
//
// Cada transição é disparada via RPC SECURITY DEFINER
// (marcar_em_preparo, marcar_pronto, marcar_entregue).
//
// RLS bloqueia UPDATE direto na tabela vendas — NUNCA usar
// db.from('vendas').update(). Ver REPASSE_TECNICO §12 e
// commit e5a67d9 ("Bug resolvido").
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'cozinha') return;

  const usuario = App.getUsuario();
  if (!usuario) { window.location.replace('login.html'); return; }

  const estabelecimentoEl = document.getElementById('cozinha-estabelecimento');
  if (estabelecimentoEl) estabelecimentoEl.textContent = APP_CONFIG.nome;

  document.getElementById('cozinha-sair')?.addEventListener('click', App.logout);

  // Limiares de alerta visual (minutos)
  const ALERTA_PENDENTE_MIN    = 15;
  const ALERTA_EM_PREPARO_MIN  = 30;

  // ── Relógio ──────────────────────────────────────────────────────
  function atualizarRelogio() {
    const el = document.getElementById('cozinha-relogio');
    if (!el) return;
    const n = new Date();
    el.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()]
      .map(v => String(v).padStart(2, '0')).join(':');
  }

  // ── Tempo decorrido ──────────────────────────────────────────────
  function minutosDesde(ts) {
    if (!ts) return 0;
    return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  }

  function tempoDecorridoTexto(ts) {
    const diff = minutosDesde(ts);
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  }

  function classeTempo(diffMin) {
    if (diffMin < 15) return 'normal';
    if (diffMin < 30) return 'atencao';
    return 'urgente';
  }

  // ── Renderização de card ─────────────────────────────────────────
  // Cada card exibe: #numero_pedido em destaque + cliente_nome + itens + botão contextual.
  // A classe .alerta-tempo é adicionada quando o pedido ultrapassa o SLA do seu status.
  function renderCard(venda) {
    const numero   = venda.numero_pedido != null
      ? `#${String(venda.numero_pedido).padStart(3, '0')}`
      : '#—';
    const cliente  = App.escapeHtml(venda.cliente_nome || 'Cliente');
    const operador = App.escapeHtml(venda.usuarios?.nome || 'Operador');

    // Referência temporal por status (para alerta):
    // - pendente:    desde criado_em
    // - em_preparo:  desde iniciado_em
    // - pronto:      desde pronto_em
    let refTs = venda.criado_em;
    let limite = Infinity;
    if (venda.status === 'pendente')      { refTs = venda.criado_em;   limite = ALERTA_PENDENTE_MIN; }
    else if (venda.status === 'em_preparo') { refTs = venda.iniciado_em || venda.criado_em; limite = ALERTA_EM_PREPARO_MIN; }
    else if (venda.status === 'pronto')     { refTs = venda.pronto_em || venda.iniciado_em || venda.criado_em; }

    const diffMin   = minutosDesde(refTs);
    const tempoTxt  = tempoDecorridoTexto(refTs);
    const classeT   = classeTempo(diffMin);
    const alerta    = diffMin > limite ? 'alerta-tempo' : '';
    const horario   = new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const itensHtml = (venda.itens_venda || []).map((item) => {
      const obs = item.observacao
        ? `<div class="cozinha-obs">&#x26A0; ${App.escapeHtml(item.observacao)}</div>` : '';
      return `<div class="cozinha-item">
        <div class="cozinha-item-linha">
          <div class="cozinha-qtd">${item.quantidade}</div>
          <span>${App.escapeHtml(item.produtos?.nome || 'Produto')}</span>
        </div>${obs}
      </div>`;
    }).join('');

    // Botão por status
    let botaoHtml = '';
    if (venda.status === 'pendente') {
      botaoHtml = `<button class="btn-fsm btn-fsm--iniciar" data-acao="iniciar" data-venda-id="${venda.id}" type="button">&#9654; Iniciar Preparo</button>`;
    } else if (venda.status === 'em_preparo') {
      botaoHtml = `<button class="btn-fsm btn-fsm--pronto" data-acao="pronto" data-venda-id="${venda.id}" type="button">&#10003; Pronto</button>`;
    } else if (venda.status === 'pronto') {
      botaoHtml = `<button class="btn-fsm btn-fsm--entregar" data-acao="entregar" data-venda-id="${venda.id}" type="button">&#128230; Entregar</button>`;
    }

    return `<div class="cozinha-card cozinha-card--${venda.status} ${alerta}" data-id="${venda.id}">
      <div class="cozinha-card-header">
        <div class="cozinha-card-top">
          <span class="cozinha-num">${numero}</span>
          <span class="cozinha-tempo ${classeT}">${App.escapeHtml(tempoTxt)}</span>
        </div>
        <div class="cozinha-card-cliente">${cliente}</div>
        <div class="cozinha-card-meta">
          <span>${horario}</span>
          <span>${operador}</span>
        </div>
      </div>
      <div class="cozinha-card-body">${itensHtml || '<span class="cozinha-vazio">Sem itens</span>'}</div>
      <div class="cozinha-card-footer">${botaoHtml}</div>
    </div>`;
  }

  function renderCardEntregue(venda) {
    const numero = venda.numero_pedido != null
      ? `#${String(venda.numero_pedido).padStart(3, '0')}`
      : '#—';
    const cliente = App.escapeHtml(venda.cliente_nome || 'Cliente');
    const horarioPedido  = new Date(venda.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horarioEntrega = venda.entregue_em
      ? new Date(venda.entregue_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const operador = App.escapeHtml(venda.usuarios?.nome || 'Operador');

    const itensHtml = (venda.itens_venda || []).map((item) => {
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
          <span class="cozinha-num">${numero}</span>
          <span class="cozinha-entregue-hora">Entregue às ${horarioEntrega}</span>
        </div>
        <div class="cozinha-card-cliente">${cliente}</div>
        <div class="cozinha-card-meta">
          <span>${horarioPedido}</span>
          <span>${operador}</span>
        </div>
      </div>
      <div class="cozinha-card-body">${itensHtml || '<span class="cozinha-vazio">Sem itens</span>'}</div>
    </div>`;
  }

  // ── Render das colunas FSM ──────────────────────────────────────
  function renderFsm(porStatus, entregues) {
    const pend   = porStatus.pendente   || [];
    const prep   = porStatus.em_preparo || [];
    const ready  = porStatus.pronto     || [];

    const colP = document.getElementById('col-pendente');
    const colE = document.getElementById('col-em-preparo');
    const colR = document.getElementById('col-pronto');

    if (colP) colP.innerHTML = pend.length
      ? pend.map(renderCard).join('')
      : '<div class="cozinha-vazio-col">Nenhum pedido aguardando.</div>';
    if (colE) colE.innerHTML = prep.length
      ? prep.map(renderCard).join('')
      : '<div class="cozinha-vazio-col">Nenhum pedido em preparo.</div>';
    if (colR) colR.innerHTML = ready.length
      ? ready.map(renderCard).join('')
      : '<div class="cozinha-vazio-col">Nenhum pedido pronto.</div>';

    document.getElementById('count-pendente').textContent   = pend.length;
    document.getElementById('count-em-preparo').textContent = prep.length;
    document.getElementById('count-pronto').textContent     = ready.length;

    const totalFila = pend.length + prep.length + ready.length;
    const tabFilaCount = document.getElementById('tab-fila-count');
    const tabEntreguesCount = document.getElementById('tab-entregues-count');
    const contador = document.getElementById('cozinha-contador');
    if (tabFilaCount) tabFilaCount.textContent = totalFila;
    if (tabEntreguesCount) tabEntreguesCount.textContent = entregues.length;
    if (contador) contador.textContent = totalFila === 1 ? '1 na fila' : `${totalFila} na fila`;

    const gridEntregues = document.getElementById('cozinha-grid-entregues');
    if (gridEntregues) {
      gridEntregues.innerHTML = entregues.length
        ? entregues.map(renderCardEntregue).join('')
        : '<div class="cozinha-vazio">Nenhum pedido entregue hoje.</div>';
    }
  }

  // ── Buscar vendas do dia ─────────────────────────────────────────
  async function buscarVendas() {
    const { data, error } = await db
      .from('vendas')
      .select('id, criado_em, iniciado_em, pronto_em, entregue_em, status, numero_pedido, cliente_nome, operador_id, usuarios(nome), itens_venda(quantidade, observacao, produtos(nome))')
      .eq('data', App.today())
      .order('numero_pedido', { ascending: true });

    if (error) {
      const fsm = document.getElementById('cozinha-fsm');
      if (fsm) {
        const msg = error.message && error.message.includes('does not exist')
          ? 'Execute a migration <strong>009_painel_cliente.sql</strong> no Supabase SQL Editor para ativar o painel FSM.'
          : `Erro ao carregar pedidos: ${App.escapeHtml(error.message || '')}`;
        fsm.innerHTML = `<div class="cozinha-vazio" style="max-width:520px;line-height:1.6;margin:auto">${msg}</div>`;
      }
      return;
    }

    const porStatus = { pendente: [], em_preparo: [], pronto: [] };
    const entregues = [];
    (data || []).forEach((v) => {
      if (v.status === 'entregue') entregues.push(v);
      else if (porStatus[v.status]) porStatus[v.status].push(v);
    });
    entregues.reverse();

    renderFsm(porStatus, entregues);
  }

  // ── Disparar transição FSM ──────────────────────────────────────
  const RPC_POR_ACAO = {
    iniciar:  'marcar_em_preparo',
    pronto:   'marcar_pronto',
    entregar: 'marcar_entregue',
  };

  async function disparaTransicao(vendaId, acao, btn) {
    const rpc = RPC_POR_ACAO[acao];
    if (!rpc) return;

    btn.disabled = true;
    const card = btn.closest('.cozinha-card');

    const { data: resultado, error } = await db.rpc(rpc, { p_venda_id: vendaId });

    const falhou = error || resultado?.erro;
    if (falhou) {
      const msgErro = resultado?.erro || error?.message || 'Erro ao atualizar pedido.';
      App.showToast(msgErro, 'error');
      btn.disabled = false;
      return;
    }

    // Feedback visual: card sai animado e recarrega
    if (card) {
      card.classList.add('cozinha-card--saindo');
      card.addEventListener('animationend', () => buscarVendas(), { once: true });
    } else {
      buscarVendas();
    }
  }

  // Um único listener para as 3 colunas (delegação)
  document.getElementById('cozinha-fsm')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-fsm');
    if (!btn) return;
    const vendaId = btn.dataset.vendaId;
    const acao = btn.dataset.acao;
    if (!vendaId || !acao) return;
    disparaTransicao(vendaId, acao, btn);
  });

  // ── Tabs ─────────────────────────────────────────────────────────
  document.getElementById('tab-fila')?.addEventListener('click', () => {
    document.getElementById('cozinha-fsm').style.display = 'grid';
    document.getElementById('cozinha-grid-entregues').style.display = 'none';
    document.getElementById('tab-fila').classList.add('ativo');
    document.getElementById('tab-entregues').classList.remove('ativo');
  });

  document.getElementById('tab-entregues')?.addEventListener('click', () => {
    document.getElementById('cozinha-fsm').style.display = 'none';
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
