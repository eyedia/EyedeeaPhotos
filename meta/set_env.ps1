$key = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$key.GetBytes($bytes)
$keyHex = ([BitConverter]::ToString($bytes)) -replace '-', ''
[System.Environment]::SetEnvironmentVariable("EYEDEEA_KEY", $keyHex, [System.EnvironmentVariableTarget]::User)