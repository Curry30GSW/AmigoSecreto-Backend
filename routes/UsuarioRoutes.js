const router = require('express').Router();
const UsuarioController = require('../controllers/UsuarioController');
const auth = require('../middlewares/AuthMiddleware');

router.post('/login', UsuarioController.login);
router.post('/logout', UsuarioController.logout);
router.get('/perfil', auth, UsuarioController.perfil);
router.put('/cambiar-password', auth, UsuarioController.cambiarPassword);

module.exports = router;