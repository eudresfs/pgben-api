/**
 * Script para auxiliar na consolidação de migrations do TypeORM
 * 
 * Este script ajuda a consolidar múltiplas migrations em uma única migration,
 * facilitando a manutenção e compreensão do esquema do banco de dados.
 * 
 * Uso: node consolidate-migrations.js <diretório-migrations> <arquivo-saída>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const migrationsDir = process.argv[2] || path.join(__dirname, '../src/database/migrations');
const outputFile = process.argv[3] || path.join(__dirname, '../src/database/migrations-consolidadas/output.sql');

// Verifica se o diretório de saída existe, se não, cria
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Função para extrair o método up() de uma migration
function extractUpMethod(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const upMethodMatch = content.match(/public\s+async\s+up\s*\(\s*queryRunner\s*:\s*QueryRunner\s*\)\s*:\s*Promise<void>\s*{([\s\S]*?)public\s+async\s+down/m);
  
  if (!upMethodMatch || upMethodMatch.length < 2) {
    console.warn(`Não foi possível extrair o método up() de ${filePath}`);
    return null;
  }
  
  return upMethodMatch[1].trim();
}

// Função para extrair o método down() de uma migration
function extractDownMethod(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const downMethodMatch = content.match(/public\s+async\s+down\s*\(\s*queryRunner\s*:\s*QueryRunner\s*\)\s*:\s*Promise<void>\s*{([\s\S]*?)\}/m);
  
  if (!downMethodMatch || downMethodMatch.length < 2) {
    console.warn(`Não foi possível extrair o método down() de ${filePath}`);
    return null;
  }
  
  return downMethodMatch[1].trim();
}

// Função para gerar o template de uma nova migration consolidada
function generateMigrationTemplate(className, upMethods, downMethods) {
  return `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${className} implements MigrationInterface {
  name = '${className}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Consolidação de múltiplas migrations
${upMethods.map(method => `    // ===== INÍCIO DA MIGRATION ORIGINAL =====\n${method}\n    // ===== FIM DA MIGRATION ORIGINAL =====\n`).join('\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Operações de reversão em ordem inversa
${downMethods.reverse().map(method => `    // ===== INÍCIO DA REVERSÃO ORIGINAL =====\n${method}\n    // ===== FIM DA REVERSÃO ORIGINAL =====\n`).join('\n')}
  }
}
`;
}

// Função principal
function consolidateMigrations() {
  console.log('Iniciando consolidação de migrations...');
  console.log(`Diretório de migrations: ${migrationsDir}`);
  console.log(`Arquivo de saída: ${outputFile}`);

  // Lê todos os arquivos de migration
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.ts') && !file.includes('.spec.'))
    .sort();

  console.log(`Encontradas ${migrationFiles.length} migrations para análise.`);

  // Extrai os métodos up() e down() de cada migration
  const migrations = [];
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const upMethod = extractUpMethod(filePath);
    const downMethod = extractDownMethod(filePath);
    
    if (upMethod && downMethod) {
      migrations.push({
        file,
        upMethod,
        downMethod
      });
      console.log(`Extraído com sucesso: ${file}`);
    }
  }

  console.log(`Processadas ${migrations.length} migrations com sucesso.`);

  // Gera o SQL consolidado
  const upMethods = migrations.map(m => m.upMethod);
  const downMethods = migrations.map(m => m.downMethod);
  
  // Gera o template da migration consolidada
  const consolidatedMigration = generateMigrationTemplate(
    `ConsolidatedMigration${Date.now()}`,
    upMethods,
    downMethods
  );

  // Escreve o resultado no arquivo de saída
  fs.writeFileSync(outputFile, consolidatedMigration);
  
  console.log('Consolidação concluída com sucesso!');
  console.log(`Resultado salvo em: ${outputFile}`);
  console.log('\nIMPORTANTE: Revise o arquivo gerado antes de utilizá-lo em produção!');
}

// Executa a função principal
try {
  consolidateMigrations();
} catch (error) {
  console.error('Erro durante a consolidação:', error);
  process.exit(1);
}