require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const senhaHash = await bcrypt.hash('123456', 10);
    const adminResult = await client.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
       RETURNING id`,
      ['Administrador', 'admin@admin.com', senhaHash, 'administrador']
    );
    const adminId = adminResult.rows[0].id;
    console.log('Usuario admin criado/atualizado:', adminId);

    const massaResult = await client.query(
      `INSERT INTO ingredientes (nome, unidade, preco_compra, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['Massa de Pastel', 'un', 0.80, 100, 20]
    );

    const frangoResult = await client.query(
      `INSERT INTO ingredientes (nome, unidade, preco_compra, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['Frango Desfiado', 'kg', 18.00, 5, 2]
    );

    const queijoResult = await client.query(
      `INSERT INTO ingredientes (nome, unidade, preco_compra, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['Queijo', 'kg', 28.00, 3, 1]
    );

    const oleoResult = await client.query(
      `INSERT INTO ingredientes (nome, unidade, preco_compra, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['Oleo', 'litro', 8.00, 10, 3]
    );

    let massaId = massaResult.rows[0]?.id;
    let frangoId = frangoResult.rows[0]?.id;
    let queijoId = queijoResult.rows[0]?.id;

    if (!massaId) {
      massaId = (await client.query('SELECT id FROM ingredientes WHERE nome = $1', ['Massa de Pastel'])).rows[0].id;
    }
    if (!frangoId) {
      frangoId = (await client.query('SELECT id FROM ingredientes WHERE nome = $1', ['Frango Desfiado'])).rows[0].id;
    }
    if (!queijoId) {
      queijoId = (await client.query('SELECT id FROM ingredientes WHERE nome = $1', ['Queijo'])).rows[0].id;
    }

    console.log('Ingredientes criados/verificados.');

    await client.query(
      `INSERT INTO compras (ingrediente_id, quantidade, valor_unitario, data, criado_por)
       VALUES ($1, $2, $3, $4, $5)`,
      [massaId, 100, 0.80, '2026-03-01', adminId]
    );
    await client.query(
      `INSERT INTO compras (ingrediente_id, quantidade, valor_unitario, data, criado_por)
       VALUES ($1, $2, $3, $4, $5)`,
      [frangoId, 5, 18.00, '2026-03-01', adminId]
    );
    await client.query(
      `INSERT INTO compras (ingrediente_id, quantidade, valor_unitario, data, criado_por)
       VALUES ($1, $2, $3, $4, $5)`,
      [queijoId, 3, 28.00, '2026-03-01', adminId]
    );
    console.log('Compras iniciais criadas.');

    const pastelFrangoResult = await client.query(
      `INSERT INTO produtos (nome, preco_venda)
       VALUES ($1, $2)
       RETURNING id`,
      ['Pastel de Frango', 8.00]
    );
    const pastelFrangoId = pastelFrangoResult.rows[0].id;

    const pastelQueijoResult = await client.query(
      `INSERT INTO produtos (nome, preco_venda)
       VALUES ($1, $2)
       RETURNING id`,
      ['Pastel de Queijo', 7.00]
    );
    const pastelQueijoId = pastelQueijoResult.rows[0].id;

    await client.query(
      `INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)`,
      [pastelFrangoId, massaId, 1]
    );
    await client.query(
      `INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)`,
      [pastelFrangoId, frangoId, 0.08]
    );
    await client.query(
      `INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)`,
      [pastelFrangoId, queijoId, 0.04]
    );
    await client.query(
      `INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)`,
      [pastelQueijoId, massaId, 1]
    );
    await client.query(
      `INSERT INTO ficha_tecnica (produto_id, ingrediente_id, quantidade) VALUES ($1, $2, $3)`,
      [pastelQueijoId, queijoId, 0.06]
    );
    console.log('Produtos e fichas tecnicas criados.');

    const custo_pastel_frango = (1 * 0.80) + (0.08 * 18.00) + (0.04 * 28.00);
    const custo_pastel_queijo = (1 * 0.80) + (0.06 * 28.00);

    const venda1 = await client.query(
      `INSERT INTO vendas (data, total, custo_total, operador_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['2026-03-10', 10 * 8.00, 10 * custo_pastel_frango, adminId]
    );
    await client.query(
      `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario)
       VALUES ($1, $2, $3, $4, $5)`,
      [venda1.rows[0].id, pastelFrangoId, 10, 8.00, custo_pastel_frango]
    );

    const venda2 = await client.query(
      `INSERT INTO vendas (data, total, custo_total, operador_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['2026-03-15', 8 * 7.00, 8 * custo_pastel_queijo, adminId]
    );
    await client.query(
      `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario)
       VALUES ($1, $2, $3, $4, $5)`,
      [venda2.rows[0].id, pastelQueijoId, 8, 7.00, custo_pastel_queijo]
    );

    const venda3 = await client.query(
      `INSERT INTO vendas (data, total, custo_total, operador_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['2026-03-20', (5 * 8.00) + (3 * 7.00), (5 * custo_pastel_frango) + (3 * custo_pastel_queijo), adminId]
    );
    await client.query(
      `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario)
       VALUES ($1, $2, $3, $4, $5)`,
      [venda3.rows[0].id, pastelFrangoId, 5, 8.00, custo_pastel_frango]
    );
    await client.query(
      `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, custo_unitario)
       VALUES ($1, $2, $3, $4, $5)`,
      [venda3.rows[0].id, pastelQueijoId, 3, 7.00, custo_pastel_queijo]
    );

    console.log('Vendas de exemplo criadas.');

    await client.query('COMMIT');
    console.log('Seed concluido com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro no seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
