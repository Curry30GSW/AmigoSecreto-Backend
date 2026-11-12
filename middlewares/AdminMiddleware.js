const { fail } = require('../utils/Response');

module.exports = (req, res, next) => {
    if (req.usuario?.rol !== 'admin') {
        return fail(res, 'No tienes permisos para administrar este recurso', 403);
    }
    return next();
};
