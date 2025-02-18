# $node_url = "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi" 
# $node_file = "node.msi"
# $node_ver = ""

# try {
#     $node_ver = &"C:\Program Files\nodejs\node1.exe" -v | Out-String
# }
# catch {}
# Write-Host $node_ver
# if ($node_ver -eq ""){
#     if (!(Test-Path -Path $node_file)) {
#         Write-Host "Downloading set 1..."
#         Invoke-WebRequest $node_url -OutFile $node_file
#         # msiexec /i node.msi TARGETDIR="C:\Program Files\nodejs\" ADDLOCAL="NodePerfCtrSupport,NodeEtwSupport,DocumentationShortcuts,EnvironmentPathNode,EnvironmentPathNpmModules,npm,NodeRuntime,EnvironmentPath" /qn
#     }
# }
# $command = "C:\Program Files\nodejs\npm.cmd"
# $arguments = "install pm2 -g"
# $proc = Start-Process $command $arguments -NoNewWindow -PassThru
# $proc.WaitForExit()
# Write-Host "Done"

$cur_dir = Get-Item $PSScriptRoot
$app_root_dir = $cur_dir.Parent.Parent.Parent.FullName

Set-Location $app_root_dir
Write-Host $app_root_dir $cur_dir

$command = "C:\Program Files\nodejs\npm.cmd"
$arguments = "install"
$proc = Start-Process $command $arguments -NoNewWindow -PassThru
$proc.WaitForExit()

$appdataRoaming = [Environment]::GetFolderPath("ApplicationData")

$command = "$appdataRoaming\npm\pm2.cmd"
$arguments = "start app.js --name ""Eyedeea Photos"""
$proc = Start-Process $command $arguments -NoNewWindow -PassThru
$proc.WaitForExit()

Set-Location $cur_dir
Write-Host "Done"
.\win_setup.ps1