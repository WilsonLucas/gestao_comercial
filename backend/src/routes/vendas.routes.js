const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { criar, listar, listarHoje } = require('../controllers/vendas.controller');

const router = Router();

router.post('/',    auth, authorize('operador', 'administrador'), criar);
router.get('/',     auth, authorize('financeiro', 'administrador'), listar);
router.get('/hoje', auth, authorize('operador', 'administrador'), listarHoje);

module.exports = router;
