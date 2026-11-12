const ExcelJS = require('exceljs');

async function generarExcelAsignaciones(evento, filas, res) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Amigo Secreto App';
    wb.created = new Date();

    const ws = wb.addWorksheet('Asignaciones');

    ws.columns = [
        { header: 'Participante', key: 'participante', width: 28 },
        { header: 'Sexo', key: 'sexo', width: 12 },
        { header: 'Amigo Secreto', key: 'amigo', width: 28 },
        { header: 'Sexo del Amigo', key: 'amigoSexo', width: 16 },
        { header: 'Lista de Deseos', key: 'deseos', width: 40 },
        { header: 'Lista de Dulces', key: 'dulces', width: 40 },
    ];

    filas.forEach(f => ws.addRow(f));

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00712D' },
    };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    ws.eachRow((row, n) => {
        if (n > 1) row.alignment = { vertical: 'middle', wrapText: true };
    });

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="amigo-secreto-${evento.id}-${Date.now()}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
}

module.exports = { generarExcelAsignaciones };