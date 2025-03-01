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

echo "All good! Let's configure Eyedeea Photos..."

# Check if the JSON file exists
if [[ ! -f "$JSON_FILE" ]]; then
    echo "Error: JSON file '$JSON_FILE' not found!"
    return 1
fi

# Make the POST request and extract the "id" field from the response
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d @"$JSON_FILE" http://127.0.0.1:8080/api/sources)

# Check if the request was successful
if [[ -z "$RESPONSE" ]]; then
    echo "Error: No response received from the server!"
    return 1
fi

# Extract the "id" from the response
source_id=$(echo "$response" | jq -r '.id')

# Check if an id was extracted
if [[ "$source_id" == "null" || -z "$source_id" ]]; then
    echo "Error: Could not communicate with Eyedeea Photos server!"
    return 1
fi

echo "New source registered: $source_id"

if [[ "$source_id" != "null" && -n "$source_id" ]]; then
    echo "New source registered. ID: $source_id"
    read -p "Do you want to start scan (y/n)? " yes_no
    if [[ "$yes_no" == "y" ]]; then
        scan_response=$(curl -s -X POST "$eyedeea_url/api/sources/$source_id/scan")
        echo "$scan_response"
    fi
    echo "Refresh browser after scanning completes."
    xdg-open "http://127.0.0.1:8080" &>/dev/null &
else
    echo "Error: Failed to register source."
fi
