# SSL Sertifikası Oluşturma Scripti (Windows PowerShell)
# Bu script self-signed sertifika oluşturur (development/test için)
# Production için Let's Encrypt (certbot) kullanmanız önerilir.

param(
    [string]$Domain = "localhost"
)

$ErrorActionPreference = "Stop"

$SSL_DIR = ".\nginx\ssl"

Write-Host ""
Write-Host "🔐 SSL sertifikası oluşturuluyor: $Domain" -ForegroundColor Cyan
Write-Host ""

# SSL dizini oluştur
if (-not (Test-Path $SSL_DIR)) {
    New-Item -ItemType Directory -Path $SSL_DIR -Force | Out-Null
    Write-Host "✅ SSL dizini oluşturuldu: $SSL_DIR" -ForegroundColor Green
}

# OpenSSL kontrolü
$opensslPath = $null
$possiblePaths = @(
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files (x86)\Git\usr\bin\openssl.exe",
    "C:\OpenSSL-Win64\bin\openssl.exe",
    "C:\OpenSSL-Win32\bin\openssl.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $opensslPath = $path
        break
    }
}

# Git'in openssl'ini kullan
if ($null -eq $opensslPath) {
    try {
        $gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
        if ($gitPath) {
            $gitDir = Split-Path (Split-Path $gitPath -Parent) -Parent
            $opensslPath = Join-Path $gitDir "usr\bin\openssl.exe"
        }
    } catch {}
}

if ($null -eq $opensslPath -or -not (Test-Path $opensslPath)) {
    Write-Host "❌ OpenSSL bulunamadı!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Çözüm seçenekleri:" -ForegroundColor Yellow
    Write-Host "  1. Git for Windows yükleyin (Git Bash ile birlikte OpenSSL gelir)"
    Write-Host "  2. OpenSSL'i manuel olarak yükleyin: https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "  3. WSL (Windows Subsystem for Linux) kullanın"
    Write-Host ""
    Write-Host "Veya Docker kullanarak sertifika oluşturun:" -ForegroundColor Cyan
    Write-Host "  docker run --rm -v `${PWD}/nginx/ssl:/ssl alpine sh -c 'apk add openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /ssl/key.pem -out /ssl/cert.pem -subj /CN=$Domain'"
    exit 1
}

Write-Host "✅ OpenSSL bulundu: $opensslPath" -ForegroundColor Green

# Self-signed sertifika oluştur
Write-Host "📝 Sertifika oluşturuluyor..." -ForegroundColor Cyan

$keyPath = Join-Path $SSL_DIR "key.pem"
$certPath = Join-Path $SSL_DIR "cert.pem"

$subject = "/C=TR/ST=Istanbul/L=Istanbul/O=TofasFenLisesi/OU=IT/CN=$Domain"

# OpenSSL komutu
& $opensslPath req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout $keyPath `
    -out $certPath `
    -subj $subject

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SSL sertifikası başarıyla oluşturuldu!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Sertifika dizini: $SSL_DIR" -ForegroundColor White
    Write-Host "📄 Dosyalar:" -ForegroundColor White
    Write-Host "   - cert.pem (sertifika)" -ForegroundColor Gray
    Write-Host "   - key.pem  (private key)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  UYARI: Bu self-signed sertifika SADECE test/development içindir." -ForegroundColor Yellow
    Write-Host "   Production ortamında Let's Encrypt kullanın!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Docker ile çalıştırmak için:" -ForegroundColor Cyan
    Write-Host "   docker-compose --profile production up -d" -ForegroundColor White
} else {
    Write-Host "❌ Sertifika oluşturulamadı!" -ForegroundColor Red
    exit 1
}
