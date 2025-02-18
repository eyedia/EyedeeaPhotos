$inputFolder = "D:\Work\EyedeeaPhotos"
$ouputFileName = "D:\temp\eyedeea_src.zip"
$excludeFolders = @("node_modules", "logs", ".github", "public", "tests")


$tempFolder = [System.IO.Path]::GetTempFileName()
Remove-Item $tempFolder -Force
New-Item -Type  Directory -Path $tempFolder -Force
$exclude =@()
$excludeFolders | ForEach-Object {
 $exclude+=(Join-Path $inputFolder $_) 
 Get-ChildItem (Join-Path $inputFolder $_) -Recurse | 
  ForEach-Object{$exclude+=$_.FullName}}
Get-ChildItem $inputFolder -Recurse | Where-Object { $_.FullName -notin $exclude} |
 Copy-Item -Destination {Join-Path $tempFolder $_.FullName.Substring($inputFolder.length)}

Get-ChildItem $tempFolder |
Compress-Archive -DestinationPath $ouputFileName -Update
# Remove-Item $tempFolder -Force -Recurse

Write-Host "Successfully created zip file: $ouputFileName"