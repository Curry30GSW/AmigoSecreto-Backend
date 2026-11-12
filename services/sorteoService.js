function barajar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generarSorteo(participantes) {
    if (participantes.length < 2) {
        throw new Error('El juego necesita al menos dos participantes');
    }

    const orden = barajar(participantes);
    return orden.map((participante, indice) => ({
        participanteId: participante.id,
        amigoSecretoId: orden[(indice + 1) % orden.length].id,
    }));
}

/**
 * Genera asignaciones SOLO para los participantes que no tienen pareja,
 * respetando las asignaciones que ya existen.
 */
function generarSorteoParcial(participantes, asignacionesExistentes) {
    const yaRegalan = new Set(asignacionesExistentes.map(a => a.participante_id));
    const yaReciben = new Set(asignacionesExistentes.map(a => a.amigo_secreto_id));

    const faltanRegalar = participantes.filter(p => !yaRegalan.has(p.id));
    const faltanRecibir = participantes.filter(p => !yaReciben.has(p.id));

    if (faltanRegalar.length === 0 || faltanRecibir.length === 0) return [];

    const hombresRegalan = barajar(faltanRegalar.filter(p => p.sexo === 'masculino'));
    const mujeresRegalan = barajar(faltanRegalar.filter(p => p.sexo === 'femenino'));
    const otrosRegalan = barajar(faltanRegalar.filter(p => p.sexo === 'otro'));

    const hombresReciben = barajar(faltanRecibir.filter(p => p.sexo === 'masculino'));
    const mujeresReciben = barajar(faltanRecibir.filter(p => p.sexo === 'femenino'));
    const otrosReciben = barajar(faltanRecibir.filter(p => p.sexo === 'otro'));

    const resultado = [];

    // Helper: buscar el primer receptor que no sea el mismo del regalador
    function tomarReceptor(pool, regalador, yaUsados) {
        const idx = pool.findIndex(r => r.id !== regalador.id && !yaUsados.has(r.id));
        if (idx === -1) return null;
        const receptor = pool.splice(idx, 1)[0];
        yaUsados.add(receptor.id);
        return receptor;
    }

    const usados = new Set();

    // Fase 1: H regala a M
    for (const h of hombresRegalan) {
        if (mujeresReciben.length === 0) break;
        const r = tomarReceptor(mujeresReciben, h, usados);
        if (r) resultado.push({ participanteId: h.id, amigoSecretoId: r.id });
    }
    // Fase 2: M regala a H
    for (const m of mujeresRegalan) {
        if (hombresReciben.length === 0) break;
        const r = tomarReceptor(hombresReciben, m, usados);
        if (r) resultado.push({ participanteId: m.id, amigoSecretoId: r.id });
    }
    // Fase 3: los que sobran regalan a los que sobran (mismo sexo u otros)
    const restantesRegalan = barajar([
        ...hombresRegalan, ...mujeresRegalan, ...otrosRegalan,
    ].filter(p => !resultado.some(r => r.participanteId === p.id)));

    const restantesReciben = barajar([
        ...hombresReciben, ...mujeresReciben, ...otrosReciben,
    ].filter(p => !usados.has(p.id)));

    for (const regalador of restantesRegalan) {
        const r = tomarReceptor(restantesReciben, regalador, usados);
        if (r) resultado.push({ participanteId: regalador.id, amigoSecretoId: r.id });
    }

    return resultado;
}

module.exports = { generarSorteo, generarSorteoParcial };