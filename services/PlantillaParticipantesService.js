const ExcelJS = require('exceljs');

async function parsearExcelParticipantes(filePath) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('El archivo no contiene hojas');

    const participantes = [];
    const errores = [];

    const normalizarSexo = (valor) => {
        const v = String(valor || '').trim().toLowerCase();
        if (['m', 'masculino', 'hombre', 'h'].includes(v)) return 'masculino';
        if (['f', 'femenino', 'mujer'].includes(v)) return 'femenino';
        if (['o', 'otro', 'otra', 'x'].includes(v)) return 'otro';
        return null;
    };

    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // cabecera

        const nombre = String(row.getCell(1).value || '').trim();
        const correo = String(row.getCell(2).value || '').trim() || null;
        const sexoRaw = row.getCell(3).value;

        if (!nombre && !correo) return; // fila vacía

        const sexo = normalizarSexo(sexoRaw);

        if (!nombre) {
            errores.push(`Fila ${rowNumber}: falta el nombre`);
            return;
        }
        if (!sexo) {
            errores.push(`Fila ${rowNumber}: sexo inválido ("${sexoRaw}")`);
            return;
        }

        participantes.push({
            nombre,
            correo,
            sexo,
            fila: rowNumber,
        });
    });

    return { participantes, errores };
}

module.exports = { parsearExcelParticipantes };