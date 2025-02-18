#!/bin/bash

sudo timeshift --create --comments "A new backup" --tags D

sudo apt install nodejs npm -y
sudo apt-get install apache2
sudo npm install -g pm2
mkdir eyedeea
cd eyedeea
git clone --branch=master https://github.com/eyedia/EyedeeaPhotos.git
cd EyedeeaPhotos
sudo chmod 755 app.js
cp /eyedeea/EyedeeaPhotos /var/www/html
npm install


sudo timeshift --restore