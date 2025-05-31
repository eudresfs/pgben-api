#!/usr/bin/env node

/**
 * Script para gerar chaves RSA para autenticação JWT
 * 
 * Este script gera um par de chaves RSA (privada e pública) para
 * ser usado na autenticação JWT, com suporte para ambientes
 * containerizados (Kubernetes) e desenvolvimento local.
 * 
 * @fileoverview Gerador de chaves JWT RSA para o Sistema SEMTAS
 * @author Sistema SEMTAS - PGBEN
 * @version 1.0.0
 * @since 2024
 * 
 * @tags jwt, rsa, keys, security, authentication, kubernetes, docker
 * @category Security
 * @subcategory Authentication
 * 
 * Uso:
 *   node scripts/gerar-chaves-jwt.js [--output-format=files|base64|env] [--key-size=2048]
 * 
 * @example
 * // Gerar chaves em arquivos (desenvolvimento local)
 * node scripts/gerar-chaves-jwt.js
 * 
 * @example
 * // Gerar chaves em base64 (Kubernetes)
 * node scripts/gerar-chaves-jwt.js --output-format=base64
 * 
 * @example
 * // Gerar chaves como variáveis de ambiente
 * node scripts/gerar-chaves-jwt.js --output-format=env --key-size=4096
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configurações padrão
const DEFAULT_CONFIG = {
  keySize: 2048,
  outputFormat: 'files', // files, base64, env, k8s
  keysDir: path.join(__dirname, '..', 'keys'),
  algorithm: 'RS256',
  force: false
};

/**
 * Processa argumentos da linha de comando
 * 
 * @function parseArgs
 * @description Analisa e valida os argumentos passados via linha de comando
 * @returns {Object} Configuração processada com os parâmetros validados
 * @throws {Error} Quando argumentos inválidos são fornecidos
 * 
 * @tags cli, arguments, validation, configuration
 * @category Utilities
 * @subcategory CLI
 * 
 * @example
 * // Retorna configuração padrão se nenhum argumento for passado
 * const config = parseArgs();
 * // { keySize: 2048, outputFormat: 'files', keysDir: './keys', algorithm: 'RS256' }
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  args.forEach(arg => {
    if (arg.startsWith('--output-format=')) {
      const format = arg.split('=')[1];
      if (!['files', 'base64', 'env', 'k8s'].includes(format)) {
        console.error('❌ Formato inválido. Use: files, base64, env ou k8s');
        process.exit(1);
      }
      config.outputFormat = format;
    }
    
    if (arg === '--force') {
      config.force = true;
    }
    
    if (arg.startsWith('--key-size=')) {
      const size = parseInt(arg.split('=')[1]);
      if (![2048, 3072, 4096].includes(size)) {
        console.error('❌ Tamanho de chave inválido. Use: 2048, 3072 ou 4096');
        process.exit(1);
      }
      config.keySize = size;
    }
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  });
  
  return config;
}

/**
 * Exibe ajuda do script
 */
function showHelp() {
  console.log(`
Uso: node scripts/gerar-chaves-jwt.js [opções]

Opções:
  --output-format=FORMAT  Formato de saída (files|base64|env) [padrão: files]
  --key-size=SIZE         Tamanho da chave RSA (2048|3072|4096) [padrão: 2048]
  --help, -h              Exibe esta ajuda

Formatos de saída:
  files   - Salva chaves em arquivos (desenvolvimento local)
  base64  - Exibe chaves em base64 (para Kubernetes Secrets)
  env     - Exibe variáveis de ambiente (para .env)
  k8s     - Gera manifesto Kubernetes completo

Opções:
  --force - Força regeneração sem confirmação

Exemplos:
  node scripts/gerar-chaves-jwt.js
  node scripts/gerar-chaves-jwt.js --output-format=base64
  node scripts/gerar-chaves-jwt.js --output-format=env --key-size=4096
  node scripts/gerar-chaves-jwt.js --output-format=k8s --force
  `);
}

/**
 * Verifica se as chaves já existem
 */
