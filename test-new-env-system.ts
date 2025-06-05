// Script de teste para verificar o novo sistema de configuração de ambiente
console.log('🧪 Testando novo sistema de configuração de ambiente...\n');

try {
  // Teste 1: Importar o novo sistema de env
  console.log('1. Testando importação do novo sistema env.ts...');
  const { env, validateRequiredEnvVars } = require('./src/config/env');
  console.log('✅ Sistema env.ts importado com sucesso!\n');

  // Teste 2: Verificar variáveis carregadas
  console.log('2. Variáveis de banco de dados carregadas:');
  console.log(`   DB_HOST: ${env.DB_HOST}`);
  console.log(`   DB_PORT: ${env.DB_PORT}`);
  console.log(`   DB_NAME: ${env.DB_NAME}`);
  console.log(`   DB_USER: ${env.DB_USER}`);
  console.log(`   DB_LOGGING: ${env.DB_LOGGING}\n`);

  // Teste 3: Verificar se as configurações do database.config.ts estão funcionando
  console.log('3. Testando database.config.ts...');
  const { databaseConfig } = require('./src/config/database.config');
  console.log('✅ database.config.ts importado com sucesso!');
  console.log(`   Host configurado: ${databaseConfig.host}`);
  console.log(`   Port configurado: ${databaseConfig.port}`);
  console.log(`   Database configurado: ${databaseConfig.database}`);
  console.log(`   Username configurado: ${databaseConfig.username}\n`);

  // Teste 4: Verificar se as configurações estão diferentes dos valores padrão
  console.log('4. Verificando se as configurações não são valores padrão...');
  const isUsingDefaults = 
    databaseConfig.host === 'localhost' &&
    databaseConfig.port === 5432 &&
    databaseConfig.database === 'pgben' &&
    databaseConfig.username === 'postgres';

  if (isUsingDefaults) {
    console.log('⚠️  ATENÇÃO: Usando valores padrão. Verifique se o arquivo .env existe e contém as variáveis corretas.');
  } else {
    console.log('✅ Configurações personalizadas detectadas! O sistema está funcionando corretamente.');
  }

  // Teste 5: Validar variáveis obrigatórias
  console.log('\n5. Testando validação de variáveis obrigatórias...');
  validateRequiredEnvVars();
  console.log('✅ Todas as variáveis obrigatórias estão presentes!\n');

  console.log('🎉 Todos os testes passaram! O novo sistema de configuração está funcionando corretamente.');

} catch (error) {
  console.error('❌ Erro durante o teste:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
}
