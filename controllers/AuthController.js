const User = require('../models/UserModel');
const { sign } = require('../utils/JwtUtils');
const { ok, fail } = require('../utils/Response');
const bcrypt = require('bcryptjs');
const { verificar } = require('../utils/Recaptcha');
const { auditar } = require('../middlewares/auditoriaService');
const { COOKIE_NAME, COOKIE_OPTIONS, optionsForSession } = require('../utils/AuthCookie');

// Rate limiting simple en memoria (por IP+user). Para producción usa redis.
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_SECONDS = 60;

function getKey(req, user) {
    return `${req.ip}::${String(user || '').toLowerCase()}`;
}

exports.login = async (req, res) => {
    try {
        const { user, password, captcha } = req.body;

        if (!user || !password) {
            return fail(res, 'Usuario y contraseña son obligatorios');
        }

        if (!captcha) return fail(res, 'Captcha requerido');
        const captchaOk = await verificar(captcha);
        if (!captchaOk) return fail(res, 'Captcha inválido');

        const key = getKey(req, user);
        const attempt = failedAttempts.get(key);

        if (attempt && attempt.blockedUntil > Date.now()) {
            const segundos = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
            return res.status(429).json({
                success: false,
                message: `Demasiados intentos. Intente de nuevo en ${segundos} segundos.`,
            });
        }

        const found = (await User.findByEmail(user)) || (await User.findByNombre(user));

        if (!found) {
            registerFail(key);
            // Auditoría: intento fallido con usuario inexistente
            await auditar(req, `Intento de inicio de sesión fallido (usuario no existe): ${user}`, null, user);
            return fail(res, 'Credenciales inválidas', 401);
        }

        if (!found.activo) {
            await auditar(req, 'Intento de inicio de sesión en cuenta inactiva', `Usuario: ${found.email}`, found.nombre);
            return fail(res, 'Usuario inactivo', 403);
        }

        const valid = await bcrypt.compare(password, found.password_hash);
        if (!valid) {
            registerFail(key);
            await auditar(req, 'Intento de inicio de sesión fallido (contraseña incorrecta)', `Usuario: ${found.email}`, found.nombre);
            return fail(res, 'Credenciales inválidas', 401);
        }

        failedAttempts.delete(key);

        const token = sign({
            id: found.id,
            email: found.email,
            rol: found.rol,
            nombre: found.nombre,
        });

        res.cookie(COOKIE_NAME, token, optionsForSession());

        // ✅ Auditoría: login exitoso
        await auditar(req, `El usuario ${found.nombre} inició sesión`, null, found.nombre);

        return ok(
            res,
            {
                user: {
                    id: found.id,
                    nombre: found.nombre,
                    email: found.email,
                    rol: found.rol,
                },
            },
            'Login exitoso'
        );
    } catch (error) {
        console.error('❌ Error en login:', error);
        return fail(res, 'Error al iniciar sesión', 500, error.message);
    }
};

exports.logout = async (req, res) => {
    try {

        if (req.user) {
            await auditar(req, `El usuario ${req.user.nombre} cerró sesión`);
        }
    } catch (error) {
        console.error('❌ Error en auditoría de logout:', error.message);
    }

    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return ok(res, null, 'Sesión cerrada');
};

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return fail(res, 'Usuario no encontrado', 404);
        return ok(res, {
            id: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
        });
    } catch (error) {
        return fail(res, 'Error al obtener perfil', 500, error.message);
    }
};

function registerFail(key) {
    const current = failedAttempts.get(key) || { count: 0, blockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
        current.blockedUntil = Date.now() + BLOCK_SECONDS * 1000;
        current.count = 0;
    }
    failedAttempts.set(key, current);
}