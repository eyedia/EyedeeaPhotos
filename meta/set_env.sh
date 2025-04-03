#!/bin/bash

if [[ -z "$EYEDEEA_KEY" ]]; then
    key_hex=$(openssl rand -hex 32)
    export EYEDEEA_KEY="$key_hex"

    echo "export EYEDEEA_KEY=\"$key_hex\"" >> ~/.bashrc
    echo "export EYEDEEA_KEY=\"$key_hex\"" >> ~/.profile
    echo "EYEDEEA_KEY set successfully for user: $USER"
else
    echo "EYEDEEA_KEY is already set."
fi
