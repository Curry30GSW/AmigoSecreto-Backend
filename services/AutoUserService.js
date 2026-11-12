// services/AutoUserService.js
const bcrypt = require('bcrypt');

/**
 * Genera una contraseña legible a partir del nombre y la cédula.
 * Ej: "Andres", "1007864285" → "Andres4285"
 */
function generarPassword(nombreCompleto, cedula) {
    const primerNombre =
        String(nombreCompleto || '').trim().split(/\s+/)[0] || 'Usuario';
    const ult4 = String(cedula || '').replace(/\D/g, '').slice(-4) || '0000';
    const capitalizado =
        primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
    return `${capitalizado}${ult4}`;
}

/**
 * Crea (o sincroniza) un usuario en `usuarios` a partir de un participante.
 * - Si ya existe por cédula → actualiza datos.
 * - Si no existe → lo crea con contraseña generada.
 *
 * Devuelve { creado, actualizado, passwordPlano, usuarioId, error }
 */
async function crearUsuarioDesdeParticipante(conn, participante) {
    if (!participante || !participante.cedula) {
        return { creado: false, error: 'Participante sin cédula' };
    }

    const cedula = String(participante.cedula).trim();

    // 1) ¿Ya existe un usuario con esa cédula?
    const [existentes] = await conn.query(
        'SELECT id, cedula FROM usuarios WHERE cedula = ? LIMIT 1',
        [cedula]
    );

    if (existentes.length > 0) {
        // Ya existe: sincronizamos datos (no tocamos password)
        const usuarioId = existentes[0].id;
        try {
            await conn.query(
                `UPDATE usuarios SET
          nombre = ?, correo = ?, agencia = ?, fecha_nacimiento = ?,
          edad = ?, rol = ?, estado = ?, participante_origen_id = ?
         WHERE id = ?`,
                [
                    participante.nombre,
                    participante.correo,
                    participante.agencia,
                    participante.fecha_nacimiento,
                    participante.edad,
                    participante.rol || 'usuario',
                    participante.estado ?? 1,
                    participante.id,
                    usuarioId,
                ]
            );
            return { creado: false, actualizado: true, usuarioId };
        } catch (e) {
            return { creado: false, error: e.message };
        }
    }

    // 2) Crear nuevo usuario con contraseña autogenerada
    const passwordPlano = generarPassword(participante.nombre, cedula);
    const password_hash = await bcrypt.hash(passwordPlano, 10);

    try {
        const [result] = await conn.query(
            `INSERT INTO usuarios
        (cedula, nombre, correo, agencia, fecha_nacimiento, edad,
         password_hash, rol, estado, participante_origen_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cedula,
                participante.nombre,
                participante.correo,
                participante.agencia,
                participante.fecha_nacimiento,
                participante.edad,
                password_hash,
                participante.rol || 'usuario',
                participante.estado ?? 1,
                participante.id,
            ]
        );

        return {
            creado: true,
            usuarioId: result.insertId,
            passwordPlano,
        };
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
            return { creado: false, error: 'Cédula ya registrada' };
        }
        return { creado: false, error: e.message };
    }
}

module.exports = { generarPassword, crearUsuarioDesdeParticipante };