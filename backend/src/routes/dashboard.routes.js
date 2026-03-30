const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { obter } = require('../controllers/dashboard.controller');

const router = Router();

router.get('/', auth, authorize('administrador'), obter);

module.exports = router;
