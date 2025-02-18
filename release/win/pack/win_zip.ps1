param (
    [string]$input_folder,
    [string]$zip_file
)

Write-Output "Zip params: $input_folder $zip_file"
$exclude_folders = @("node_modules", "logs", ".github", "public", "tests")

$tempFolder = [System.IO.Path]::GetTempFileName()
Remove-Item $tempFolder -Force
New-Item -Type  Directory -Path $tempFolder -Force
$exclude =@()
$exclude_folders | ForEach-Object {
 $exclude+=(Join-Path $input_folder $_) 
 Get-ChildItem (Join-Path $input_folder $_) -Recurse | 
  ForEach-Object{$exclude+=$_.FullName}}
Get-ChildItem $input_folder -Recurse | Where-Object { $_.FullName -notin $exclude} |
 Copy-Item -Destination {Join-Path $tempFolder $_.FullName.Substring($input_folder.length)}

Get-ChildItem $tempFolder |
Compress-Archive -DestinationPath $zip_file -Update
Remove-Item $tempFolder -Force -Recurse

Remove-Item -Path $input_folder -Recurse -ErrorAction SilentlyContinue -Force -Confirm:$false
Write-Host "Successfully created zip file: $zip_file"