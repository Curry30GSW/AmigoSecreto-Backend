const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Carpeta temporal
const tmpDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tmpDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const ok = ['.xlsx', '.xls'].includes(
        path.extname(file.originalname).toLowerCase(),
    );
    cb(ok ? null : new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), ok);
};

const uploadExcel = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
}).single('excel');

module.exports = { uploadExcel };