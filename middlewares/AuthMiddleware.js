const { verify } = require('../utils/JwtUtils');
const { fail } = require('../utils/Response');
const { COOKIE_NAME } = require('../utils/AuthCookie');

module.exports = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = req.cookies?.[COOKIE_NAME] ||
        (header.startsWith('Bearer ') ? header.slice(7) : null);

    if (!token) return fail(res, 'Token no enviado', 401);

    try {
        req.usuario = verify(token);
        req.user = req.usuario;
        next();
    } catch (error) {
        return fail(res, 'Token inválido o expirado', 401);
    }
};