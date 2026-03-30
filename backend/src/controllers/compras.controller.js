const pool = require('../config/database');

async function listar(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.ingrediente_id, i.nome AS ingrediente_nome, i.unidade,
              c.quantidade, c.valor_unitario, c.total, c.data, c.criado_em
       FROM compras c
       JOIN ingredientes i ON i.id = c.ingrediente_id
       ORDER BY c.data DESC, c.criado_em DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar compras:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function criar(req, res) {
  const { ingrediente_id, quantidade, valor_unitario, data } = req.body;
  if (!ingrediente_id || !quantidade || !valor_unitario || !data) {
    return res.status(400).json({ erro: 'ingrediente_id, quantidade, valor_unitario e data sao obrigatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const compraResult = await client.query(
      `INSERT INTO compras (ingrediente_id, quantidade, valor_unitario, data, criado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ingrediente_id, Number(quantidade), Number(valor_unitario), data, req.usuario.id]
    );

    await client.query(
      `UPDATE ingredientes
       SET estoque_atual = estoque_atual + $1,
           preco_compra = $2,
           atualizado_em = NOW()
       WHERE id = $3`,
      [Number(quantidade), Number(valor_unitario), ingrediente_id]
    );

    await client.query('COMMIT');
    return res.status(201).json(compraResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar compra:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  } finally {
    client.release();
  }
}

async function remover(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const compraResult = await client.query(
      'SELECT ingrediente_id, quantidade FROM compras WHERE id = $1',
      [id]
    );
    if (!compraResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Compra nao encontrada.' });
    }

    const { ingrediente_id, quantidade } = compraResult.rows[0];

    await client.query('DELETE FROM compras WHERE id = $1', [id]);

    await client.query(
      `UPDATE ingredientes
       SET estoque_atual = GREATEST(0, estoque_atual - $1),
           atualizado_em = NOW()
       WHERE id = $2`,
      [Number(quantidade), ingrediente_id]
    );

    await client.query('COMMIT');
    return res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover compra:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  } finally {
    client.release();
  }
}

module.exports = { listar, criar, remover };
