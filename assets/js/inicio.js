document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'inicio') return;

  const usuario = App.getUsuario();
  if (!usuario) return;

  const perfil = usuario.perfil;
  const main = document.getElementById('inicio-main');
  if (!main) return;

  // ── Cabecalho comum ──────────────────────────────────────────────
  const cfg = APP_CONFIG;
  const logoHtml = cfg.logo
    ? `<img src="${App.escapeHtml(cfg.logo)}" alt="${App.escapeHtml(cfg.nome)}" style="max-height:72px; object-fit:contain;">`
    : `<h1 class="inicio-logo-text">${App.escapeHtml(cfg.nome)}</h1>`;

  const header = `
    <section class="inicio-hero">
      ${logoHtml}
      <p class="inicio-saudacao">Ola, <strong>${App.escapeHtml(usuario.nome || 'usuario')}</strong>. O que vamos fazer hoje?</p>
    </section>
  `;

  // ── Layouts por perfil ───────────────────────────────────────────
  if (perfil === 'operador') {
    main.innerHTML = `
      ${header}
      <section class="inicio-operador">
        <a href="pdv.html" class="inicio-pdv-btn">
          <span class="inicio-pdv-icon">&#9654;</span>
          Abrir PDV
        </a>
        <a href="historico-dia.html" class="btn btn-secondary inicio-link-secundario">Ver historico do dia</a>
      </section>
    `;
    return;
  }

  if (perfil === 'gerente') {
    // Buscar ingredientes com estoque critico ou em atencao
    const { data: alertas } = await db
      .from('ingredientes')
      .select('nome, estoque_atual, estoque_minimo, unidade')
      .order('nome');

    const criticos = (alertas || []).filter((i) => {
      const atual = Number(i.estoque_atual);
      const minimo = Number(i.estoque_minimo);
      return atual <= minimo * 1.5;
    });

    const alertasHtml = criticos.length
      ? `
        <article class="inicio-alerta-estoque">
          <h3>&#9888; Estoque em atencao</h3>
          <ul>
            ${criticos.map((i) => {
              const s = App.calcularStatus(i);
              return `<li>
                <span class="badge ${s.className}">${App.escapeHtml(s.label)}</span>
                <strong>${App.escapeHtml(i.nome)}</strong> —
                ${parseFloat(Number(i.estoque_atual).toFixed(3))} ${App.escapeHtml(i.unidade)}
                (min. ${parseFloat(Number(i.estoque_minimo).toFixed(3))})
              </li>`;
            }).join('')}
          </ul>
        </article>
      `
      : `<article class="inicio-alerta-estoque normal"><p>&#10003; Todos os ingredientes estao com estoque adequado.</p></article>`;

    main.innerHTML = `
      ${header}
      <section class="inicio-cards-grid inicio-cols-auto">
        <a href="ingredientes.html" class="inicio-card">
          <span class="inicio-card-icon">&#127811;</span>
          <strong>Ingredientes</strong>
          <span>Consultar e ajustar estoque</span>
        </a>
        <a href="produtos.html" class="inicio-card">
          <span class="inicio-card-icon">&#127859;</span>
          <strong>Produtos</strong>
          <span>Cardapio e fichas tecnicas</span>
        </a>
        <a href="lista-compras.html" class="inicio-card">
          <span class="inicio-card-icon">&#128203;</span>
          <strong>Lista de Compras</strong>
          <span>Ver o que precisa repor</span>
        </a>
        <a href="compras.html" class="inicio-card">
          <span class="inicio-card-icon">&#128722;</span>
          <strong>Compras</strong>
          <span>Registrar entradas no estoque</span>
        </a>
        <a href="financeiro.html" class="inicio-card">
          <span class="inicio-card-icon">&#128200;</span>
          <strong>Financeiro</strong>
          <span>Indicadores e resultados</span>
        </a>
      </section>
      ${alertasHtml}
    `;
    return;
  }

  // ── Admin: grade completa ────────────────────────────────────────
  main.innerHTML = `
    ${header}
    <section class="inicio-cards-grid inicio-cols-auto">
      <a href="pdv.html" class="inicio-card inicio-card-destaque">
        <span class="inicio-card-icon">&#9654;</span>
        <strong>PDV</strong>
        <span>Registrar vendas</span>
      </a>
      <a href="ingredientes.html" class="inicio-card">
        <span class="inicio-card-icon">&#127811;</span>
        <strong>Ingredientes</strong>
        <span>Estoque e custos</span>
      </a>
      <a href="produtos.html" class="inicio-card">
        <span class="inicio-card-icon">&#127859;</span>
        <strong>Produtos</strong>
        <span>Cardapio e fichas</span>
      </a>
      <a href="compras.html" class="inicio-card">
        <span class="inicio-card-icon">&#128722;</span>
        <strong>Compras</strong>
        <span>Registrar despesas</span>
      </a>
      <a href="lista-compras.html" class="inicio-card">
        <span class="inicio-card-icon">&#128203;</span>
        <strong>Lista de Compras</strong>
        <span>O que precisa repor</span>
      </a>
      <a href="financeiro.html" class="inicio-card">
        <span class="inicio-card-icon">&#128200;</span>
        <strong>Financeiro</strong>
        <span>Resultados mensais</span>
      </a>
      <a href="usuarios.html" class="inicio-card">
        <span class="inicio-card-icon">&#128100;</span>
        <strong>Usuarios</strong>
        <span>Gerenciar acessos</span>
      </a>
    </section>
  `;
});
