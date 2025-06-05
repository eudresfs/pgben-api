// Script de teste para verificar se as configurações de ambiente estão funcionando
console.log('🧪 Testando carregamento de configurações de ambiente...\n');

// Teste 1: Verificar se o dotenv está carregando
require('dotenv').config();
console.log('1. Teste dotenv direto:');
console.log(`   DB_HOST: ${process.env.DB_HOST || 'UNDEFINED'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'UNDEFINED'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'UNDEFINED'}`);
console.log(`   DB_USER: ${process.env.DB_USER || 'UNDEFINED'}\n`);

// Teste 2: Verificar se o arquivo .env existe
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');
console.log('2. Verificação do arquivo .env:');
console.log(`   Caminho: ${envPath}`);
console.log(`   Existe: ${fs.existsSync(envPath) ? 'SIM' : 'NÃO'}\n`);

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbLines = envContent.split('\n').filter(line => 
    line.startsWith('DB_') && !line.startsWith('#')
  );
  console.log('3. Variáveis DB_ encontradas no .env:');
  dbLines.forEach(line => {
    console.log(`   ${line}`);
  });
} else {
  console.log('3. ❌ Arquivo .env não encontrado!');
  console.log('   Certifique-se de que existe um arquivo .env na raiz do projeto.');
}

console.log('\n🔍 Teste concluído.');
