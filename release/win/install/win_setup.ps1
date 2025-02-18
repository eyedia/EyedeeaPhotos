
$eyedeea_url = "http://127.0.0.1:8080"
#currently we have hardcoded source id, we will create NAS by ourselves to lock id 1
try {
    $body_raw = [PSCustomObject]@{
        name = "nas"
        url = "http://192.168.90.101:5001/webapi"
        user = "eyedeea_player"
        password = "password"
    }
    $body = ConvertTo-Json $body_raw
    $response = Invoke-RestMethod -Uri $eyedeea_url"/api/sources" -Method Post -Body $body -ContentType "application/json"
    # Write-Host "Response:"
    # $response | ConvertTo-Json
}
catch {
    Write-Host "Error:"
    Write-Host $_.Exception.Message
}

$source_type = Read-Host -Prompt "Enter source type(nas/fs)"
if(($source_type -ne "nas") -or ($source_type -ne "nas")){
    $source_type = "fs"
}
# $source_name = Read-Host -Prompt "Enter source name:"
$url_prompt = "Enter photo repository (e.g. D:\photos)"
if($source_type -eq "nas"){
    $url_prompt = "Enter Synlogy NAS url (e.g.https://192.168.86.218:5001/webapi)"
}

$source_url = Read-Host -Prompt $url_prompt

$source_user = ""
$source_password = ""
if($source_type -eq "nas"){
    $source_user = Read-Host -Prompt "Enter Synlogy NAS user name"
    $source_password = Read-Host -Prompt "Enter Synlogy NAS password"
}

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
