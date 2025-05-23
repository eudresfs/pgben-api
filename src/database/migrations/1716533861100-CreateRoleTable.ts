import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de roles, substituindo o enum 'role'.
 * 
 * Esta migração transforma o enum 'role' em uma tabela para permitir
 * relacionamentos com as entidades de permissão.
 * 
 * IMPORTANTE: Primeiro removemos o enum 'role' existente e depois criamos a tabela 'role_table'
 * para evitar conflitos de nome. Depois atualizamos as referências nas outras tabelas.
 */
export class CreateRoleTable1716533861100 implements MigrationInterface {
    name = 'CreateRoleTable1716533861100';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se o enum 'role' existe
        const checkEnum = await queryRunner.query(`
            SELECT 1 FROM pg_type t 
            JOIN pg_namespace n ON n.oid = t.typnamespace 
            WHERE t.typname = 'role' AND n.nspname = 'public'
        `);

        // Verificar se a tabela 'usuario' tem a coluna 'role' do tipo enum
        const checkUsuarioRole = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'usuario' AND column_name = 'role'
        `);

        // 1. Primeiro, vamos criar uma tabela temporária para armazenar os valores do enum
        if (checkEnum && checkEnum.length > 0 && checkUsuarioRole && checkUsuarioRole.length > 0) {
            console.log('\n🔍 Enum "role" encontrado. Iniciando migração para tabela...');
            
            // 1.1 Criar tabela temporária para armazenar os valores atuais
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS "temp_role_values" (
                    "usuario_id" uuid PRIMARY KEY,
                    "role_value" text
                )
            `);
            
            // 1.2 Copiar os valores atuais para a tabela temporária
            await queryRunner.query(`
                INSERT INTO "temp_role_values" ("usuario_id", "role_value")
                SELECT id, role::text FROM "usuario" WHERE role IS NOT NULL
            `);
            
            console.log('\n✅ Valores de role salvos em tabela temporária');
        }

        // 2. Criar a tabela de roles com nome diferente para evitar conflito
        console.log('\n🔄 Criando tabela de roles...');
        await queryRunner.createTable(
            new Table({
                name: 'role_table',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'nome',
                        type: 'varchar',
                        isUnique: true,
                    },
                    {
                        name: 'descricao',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'ativo',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true
        );

        // 3. Criar índices
        await queryRunner.createIndex(
            'role_table',
            new TableIndex({
                name: 'IDX_ROLE_TABLE_NOME',
                columnNames: ['nome'],
                isUnique: true,
            })
        );

        // 4. Inserir os valores padrão na tabela
        await queryRunner.query(`
            INSERT INTO "role_table" (nome, descricao)
            VALUES 
            ('ADMIN', 'Administrador do sistema'),
            ('GESTOR', 'Gestor de unidade'),
            ('TECNICO', 'Técnico responsável por análises'),
            ('ATENDENTE', 'Atendente de balcão')
        `);
        
        console.log('\n✅ Tabela role_table criada com sucesso');

        // 5. Se o enum existir e a tabela usuario tiver a coluna role, migrar os dados
        if (checkEnum && checkEnum.length > 0 && checkUsuarioRole && checkUsuarioRole.length > 0) {
            // 5.1 Adicionar a coluna role_id à tabela usuario
            await queryRunner.query(`
                ALTER TABLE "usuario" 
                ADD COLUMN "role_id" uuid NULL
            `);

            // 5.2 Migrar os dados da tabela temporária para a nova estrutura
            await queryRunner.query(`
                UPDATE "usuario" u
                SET role_id = r.id
                FROM "role_table" r, "temp_role_values" t
                WHERE u.id = t.usuario_id AND t.role_value = r.nome
            `);

            // 5.3 Adicionar a FK constraint
            await queryRunner.query(`
                ALTER TABLE "usuario"
                ADD CONSTRAINT "FK_USUARIO_ROLE"
                FOREIGN KEY ("role_id")
                REFERENCES "role_table" ("id")
                ON DELETE SET NULL
            `);

            // 5.4 Criar índice na coluna role_id
            await queryRunner.query(`
                CREATE INDEX "IDX_USUARIO_ROLE_ID" ON "usuario" ("role_id")
            `);

            // 5.5 Remover a coluna role (enum) da tabela usuario
            await queryRunner.query(`
                ALTER TABLE "usuario" DROP COLUMN IF EXISTS "role"
            `);

            // 5.6 Remover a tabela temporária
            await queryRunner.query(`
                DROP TABLE IF EXISTS "temp_role_values"
            `);
            
            console.log('\n✅ Dados migrados da coluna enum para a nova tabela');
        }

        // 6. Atualizar a tabela role_permission para usar a FK correta
        const checkRolePermission = await queryRunner.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'role_permission'
        `);

        if (checkRolePermission && checkRolePermission.length > 0) {
            console.log('\n🔄 Atualizando tabela role_permission...');
            
            // 6.1 Verificar se já existe a constraint
            const checkConstraint = await queryRunner.query(`
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'role_permission' AND constraint_name = 'FK_ROLE_PERMISSION_ROLE'
            `);
            
            if (checkConstraint && checkConstraint.length === 0) {
                // 6.2 Adicionar a FK constraint
                await queryRunner.query(`
                    ALTER TABLE "role_permission"
                    ADD CONSTRAINT "FK_ROLE_PERMISSION_ROLE"
                    FOREIGN KEY ("role_id")
                    REFERENCES "role_table" ("id")
                    ON DELETE CASCADE
                `);
                
                console.log('\n✅ Constraint adicionada à tabela role_permission');
            }
        }

        // 7. Finalmente, remover o enum 'role' se ele existir
        if (checkEnum && checkEnum.length > 0) {
            console.log('\n🔄 Removendo o enum "role"...');
            
            // Verificar se existem tabelas que dependem do enum 'role'
            const checkDependencies = await queryRunner.query(`
                SELECT pg_namespace.nspname AS schema_name,
                       pg_class.relname AS table_name,
                       pg_attribute.attname AS column_name
                FROM pg_depend
                JOIN pg_type ON pg_depend.refobjid = pg_type.oid
                JOIN pg_class ON pg_depend.objid = pg_class.oid
                JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
                JOIN pg_attribute ON pg_depend.objid = pg_attribute.attrelid AND pg_depend.objsubid = pg_attribute.attnum
                WHERE pg_type.typname = 'role' AND pg_namespace.nspname = 'public'
            `);
            
            if (checkDependencies && checkDependencies.length > 0) {
                console.log('\n⚠️ Encontradas dependências para o enum "role":');
                checkDependencies.forEach(dep => {
                    console.log(`- Tabela: ${dep.table_name}, Coluna: ${dep.column_name}`);
                });
                
                // Para cada tabela com dependência, criar uma coluna temporária, migrar os dados e remover a coluna original
                for (const dep of checkDependencies) {
                    const tableName = dep.table_name;
                    const columnName = dep.column_name;
                    
                    console.log(`\n🔄 Migrando coluna ${columnName} na tabela ${tableName}...`);
                    
                    // 1. Criar tabela temporária para armazenar os valores
                    await queryRunner.query(`
                        CREATE TABLE IF NOT EXISTS "temp_${tableName}_${columnName}" (
                            "id" uuid PRIMARY KEY,
                            "${columnName}_value" text
                        )
                    `);
                    
                    // 2. Copiar os valores atuais
                    await queryRunner.query(`
                        INSERT INTO "temp_${tableName}_${columnName}" ("id", "${columnName}_value")
                        SELECT id, ${columnName}::text FROM "${tableName}" WHERE ${columnName} IS NOT NULL
                    `);
                    
                    // 3. Remover a coluna original
                    await queryRunner.query(`
                        ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}"
                    `);
                    
                    // 4. Adicionar nova coluna do tipo varchar
                    await queryRunner.query(`
                        ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" varchar
                    `);
                    
                    // 5. Migrar os dados de volta
                    await queryRunner.query(`
                        UPDATE "${tableName}" t
                        SET ${columnName} = temp.${columnName}_value
                        FROM "temp_${tableName}_${columnName}" temp
                        WHERE t.id = temp.id
                    `);
                    
                    // 6. Remover a tabela temporária
                    await queryRunner.query(`
                        DROP TABLE IF EXISTS "temp_${tableName}_${columnName}"
                    `);
                    
                    console.log(`✅ Coluna ${columnName} na tabela ${tableName} migrada com sucesso`);
                }
            }
            
            // Agora podemos remover o enum com segurança
            await queryRunner.query(`
                DROP TYPE IF EXISTS "role" CASCADE
            `);
            
            console.log('\n✅ Enum "role" removido com sucesso');
        }
        
        console.log('\n✅ Migration concluída com sucesso!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('\n🔄 Revertendo migration...');
        
        // 1. Remover a FK constraint da tabela role_permission
        await queryRunner.query(`
            ALTER TABLE "role_permission" DROP CONSTRAINT IF EXISTS "FK_ROLE_PERMISSION_ROLE"
        `);

        // 2. Verificar se a tabela usuario tem a coluna role_id
        const hasRoleId = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'usuario' AND column_name = 'role_id'
        `);

        if (hasRoleId && hasRoleId.length > 0) {
            // 3. Criar tabela temporária para armazenar os valores atuais
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS "temp_role_values" (
                    "usuario_id" uuid PRIMARY KEY,
                    "role_value" text
                )
            `);
            
            // 4. Copiar os valores atuais para a tabela temporária
            await queryRunner.query(`
                INSERT INTO "temp_role_values" ("usuario_id", "role_value")
                SELECT u.id, r.nome 
                FROM "usuario" u 
                JOIN "role_table" r ON u.role_id = r.id 
                WHERE u.role_id IS NOT NULL
            `);
            
            // 5. Remover a FK constraint da tabela usuario
            await queryRunner.query(`
                ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "FK_USUARIO_ROLE"
            `);

            // 6. Remover o índice
            await queryRunner.query(`
                DROP INDEX IF EXISTS "IDX_USUARIO_ROLE_ID"
            `);

            // 7. Recriar o enum 'role'
            await queryRunner.query(`
                CREATE TYPE "role" AS ENUM (
                    'ADMIN', 
                    'GESTOR', 
                    'COORDENADOR', 
                    'TECNICO', 
                    'ASSISTENTE_SOCIAL', 
                    'AUDITOR', 
                    'CIDADAO'
            `);

            // 8. Adicionar a coluna role do tipo enum
            await queryRunner.query(`
                ALTER TABLE "usuario" ADD COLUMN "role" role NULL
            `);

            // 9. Migrar os dados de volta da tabela temporária
            await queryRunner.query(`
                UPDATE "usuario" u
                SET role = t.role_value::role
                FROM "temp_role_values" t
                WHERE u.id = t.usuario_id
            `);

            // 10. Remover a coluna role_id
            await queryRunner.query(`
                ALTER TABLE "usuario" DROP COLUMN IF EXISTS "role_id"
            `);
            
            // 11. Remover a tabela temporária
            await queryRunner.query(`
                DROP TABLE IF EXISTS "temp_role_values"
            `);
        }

        // 12. Remover a tabela role_table
        await queryRunner.dropTable('role_table', true);
        
        console.log('\n✅ Migration revertida com sucesso!');
    }
}
