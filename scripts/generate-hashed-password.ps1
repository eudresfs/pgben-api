# Define a senha a ser criptografada
$senha = Read-Host "Digite a senha para gerar o hash"

# Cria um script temporário em Node.js
$scriptNode = @"
const bcrypt = require('bcrypt');

const senha = '$senha';
bcrypt.hash(senha, 10).then(hash => {
    console.log('Hash gerado: ' + hash);
}).catch(err => {
    console.error('Erro ao gerar hash:', err);
});
"@

# Salva o script Node.js em um arquivo temporário
$tempFile = "$env:TEMP\gerarHashTemp.js"
Set-Content -Path $tempFile -Value $scriptNode -Encoding UTF8

# Executa o script com Node.js
node $tempFile

# Remove o script temporário (opcional)
Remove-Item $tempFile
