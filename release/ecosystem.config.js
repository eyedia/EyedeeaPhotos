module.exports = {
  apps: [{
    name: 'Eyedeea Photos',
    script: '/var/www/html/EyedeeaPhotos/node_modules/eyedeeaphotos/app.js',
    cwd: '/var/www/html/EyedeeaPhotos/node_modules/eyedeeaphotos',
    autorestart: true,
    env: {
      EYEDEEA_KEY: '$EYEDEEA_KEY'
    },
    error_file: '/var/log/EyediaTech/EyedeeaPhotos/pm2_error.log',
    out_file: '/var/log/EyediaTech/EyedeeaPhotos/pm2_app.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};