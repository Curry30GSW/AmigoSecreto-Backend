const router = require('express').Router();
const EventoController = require('../controllers/EventoController');
const auth = require('../middlewares/AuthMiddleware');
const admin = require('../middlewares/AdminMiddleware');

router.get('/mis-juegos', auth, EventoController.getMyGames);
router.get('/mis-juegos/:id', auth, EventoController.getMyGame);
router.get('/', auth, admin, EventoController.getAll);
router.get('/:id', auth, admin, EventoController.getById);
router.post('/', auth, admin, EventoController.create);
router.put('/:id/asignacion-automatica', auth, admin, EventoController.configurarAsignacionAutomatica);
router.delete('/:id', auth, admin, EventoController.delete);

module.exports = router;