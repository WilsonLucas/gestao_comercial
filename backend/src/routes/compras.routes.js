const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { listar, criar, remover } = require('../controllers/compras.controller');

const router = Router();

router.get('/',       auth, authorize('estoque', 'financeiro', 'administrador'), listar);
router.post('/',      auth, authorize('estoque', 'administrador'), criar);
router.delete('/:id', auth, authorize('administrador'), remover);

module.exports = router;
