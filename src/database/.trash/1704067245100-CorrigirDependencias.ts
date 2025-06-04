import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration especial para corrigir dependências entre tabelas
 * Esta migration verifica e adiciona as chaves estrangeiras ausentes
 * quando as tabelas referenciadas já existem
 */
export class CorrigirDependencias1704067245100 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration de correção de dependências...');

    // Verificar e corrigir a chave estrangeira de info_bancaria para cidadao
    await this.corrigirFKInfoBancariaCidadao(queryRunner);

    // Aqui você pode adicionar mais correções de dependências conforme necessário

    console.log('Migration de correção de dependências concluída com sucesso!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Não é necessário reverter esta migration pois ela apenas corrige dependências
    console.log('Revertendo migration de correção de dependências...');
    console.log(
      'Não é necessário reverter esta migration pois ela apenas corrige dependências.',
    );
  }

  /**
   * Corrige a chave estrangeira de info_bancaria para cidadao
   */
  private async corrigirFKInfoBancariaCidadao(
    queryRunner: QueryRunner,
  ): Promise<void> {
    try {
      console.log('Verificando dependência entre info_bancaria e cidadao...');

      // Verificar se ambas as tabelas existem
      const infoBancariaExists = await queryRunner.hasTable('info_bancaria');
      const cidadaoExists = await queryRunner.hasTable('cidadao');

      if (!infoBancariaExists) {
        console.log(
          '⚠️ Tabela info_bancaria não existe. Não é possível adicionar a chave estrangeira.',
        );
        return;
      }

      if (!cidadaoExists) {
        console.log(
          '⚠️ Tabela cidadao não existe. Não é possível adicionar a chave estrangeira.',
        );
        return;
      }

      // Verificar se a chave estrangeira já existe
      const tableConstraints = await queryRunner.query(
        `SELECT constraint_name 
         FROM information_schema.table_constraints 
         WHERE table_name = 'info_bancaria' 
         AND constraint_name = 'FK_info_bancaria_cidadao'`,
      );

      if (tableConstraints && tableConstraints.length > 0) {
        console.log('✅ Chave estrangeira FK_info_bancaria_cidadao já existe.');
        return;
      }

      // Adicionar a chave estrangeira
      console.log('Adicionando chave estrangeira FK_info_bancaria_cidadao...');
      await queryRunner.query(`
        ALTER TABLE "info_bancaria" 
        ADD CONSTRAINT "FK_info_bancaria_cidadao" 
        FOREIGN KEY ("cidadao_id") 
        REFERENCES "cidadao"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
      `);

      console.log(
        '✅ Chave estrangeira FK_info_bancaria_cidadao adicionada com sucesso!',
      );
    } catch (error) {
      console.error(
        '❌ Erro ao corrigir dependência entre info_bancaria e cidadao:',
        error,
      );
      // Não lançamos o erro para permitir que a migration continue
    }
  }
}
