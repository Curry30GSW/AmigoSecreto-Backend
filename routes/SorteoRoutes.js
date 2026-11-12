const router = require('express').Router();
const SorteoController = require('../controllers/SorteoController');
const auth = require('../middlewares/AuthMiddleware');
const admin = require('../middlewares/AdminMiddleware');


router.get('/evento/:id/mi-resultado', auth, SorteoController.getMiResultado);
router.post('/evento/:id/girar/:participanteId', auth, SorteoController.girar);
router.post('/evento/:id/iniciar', auth, admin, SorteoController.iniciarJuego);
router.get('/evento/:id/asignaciones', auth, admin, SorteoController.getAsignaciones);
router.get('/evento/:id/exportar', auth, admin, SorteoController.exportarExcel);

module.exports = router;