function checkExistingKeys(keysDir) {
  const privateKeyPath = path.join(keysDir, 'private.key');
  const publicKeyPath = path.join(keysDir, 'public.key');
  
  const keyFilesExist = fs.existsSync(privateKeyPath) || fs.existsSync(publicKeyPath);
  
  if (keyFilesExist) {
    return { 
      privateKeyPath, 
      publicKeyPath, 
      exists: true 
    };
  }
  
  return { 
    privateKeyPath, 
    publicKeyPath, 
    exists: false 
  };
}

/**
 * Valida as chaves geradas
 * 
 * @function validateKeys
 * @description Testa se as chaves RSA geradas funcionam corretamente através de assinatura e verificação
 * @param {string} privateKey - Chave privada RSA em formato PEM
 * @param {string} publicKey - Chave pública RSA em formato PEM
 * @returns {boolean} true se as chaves são válidas, false caso contrário
 * 
 * @tags validation, cryptography, rsa, testing, security
 * @category Security
 * @subcategory Validation
 * 
 * @example
 * // Validar um par de chaves geradas
 * const isValid = validateKeys(privateKey, publicKey);
 * if (isValid) {
 *   console.log('Chaves válidas!');
 * }
 */
function validateKeys(privateKey, publicKey) {
  try {
    // Testa assinatura e verificação
    const data = 'test-data-for-validation';
    const signature = crypto.sign('sha256', Buffer.from(data), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    });
    
    const isValid = crypto.verify('sha256', Buffer.from(data), {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    }, signature);
    
    return isValid;
  } catch (error) {
    console.error('❌ Erro na validação das chaves:', error.message);
    return false;
  }
}

/**
 * Gera as chaves RSA
 * 
 * @function generateKeyPair
 * @description Gera um par de chaves RSA (privada e pública) para autenticação JWT
 * @param {number} keySize - Tamanho da chave RSA em bits (2048, 3072 ou 4096)
 * @returns {Object} Objeto contendo privateKey e publicKey em formato PEM
 * @throws {Error} Quando falha na geração ou validação das chaves
 * 
 * @tags rsa, cryptography, key-generation, jwt, security
 * @category Security
 * @subcategory Cryptography
 * 
 * @example
 * // Gerar chaves RSA de 2048 bits
 * const { privateKey, publicKey } = generateKeyPair(2048);
 * 
 * @example
 * // Gerar chaves RSA de 4096 bits para maior segurança
 * const { privateKey, publicKey } = generateKeyPair(4096);
 */
function generateKeyPair(keySize) {
  console.log(`🔑 Gerando par de chaves RSA ${keySize} bits...`);
  
  try {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    // Validar as chaves geradas
    if (!validateKeys(privateKey, publicKey)) {
      throw new Error('Falha na validação das chaves geradas');
    }
    
    console.log('✅ Chaves geradas e validadas com sucesso');
    return { privateKey, publicKey };
    
  } catch (error) {
    console.error('❌ Erro ao gerar chaves:', error.message);
    process.exit(1);
  }
}

/**
 * Salva chaves em arquivos com permissões adequadas
 */
function saveToFiles(privateKey, publicKey, keysDir) {
  try {
    // Criar diretório se não existir
    if (!fs.existsSync(keysDir)) {
      console.log(`📁 Criando diretório ${keysDir}`);
      fs.mkdirSync(keysDir, { recursive: true });
    }
    
    // Caminhos para arquivos .key (formato principal para desenvolvimento)
    const privateKeyPath = path.join(keysDir, 'private.key');
    const publicKeyPath = path.join(keysDir, 'public.key');
    
    // Salvar chaves .key
    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }); // Somente owner read/write
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });   // Owner read/write, others read
    
    console.log(`✅ Chave privada salva em: ${privateKeyPath}`);
    console.log(`✅ Chave pública salva em: ${publicKeyPath}`);
    
    // Adicionar ao .gitignore se não estiver lá
    addToGitignore(keysDir);
    
    // Instruções para .env local
    console.log('\n📝 CONFIGURAÇÃO PARA DESENVOLVIMENTO LOCAL:');
    console.log('Adicione ao seu .env:');
    console.log(`JWT_ALGORITHM=${DEFAULT_CONFIG.algorithm}`);
    console.log(`JWT_PRIVATE_KEY_PATH=keys/private.key`);
    console.log(`JWT_PUBLIC_KEY_PATH=keys/public.key`);
    console.log('JWT_ACCESS_TOKEN_EXPIRES_IN=1h');
    console.log('JWT_REFRESH_TOKEN_EXPIRES_IN=7d');
    
  } catch (error) {
    console.error('❌ Erro ao salvar arquivos:', error.message);
    process.exit(1);
  }
}

