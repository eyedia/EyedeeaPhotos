
$eyedeea_url = "http://127.0.0.1:8080"

$source_type = Read-Host -Prompt "Enter source type(nas/fs)"
if(($source_type -ne "nas") -or ($source_type -ne "nas")){
    $source_type = "fs"
}
$source_name = Read-Host -Prompt "Enter source name"
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
        name = $source_name
        type = $source_type
        url = $source_url 
        user = $source_user
        password = $source_password
    }
    $body = ConvertTo-Json $body_raw
    $response = Invoke-RestMethod -Uri $eyedeea_url"/api/sources" -Method Post -Body $body -ContentType "application/json"
    
    $source_id = $response.id
    Write-Host "New source registered. id": $source_id

    $yes_no = Read-Host -Prompt "Do you want to start scan (y/n)?"
    $uri = $eyedeea_url + "/api/sources/" + $source_id + "/scan"
    Write-Host $uri
    if($yes_no -eq "y"){
        $response = Invoke-RestMethod -Uri $uri -Method Post
        Write-Host $response
    }
}
catch {
    Write-Host "Error:"
    Write-Host $_.Exception.Message
}
