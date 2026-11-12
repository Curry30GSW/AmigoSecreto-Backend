const ExcelJS = require('exceljs');

function valorTexto(cell) {
    if (!cell) return '';
    const v = cell.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return String(v);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object' && v.text) return String(v.text).trim();
    if (typeof v === 'object' && Array.isArray(v.richText)) {
        return v.richText.map((r) => r.text || '').join('').trim();
    }
    if (typeof v === 'object' && 'result' in v) {
        return String(v.result ?? '').trim();
    }
    return String(cell.text ?? '').trim();
}

function parsearFecha(valor) {
    if (!valor) return null;
    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }
    const str = String(valor).trim();
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function normalizarSexo(valor) {
    const v = String(valor || '').trim().toLowerCase();
    if (['m', 'masculino', 'hombre', 'h'].includes(v)) return 'masculino';
    if (['f', 'femenino', 'mujer'].includes(v)) return 'femenino';
    if (['o', 'otro', 'otra', 'x'].includes(v)) return 'otro';
    return null;
}

function normalizarRol(valor) {
    const v = String(valor || '').trim().toLowerCase();
    if (['admin', 'administrador'].includes(v)) return 'admin';
    return 'usuario';
}

async function parsearExcelParticipantes(filePath) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('El archivo no contiene hojas');

    const participantes = [];
    const errores = [];

    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // cabecera

        const cedula = valorTexto(row.getCell(1));
        const nombre = valorTexto(row.getCell(2));
        const correo = valorTexto(row.getCell(3)) || null;
        const sexoRaw = valorTexto(row.getCell(4));
        const agencia = valorTexto(row.getCell(5)) || null;
        const fechaRaw = row.getCell(6).value;
        const rolRaw = valorTexto(row.getCell(7));

        if (!cedula && !nombre && !correo) return; // fila vacía

        if (!cedula) {
            errores.push(`Fila ${rowNumber}: falta la cédula`);
            return;
        }
        if (!nombre) {
            errores.push(`Fila ${rowNumber}: falta el nombre`);
            return;
        }
        const sexo = normalizarSexo(sexoRaw);
        if (!sexo) {
            errores.push(`Fila ${rowNumber}: sexo inválido ("${sexoRaw}")`);
            return;
        }

        const fecha_nacimiento = parsearFecha(fechaRaw);
        const rol = normalizarRol(rolRaw);

        participantes.push({
            cedula, nombre, correo, sexo, agencia,
            fecha_nacimiento, rol,
            fila: rowNumber,
        });
    });

    return { participantes, errores };
}

module.exports = { parsearExcelParticipantes };