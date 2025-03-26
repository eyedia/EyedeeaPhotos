$node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi"
$node_file = "node.msi"
$current_dir = Get-Item $PSScriptRoot
$appdataRoaming = [Environment]::GetFolderPath("ApplicationData")
$node_path = "C:\Program Files\nodejs\npm.cmd"
$app_path = Join-Path -Path $env:LOCALAPPDATA -ChildPath "EyediaTech\EyedeeaPhotos\app"

Function Set-Key () {
    $key = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    $key.GetBytes($bytes)
    $keyHex = ([BitConverter]::ToString($bytes)) -replace '-', ''
    [System.Environment]::SetEnvironmentVariable("EYEDEEA_KEY", $keyHex, [System.EnvironmentVariableTarget]::User)
}

Function Execute-Command ($cmd, $arg, $working_dir) {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $cmd
    $pinfo.RedirectStandardError = $true
    $pinfo.RedirectStandardOutput = $true
    $pinfo.UseShellExecute = $false
    $pinfo.Arguments = $arg
    $pinfo.WorkingDirectory = $working_dir
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    $p.Start() | Out-Null
    $p.WaitForExit()
    [pscustomobject]@{        
        stdout   = $p.StandardOutput.ReadToEnd()
        stderr   = $p.StandardError.ReadToEnd()
        ExitCode = $p.ExitCode
    }
}

Set-Key

# Check if Node.js is installed
Write-Host -NoNewline "Checking Node.js installation..."
$output = Execute-Command -cmd "node" -arg "-v" -working_dir $current_dir
$node_ver = $output.stdout.ToString().Trim()

if ($node_ver -eq "") {
    Write-Host " not found! Installing Node.js..."
    if (!(Test-Path -Path $node_file)) {        
        Invoke-WebRequest -Uri $node_url -OutFile $node_file
    }
    Start-Process "msiexec.exe" -ArgumentList "/i $node_file TARGETDIR=""C:\Program Files\nodejs\"" ADDLOCAL=ALL /qn" -Wait
    Write-Host "Node.js installed successfully!"
} else {
    Write-Host " found! Version: $node_ver"
}

# Install PM2 globally
Write-Host -NoNewline "Checking PM2 installation..."
if (!(Test-Path -Path "$appdataRoaming\npm\pm2.cmd")) {    
    Execute-Command -cmd $node_path -arg "install pm2 -g" -working_dir $current_dir | Out-Null
    Write-Host "done!"
} else {
    Write-Host "already installed."
}

# Ensure App Directory Exists
if (!(Test-Path $app_path)) {
    New-Item -ItemType Directory -Path $app_path -Force | Out-Null
    Write-Output "Directory created: $app_path"
} 

# Install Eyedeea Photos
Write-Host -NoNewline "Installing Eyedeea Photos..."
$output = Execute-Command -cmd $node_path -arg "install --prefix $app_path eyedeeaphotos" -working_dir $app_path
$install_error = $output.stderr.ToString().Trim()
$exit_code = $output.ExitCode.ToString().Trim()
if ($exit_code -ne "0") {
    Write-Host "Error: $install_error"
    exit 100
}
Write-Host "done!"

# Start the server
Write-Host -NoNewline "Starting Eyedeea Photos server..."
$eyedeea_dir = "$app_path\node_modules\eyedeeaphotos"
$output = Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "start app.js --name ""Eyedeea Photos""" -working_dir $eyedeea_dir
$pm2_result = $output.stdout.ToString().Trim()

if (($pm2_result -like "*Done*") -or ($pm2_result -eq "")) {
    Write-Host "done!"
} else {
    Write-Host "Something went wrong! Try re-running the installer."
}

# Open Browser
Write-Host "Opening Eyedeea Photos: http://127.0.0.1:8080/manage"
Start-Process "http://127.0.0.1:8080"
Start-Process "http://127.0.0.1:8080/manage"

Write-Host "Setup complete! Enjoy Eyedeea Photos!"
