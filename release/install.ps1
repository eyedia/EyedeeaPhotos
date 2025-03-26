param (
    [string]$Action = "install" # Default action is "install"
)

$app_path = Join-Path -Path $env:LOCALAPPDATA -ChildPath "EyediaTech\EyedeeaPhotos\app"
$appdataRoaming = [Environment]::GetFolderPath("ApplicationData")
$node_path = "C:\Program Files\nodejs\npm.cmd"
$node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi"
$node_file = "node.msi"

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

Function Install-EyedeeaPhotos {
    Write-Host "Installing Eyedeea Photos..."

    # Check if Node.js is installed
    $output = Execute-Command -cmd "node" -arg "-v" -working_dir $app_path
    if (-not $output.stdout) {
        Write-Host "Node.js not found, installing..."
        Invoke-WebRequest $node_url -OutFile $node_file
        Start-Process "msiexec.exe" -ArgumentList "/i $node_file /qn" -Wait
        Write-Host "Node.js installed."
    } else {
        Write-Host "Node.js found, version: $($output.stdout.Trim())"
    }

    # Check and install PM2
    if (!(Test-Path "$appdataRoaming\npm\pm2.cmd")) {
        Write-Host "Installing pm2..."
        Execute-Command -cmd $node_path -arg "install pm2 -g" -working_dir $app_path | Out-Null
        Write-Host "PM2 installed."
    } else {
        Write-Host "PM2 already installed."
    }

    # Create application directory if not exists
    if (!(Test-Path $app_path)) {
        New-Item -ItemType Directory -Path $app_path -Force | Out-Null
        Write-Host "Created application directory: $app_path"
    }

    # Install Eyedeea Photos
    Write-Host "Installing Eyedeea Photos package..."
    $output = Execute-Command -cmd $node_path -arg "install eyedeeaphotos" -working_dir $app_path
    if ($output.ExitCode -ne 0) {
        Write-Host "Installation failed: $($output.stderr.Trim())"
        exit 100
    }
    Write-Host "Eyedeea Photos installed."

    # Start the application
    Write-Host "Starting Eyedeea Photos server..."
    $eyedeea_dir = "$app_path\node_modules\eyedeeaphotos"
    Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "start app.js --name ""Eyedeea Photos""" -working_dir $eyedeea_dir | Out-Null
    Write-Host "Eyedeea Photos started."

    # Open the application in the browser
    Start-Process "http://127.0.0.1:8080/manage"
    Write-Host "Eyedeea Photos setup complete!"
}

Function Uninstall-EyedeeaPhotos {
    Write-Host "Uninstalling Eyedeea Photos..."

    # Stop PM2 process
    if (Test-Path "$appdataRoaming\npm\pm2.cmd") {
        Write-Host "Stopping PM2 process..."
        Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "stop Eyedeea Photos" -working_dir $app_path | Out-Null
        Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "delete Eyedeea Photos" -working_dir $app_path | Out-Null
        Write-Host "PM2 process stopped."
    }

    # Kill all Node.js processes
    Write-Host "Killing Node.js processes..."
    Get-Process "node" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force }
    Write-Host "Node.js processes killed."

    # Uninstall Eyedeea Photos
    if (Test-Path $node_path) {
        Write-Host "Uninstalling Eyedeea Photos package..."
        Execute-Command -cmd $node_path -arg "uninstall eyedeeaphotos -g" -working_dir $app_path | Out-Null
        Write-Host "Eyedeea Photos uninstalled."
    }

    # Remove PM2 if not needed
    $pm2_apps = Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "list" -working_dir $app_path
    if ($pm2_apps.stdout -match "No processes") {
        Write-Host "No PM2 apps found, uninstalling PM2..."
        Execute-Command -cmd $node_path -arg "uninstall pm2 -g" -working_dir $app_path | Out-Null
        Write-Host "PM2 removed."
    }

    # Remove application directory
    if (Test-Path $app_path) {
        Write-Host "Removing Eyedeea Photos directory..."
        Remove-Item -Path $app_path -Recurse -Force
        Write-Host "Application directory deleted."
    }

    Write-Host "Uninstallation complete!"
}

# Execute based on command-line parameter
if ($Action -eq "install") {
    Install-EyedeeaPhotos
} elseif ($Action -eq "uninstall") {
    Uninstall-EyedeeaPhotos
} else {
    Write-Host "Invalid argument! Use 'install' or 'uninstall'."
    exit 1
}
