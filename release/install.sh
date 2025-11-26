#!/bin/bash

set -euo pipefailedeea_url="http://127.0.0.1:8080"

# Error handling function
handle_error() {
    local lineno=$1
    local msg=$2
    echo "❌ Error on line ${lineno}: ${msg}" >&2
    exit 1
}
trap 'handle_error ${LINENO} "Script terminated due to an error."' ERR

echo "🚀 Starting Eyedeea Photos Setup..."

# ============================================================================
# 1. GENERATE AND SET ENVIRONMENT VARIABLES
# ============================================================================
echo "📝 Generating EYEDEEA_KEY..."
key) || handle_error $LINENO "Failed to generate EYEDEEA_KEY"
export EYEDEEA_KEY="$key_hex"

# Update shell configuration files
{
    echo "export EYEDEEA_KEY=\"$key_hex\""
} >> ~/.bashrc || handle_error $LINENO "Failed to update ~/.bashrc"

{
    echo "EYEDEEA_KEY=\"$key_hex\""
} >> ~/.profile || handle_error $LINENO "Failed to update ~/.profile"

echo "EYEDEEA_KEY=\"$key_hex\"" | sudo tee -a /etc/environment > /dev/null || handle_error $LINENO "Failed to update /etc/environment"

echo "✅ EYEDEEA_KEY set successfully: ${key_hex:0:16}..."

# ============================================================================
# 2. CHECK IF PACKAGE IS INSTALLED
# ============================================================================
is_installed() {
    dpkg -l | grep -q "^ii  $1 " 2>/dev/null && return 0 || return 1
}

# ============================================================================
# 3. INSTALL NODE.JS
# ============================================================================
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    if wget -qO- https://deb.nodesource.com/setup_22.x | sudo -E bash - && \
       sudo apt update > /dev/null 2>&1 && \
       sudo apt install -y nodejs npm > /dev/null 2>&1; then
        echo "✅ Node.js installed successfully"
    else
        handle_error $LINENO "Failed to install Node.js"
    fi
else
    echo "✅ Node.js is already installed ($(node -v))"
fi

# ============================================================================
# 4. INSTALL PM2
# ============================================================================
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    if npm install -g pm2 > /dev/null 2>&1; then
        echo "✅ PM2 installed successfully"
    else
        handle_error $LINENO "Failed to install PM2"
    fi
else
    echo "✅ PM2 is already installed ($(pm2 -v))"
fi

# ============================================================================
# 5. INSTALL APACHE2
# ============================================================================
if ! is_installed apache2; then
    echo "📦 Installing Apache2..."
    if sudo apt install -y apache2 > /dev/null 2>&1; then
        echo "✅ Apache2 installed successfully"
    else
        handle_error $LINENO "Failed to install Apache2"
    fi
else
    echo "✅ Apache2 is already installed"
fi

# ============================================================================
# 6. PREPARE APPLICATIONW_DIR="/var/www/html"
JSON_FILE="input.json"
APP_DIR="EyedeeaPhotos"
APP_DIR_FULL="$WWW_DIR/$APP_DIR"

echo "📁 Preparing application directory..."

if [ ! -d "$WWW_DIR" ]; then
    handle_error $LINENO "Directory $WWW_DIR does not exist"
fi

if [ ! -f "$JSON_FILE" ]; then
    handle_error $LINENO "Configuration file $JSON_FILE not found in current directory"
fi

if [ -d "$APP_DIR_FULL" ]; then
    echo "🔄 Removing existing installation..."
    rm -rf "$APP_DIR_FULL" || handle_error $LINENO "Failed to remove existing app directory"
fi

mkdir -p "$APP_DIR_FULL" || handle_error $LINENO "Failed to create app directory"
cp "$JSON_FILE" "$APP_DIR_FULL" || handle_error $LINENO "Failed to copy JSON file"

echo "✅ Application directory prepared at $APP_DIR_FULL"

