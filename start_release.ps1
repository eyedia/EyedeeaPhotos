# Eyedeea Photos Release Script
# Automates version bump, git tag, and release prep

# Get today's date and sequence number
$today = Get-Date -Format "yyyy.MM.dd"
$seq = 1

# Check if a release already exists today; increment sequence if needed
$existingTag = git tag -l "$today.*" | Sort-Object -Descending | Select-Object -First 1
if ($existingTag -match "$today\.(\d+)") {
    $lastSeq = [int]$matches[1]
    $seq = $lastSeq + 1
}

$version = "$today.$($seq.ToString('00'))"

Write-Host "Package Eyedeea Photos Release: $version" -ForegroundColor Cyan

# Verify required files exist
Write-Host "`nVerifying required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "release/install.ps1",
    "release/install.sh",
    "release/ep_a.apk",
    "release/ep_f.apk",
    "apps/desktop/bootstrap.ps1"
)

$missing = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Host "X Missing required files:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "OK All required files present" -ForegroundColor Green

# Update package.json version
Write-Host "`nUpdating package.json version to $version..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.version = $version
$packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"

# Update package-lock.json version
if (Test-Path "package-lock.json") {
    $packageLock = Get-Content "package-lock.json" -Raw | ConvertFrom-Json
    $packageLock.version = $version
    $packageLock.packages."".version = $version
    $packageLock | ConvertTo-Json -Depth 100 | Set-Content "package-lock.json"
}

# Create git commit with version update
Write-Host "`nCreating git commit..." -ForegroundColor Yellow
git add package.json package-lock.json 2>$null
git commit -m "Release: Eyedeea Photos $version"

# Create git tag
Write-Host "`nCreating git tag: $version" -ForegroundColor Yellow
git tag $version

# Push commits and tag
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push origin
git push origin $version

Write-Host "`nRelease prep complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to GitHub Releases: https://github.com/eyedia/EyedeeaPhotos/releases"
Write-Host "  2. Find tag '$version' and click 'Publish Release'"
Write-Host "  3. This will trigger npm-publish and release-assets workflows"
Write-Host "  4. Assets will be available at: https://github.com/eyedia/EyedeeaPhotos/releases/latest/download/" -ForegroundColor Cyan
