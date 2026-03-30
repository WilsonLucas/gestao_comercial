const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { resumoMensal, desempenho } = require('../controllers/financeiro.controller');

const router = Router();

router.get('/resumo-mensal', auth, authorize('financeiro', 'administrador'), resumoMensal);
router.get('/desempenho',    auth, authorize('financeiro', 'administrador'), desempenho);

module.exports = router;
