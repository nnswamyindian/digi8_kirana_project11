/**
 * PM2 Ecosystem Configuration for Hostinger VPS Production Deployment
 */

module.exports = {
  apps: [
    {
      name: 'kirana-saas-backend',
      script: './server/index.js',
      cwd: '/var/www/grocery-platform',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        DB_CLIENT: 'mysql',
        DB_HOST: '127.0.0.1',
        DB_PORT: 3306,
        DB_NAME: 'kirana_saas_db',
        DB_USER: 'kirana_admin',
        DB_PASSWORD: 'YOUR_SECURE_MYSQL_PASSWORD',
        JWT_SECRET: 'YOUR_PRODUCTION_JWT_SECRET_KEY'
      }
    }
  ]
};
