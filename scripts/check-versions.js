#!/usr/bin/env node

/**
 * Script para verificar compatibilidade de versões do Node.js e npm
 * Usado no pipeline CI/CD para garantir que as versões estão corretas
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output no terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkVersions() {
  try {
    // Ler package.json para obter os requisitos de engine
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const engines = packageJson.engines || {};
    const requiredNode = engines.node || 'não especificado';
    const requiredNpm = engines.npm || 'não especificado';
    
    // Obter versões atuais
    const currentNode = process.version;
    const currentNpm = execSync('npm --version', { encoding: 'utf8' }).trim();
    
    log('🔍 Verificação de Compatibilidade de Versões', 'blue');
    log('=' .repeat(50), 'blue');
    
    log(`Node.js:`, 'yellow');
    log(`  Atual: ${currentNode}`);
    log(`  Requerido: ${requiredNode}`);
    
    log(`npm:`, 'yellow');
    log(`  Atual: ${currentNpm}`);
    log(`  Requerido: ${requiredNpm}`);
    
    // Verificar compatibilidade do npm com lockfileVersion
    const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
    if (fs.existsSync(packageLockPath)) {
      const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
      const lockfileVersion = packageLock.lockfileVersion;
      
      log(`package-lock.json:`, 'yellow');
      log(`  lockfileVersion: ${lockfileVersion}`);
      
      // Verificar se a versão do npm é compatível com lockfileVersion
      const npmMajor = parseInt(currentNpm.split('.')[0]);
      const npmMinor = parseInt(currentNpm.split('.')[1]);
      
      let compatible = true;
      let recommendation = '';
      
      if (lockfileVersion === 3) {
        if (npmMajor < 7) {
          compatible = false;
          recommendation = 'npm >= 7.0.0 requerido para lockfileVersion 3';
        } else if (npmMajor === 10 && npmMinor < 8) {
          compatible = false;
          recommendation = 'npm >= 10.8.2 recomendado para melhor compatibilidade';
        }
      }
      
      if (compatible) {
        log(`✅ Versões compatíveis!`, 'green');
      } else {
        log(`❌ Incompatibilidade detectada!`, 'red');
        log(`💡 Recomendação: ${recommendation}`, 'yellow');
        process.exit(1);
      }
    }
    
    log('=' .repeat(50), 'blue');
    log('✅ Verificação concluída com sucesso!', 'green');
    
  } catch (error) {
    log(`❌ Erro durante verificação: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Executar verificação se chamado diretamente
if (require.main === module) {
  checkVersions();
}

module.exports = { checkVersions };