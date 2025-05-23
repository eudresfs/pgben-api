/**
 * Script para gerar chaves RSA para autenticação JWT
 * 
 * Este script gera um par de chaves RSA (privada e pública) para
 * ser usado na autenticação JWT do PGBEN.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Diretório para armazenar as chaves
const KEYS_DIR = path.join(__dirname, '..', 'keys');

// Verificar se o diretório existe, senão criar
if (!fs.existsSync(KEYS_DIR)) {
  console.log(`Criando diretório ${KEYS_DIR}`);
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

// Função para gerar as chaves
function generateKeys() {
  console.log('Gerando par de chaves RSA...');
  
  // Gerar par de chaves RSA
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // Salvar chaves em arquivos
  const privateKeyPath = path.join(KEYS_DIR, 'private.key');
  const publicKeyPath = path.join(KEYS_DIR, 'public.key');
  
  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);
  
  console.log(`✅ Chave privada salva em: ${privateKeyPath}`);
  console.log(`✅ Chave pública salva em: ${publicKeyPath}`);
  
  // Exibir instruções para .env
  console.log('\n===== INSTRUÇÕES PARA CONFIGURAÇÃO =====');
  console.log('Adicione as seguintes linhas ao seu arquivo .env:');
  console.log('JWT_ALGORITHM=RS256');
  console.log(`JWT_PRIVATE_KEY_PATH=keys/private.key`);
  console.log(`JWT_PUBLIC_KEY_PATH=keys/public.key`);
  console.log('JWT_ACCESS_TOKEN_EXPIRES_IN=1h');
  console.log('JWT_REFRESH_TOKEN_EXPIRES_IN=7d');
  console.log('==========================================');
}

// Executar a geração
generateKeys();