/**
 * Exibe chaves em formato base64 para Kubernetes Secrets
 */
function outputBase64(privateKey, publicKey) {
  const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
  const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
  
  console.log('\n🔐 KUBERNETES SECRETS (base64):');
  console.log('\nCrie um Secret no Kubernetes:');
  console.log('```yaml');
  console.log('apiVersion: v1');
  console.log('kind: Secret');
  console.log('metadata:');
  console.log('  name: pgben-jwt-keys');
  console.log('  namespace: default');
  console.log('type: Opaque');
  console.log('data:');
  console.log(`  private.key: ${privateKeyBase64}`);
  console.log(`  public.key: ${publicKeyBase64}`);
  console.log('```');
  
  console.log('\nOu via kubectl:');
  console.log(`kubectl create secret generic pgben-jwt-keys \\`);
  console.log(`  --from-literal=private.key="${privateKeyBase64}" \\`);
  console.log(`  --from-literal=public.key="${publicKeyBase64}" \\`);
  console.log(`  --namespace=default`);
  
  console.log('\n📝 CONFIGURAÇÃO PARA KUBERNETES:');
  console.log('Variáveis de ambiente no Deployment:');
  console.log(`JWT_ALGORITHM=${DEFAULT_CONFIG.algorithm}`);
  console.log('JWT_PRIVATE_KEY_PATH=/etc/secrets/private.key');
  console.log('JWT_PUBLIC_KEY_PATH=/etc/secrets/public.key');
  console.log('JWT_ACCESS_TOKEN_EXPIRES_IN=1h');
  console.log('JWT_REFRESH_TOKEN_EXPIRES_IN=7d');
}

/**
 * Exibe chaves como variáveis de ambiente
 */
function outputEnv(privateKey, publicKey) {
  // Escapar quebras de linha para variáveis de ambiente
  const privateKeyEnv = privateKey.replace(/\n/g, '\\n');
  const publicKeyEnv = publicKey.replace(/\n/g, '\\n');
  
  console.log('\n🌐 VARIÁVEIS DE AMBIENTE:');
  console.log('Para uso direto em .env ou variáveis de ambiente:');
  console.log('');
  console.log(`JWT_ALGORITHM=${DEFAULT_CONFIG.algorithm}`);
  console.log(`JWT_PRIVATE_KEY="${privateKeyEnv}"`);
  console.log(`JWT_PUBLIC_KEY="${publicKeyEnv}"`);
  console.log('JWT_ACCESS_TOKEN_EXPIRES_IN=1h');
  console.log('JWT_REFRESH_TOKEN_EXPIRES_IN=7d');
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('- Mantenha a chave privada segura');
  console.log('- Use Secrets do Kubernetes em produção');
  console.log('- Considere rotação periódica das chaves');
}

/**
 * Exibe chaves em formato Kubernetes Secret YAML
 */
