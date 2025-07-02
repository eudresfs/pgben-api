import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração idempotente para transferir dados existentes de cidadão para as novas tabelas
 * de contato e endereço. Este script:
 *
 * 1. Cria um contato para cada cidadão com os dados de telefone e email
 * 2. Cria um endereço para cada cidadão com os dados do endereço JSONB
 * 3. Usa ON CONFLICT DO NOTHING para garantir idempotência
 */
export class MigrateContatoEnderecoData1750700100000
  implements MigrationInterface
{
  name = 'MigrateContatoEnderecoData1750700100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrar dados de contato (telefone e email)
    await queryRunner.query(`
      INSERT INTO contato (
        id, 
        cidadao_id, 
        telefone, 
        email, 
        proprietario, 
        is_whatsapp, 
        possui_smartphone
      )
      SELECT 
        uuid_generate_v4() as id,
        id as cidadao_id,
        telefone,
        email,
        true as proprietario,
        false as is_whatsapp,
        false as possui_smartphone
      FROM cidadao
      WHERE telefone IS NOT NULL OR email IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Migrar dados de endereço
    await queryRunner.query(`
      INSERT INTO endereco (
        id,
        cidadao_id,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        ponto_referencia,
        tempo_de_residencia,
        data_inicio_vigencia,
        data_fim_vigencia
      )
      SELECT 
        uuid_generate_v4() as id,
        id as cidadao_id,
        endereco->>'logradouro' as logradouro,
        endereco->>'numero' as numero,
        endereco->>'complemento' as complemento,
        endereco->>'bairro' as bairro,
        endereco->>'cidade' as cidade,
        endereco->>'estado' as estado,
        endereco->>'cep' as cep,
        endereco->>'ponto_referencia' as ponto_referencia,
        (endereco->>'tempo_de_residencia')::integer as tempo_de_residencia,
        COALESCE(created_at, NOW()) as data_inicio_vigencia,
        NULL as data_fim_vigencia
      FROM cidadao
      WHERE endereco IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Adicionar métricas de migração para monitoramento
    await queryRunner.query(`
      INSERT INTO metrica (
        nome,
        valor,
        tipo,
        descricao,
        created_at
      )
      VALUES 
      (
        'migracao_contato_count', 
        (SELECT COUNT(*) FROM contato), 
        'SISTEMA', 
        'Quantidade de contatos migrados', 
        NOW()
      ),
      (
        'migracao_endereco_count', 
        (SELECT COUNT(*) FROM endereco), 
        'SISTEMA', 
        'Quantidade de endereços migrados', 
        NOW()
      ),
      (
        'migracao_cidadao_count', 
        (SELECT COUNT(*) FROM cidadao), 
        'SISTEMA', 
        'Quantidade total de cidadãos', 
        NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Não há necessidade de reverter a migração de dados, pois os dados originais
    // ainda estão presentes nas colunas originais do cidadão.
    // Apenas removemos as métricas de migração
    await queryRunner.query(`
      DELETE FROM metrica 
      WHERE nome IN (
        'migracao_contato_count', 
        'migracao_endereco_count', 
        'migracao_cidadao_count'
      );
    `);
  }
}
