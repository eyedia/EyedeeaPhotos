# Verify required files exist
Test-Path release/install.ps1; Test-Path release/install.sh; Test-Path release/ep_a.apk; Test-Path release/ep_f.apk; Test-Path apps/desktop/bootstrap.ps1

# Create and push tag
git add -A
git commit -m "Prep release 2025.12.15.01"
git tag 2025.12.15.01
git push origin 2025.12.15.01