const pool = require('../config/database');

async function listar(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, nome, unidade, preco_compra, estoque_atual, estoque_minimo, criado_em, atualizado_em FROM ingredientes ORDER BY nome'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar ingredientes:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function criar(req, res) {
  const { nome, unidade, preco_compra, estoque_atual, estoque_minimo } = req.body;
  if (!nome || !unidade) {
    return res.status(400).json({ erro: 'Nome e unidade sao obrigatorios.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ingredientes (nome, unidade, preco_compra, estoque_atual, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome.trim(), unidade, Number(preco_compra) || 0, Number(estoque_atual) || 0, Number(estoque_minimo) || 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar ingrediente:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, unidade, preco_compra, estoque_atual, estoque_minimo } = req.body;

  try {
    const result = await pool.query(
      `UPDATE ingredientes
       SET nome = COALESCE($1, nome),
           unidade = COALESCE($2, unidade),
           preco_compra = COALESCE($3, preco_compra),
           estoque_atual = COALESCE($4, estoque_atual),
           estoque_minimo = COALESCE($5, estoque_minimo),
           atualizado_em = NOW()
       WHERE id = $6
       RETURNING *`,
      [nome?.trim(), unidade, preco_compra != null ? Number(preco_compra) : null, estoque_atual != null ? Number(estoque_atual) : null, estoque_minimo != null ? Number(estoque_minimo) : null, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ erro: 'Ingrediente nao encontrado.' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar ingrediente:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM ingredientes WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ erro: 'Ingrediente nao encontrado.' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover ingrediente:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, criar, atualizar, remover };
