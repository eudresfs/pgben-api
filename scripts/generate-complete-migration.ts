import { DataSource } from 'typeorm';
import { AppDataSource } from '../src/data-source';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para gerar migration completa baseada nas entidades
 * Este script analisa todas as entidades e gera uma migration completa
 */
async function generateCompleteMigration() {
  console.log('🚀 Gerando migration completa...');
  
  try {
    // Inicializar conexão
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida!');
    
    // Obter metadados das entidades
    const entityMetadatas = AppDataSource.entityMetadatas;
    console.log(`📊 Encontradas ${entityMetadatas.length} entidades`);
    
    // Gerar timestamp
    const timestamp = Date.now();
    const migrationName = `${timestamp}-InitialSchema`;
    const className = 'InitialSchema';
    
    // Gerar SQL para criação das tabelas
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    
    // Primeiro, criar todos os ENUMs
    console.log('📝 Gerando ENUMs...');
    const enumQueries = generateEnumQueries(entityMetadatas);
    upQueries.push(...enumQueries.up);
    downQueries.unshift(...enumQueries.down);
    
    // Depois, criar todas as tabelas
    console.log('📝 Gerando tabelas...');
    for (const metadata of entityMetadatas) {
      const tableQueries = generateTableQueries(metadata);
      upQueries.push(...tableQueries.up);
      downQueries.unshift(...tableQueries.down);
    }
    
    // Por último, criar foreign keys
    console.log('📝 Gerando foreign keys...');
    for (const metadata of entityMetadatas) {
      const fkQueries = generateForeignKeyQueries(metadata);
      upQueries.push(...fkQueries.up);
      downQueries.unshift(...fkQueries.down);
    }
    
    // Gerar conteúdo da migration
    const migrationContent = generateMigrationFileContent(className, timestamp, upQueries, downQueries);
    
    // Salvar arquivo
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const migrationPath = path.join(migrationsDir, `${migrationName}.ts`);
    
    // Substituir a migration vazia existente
    fs.writeFileSync(migrationPath, migrationContent);
    
    console.log('✅ Migration completa gerada!');
    console.log(`📄 Arquivo: ${migrationPath}`);
    console.log(`🔢 Queries UP: ${upQueries.length}`);
    console.log(`🔢 Queries DOWN: ${downQueries.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar migration:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão fechada.');
    }
  }
}

/**
 * Gera queries para criação de ENUMs
 */
function generateEnumQueries(entityMetadatas: any[]): { up: string[], down: string[] } {
  const up: string[] = [];
  const down: string[] = [];
  const enumsCreated = new Set<string>();
  
  for (const metadata of entityMetadatas) {
    for (const column of metadata.columns) {
      if (column.enum && !enumsCreated.has(column.enumName || column.databaseName)) {
        const enumName = column.enumName || `${metadata.tableName}_${column.databaseName}_enum`;
        
        // Verificar se os valores do enum são válidos
        const enumValues = Object.values(column.enum)
          .filter(v => v !== null && v !== undefined && v !== '')
          .map(v => `'${String(v).replace(/'/g, "''")}'`)
          .join(', ');
        
        if (enumValues.length > 0) {
          up.push(`CREATE TYPE "${enumName}" AS ENUM (${enumValues});`);
          down.push(`DROP TYPE IF EXISTS "${enumName}";`);
          
          enumsCreated.add(enumName);
        }
      }
    }
  }
  
  return { up, down };
}

/**
 * Gera queries para criação de tabelas
 */
