import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove colunas redundantes da tabela cidadao após normalização
 * para as tabelas contato e endereco.
 * 
 * Esta migração remove:
 * - telefone (migrado para tabela contato)
 * - email (migrado para tabela contato) 
 * - endereco (migrado para tabela endereco)
 */
export class RemoveRedundantCidadaoColumns1750700200000 implements MigrationInterface {
  name = 'RemoveRedundantCidadaoColumns1750700200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Removendo colunas redundantes da tabela cidadao...');

    // Verificar se as tabelas contato e endereco existem antes de remover as colunas
    const contatoTableExists = await queryRunner.hasTable('contato');
    const enderecoTableExists = await queryRunner.hasTable('endereco');

    if (!contatoTableExists || !enderecoTableExists) {
      throw new Error('As tabelas contato e endereco devem existir antes de remover as colunas redundantes do cidadao');
    }

    // Verificar se há dados nas novas tabelas
    const contatoCount = await queryRunner.query('SELECT COUNT(*) as count FROM contato');
    const enderecoCount = await queryRunner.query('SELECT COUNT(*) as count FROM endereco');
    
    console.log(`Contatos migrados: ${contatoCount[0].count}`);
    console.log(`Endereços migrados: ${enderecoCount[0].count}`);

    // Remover coluna telefone
    await queryRunner.query(`
      ALTER TABLE "cidadao" DROP COLUMN IF EXISTS "telefone";
    `);
    console.log('Coluna telefone removida');

    // Remover coluna email
    await queryRunner.query(`
      ALTER TABLE "cidadao" DROP COLUMN IF EXISTS "email";
    `);
    console.log('Coluna email removida');

    // Remover coluna endereco (JSONB)
    await queryRunner.query(`
      ALTER TABLE "cidadao" DROP COLUMN IF EXISTS "endereco";
    `);
    console.log('Coluna endereco removida');

    console.log('Migration RemoveRedundantCidadaoColumns concluída com sucesso!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo remoção das colunas redundantes...');

    // Recriar coluna telefone
    await queryRunner.query(`
      ALTER TABLE "cidadao" ADD COLUMN "telefone" character varying;
    `);

    // Recriar coluna email
    await queryRunner.query(`
      ALTER TABLE "cidadao" ADD COLUMN "email" character varying;
    `);

    // Recriar coluna endereco como JSONB
    await queryRunner.query(`
      ALTER TABLE "cidadao" ADD COLUMN "endereco" jsonb;
    `);

    console.log('Colunas redundantes recriadas. ATENÇÃO: Os dados não foram restaurados!');
  }
}