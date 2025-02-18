$source_type = Read-Host -Prompt "Enter source type(nas/fs):"
# $source_name = Read-Host -Prompt "Enter source name:"
$source_url = Read-Host -Prompt "Enter url (nas ex: https://192.168.86.218:5001/webapi | fs ex: D:\\photos):"
$source_user = Read-Host -Prompt "Enter user name (required for nas, else empty):"
$source_password = Read-Host -Prompt "Enter password (required for nas, else empty):"

$eyedeea_url = "http://127.0.0.1:8080"
try {
    $body_raw = [PSCustomObject]@{
        name = $source_type
        url = $source_url
        user = $source_user
        password = $source_password
    }
    $body = ConvertTo-Json $body_raw
    $response = Invoke-RestMethod -Uri $eyedeea_url"/api/sources" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Response:"
    $response | ConvertTo-Json
}
catch {
    Write-Host "Error:"
    Write-Host $_.Exception.Message
}