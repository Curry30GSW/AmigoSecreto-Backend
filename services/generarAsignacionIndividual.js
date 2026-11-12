function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Genera UNA sola asignación para el participante actual.
 * Reglas:
 *  - Si el participante es masculino: buscar mujeres que aún no reciban.
 *  - Si es femenino: buscar hombres que aún no reciban.
 *  - Si no quedan del sexo opuesto: mismo sexo.
 *  - Si no hay disponibles: devolver null.
 */
function generarAsignacionIndividual(participante, todos, asignacionesExistentes) {
    const yaReciben = new Set(asignacionesExistentes.map(a => a.amigo_secreto_id));
    const candidatos = todos.filter(p =>
        p.id !== participante.id && // no autoasignarse
        !yaReciben.has(p.id)        // no repetir receptor
    );

    if (candidatos.length === 0) return null;

    // Prioridad 1: sexo opuesto
    const opuesto = participante.sexo === 'masculino' ? 'femenino' : 'femenino';
    const sexoOpuesto = participante.sexo === 'masculino' ? 'femenino'
        : participante.sexo === 'femenino' ? 'masculino'
            : 'otro';

    let pool;
    if (participante.sexo === 'masculino') {
        pool = candidatos.filter(c => c.sexo === 'femenino');
    } else if (participante.sexo === 'femenino') {
        pool = candidatos.filter(c => c.sexo === 'masculino');
    } else {
        pool = candidatos;
    }

    // Si no hay del sexo opuesto, mismo sexo
    if (pool.length === 0) {
        pool = candidatos.filter(c => c.sexo === participante.sexo);
    }

    // Si tampoco hay, cualquier disponible
    if (pool.length === 0) {
        pool = candidatos;
    }

    if (pool.length === 0) return null;

    const elegido = shuffle(pool)[0];
    return {
        participanteId: participante.id,
        amigoSecretoId: elegido.id,
    };
}

module.exports = { generarAsignacionIndividual };