function generateTableQueries(metadata: any): { up: string[], down: string[] } {
  const up: string[] = [];
  const down: string[] = [];
  
  // Criar tabela
  const columns = metadata.columns.map((column: any) => {
    let columnDef = `"${column.databaseName}" ${getColumnType(column)}`;
    
    if (column.isPrimary) {
      columnDef += ' PRIMARY KEY';
    }
    
    if (column.isGenerated && column.generationStrategy === 'uuid') {
      columnDef += ' DEFAULT gen_random_uuid()';
    } else if (column.isGenerated && column.generationStrategy === 'increment') {
      columnDef = `"${column.databaseName}" SERIAL PRIMARY KEY`;
    }
    
    if (!column.isNullable && !column.isPrimary) {
      columnDef += ' NOT NULL';
    }
    
    if (column.default !== undefined) {
      columnDef += ` DEFAULT ${column.default}`;
    }
    
    return columnDef;
  }).join(',\n    ');
  
  up.push(`CREATE TABLE "${metadata.tableName}" (\n    ${columns}\n);`);
  down.push(`DROP TABLE IF EXISTS "${metadata.tableName}";`);
  
  // Criar índices
  for (const index of metadata.indices) {
    const indexColumns = index.columns.map((col: any) => `"${col.databaseName}"`).join(', ');
    const indexName = index.name || `IDX_${metadata.tableName}_${index.columns.map((c: any) => c.databaseName).join('_')}`;
    
    up.push(`CREATE INDEX "${indexName}" ON "${metadata.tableName}" (${indexColumns});`);
    down.push(`DROP INDEX IF EXISTS "${indexName}";`);
  }
  
  return { up, down };
}

/**
 * Gera queries para foreign keys
 */
function generateForeignKeyQueries(metadata: any): { up: string[], down: string[] } {
  const up: string[] = [];
  const down: string[] = [];
  
  for (const foreignKey of metadata.foreignKeys) {
    const fkName = foreignKey.name || `FK_${metadata.tableName}_${foreignKey.columnNames.join('_')}`;
    const columns = foreignKey.columnNames.map((name: string) => `"${name}"`).join(', ');
    const refColumns = foreignKey.referencedColumnNames.map((name: string) => `"${name}"`).join(', ');
    
    up.push(`ALTER TABLE "${metadata.tableName}" ADD CONSTRAINT "${fkName}" FOREIGN KEY (${columns}) REFERENCES "${foreignKey.referencedTableName}" (${refColumns});`);
    down.push(`ALTER TABLE "${metadata.tableName}" DROP CONSTRAINT IF EXISTS "${fkName}";`);
  }
  
  return { up, down };
}

/**
 * Determina o tipo da coluna PostgreSQL
 */
function getColumnType(column: any): string {
  if (column.enum) {
    const enumName = column.enumName || `${column.entityMetadata.tableName}_${column.databaseName}_enum`;
    return `"${enumName}"`;
  }
  
  // Garantir que column.type é uma string
  const columnType = typeof column.type === 'string' ? column.type : String(column.type);
  
  switch (columnType.toLowerCase()) {
    case 'varchar':
      return column.length ? `VARCHAR(${column.length})` : 'VARCHAR';
    case 'text':
      return 'TEXT';
    case 'int':
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'decimal':
    case 'numeric':
      return column.precision && column.scale ? 
        `DECIMAL(${column.precision},${column.scale})` : 'DECIMAL';
    case 'boolean':
      return 'BOOLEAN';
    case 'timestamp':
    case 'datetime':
      return 'TIMESTAMP';
    case 'date':
      return 'DATE';
    case 'uuid':
      return 'UUID';
    case 'json':
    case 'jsonb':
      return 'JSONB';
    case 'float':
    case 'double':
      return 'FLOAT';
    case 'real':
      return 'REAL';
    case 'smallint':
      return 'SMALLINT';
    case 'time':
      return 'TIME';
    case 'bytea':
      return 'BYTEA';
    default:
      // Fallback seguro para tipos não reconhecidos
      console.warn(`Tipo de coluna não reconhecido: ${columnType}`);
      return 'TEXT';
  }
}

/**
 * Gera o conteúdo do arquivo de migration
 */
function generateMigrationFileContent(className: string, timestamp: number, upQueries: string[], downQueries: string[]): string {
  const upQueriesStr = upQueries
    .map(query => `        await queryRunner.query(\`${query.replace(/`/g, '\\`')}\`);`)
    .join('\n');
    
  const downQueriesStr = downQueries
    .map(query => `        await queryRunner.query(\`${query.replace(/`/g, '\\`')}\`);`)
    .join('\n');
  
  return `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${className}${timestamp} implements MigrationInterface {
    name = '${className}${timestamp}'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Habilitar extensão para UUID
        await queryRunner.query(\`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\`);
        
        // Criar estrutura completa do banco
${upQueriesStr}
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter todas as alterações
${downQueriesStr}
    }
}
`;
}

// Executar se chamado diretamente
if (require.main === module) {
  generateCompleteMigration().catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
}

export { generateCompleteMigration };