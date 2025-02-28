#!/bin/bash

eyedeea_url="http://127.0.0.1:8080"

key_hex=$(openssl rand -hex 32)
export EYEDEEA_KEY="$key_hex"
echo "EYEDEEA_KEY set successfully"

is_installed() {
    dpkg -l | grep -q "^ii  $1 "
}

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo -n "Installing Node.js..."
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

# Check if the directory exists
if [ -d "$WWW_DIR" ]; then    
    echo "Installing Eyedeea Photos $WWW_DIR as $BACKUP_FILE..."
    cd $WWW_DIR
else
    echo "Directory $WWW_DIR does not exist."
fi
# Get the current directory
CURRENT_DIR=$(pwd)

# Start the Eyedeea Photos app with PM2
APP_PATH="$CURRENT_DIR/node_modules/eyedeeaphotos/app.js"

if [ -f "$APP_PATH" ]; then
    echo -n "Starting Eyedeea Photos with PM2..."
    pm2 start "$APP_PATH" --name "Eyedeea Photos" > /dev/null 2>&1
    echo -e "\rStarting Eyedeea Photos with PM2...done"
else
    echo "Error: $APP_PATH does not exist. Make sure Eyedeea Photos is installed."
fi

# Set up PM2 to start on system boot
echo -n "Setting up PM2 to start on boot..."
pm2 startup systemd > /dev/null 2>&1
pm2 save > /dev/null 2>&1
echo -e "\rSetting up PM2 to start on boot...done"

echo "All good! Let's configure Eyedeea Photos..."
#!/bin/bash

# Define the JSON file to read (change this if needed)
JSON_FILE="input.json"

# Check if the JSON file exists
if [[ ! -f "$JSON_FILE" ]]; then
    echo "Error: JSON file '$JSON_FILE' not found!"
    exit 1
fi

# Make the POST request and extract the "id" field from the response
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d @"$JSON_FILE" http://127.0.0.1:8080/api/sources)

# Check if the request was successful
if [[ -z "$RESPONSE" ]]; then
    echo "Error: No response received from the server!"
    exit 1
fi

# Extract the "id" from the response
source_id=$(echo "$response" | jq -r '.id')

# Check if an id was extracted
if [[ "$source_id" == "null" || -z "$source_id" ]]; then
    echo "Error: Could not communicate with Eyedeea Photos server!"
    exit 1
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
