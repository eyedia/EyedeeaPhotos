Remove-Item -Path $PSScriptRoot\EyedeeaPhotos -Recurse -ErrorAction SilentlyContinue -Force -Confirm:$false

$command = "git"
$arguments = "clone --branch=main https://github.com/eyedia/EyedeeaPhotos.git"
$proc = Start-Process $command $arguments -NoNewWindow -PassThru
$proc.WaitForExit()


$files_to_delete = ".gitignore", "babel.config.js", "jest.config.js", "package-lock.json", "graphics", "tests", ".git", ".github", "ps_commands.txt", "release\win\pack"
foreach ($file in $files_to_delete) {
    Remove-Item -Path $PSScriptRoot\EyedeeaPhotos\$file -Recurse -ErrorAction SilentlyContinue -Force -Confirm:$false
}

$install_folder = Get-Item $PSScriptRoot
$zip_file = $install_folder.Parent.Parent.FullName

.\win_zip.ps1 -input_folder $PSScriptRoot\EyedeeaPhotos -zip_file $zip_file\win\install\EyedeeaPhotos.zip

