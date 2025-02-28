$node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi" 
$node_file = "node.msi"
$node_ver = ""
$current_dir = Get-Item $PSScriptRoot
$appdataRoaming = [Environment]::GetFolderPath("ApplicationData")

Function Set-key () {
    $key = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 32
    $key.GetBytes($bytes)
    $keyHex = ([BitConverter]::ToString($bytes)) -replace '-', ''
    [System.Environment]::SetEnvironmentVariable("EYEDEEA_KEY", $keyHex, [System.EnvironmentVariableTarget]::User)
}
Set-key
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

$output = Execute-Command -cmd "node" -arg "-v"
$node_ver = $output.stdout.ToString().Trim()

Write-Host -NoNewline "Installing node..."
if ($node_ver -eq "") {
    if (!(Test-Path -Path $node_file)) {        
        Invoke-WebRequest $node_url -OutFile $node_file
        msiexec /i node.msi TARGETDIR="C:\Program Files\nodejs\" ADDLOCAL="NodePerfCtrSupport,NodeEtwSupport,DocumentationShortcuts,EnvironmentPathNode,EnvironmentPathNpmModules,npm,NodeRuntime,EnvironmentPath" /qn
        Write-Host "done!"
    }
}else{
    Write-Host "found! v:$node_ver."
}

Write-Host -NoNewline "Installing pm2..."
if (!(Test-Path -Path $appdataRoaming\npm\pm2.cmd)) {    
    $output = Execute-Command -cmd "npm" -arg "install pm2 -g"
    Write-Host "done!"
}else{
    Write-Host "found!"
}

Write-Host -NoNewline "Installing Eyedeea Photos..."
$output = Execute-Command -cmd "C:\Program Files\nodejs\npm.cmd" -arg " install eyedeeaphotos" -working_dir $current_dir
$install_error = $output.stderr.ToString().Trim()
$exit_code = $output.ExitCode.ToString().Trim()
if ($exit_code -ne "0"){
    Write-Host $install_error
    exit 100
}
Write-Host "done!"

Write-Host -NoNewline "Setting up the server..."
$eyedeea_dir = "$current_dir\node_modules\eyedeeaphotos"
$output = Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "start app.js --name ""Eyedeea Photos""" -working_dir $eyedeea_dir
$pm2_result = $output.stdout.ToString().Trim()
if (($pm2_result -like "*Done*") -or ($pm2_result -eq "")) {    #if the app is already listed, PM2 returns empty string (when someone re-runs the installer)
    Write-Host "done!"    
} else {
    Write-Host "Something went wrong! Re-running the installer may solve the problem."
}
Write-Host "All good! Let's configure Eyedeea Photos..."
.\setup.ps1