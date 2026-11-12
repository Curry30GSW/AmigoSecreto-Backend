const { fail } = require('../utils/Response');

module.exports = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
        return fail(res, 'Acceso denegado: rol insuficiente', 403);
    }
    next();
};