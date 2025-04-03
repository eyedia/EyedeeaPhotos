#!/bin/bash

eyedeea_url="http://127.0.0.1:8080"

key_hex=$(openssl rand -hex 32)
export EYEDEEA_KEY="$key_hex"
echo "export "$EYEDEEA_KEY"="$key_hex>>~/.bashrc
echo $EYEDEEA_KEY"="$key_hex>>~/.profile
echo $EYEDEEA_KEY"="$key_hex>>/etc/environment
echo "EYEDEEA_KEY set successfully"

is_installed() {
    dpkg -l | grep -q "^ii  $1 "
}

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo -n "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt update > /dev/null 2>&1
    sudo apt install -y nodejs npm > /dev/null 2>&1
    echo -e "\rInstalling Node.js...done"
else
    echo "Node.js is already installed."
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo -n "Installing PM2..."
    npm install -g pm2 > /dev/null 2>&1
    echo -e "\rInstalling PM2...done"
else
    echo "PM2 is already installed."
fi

# Install Apache2 if not installed
if ! is_installed apache2; then
    echo -n "Installing Apache2..."
    sudo apt install -y apache2 > /dev/null 2>&1
    echo -e "\rInstalling Apache2...done"
else
    echo "Apache2 is already installed."
fi

# Define the Apache web directory
WWW_DIR="/var/www/html"

JSON_FILE="input.json"
APP_DIR="EyedeeaPhotos"

# Check if the directory exists
if [ -d "$WWW_DIR" ]; then
    if [ -d "$WWW_DIR/$APP_DIR" ]; then
        rm -rf $WWW_DIR/$APP_DIR
    fi
    mkdir $WWW_DIR/$APP_DIR
    cp $JSON_FILE $WWW_DIR/$APP_DIR    
    cd $WWW_DIR/$APP_DIR
    echo "Installing Eyedeea Photos on $WWW_DIR/$APP_DIR ..."
else
    echo "Directory $WWW_DIR does not exist."
    return 1
fi

npm install eyedeeaphotos

# Verify installation
if [ $? -eq 0 ]; then
    echo "'Eyedeea Photos' installed"
else
    echo "Failed to install 'Eyedeea Photos'"
    return 1
fi

LOG_DIR="/var/log/EyediaTech/EyedeeaPhotos"
mkdir $LOG_DIR
chmod -R 777 $LOG_DIR

cd $WWW_DIR
chmod -R 777 $WWW_DIR/$APP_DIR

# Start the Eyedeea Photos app with PM2
APP_DIR_FULL="$WWW_DIR/$APP_DIR/node_modules/eyedeeaphotos"


if [ -d "$APP_DIR_FULL" ]; then
    echo -n "Starting Eyedeea Photos with PM2...$APP_DIR_FULL"
    cd $APP_DIR_FULL
    pm2 start "app.js" --name "Eyedeea Photos" > /dev/null 2>&1
    echo -e "\rStarting Eyedeea Photos with PM2...done"
else
    echo "Error: $APP_DIR_FULL does not exist. Make sure Eyedeea Photos is installed."
fi

cd $WWW_DIR/$APP_DIR

# Set up PM2 to start on system boot
echo -n "Setting up PM2 to start on boot..."
pm2 startup systemd > /dev/null 2>&1
pm2 save > /dev/null 2>&1
echo -e "\rSetting up PM2 to start on boot...done"


sudo mkdir -p /var/log/EyedeeaPhotos/logs
sudo chown -R $USER:$USER /var/log/EyedeeaPhotos
sudo chmod -R 777 /var/log/EyedeeaPhotos

sudo mkdir -p /var/lib/EyedeeaPhotos/data
sudo chown -R $USER:$USER /var/lib/EyedeeaPhotos/data
sudo chmod -R 777 /var/lib/EyedeeaPhotos

xdg-open "http://127.0.0.1:8080/manage"
echo "Eyedeea Photos setup complete!"