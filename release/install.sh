#!/bin/bash

set -euo pipefail

eyedeea_url="http://127.0.0.1:8080"

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
key_hex=$(openssl rand -hex 32) || handle_error $LINENO "Failed to generate EYEDEEA_KEY"
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
    
    # Install Node.js (repository should already be configured)
    sudo apt update && sudo apt install -y nodejs || handle_error $LINENO "Failed to install Node.js"
    
    echo "✅ Node.js installed successfully ($(node -v))"
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

# Enable required Apache modules
echo "⚙️ Enabling Apache proxy modules..."
sudo a2enmod proxy proxy_http rewrite || handle_error $LINENO "Failed to enable Apache modules"

# Configure Apache virtual host
echo "⚙️ Configuring Apache virtual host..."
APACHE_CONF="/etc/apache2/sites-available/000-default.conf"

# Backup existing Apache configuration
if [ -f "$APACHE_CONF" ]; then
    BACKUP_CONF="${APACHE_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp "$APACHE_CONF" "$BACKUP_CONF" || handle_error $LINENO "Failed to backup Apache configuration"
    echo "✅ Backup created: $BACKUP_CONF"
fi

sudo tee "$APACHE_CONF" > /dev/null << 'EOF'
#/etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
   ServerName eyedeea
   ServerAlias eyedeea.photos
   ServerAdmin deb@localhost
   ErrorLog ${APACHE_LOG_DIR}/error.log
   CustomLog ${APACHE_LOG_DIR}/access.log combined

   ProxyRequests Off
   ProxyPreserveHost On
   ProxyVia Full
   <Proxy *>
      Require all granted
   </Proxy>
      ProxyPass / http://127.0.0.1:8080/
      ProxyPassReverse / http://127.0.0.1:8080/
</VirtualHost>
EOF

# Restart Apache to apply changes
echo "🔄 Restarting Apache..."
sudo systemctl restart apache2 || handle_error $LINENO "Failed to restart Apache2"
echo "✅ Apache2 configured and restarted"

# ============================================================================
# 6. PREPARE APPLICATION
# ============================================================================
WWW_DIR="/var/www/html"
JSON_FILE="input.json"
APP_DIR="EyedeeaPhotos"
APP_DIR_FULL="$WWW_DIR/$APP_DIR"

echo "📁 Preparing application directory..."

if [ ! -d "$WWW_DIR" ]; then
    handle_error $LINENO "Directory $WWW_DIR does not exist"
fi

if [ -d "$APP_DIR_FULL" ]; then
    echo "🔄 Removing existing installation..."
    rm -rf "$APP_DIR_FULL" || handle_error $LINENO "Failed to remove existing app directory"
fi

mkdir -p "$APP_DIR_FULL" || handle_error $LINENO "Failed to create app directory"

# Copy input.json if it exists in current directory
if [ -f "$JSON_FILE" ]; then
    cp "$JSON_FILE" "$APP_DIR_FULL" || handle_error $LINENO "Failed to copy JSON file"
    echo "✅ Configuration file copied"
fi

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

LOG_DIR_2="/var/log/EyedeeaPhotos" #todo
sudo mkdir -p "$LOG_DIR_2" || handle_error $LINENO "Failed to create log directory 2"
sudo chmod -R 777 "$LOG_DIR_2" || handle_error $LINENO "Failed to set log directory permissions 2"

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

# Create ecosystem config file to ensure environment variables are persisted
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'Eyedeea Photos',
    script: '$APP_ENTRY',
    env: {
      EYEDEEA_KEY: '$EYEDEEA_KEY'
    },
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/app.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start PM2 daemon explicitly and start application
echo "🎯 Starting PM2 and application..."

# Determine the actual user running the script (not root if using sudo)
ACTUAL_USER="${SUDO_USER:-$(whoami)}"

# Ensure PM2 is started as the actual user
sudo -u "$ACTUAL_USER" pm2 ping || handle_error $LINENO "Failed to start PM2 daemon"
sudo -u "$ACTUAL_USER" pm2 start ecosystem.config.js || handle_error $LINENO "Failed to start Eyedeea Photos with PM2"
echo "✅ Eyedeea Photos started with PM2 (user: $ACTUAL_USER)"

# ============================================================================
# 11. CONFIGURE PM2 STARTUP ON BOOT
# ============================================================================
echo "⚙️ Configuring PM2 to start on system boot..."

# Determine the actual user running the script (not root if using sudo)
ACTUAL_USER="${SUDO_USER:-$(whoami)}"
ACTUAL_HOME=$(eval echo ~"$ACTUAL_USER")

echo "ℹ️  Running PM2 configuration for user: $ACTUAL_USER"
echo "ℹ️  Home directory: $ACTUAL_HOME"

# Save PM2 process list as the actual user
sudo -u "$ACTUAL_USER" pm2 save || handle_error $LINENO "Failed to save PM2 configuration"

# Configure PM2 systemd startup for the actual user
PM2_SERVICE="pm2-$ACTUAL_USER"
echo "🚀 Configuring PM2 systemd service for $ACTUAL_USER..."

# Run pm2 startup and execute the generated command
echo "Running pm2 startup command..."
STARTUP_OUTPUT=$(sudo -u "$ACTUAL_USER" pm2 startup systemd -u "$ACTUAL_USER" --hp "$ACTUAL_HOME" 2>&1)
echo "$STARTUP_OUTPUT"

# Extract and execute the sudo command from the output
STARTUP_CMD=$(echo "$STARTUP_OUTPUT" | grep "sudo env" | head -1)
if [ -n "$STARTUP_CMD" ]; then
    echo "Executing: $STARTUP_CMD"
    eval "$STARTUP_CMD" || handle_error $LINENO "Failed to execute PM2 startup command"
else
    echo "⚠️  No startup command found in output, service may already be configured"
fi

# Reload systemd to recognize the service
sudo systemctl daemon-reload || handle_error $LINENO "Failed to reload systemd"

# Enable the PM2 service to start on boot
sudo systemctl enable "$PM2_SERVICE" 2>/dev/null || echo "ℹ️  Service already enabled"

# Stop any running instance to ensure clean start
sudo systemctl stop "$PM2_SERVICE" 2>/dev/null || true

# Start the PM2 systemd service
sudo systemctl start "$PM2_SERVICE" || handle_error $LINENO "Failed to start PM2 service"

# Wait for the service to fully start
sleep 3

# Verify the service is running
if sudo systemctl is-active --quiet "$PM2_SERVICE"; then
    echo "✅ PM2 systemd service is running"
    
    # Verify apps are running
    sudo -u "$ACTUAL_USER" pm2 status
else
    echo "❌ PM2 service failed to start. Checking status..."
    sudo systemctl status "$PM2_SERVICE" || true
    handle_error $LINENO "PM2 service is not running"
fi

echo "✅ PM2 startup configured and verified"

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
