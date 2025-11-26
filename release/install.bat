@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/eyedia/EyedeeaPhotos/refs/heads/main/release/install.ps1'))"
pause
