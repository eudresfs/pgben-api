import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration para criar o schema relacionado às informações bancárias
 * 
 * Esta migration cria a tabela info_bancaria para armazenar dados bancários
 * dos cidadãos, incluindo contas poupança social do Banco do Brasil e
 * informações de chaves PIX.
 * 
 * Os enums necessários são criados na migration CreateAllEnums
 */
export class CreateInfoBancariaSchema1704067205000 implements MigrationInterface {
  name = 'CreateInfoBancariaSchema1704067205000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Iniciando migration CreateInfoBancariaSchema...');

      // Verificar se os enums necessários existem
      const tipoContaEnumExists = await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'tipo_conta'
      `);

      const tipoChavePixEnumExists = await queryRunner.query(`
        SELECT 1 FROM pg_type WHERE typname = 'tipo_chave_pix'
      `);

      // Criar enum tipo_conta se não existir
      if (!tipoContaEnumExists.length) {
        await queryRunner.query(`
          CREATE TYPE "tipo_conta" AS ENUM (
            'CORRENTE',
            'POUPANCA',
            'POUPANCA_SOCIAL',
            'SALARIO'
          )
        `);
        console.log('Enum tipo_conta criado com sucesso');
      }

      // Criar enum tipo_chave_pix se não existir
      if (!tipoChavePixEnumExists.length) {
        await queryRunner.query(`
          CREATE TYPE "tipo_chave_pix" AS ENUM (
            'CPF',
            'CNPJ',
            'EMAIL',
            'TELEFONE',
            'ALEATORIA'
          )
        `);
        console.log('Enum tipo_chave_pix criado com sucesso');
      }

      // Criar tabela info_bancaria
      await queryRunner.createTable(
        new Table({
          name: 'info_bancaria',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'cidadao_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'banco',
              type: 'varchar',
              length: '3',
              isNullable: true,
              comment: 'Código do banco (ex: 001 para Banco do Brasil)',
            },
            {
              name: 'nome_banco',
              type: 'varchar',
              length: '100',
              isNullable: true,
              comment: 'Nome completo do banco',
            },
            {
              name: 'agencia',
              type: 'varchar',
              length: '10',
              isNullable: true,
              comment: 'Número da agência bancária',
            },
            {
              name: 'conta',
              type: 'varchar',
              length: '20',
              isNullable: true,
              comment: 'Número da conta bancária',
            },
            {
              name: 'tipo_conta',
              type: 'enum',
              enum: ['CORRENTE', 'POUPANCA', 'POUPANCA_SOCIAL', 'SALARIO'],
              enumName: 'tipo_conta',
              isNullable: true,
              comment: 'Tipo da conta bancária',
            },
            {
              name: 'chave_pix',
              type: 'varchar',
              length: '100',
              isNullable: false,
              comment: 'Chave PIX do cidadão',
            },
            {
              name: 'tipo_chave_pix',
              type: 'enum',
              enum: ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'],
              enumName: 'tipo_chave_pix',
              isNullable: false,
              comment: 'Tipo da chave PIX',
            },
            {
              name: 'ativo',
              type: 'boolean',
              default: true,
              isNullable: false,
              comment: 'Indica se a informação bancária está ativa',
            },
            {
              name: 'observacoes',
              type: 'text',
              isNullable: true,
              comment: 'Observações sobre a conta bancária',
            },
            {
              name: 'created_at',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'updated_at',
              type: 'timestamp with time zone',
              default: 'CURRENT_TIMESTAMP',
              isNullable: false,
            },
            {
              name: 'deleted_at',
              type: 'timestamp with time zone',
              isNullable: true,
            },
          ],
        }),
        true,
      );

      console.log('Tabela info_bancaria criada com sucesso');

      // Criar índices
      await queryRunner.createIndex(
        'info_bancaria',
        new TableIndex({
          name: 'IDX_info_bancaria_cidadao_id',
          columnNames: ['cidadao_id'],
        }),
      );

      await queryRunner.createIndex(
        'info_bancaria',
        new TableIndex({
          name: 'IDX_info_bancaria_conta_agencia_banco',
          columnNames: ['conta', 'agencia', 'banco'],
        }),
      );

      await queryRunner.createIndex(
        'info_bancaria',
        new TableIndex({
          name: 'IDX_info_bancaria_chave_pix',
          columnNames: ['chave_pix'],
          isUnique: true,
          where: 'chave_pix IS NOT NULL AND deleted_at IS NULL',
        }),
      );

      await queryRunner.createIndex(
        'info_bancaria',
        new TableIndex({
          name: 'IDX_info_bancaria_ativo',
          columnNames: ['ativo'],
        }),
      );

      await queryRunner.createIndex(
        'info_bancaria',
        new TableIndex({
          name: 'IDX_info_bancaria_deleted_at',
          columnNames: ['deleted_at'],
        }),
      );

      // Criar índice único para garantir apenas uma conta ativa por cidadão
      await queryRunner.createIndex(
        'info_bancaria',
        new TableIndex({
          name: 'IDX_info_bancaria_cidadao_ativo_unique',
          columnNames: ['cidadao_id'],
          isUnique: true,
          where: 'ativo = true AND deleted_at IS NULL',
        }),
      );

      console.log('Índices da tabela info_bancaria criados com sucesso');

      // Verificar se a tabela cidadao existe antes de criar a chave estrangeira
      try {
        // Verificar se a tabela cidadao existe
        const cidadaoExists = await queryRunner.hasTable('cidadao');
        
        if (cidadaoExists) {
          console.log('Tabela cidadao existe. Criando chave estrangeira...');
          // Criar chave estrangeira para cidadao
          await queryRunner.createForeignKey(
            'info_bancaria',
            new TableForeignKey({
              columnNames: ['cidadao_id'],
              referencedTableName: 'cidadao',
              referencedColumnNames: ['id'],
              onDelete: 'CASCADE',
              onUpdate: 'CASCADE',
              name: 'FK_info_bancaria_cidadao',
            })
          );
          console.log('Chave estrangeira FK_info_bancaria_cidadao criada com sucesso');
        } else {
          console.log('⚠️ Tabela cidadao não existe. A chave estrangeira será criada posteriormente.');
          // Vamos criar uma função que cria a tabela temporária sem a FK
          // e depois teremos outra migration para adicionar a FK quando cidadao existir
        }
      } catch (error) {
        console.error('Erro ao verificar tabela cidadao ou criar chave estrangeira:', error);
        // Continuamos sem a chave estrangeira por enquanto
      }

      // Criar trigger para atualizar updated_at
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_info_bancaria_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await queryRunner.query(`
        CREATE TRIGGER trigger_update_info_bancaria_updated_at
        BEFORE UPDATE ON info_bancaria
        FOR EACH ROW
        EXECUTE FUNCTION update_info_bancaria_updated_at();
      `);

      console.log('Trigger para updated_at criado com sucesso');

      // Adicionar comentários na tabela
      await queryRunner.query(`
        COMMENT ON TABLE info_bancaria IS 'Tabela para armazenar informações bancárias dos cidadãos, incluindo contas poupança social e dados PIX';
      `);

      console.log('Migration CreateInfoBancariaSchema executada com sucesso.');
    } catch (error) {
      console.error('Erro ao executar migration CreateInfoBancariaSchema:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Revertendo migration CreateInfoBancariaSchema...');

      // Remover trigger
      await queryRunner.query(`
        DROP TRIGGER IF EXISTS trigger_update_info_bancaria_updated_at ON info_bancaria;
      `);

      await queryRunner.query(`
        DROP FUNCTION IF EXISTS update_info_bancaria_updated_at();
      `);

      // Remover tabela (isso também remove índices e chaves estrangeiras)
      await queryRunner.dropTable('info_bancaria', true);

      // Remover enums se não estiverem sendo usados por outras tabelas
      const tipoContaUsage = await queryRunner.query(`
        SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE udt_name = 'tipo_conta' AND table_name != 'info_bancaria'
      `);

      const tipoChavePixUsage = await queryRunner.query(`
        SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE udt_name = 'tipo_chave_pix' AND table_name != 'info_bancaria'
      `);

      if (parseInt(tipoContaUsage[0].count) === 0) {
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_conta"`);
        console.log('Enum tipo_conta removido');
      }

      if (parseInt(tipoChavePixUsage[0].count) === 0) {
        await queryRunner.query(`DROP TYPE IF EXISTS "tipo_chave_pix"`);
        console.log('Enum tipo_chave_pix removido');
      }

      console.log('Migration CreateInfoBancariaSchema revertida com sucesso.');
    } catch (error) {
      console.error('Erro ao reverter migration CreateInfoBancariaSchema:', error);
      throw error;
    }
  }
}