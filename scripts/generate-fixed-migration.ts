import { AppDataSource } from '../src/data-source';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Script para gerar migration corrigida sem problemas de sintaxe SQL
 */
async function generateFixedMigration() {
  console.log('🔧 Gerando migration corrigida...');
  
  try {
    // Inicializar conexão
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida!');
    
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Gerar SQL de criação das tabelas
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    
    // Adicionar extensão UUID
    upQueries.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Obter metadados das entidades
    const entityMetadatas = AppDataSource.entityMetadatas;
    
    console.log(`📋 Processando ${entityMetadatas.length} entidades...`);
    
    // Primeiro, criar todos os ENUMs
    const enumsCreated = new Set<string>();
    
    for (const metadata of entityMetadatas) {
      for (const column of metadata.columns) {
        if (column.type === 'enum' && column.enum && Array.isArray(column.enum)) {
          const enumName = `${metadata.tableName}_${column.propertyName}_enum`;
          
          if (!enumsCreated.has(enumName)) {
            const enumValues = column.enum
              .filter(val => val != null && val !== '')
              .map(val => `'${String(val).replace(/'/g, "''")}'`)
              .join(', ');
            
            if (enumValues) {
              upQueries.push(`CREATE TYPE "${enumName}" AS ENUM (${enumValues});`);
              downQueries.unshift(`DROP TYPE IF EXISTS "${enumName}";`);
              enumsCreated.add(enumName);
              console.log(`📝 ENUM criado: ${enumName}`);
            }
          }
        }
      }
    }
    
    // Depois, criar todas as tabelas
    for (const metadata of entityMetadatas) {
      const tableName = metadata.tableName;
      const columns: string[] = [];
      
      console.log(`🔨 Processando tabela: ${tableName}`);
      
      for (const column of metadata.columns) {
        let columnDef = `"${column.databaseName}" `;
        
        // Definir tipo da coluna
        if (column.type === 'enum' && column.enum) {
          const enumName = `${metadata.tableName}_${column.propertyName}_enum`;
          columnDef += `"${enumName}"`;
        } else {
          columnDef += getPostgreSQLType(column);
        }
        
        // Primary key
        if (column.isPrimary) {
          if (column.isGenerated && column.generationStrategy === 'uuid') {
            columnDef += ' PRIMARY KEY DEFAULT uuid_generate_v4()';
          } else if (column.isGenerated) {
            columnDef += ' PRIMARY KEY';
          } else {
            columnDef += ' PRIMARY KEY';
          }
        }
        
        // Not null
        if (!column.isNullable && !column.isPrimary) {
          columnDef += ' NOT NULL';
        }
        
        // Default values
        if (column.default !== undefined && column.default !== null) {
          const defaultValue = getDefaultValue(column);
          if (defaultValue) {
            columnDef += ` DEFAULT ${defaultValue}`;
          }
        }
        
        columns.push(columnDef);
      }
      
      // Criar tabela
      const createTableQuery = `CREATE TABLE "${tableName}" (\n    ${columns.join(',\n    ')}\n);`;
      upQueries.push(createTableQuery);
      downQueries.unshift(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
      
      // Criar índices
      for (const index of metadata.indices) {
        const indexColumns = index.columns.map(col => `"${col.databaseName}"`).join(', ');
        const indexName = index.name || `IDX_${tableName}_${index.columns.map(c => c.databaseName).join('_')}`;
        const uniqueClause = index.isUnique ? 'UNIQUE ' : '';
        
        const createIndexQuery = `CREATE ${uniqueClause}INDEX "${indexName}" ON "${tableName}" (${indexColumns});`;
        upQueries.push(createIndexQuery);
        downQueries.unshift(`DROP INDEX IF EXISTS "${indexName}";`);
      }
    }
    
    // Criar foreign keys
    for (const metadata of entityMetadatas) {
      for (const foreignKey of metadata.foreignKeys) {
        const constraintName = foreignKey.name || `FK_${metadata.tableName}_${foreignKey.columnNames.join('_')}`;
        const columnNames = foreignKey.columnNames.map(name => `"${name}"`).join(', ');
        const referencedColumnNames = foreignKey.referencedColumnNames.map(name => `"${name}"`).join(', ');
        
        const addForeignKeyQuery = `ALTER TABLE "${metadata.tableName}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY (${columnNames}) REFERENCES "${foreignKey.referencedTablePath}" (${referencedColumnNames});`;
        upQueries.push(addForeignKeyQuery);
        downQueries.unshift(`ALTER TABLE "${metadata.tableName}" DROP CONSTRAINT IF EXISTS "${constraintName}";`);
      }
    }
    
    // Gerar arquivo de migration
    const timestamp = Date.now();
    const className = `InitialSchemaFixed${timestamp}`;
    const fileName = `${timestamp}-InitialSchemaFixed.ts`;
    
    const migrationContent = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${className} implements MigrationInterface {
    name = '${className}'

    public async up(queryRunner: QueryRunner): Promise<void> {
        ${upQueries.map(query => `await queryRunner.query(\`${query}\`);`).join('\n        ')}
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        ${downQueries.map(query => `await queryRunner.query(\`${query}\`);`).join('\n        ')}
    }
}
`;
    
    const migrationPath = join(process.cwd(), 'src', 'database', 'migrations', fileName);
    writeFileSync(migrationPath, migrationContent, 'utf8');
    
    console.log('✅ Migration corrigida gerada!');
    console.log(`📄 Arquivo: ${migrationPath}`);
    console.log(`🔢 Queries UP: ${upQueries.length}`);
    console.log(`🔢 Queries DOWN: ${downQueries.length}`);
    
    await queryRunner.release();
    
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

function getPostgreSQLType(column: any): string {
  const type = typeof column.type === 'function' ? column.type.name.toLowerCase() : String(column.type).toLowerCase();
  
  switch (type) {
    case 'varchar':
    case 'string':
      return column.length ? `VARCHAR(${column.length})` : 'TEXT';
    case 'text':
      return 'TEXT';
    case 'int':
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'smallint':
      return 'SMALLINT';
    case 'decimal':
    case 'numeric':
      if (column.precision && column.scale) {
        return `DECIMAL(${column.precision}, ${column.scale})`;
      }
      return 'DECIMAL';
    case 'float':
    case 'real':
      return 'REAL';
    case 'double':
      return 'DOUBLE PRECISION';
    case 'boolean':
    case 'bool':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'time':
      return 'TIME';
    case 'datetime':
    case 'timestamp':
      return 'TIMESTAMP';
    case 'uuid':
      return 'UUID';
    case 'json':
      return 'JSON';
    case 'jsonb':
      return 'JSONB';
    case 'bytea':
      return 'BYTEA';
    default:
      console.warn(`Tipo não reconhecido: ${type}, usando TEXT`);
      return 'TEXT';
  }
}

function getDefaultValue(column: any): string | null {
  if (column.default === undefined || column.default === null) {
    return null;
  }
  
  const defaultVal = column.default;
  
  // Valores especiais do TypeORM
  if (typeof defaultVal === 'string') {
    if (defaultVal.includes('CURRENT_TIMESTAMP') || defaultVal.includes('now()')) {
      return 'CURRENT_TIMESTAMP';
    }
    if (defaultVal.includes('uuid_generate_v4') || defaultVal.includes('gen_random_uuid')) {
      return 'uuid_generate_v4()';
    }
    if (defaultVal === 'true' || defaultVal === 'false') {
      return defaultVal;
    }
    // String literal
    return `'${defaultVal.replace(/'/g, "''")}'`;
  }
  
  if (typeof defaultVal === 'boolean') {
    return defaultVal.toString();
  }
  
  if (typeof defaultVal === 'number') {
    return defaultVal.toString();
  }
  
  return null;
}

// Executar se chamado diretamente
if (require.main === module) {
  generateFixedMigration().catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
}

export { generateFixedMigration };