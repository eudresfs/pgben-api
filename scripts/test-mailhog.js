#!/usr/bin/env node

/**
 * Script de teste para verificar configuração do MailHog
 * Execute: node scripts/test-mailhog.js
 */

const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testMailHogConfiguration() {
  logHeader('TESTE DE CONFIGURAÇÃO MAILHOG');

  // Verificar variáveis de ambiente
  const config = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT) || 1025,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@localhost.test',
    fromName: process.env.SMTP_FROM_NAME || 'SEMTAS - Teste',
    enabled: process.env.EMAIL_ENABLED === 'true'
  };

  logInfo('Configurações detectadas:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Porta: ${config.port}`);
  console.log(`  Usuário: ${config.user || 'Não configurado (OK para MailHog)'}`);
  console.log(`  Senha: ${config.pass ? '***' : 'Não configurada (OK para MailHog)'}`);
  console.log(`  From: ${config.from}`);
  console.log(`  Email habilitado: ${config.enabled}`);

  // Verificar se é MailHog
  const isMailHog = config.host.toLowerCase().includes('mailhog') ||
                   (config.host === 'localhost' && config.port === 1025) ||
                   (config.host === '127.0.0.1' && config.port === 1025) ||
                   config.port === 1025;

  if (isMailHog) {
    logSuccess('MailHog detectado!');
  } else {
    logWarning('MailHog não detectado. Verifique as configurações.');
  }

  if (!config.enabled) {
    logError('EMAIL_ENABLED=false. Configure EMAIL_ENABLED=true para testar.');
    return;
  }

  // Criar transporter
  logHeader('TESTANDO CONEXÃO');
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
    requireTLS: false,
    ignoreTLS: true,
    auth: isMailHog ? undefined : {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    debug: true,
    logger: true
  });

  try {
    logInfo('Verificando conexão SMTP...');
    await transporter.verify();
    logSuccess('Conexão SMTP estabelecida com sucesso!');
  } catch (error) {
    logError(`Erro na conexão SMTP: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      logWarning('MailHog não está rodando. Execute:');
      log('  docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog', 'yellow');
    }
    
    return;
  }

  // Testar envio de email
  logHeader('TESTANDO ENVIO DE EMAIL');
  
  const testEmail = {
    from: `"${config.fromName}" <${config.from}>`,
    to: 'teste@exemplo.com',
    subject: 'Teste MailHog - SEMTAS',
    html: `
      <h2>🧪 Teste de Email MailHog</h2>
      <p>Este é um email de teste para verificar a configuração do MailHog.</p>
      <hr>
      <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      <p><strong>Servidor:</strong> ${config.host}:${config.port}</p>
      <p><strong>Ambiente:</strong> ${process.env.NODE_ENV || 'development'}</p>
      <hr>
      <p>✅ Se você está vendo este email no MailHog, a configuração está funcionando!</p>
      <p>🌐 Acesse a interface web: <a href="http://localhost:8025">http://localhost:8025</a></p>
    `,
    text: `
      Teste de Email MailHog - SEMTAS
      
      Este é um email de teste para verificar a configuração do MailHog.
      
      Data/Hora: ${new Date().toLocaleString('pt-BR')}
      Servidor: ${config.host}:${config.port}
      Ambiente: ${process.env.NODE_ENV || 'development'}
      
      ✅ Se você está vendo este email no MailHog, a configuração está funcionando!
      🌐 Acesse a interface web: http://localhost:8025
    `
  };

  try {
    logInfo('Enviando email de teste...');
    const result = await transporter.sendMail(testEmail);
    logSuccess('Email enviado com sucesso!');
    logInfo(`Message ID: ${result.messageId}`);
    logInfo(`Response: ${result.response}`);
    
    log('\n' + '🎉'.repeat(20), 'green');
    logSuccess('TESTE CONCLUÍDO COM SUCESSO!');
    logInfo('Verifique o email na interface web do MailHog:');
    log('  http://localhost:8025', 'cyan');
    log('🎉'.repeat(20), 'green');
    
  } catch (error) {
    logError(`Erro ao enviar email: ${error.message}`);
    logError(`Código: ${error.code}`);
    
    if (error.code === 'EENVELOPE') {
      logWarning('Erro de envelope. Para MailHog, isso é incomum.');
    }
  }

  // Fechar conexão
  transporter.close();
}

async function checkMailHogStatus() {
  logHeader('VERIFICANDO STATUS DO MAILHOG');
  
  try {
    const response = await fetch('http://localhost:8025/api/v1/messages');
    if (response.ok) {
      const messages = await response.json();
      logSuccess(`MailHog está rodando! ${messages.length} mensagens na caixa.`);
      logInfo('Interface web: http://localhost:8025');
      return true;
    }
  } catch (error) {
    logError('MailHog não está acessível via HTTP.');
  }
  
  logWarning('Para iniciar o MailHog:');
  log('  docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog', 'yellow');
  return false;
}

async function main() {
  try {
    await checkMailHogStatus();
    await testMailHogConfiguration();
  } catch (error) {
    logError(`Erro inesperado: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testMailHogConfiguration, checkMailHogStatus };