# ============================================================================
# 7. INSTALL EYEDEEA PHOTOS
# ============================================================================
echo "📥 Installing Eyedeea Photos package..."
cd "$APP_DIR_FULL" || handle_error $LINENO "Failed to change to app directory"

if npm install eyedeeaphotos > /dev/null 2>&1; then
    echo "✅ Eyedeea Photos package installed successfully"
else
    handle_error $LINENO "Failed to install Eyedeea Photos package"
fi

# ============================================================================
# 8. CREATE LOG AND DATA DIRECTORIES
# ============================================================================
echo "📂 Creating log and data directories..."

LOG_DIR="/var/log/EyediaTech/EyedeeaPhotos"
sudo mkdir -p "$LOG_DIR" || handle_error $LINENO "Failed to create log directory"
sudo chmod -R 777 "$LOG_DIR" || handle_error $LINENO "Failed to set log directory permissions"

DATA_DIR="/var/lib/EyedeeaPhotos/data"
sudo mkdir -p "$DATA_DIR" || handle_error $LINENO "Failed to create data directory"
sudo chown -R "$USER:$USER" "$DATA_DIR" || handle_error $LINENO "Failed to set data directory ownership"
sudo chmod -R 755 "$DATA_DIR" || handle_error $LINENO "Failed to set data directory permissions"

echo "✅ Log and data directories created"

# ============================================================================
# 9. SET PERMISSIONS ON APP DIRECTORY
# ============================================================================
sudo chmod -R 755 "$APP_DIR_FULL" || handle_error $LINENO "Failed to set app directory permissions"

# ============================================================================
# 10. START APPLICATION WITH PM2
# ============================================================================
echo "🎯 Starting Eyedeea Photos with PM2..."

APP_ENTRY="$APP_DIR_FULL/node_modules/eyedeeaphotos/app.js"

if [ ! -f "$APP_ENTRY" ]; then
    handle_error $LINENO "App entry file not found: $APP_ENTRY"
fi

# Stop existing PM2 process if running
pm2 delete "Eyedeea Photos" 2>/dev/null || true

# Create PM2 ecosystem config with environment variables
cd "$APP_DIR_FULL" || handle_error $LINENO "Failed to change directory for PM2"

if pm2 start "$APP_ENTRY" \
    --name "Eyedeea Photos" \
    --env EYEDEEA_KEY="$EYEDEEA_KEY" \
    --log "$LOG_DIR/app.log" \
    --error "$LOG_DIR/error.log" \
    > /dev/null 2>&1; then
    echo "✅ Eyedeea Photos started with PM2"
else
    handle_error $LINENO "Failed to start Eyedeea Photos with PM2"
fi

# ============================================================================
# 11. CONFIGURE PM2 STARTUP ON BOOT
# ============================================================================
echo "⚙️ Configuring PM2 to start on system boot..."

if pm2 startup systemd -u "$USER" --hp /home/"$USER" > /dev/null 2>&1; then
    pm2 save > /dev/null 2>&1 || handle_error $LINENO "Failed to save PM2 configuration"
    echo "✅ PM2 startup configured"
else
    echo "⚠️ Warning: PM2 startup configuration may require manual setup"
fi

# ============================================================================
# 12. VERIFY SETUP
# ============================================================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Status:"
pm2 status
echo ""
echo "🔑 Environment Variable: EYEDEEA_KEY=${key_hex:0:16}..."
echo "📍 Application URL: $eyedeea_url"
echo "📂 App Location: $APP_DIR_FULL"
echo "📋 Logs: $LOG_DIR"
echo ""
echo "Useful Commands:"
echo "  - View logs: pm2 logs 'Eyedeea Photos'"
echo "  - Restart app: pm2 restart 'Eyedeea Photos'"
echo "  - Stop app: pm2 stop 'Eyedeea Photos'"
echo ""

# Optional: Open in browser
if command -v xdg-open &> /dev/null; then
    xdg-open "$eyedeea_url/manage" 2>/dev/null || true
fi

echo "✨ Eyedeea Photos is ready to use!"
