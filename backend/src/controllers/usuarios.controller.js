const bcrypt = require('bcrypt');
const pool = require('../config/database');

const ADMIN_EMAIL = 'admin@admin.com';

async function listar(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, nome, email, perfil, ativo, criado_em FROM usuarios ORDER BY nome'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar usuarios:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function criar(req, res) {
  const { nome, email, senha, perfil } = req.body;
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'nome, email, senha e perfil sao obrigatorios.' });
  }

  const perfisValidos = ['administrador', 'financeiro', 'estoque', 'operador'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ erro: `Perfil invalido. Use: ${perfisValidos.join(', ')}.` });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, perfil, ativo, criado_em`,
      [nome.trim(), email.toLowerCase().trim(), senhaHash, perfil]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Ja existe um usuario com este e-mail.' });
    }
    console.error('Erro ao criar usuario:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, email, senha, perfil, ativo } = req.body;

  try {
    let senhaHash = null;
    if (senha) {
      senhaHash = await bcrypt.hash(senha, 10);
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET nome = COALESCE($1, nome),
           email = COALESCE($2, email),
           senha_hash = COALESCE($3, senha_hash),
           perfil = COALESCE($4, perfil),
           ativo = COALESCE($5, ativo)
       WHERE id = $6
       RETURNING id, nome, email, perfil, ativo, criado_em`,
      [nome?.trim(), email?.toLowerCase().trim(), senhaHash, perfil, ativo, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ erro: 'Usuario nao encontrado.' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Ja existe um usuario com este e-mail.' });
    }
    console.error('Erro ao atualizar usuario:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    const usuarioResult = await pool.query('SELECT email FROM usuarios WHERE id = $1', [id]);
    if (!usuarioResult.rows[0]) {
      return res.status(404).json({ erro: 'Usuario nao encontrado.' });
    }

    if (usuarioResult.rows[0].email === ADMIN_EMAIL) {
      return res.status(403).json({ erro: 'O usuario administrador padrao nao pode ser removido.' });
    }

    await pool.query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover usuario:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}

module.exports = { listar, criar, atualizar, remover };
