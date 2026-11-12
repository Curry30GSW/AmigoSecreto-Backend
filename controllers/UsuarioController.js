const Usuario = require('../models/UsuarioModel');
const { ok, fail } = require('../utils/Response');
const { sign } = require('../utils/JwtUtils');
const { COOKIE_NAME, COOKIE_OPTIONS, optionsForSession } = require('../utils/AuthCookie');

exports.login = async (req, res) => {
    try {
        const { cedula, password, recordar = true } = req.body;

        if (!cedula || !password) {
            return fail(res, 'Cédula y contraseña son obligatorias', 400);
        }

        const usuario = await Usuario.findByCedula(String(cedula).trim());
        if (!usuario) return fail(res, 'Cédula no registrada', 404);
        if (usuario.estado !== 1) return fail(res, 'Usuario inactivo', 403);

        const okPass = await Usuario.verificarPassword(usuario, password);
        if (!okPass) return fail(res, 'Contraseña incorrecta', 401);

        const token = sign(
            { id: usuario.id, cedula: usuario.cedula, rol: usuario.rol },
        );
        res.cookie(COOKIE_NAME, token, optionsForSession(recordar !== false));

        return ok(
            res,
            {
                usuario: {
                    id: usuario.id,
                    cedula: usuario.cedula,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol,
                    agencia: usuario.agencia,
                },
            },
            'Login exitoso'
        );
    } catch (error) {
        return fail(res, 'Error al iniciar sesión', 500, error.message);
    }
};

exports.logout = (req, res) => {
    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return ok(res, null, 'Sesión cerrada');
};

exports.perfil = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id);
        if (!usuario) return fail(res, 'Usuario no encontrado', 404);
        delete usuario.password_hash;
        return ok(res, usuario);
    } catch (error) {
        return fail(res, 'Error al obtener perfil', 500, error.message);
    }
};

exports.cambiarPassword = async (req, res) => {
    try {
        const { nuevaPassword } = req.body;
        if (!nuevaPassword || nuevaPassword.length < 4) {
            return fail(res, 'La nueva contraseña debe tener al menos 4 caracteres', 400);
        }
        await Usuario.cambiarPassword(req.usuario.id, nuevaPassword);
        return ok(res, null, 'Contraseña actualizada');
    } catch (error) {
        return fail(res, 'Error al cambiar contraseña', 500, error.message);
    }
};