$node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi" 
$node_file = "node.msi"
$node_ver = ""
$appdataRoaming = [Environment]::GetFolderPath("ApplicationData")
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
#$output = Execute-Command -cmd "C:\Program Files\nodejs\npm.cmd" -arg " install eyedeeaphotos"
Write-Host "done!"

Write-Host -NoNewline "Starting Eyedeea Photos..."
$current_dir = Get-Item $PSScriptRoot
$eyedeea_dir = "$current_dir\node_modules\eyedeeaphotos"
Set-Location $eyedeea_dir
$output = Execute-Command -cmd "$appdataRoaming\npm\pm2.cmd" -arg "start app.js --name ""Eyedeea Photos"""
Write-Host $output
Set-Location $current_dir



# $cur_dir = Get-Item $PSScriptRoot
# $app_root_dir = $cur_dir.Parent.Parent.Parent.FullName

# Set-Location $app_root_dir
# Write-Host $app_root_dir $cur_dir

# $command = "C:\Program Files\nodejs\npm.cmd"
# $arguments = "install"
# $proc = Start-Process $command $arguments -NoNewWindow -PassThru
# $proc.WaitForExit()

# $appdataRoaming = [Environment]::GetFolderPath("ApplicationData")

# $command = "$appdataRoaming\npm\pm2.cmd"
# $arguments = "start app.js --name ""Eyedeea Photos"""
# $proc = Start-Process $command $arguments -NoNewWindow -PassThru
# $proc.WaitForExit()

# Set-Location $cur_dir
# Write-Host "Done"
# .\win_setup.ps1