function outputK8s(privateKey, publicKey) {
  const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
  const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
  
  console.log('\n☸️  KUBERNETES SECRET YAML:');
  console.log('---');
  console.log('apiVersion: v1');
  console.log('kind: Secret');
  console.log('metadata:');
  console.log('  name: pgben-jwt-keys');
  console.log('  namespace: default');
  console.log('type: Opaque');
  console.log('data:');
  console.log(`  private.key: ${privateKeyBase64}`);
  console.log(`  public.key: ${publicKeyBase64}`);
  console.log('---');
  
  console.log('\n📝 APLICAR NO KUBERNETES:');
  console.log('kubectl apply -f - <<EOF');
  console.log('apiVersion: v1');
  console.log('kind: Secret');
  console.log('metadata:');
  console.log('  name: pgben-jwt-keys');
  console.log('  namespace: default');
  console.log('type: Opaque');
  console.log('data:');
  console.log(`  private.key: ${privateKeyBase64}`);
  console.log(`  public.key: ${publicKeyBase64}`);
  console.log('EOF');
  
  console.log('\n📝 CONFIGURAÇÃO NO DEPLOYMENT:');
  console.log('env:');
  console.log(`- name: JWT_ALGORITHM`);
  console.log(`  value: "${DEFAULT_CONFIG.algorithm}"`);
  console.log('- name: JWT_PRIVATE_KEY_PATH');
  console.log('  value: "/etc/secrets/private.key"');
  console.log('- name: JWT_PUBLIC_KEY_PATH');
  console.log('  value: "/etc/secrets/public.key"');
  console.log('- name: JWT_ACCESS_TOKEN_EXPIRES_IN');
  console.log('  value: "1h"');
  console.log('- name: JWT_REFRESH_TOKEN_EXPIRES_IN');
  console.log('  value: "7d"');
  console.log('\nvolumeMounts:');
  console.log('- name: jwt-keys');
  console.log('  mountPath: "/etc/secrets"');
  console.log('  readOnly: true');
  console.log('\nvolumes:');
  console.log('- name: jwt-keys');
  console.log('  secret:');
  console.log('    secretName: pgben-jwt-keys');
}

/**
 * Adiciona o diretório keys ao .gitignore
 */
function addToGitignore(keysDir) {
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const relativePath = path.relative(path.dirname(gitignorePath), keysDir);
  
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    
    if (!gitignoreContent.includes(relativePath)) {
      fs.appendFileSync(gitignorePath, `\n# JWT Keys\n${relativePath}/\n`);
      console.log(`📝 Adicionado ${relativePath}/ ao .gitignore`);
    }
  }
}

/**
 * Função principal
 * 
 * @function main
 * @description Ponto de entrada principal do script, coordena todo o processo de geração de chaves
 * @returns {void}
 * 
 * @tags main, entry-point, orchestration, cli
 * @category Core
 * @subcategory Entry Point
 * 
 * @example
 * // Executar o script diretamente
 * main();
 * 
 * @workflow
 * 1. Processa argumentos da linha de comando
 * 2. Verifica se chaves já existem (modo files)
 * 3. Solicita confirmação para sobrescrever se necessário
 * 4. Gera e valida as chaves RSA
 * 5. Salva ou exibe as chaves conforme formato solicitado
 * 6. Exibe instruções de configuração e segurança
 */
function main() {
  console.log('🔐 Gerador de Chaves JWT RSA\n');
  
  const config = parseArgs();
  
  // Verificar se as chaves já existem (apenas para formato files)
  if (config.outputFormat === 'files' && !config.force) {
    const { exists, privateKeyPath, publicKeyPath } = checkExistingKeys(config.keysDir);
    
    if (exists) {
      console.log('⚠️  Chaves já existem:');
      if (fs.existsSync(privateKeyPath)) console.log(`   ${privateKeyPath}`);
      if (fs.existsSync(publicKeyPath)) console.log(`   ${publicKeyPath}`);
      console.log('\nDeseja sobrescrever? (y/N)');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('', (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Operação cancelada');
          process.exit(0);
        }
        generateAndOutput(config);
      });
      return;
    }
  }
  
  generateAndOutput(config);
}

/**
 * Gera e exibe as chaves conforme configuração
 */
function generateAndOutput(config) {
  const { privateKey, publicKey } = generateKeyPair(config.keySize);
  
  switch (config.outputFormat) {
    case 'files':
      saveToFiles(privateKey, publicKey, config.keysDir);
      break;
    case 'base64':
      outputBase64(privateKey, publicKey);
      break;
    case 'env':
      outputEnv(privateKey, publicKey);
      break;
    case 'k8s':
      outputK8s(privateKey, publicKey);
      break;
  }
  
  console.log('\n⚠️  LEMBRETE DE SEGURANÇA:');
  console.log('- Nunca commite chaves privadas no Git');
  console.log('- Use Kubernetes Secrets em produção');
  console.log('- Considere rotação periódica das chaves');
  console.log('- Mantenha backups seguros das chaves');
  
  console.log('\n✅ Processo concluído com sucesso!');
}

// Executar apenas se for o arquivo principal
if (require.main === module) {
  main();
}

module.exports = {
  generateKeyPair,
  validateKeys,
  parseArgs
};