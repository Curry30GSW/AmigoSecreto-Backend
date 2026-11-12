const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');

// 1) Cargar .env según entorno, con fallback
const envFiles = [`.env.${process.env.NODE_ENV || 'development'}`, '.env']
    .filter((file) => fs.existsSync(file));
require('dotenv').config({ path: envFiles });

const EventoRoutes = require('./routes/EventoRoutes');
const ParticipanteRoutes = require('./routes/ParticipanteRoutes');
const SorteoRoutes = require('./routes/SorteoRoutes');
const DeseoRoutes = require('./routes/DeseoRoutes');
const DulceRoutes = require('./routes/DulceRoutes');
const UsuarioRoutes = require('./routes/UsuarioRoutes');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';


const origenesPermitidos = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, '')) // sin slash final
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        // Sin origin: Postman, curl, server-to-server → permitir
        if (!origin) return callback(null, true);

        // Si está en la lista, permitir
        if (origenesPermitidos.includes(origin)) {
            return callback(null, true);
        }

        // En dev, permitir cualquier localhost (por si cambia el puerto de Vite)
        if (!isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
};

app.use(cors(corsOptions));

// Si estás detrás de nginx/apache con path base /Amigo, esto ayuda a req.ip y secure cookies
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.json({ success: true, message: 'API Amigo Secreto 🎁', env: process.env.NODE_ENV });
});

app.use('/api/eventos', EventoRoutes);
app.use('/api/participantes', ParticipanteRoutes);
app.use('/api/sorteo', SorteoRoutes);
app.use('/api/deseos', DeseoRoutes);
app.use('/api/dulces', DulceRoutes);
app.use('/api/usuarios', UsuarioRoutes);

// Middleware global de errores
app.use((err, req, res, next) => {
    console.error(err);
    // Errores de CORS → 403 en vez de 500
    if (err.message?.startsWith('Origen no permitido')) {
        return res.status(403).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`   CORS permitidos:`, origenesPermitidos);
});