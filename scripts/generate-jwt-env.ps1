# Caminho do executável OpenSSL
$openssl = "C:\OpenSSL-Win64\bin\openssl.exe"

# Verifica se o OpenSSL existe
if (-Not (Test-Path $openssl)) {
    Write-Error "❌ OpenSSL não encontrado em: $openssl"
    exit 1
}

# Caminhos temporários
$temp = [System.IO.Path]::GetTempPath()
$privateKeyPath = Join-Path $temp "jwt-private.pem"
$publicKeyPath  = Join-Path $temp "jwt-public.pem"

# Gera chave privada
& $openssl genpkey -algorithm RSA -out $privateKeyPath -pkeyopt rsa_keygen_bits:2048

# Gera chave pública
& $openssl rsa -in $privateKeyPath -pubout -out $publicKeyPath

# Codifica as chaves em base64
$privateKeyBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($privateKeyPath))
$publicKeyBase64  = [Convert]::ToBase64String([IO.File]::ReadAllBytes($publicKeyPath))

# Gera secrets randômicos para JWT_SECRET e JWT_REFRESH_SECRET
$jwtSecret         = [Convert]::ToBase64String([Guid]::NewGuid().ToByteArray())
$jwtRefreshSecret  = [Convert]::ToBase64String([Guid]::NewGuid().ToByteArray())

# Conteúdo final
$envContent = @"
JWT_SECRET=$jwtSecret
JWT_REFRESH_SECRET=$jwtRefreshSecret
JWT_PRIVATE_KEY_BASE64=$privateKeyBase64
JWT_PUBLIC_KEY_BASE64=$publicKeyBase64
"@

# Escreve no arquivo .env.jwt
$envPath = ".env.jwt"
$envContent | Out-File -Encoding utf8 -FilePath $envPath

# Copia as chaves para a pasta de segredos (opcional)
$secretsPath = ".\secrets"
if (-Not (Test-Path $secretsPath)) {
    New-Item -ItemType Directory -Path $secretsPath | Out-Null
}

Copy-Item $privateKeyPath -Destination (Join-Path $secretsPath "jwt-private.pem") -Force
Copy-Item $publicKeyPath  -Destination (Join-Path $secretsPath "jwt-public.pem") -Force

# Limpa arquivos temporários
Remove-Item $privateKeyPath, $publicKeyPath

Write-Host "`n✅ Arquivo '.env.jwt' gerado com sucesso!"
Write-Host "📂 Caminho: $(Resolve-Path $envPath)"
