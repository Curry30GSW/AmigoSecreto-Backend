const pool = require('../config/ConectDb');
const bcrypt = require('bcrypt');

class Usuario {
    /** Busca un usuario por cédula (para login) */
    static async findByCedula(cedula) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE cedula = ? LIMIT 1',
            [cedula]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0];
    }

    static async listar() {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios ORDER BY creado_en DESC'
        );
        return rows;
    }

    /**
     * Crea un usuario a partir de una fila de `participantes`.
     * Si ya existe uno con la misma cédula, no lo duplica.
     */
    static async crearDesdeParticipante(participante) {
        if (!participante || !participante.cedula) return null;

        const existente = await this.findByCedula(participante.cedula);
        if (existente) {
            // Sincronizar datos por si cambiaron
            await pool.query(
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
                    existente.id,
                ]
            );
            return existente.id;
        }

        // Contraseña inicial: la cédula (hasheada)
        const passwordHash = await bcrypt.hash(String(participante.cedula), 10);

        const [result] = await pool.query(
            `INSERT INTO usuarios
        (cedula, nombre, correo, agencia, fecha_nacimiento, edad,
         password_hash, rol, estado, participante_origen_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                participante.cedula,
                participante.nombre,
                participante.correo,
                participante.agencia,
                participante.fecha_nacimiento,
                participante.edad,
                passwordHash,
                participante.rol || 'usuario',
                participante.estado ?? 1,
                participante.id,
            ]
        );

        return result.insertId;
    }

    /** Verifica contraseña contra el hash guardado */
    static async verificarPassword(usuario, password) {
        if (!usuario?.password_hash) return false;
        return bcrypt.compare(String(password), usuario.password_hash);
    }

    /** Cambia la contraseña */
    static async cambiarPassword(id, nuevaPassword) {
        const hash = await bcrypt.hash(String(nuevaPassword), 10);
        await pool.query(
            'UPDATE usuarios SET password_hash = ? WHERE id = ?',
            [hash, id]
        );
    }

    /** Actualiza manualmente un usuario (para panel admin) */
    static async update(id, datos) {
        const permitidos = [
            'nombre', 'correo', 'agencia', 'fecha_nacimiento',
            'rol', 'estado',
        ];
        const campos = [];
        const valores = [];

        for (const key of permitidos) {
            if (datos[key] !== undefined) {
                campos.push(`${key} = ?`);
                valores.push(datos[key]);
            }
        }
        if (datos.fecha_nacimiento !== undefined) {
            let edad = null;
            if (datos.fecha_nacimiento) {
                const hoy = new Date();
                const nac = new Date(datos.fecha_nacimiento);
                edad = hoy.getFullYear() - nac.getFullYear();
                const m = hoy.getMonth() - nac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
            }
            campos.push('edad = ?');
            valores.push(edad);
        }

        if (!campos.length) return false;
        valores.push(id);
        const [r] = await pool.query(
            `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );
        return r.affectedRows > 0;
    }
}

module.exports = Usuario;