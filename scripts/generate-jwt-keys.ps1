# Gera um par de chaves RSA para JWT, codificadas em Base64

# Caminhos dos arquivos
$privateKeyPath = "jwtRS256.key"
$publicKeyPath = "jwtRS256.key.pub"

# Gera chave RSA privada com OpenSSL
openssl genpkey -algorithm RSA -out $privateKeyPath -pkeyopt rsa_keygen_bits:2048

# Gera chave pública a partir da privada
openssl rsa -in $privateKeyPath -pubout -out $publicKeyPath

# Lê os conteúdos
$privateKey = Get-Content $privateKeyPath -Raw
$publicKey = Get-Content $publicKeyPath -Raw

# Codifica em Base64 (caso queira o conteúdo inline em string base64)
$privateKeyBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($privateKey))
$publicKeyBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($publicKey))

# Opcional: salvar arquivos base64
Set-Content -Path "$privateKeyPath.base64" -Value $privateKeyBase64
Set-Content -Path "$publicKeyPath.base64" -Value $publicKeyBase64

Write-Host "✅ Chaves RSA geradas com sucesso:"
Write-Host "• Privada: $privateKeyPath"
Write-Host "• Pública: $publicKeyPath"
Write-Host "• Privada Base64: $privateKeyPath.base64"
Write-Host "• Pública Base64: $publicKeyPath.base64"