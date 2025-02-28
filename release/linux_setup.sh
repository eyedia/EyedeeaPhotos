#!/bin/bash

eyedeea_url="http://127.0.0.1:8080"
set_key() {
    key_hex=$(openssl rand -hex 32)
    export EYEDEEA_KEY="$key_hex"
    echo "EYEDEEA_KEY set successfully"
}
set_key

read -p "Enter source type (nas/fs): " source_type
if [[ "$source_type" != "nas" && "$source_type" != "fs" ]]; then
    source_type="fs"
fi

read -p "Enter source name: " source_name

url_prompt="Enter photo repository (e.g. /home/user/photos): "
if [[ "$source_type" == "nas" ]]; then
    url_prompt="Enter Synology NAS URL (e.g. https://192.168.86.218:5001/webapi): "
fi

read -p "$url_prompt" source_url

source_user=""
source_password=""
if [[ "$source_type" == "nas" ]]; then
    read -p "Enter Synology NAS username: " source_user
    read -s -p "Enter Synology NAS password: " source_password
    echo ""
fi

body_raw=$(jq -n --arg name "$source_name" \
              --arg type "$source_type" \
              --arg url "$source_url" \
              --arg user "$source_user" \
              --arg password "$source_password" \
              '{name: $name, type: $type, url: $url, user: $user, password: $password}')

response=$(curl -s -X POST "$eyedeea_url/api/sources" -H "Content-Type: application/json" -d "$body_raw")
source_id=$(echo "$response" | jq -r '.id')

if [[ "$source_id" != "null" && -n "$source_id" ]]; then
    echo "New source registered. ID: $source_id"
    read -p "Do you want to start scan (y/n)? " yes_no
    if [[ "$yes_no" == "y" ]]; then
        scan_response=$(curl -s -X POST "$eyedeea_url/api/sources/$source_id/scan")
        echo "$scan_response"
    fi
    echo "Opening Eyedeea Photos... Refresh browser after scanning completes."
    xdg-open "http://127.0.0.1:8080" &>/dev/null &
else
    echo "Error: Failed to register source."
fi
