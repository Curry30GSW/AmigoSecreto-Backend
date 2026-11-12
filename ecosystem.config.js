module.exports = {
    apps: [
        {
            name: 'apiSorteos',
            script: './server.js',
            instances: 1,
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            restart_delay: 5000,
            kill_timeout: 3000,
            listen_timeout: 3000,

            env: {
                NODE_ENV: 'production',
                PORT: 5009
            },

            // Entorno de desarrollo
            env_development: {
                NODE_ENV: 'development',
                PORT: 3009
            },

            // Entorno de producción (RECOMENDADO)
            env_production: {
                NODE_ENV: 'production',
                PORT: 5009
            },
        },
    ],
};
