exports.validateUser = ({ nombre, email, password, rol }) => {
    if (!nombre || String(nombre).trim().length < 3) return 'El nombre es obligatorio (mín. 3 letras)';

    if (!email || String(email).trim().length < 3) return 'El usuario/correo es obligatorio (mín. 3 letras)';

    if (!password || String(password).length < 6) return 'Contraseña mínimo 6 caracteres';

    if (rol && !['admin', 'verificador', 'vendedor'].includes(rol)) return 'Rol inválido';

    return null;
};

exports.validateClosure = ({ empacador_nombre, transportadora, paquetes }) => {
    if (!empacador_nombre || empacador_nombre.trim().length < 3)
        return 'Nombre del empacador requerido (mín. 3 caracteres)';

    if (!transportadora || transportadora.trim().length < 2)
        return 'Transportadora requerida';

    if (!Array.isArray(paquetes) || paquetes.length === 0)
        return 'Debe agregar al menos un tipo de paquete';

    const TIPOS_VALIDOS = ['caja', 'bulto', 'bolsa', 'paquete'];

    for (const p of paquetes) {
        if (!TIPOS_VALIDOS.includes(p.tipo))
            return `Tipo de paquete inválido: "${p.tipo}"`;
        if (!Number.isInteger(Number(p.cantidad)) || Number(p.cantidad) <= 0)
            return `Cantidad inválida para "${p.tipo}"`;
    }

    const tipos = paquetes.map((p) => p.tipo);
    const duplicados = tipos.filter((t, i) => tipos.indexOf(t) !== i);
    if (duplicados.length)
        return `Tipos de paquete duplicados: ${[...new Set(duplicados)].join(', ')}. Une las cantidades.`;

    return null;
};