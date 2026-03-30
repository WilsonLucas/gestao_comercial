function authorize(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Nao autenticado.' });
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso nao autorizado para este perfil.' });
    }
    next();
  };
}

module.exports = authorize;
