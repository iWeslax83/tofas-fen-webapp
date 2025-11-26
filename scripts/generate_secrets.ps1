<#
Generates strong secrets and writes them to .new_secrets.env in the repo root.
This file is written locally only and the script will NOT commit the file.
#>

param(
    [int]$Bytes = 48
)

function New-RandomHex($count) {
    $bytes = New-Object 'System.Byte[]' $count
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ([System.BitConverter]::ToString($bytes)).Replace('-','').ToLower()
}

$secrets = @{
    JWT_SECRET = New-RandomHex 48
    JWT_REFRESH_SECRET = New-RandomHex 64
    MONGO_PASSWORD = New-RandomHex 24
    SMTP_PASS = New-RandomHex 24
    REDIS_PASSWORD = New-RandomHex 24
    SESSION_SECRET = New-RandomHex 48
}

$outFile = Join-Path (Get-Location) '.new_secrets.env'
Write-Host "Writing generated secrets to $outFile (local only). Do NOT commit this file."

"# Generated secrets - keep this file local and copy values to your secret manager" | Out-File -FilePath $outFile -Encoding utf8
foreach ($k in $secrets.Keys) {
    "{0}={1}" -f $k, $secrets[$k] | Out-File -FilePath $outFile -Append -Encoding utf8
}

Write-Host "Generated secrets written. Next: run scripts\clean_git_history.ps1 to purge old values from Git history (dry-run first)."
