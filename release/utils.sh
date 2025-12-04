mkdir EyedeeaPhotos
cd EyedeeaPhotos
git clone https://github.com/eyedia/EyedeeaPhotos.git
cp -rf EyedeeaPhotos/.  /var/www/html/EyedeeaPhotos/node_modules/eyedeeaphotos/
pm2 restart 'Eyedeea Photos'
sudo systemctl restart apache2
