import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration corretiva para verificar e resolver quaisquer inconsistências
 * deixadas pela migração que transformou o enum 'role' em tabela.
 *
 * Esta migration verifica se o enum 'role' ainda existe e, caso exista,
 * migra todas as suas dependências para usar a nova tabela 'role'.
 */
export class CorrecaoDependenciasRole1704067203000
  implements MigrationInterface
{
  name = 'CorrecaoDependenciasRole1704067203000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('\n🔍 Verificando se o enum role ainda existe...');

    // 1. Verificar se o enum 'role' ainda existe
    const checkEnum = await queryRunner.query(`
            SELECT 1 FROM pg_type t 
            JOIN pg_namespace n ON n.oid = t.typnamespace 
            WHERE t.typname = 'role' AND n.nspname = 'public'
        `);

    if (checkEnum && checkEnum.length > 0) {
      console.log('\n⚠️ O enum role ainda existe. Verificando dependências...');

      // 2. Verificar se existem dependências para o enum 'role'
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
        console.log(
          `\n⚠️ Encontradas ${checkDependencies.length} dependências para o enum role:`,
        );

        // 3. Para cada tabela que depende do enum 'role', migrar a coluna para VARCHAR
        // e associá-la à tabela 'role'
        for (const dep of checkDependencies) {
          const tableName = dep.table_name;
          const columnName = dep.column_name;

          console.log(
            `\n🔄 Migrando a coluna ${columnName} na tabela ${tableName}...`,
          );

          // 3.1 Criar coluna temporária para armazenar valores atuais do enum
          await queryRunner.query(`
                        ALTER TABLE "${tableName}" 
                        ADD COLUMN "${columnName}_temp" VARCHAR
                    `);

          // 3.2 Copiar valores do enum para a coluna temporária
          await queryRunner.query(`
                        UPDATE "${tableName}"
                        SET "${columnName}_temp" = "${columnName}"::TEXT
                        WHERE "${columnName}" IS NOT NULL
                    `);

          // 3.3 Adicionar coluna para FK para role
          await queryRunner.query(`
                        ALTER TABLE "${tableName}"
                        ADD COLUMN "${columnName}_id" UUID NULL
                    `);

          // 3.4 Associar valores à tabela role
          await queryRunner.query(`
                        UPDATE "${tableName}" t
                        SET "${columnName}_id" = rt.id
                        FROM "role" rt
                        WHERE t."${columnName}_temp" = rt.nome
                    `);

          // 3.5 Remover a coluna original baseada no enum
          await queryRunner.query(`
                        ALTER TABLE "${tableName}"
                        DROP COLUMN "${columnName}"
                    `);

          // 3.6 Renomear a coluna de FK para usar o nome original
          await queryRunner.query(`
                        ALTER TABLE "${tableName}"
                        RENAME COLUMN "${columnName}_id" TO "${columnName}"
                    `);

          // 3.7 Adicionar FK constraint
          await queryRunner.query(`
                        ALTER TABLE "${tableName}"
                        ADD CONSTRAINT "FK_${tableName}_${columnName}"
                        FOREIGN KEY ("${columnName}")
                        REFERENCES "role" ("id")
                        ON DELETE SET NULL
                    `);

          // 3.8 Remover a coluna temporária
          await queryRunner.query(`
                        ALTER TABLE "${tableName}"
                        DROP COLUMN IF EXISTS "${columnName}_temp"
                    `);

          console.log(
            `✅ Coluna ${columnName} na tabela ${tableName} migrada com sucesso!`,
          );
        }
      } else {
        console.log('\n✅ Não há dependências para o enum role.');
      }
    } else {
      console.log('\n✅ O enum role não existe mais, nada a fazer.');
    }

    // 5. Verificar se a tabela role existe e está configurada corretamente
    const checkRoleTable = await queryRunner.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'role'
        `);

    if (checkRoleTable && checkRoleTable.length > 0) {
      console.log('\n✅ Tabela role existe.');

      // 5.1 Verificar se a tabela role_permissao existe
      const checkRolePermissionTable = await queryRunner.query(`
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'role_permissao'
            `);

      if (checkRolePermissionTable && checkRolePermissionTable.length > 0) {
        // 5.2 Verificar se role_permissao está corretamente configurada
        const checkRolePermission = await queryRunner.query(`
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE table_name = 'role_permissao' 
                    AND constraint_name = 'FK_ROLE_PERMISSAO_ROLE'
                `);

        if (checkRolePermission && checkRolePermission.length === 0) {
          console.log(
            '\n⚠️ FK constraint não encontrada em role_permissao. Adicionando...',
          );

          // 5.3 Adicionar FK constraint se não existir
          await queryRunner.query(`
                        ALTER TABLE "role_permissao"
                        ADD CONSTRAINT "FK_ROLE_PERMISSAO_ROLE"
                        FOREIGN KEY ("role_id")
                        REFERENCES "role" ("id")
                        ON DELETE CASCADE
                    `);

          console.log('✅ FK constraint adicionada à tabela role_permissao.');
        } else {
          console.log('\n✅ FK constraint já existe em role_permissao.');
        }
      } else {
        console.log(
          '\n⚠️ Tabela role_permissao ainda não existe. A constraint será adicionada quando a tabela for criada.',
        );
      }
    } else {
      console.log('\n⚠️ Tabela role não encontrada!');
    }

    console.log('\n✅ Migration corretiva concluída com sucesso!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Não faz sentido reverter esta migration, pois ela é apenas corretiva
    console.log(
      '\n⚠️ Esta é uma migration corretiva e não pode ser revertida.',
    );
  }
}
