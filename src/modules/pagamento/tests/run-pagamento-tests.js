/**
 * Script para executar testes do módulo de pagamento
 * 
 * Este script executa todos os testes do módulo de pagamento utilizando
 * a configuração personalizada para garantir que todos os testes sejam
 * executados corretamente.
 * 
 * Uso: node run-pagamento-tests.js [--unit|--integration|--e2e|--coverage]
 * 
 * @author Equipe PGBen
 */

const { execSync } = require('child_process');
const path = require('path');

// Caminho para o arquivo de configuração do Jest
const configPath = path.resolve(__dirname, 'jest-pagamento.config.js');

// Opções de linha de comando
const args = process.argv.slice(2);
const runUnit = args.includes('--unit') || args.length === 0;
const runIntegration = args.includes('--integration') || args.length === 0;
const runE2E = args.includes('--e2e');
const runCoverage = args.includes('--coverage');

// Comandos para executar os testes
const commands = [];

if (runUnit) {
  commands.push(`npx jest --config=${configPath} "src/modules/pagamento/tests/unit/**/*.spec.ts" --verbose`);
}

if (runIntegration) {
  commands.push(`npx jest --config=${configPath} "src/modules/pagamento/tests/integration/**/*.spec.ts" --verbose`);
}

if (runE2E) {
  commands.push(`npx jest --config=${configPath} "test/pagamento/**/*.spec.ts" --verbose`);
}

if (runCoverage) {
  commands.push(`npx jest --config=${configPath} --coverage "src/modules/pagamento/**/*.spec.ts"`);
}

// Executar os comandos
console.log('Executando testes do módulo de pagamento...\n');

commands.forEach(command => {
  console.log(`\n> ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Erro ao executar o comando: ${command}`);
    console.error('Continuando com os próximos testes...\n');
  }
});

console.log('\nExecução dos testes concluída!');
