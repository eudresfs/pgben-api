import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEnderecoVisitaNullable1755900000000
  implements MigrationInterface
{
  name = 'FixEnderecoVisitaNullable1755900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Dropar a view que depende da coluna endereco_visita
    await queryRunner.query(`DROP VIEW IF EXISTS vw_agendamentos_em_atraso;`);

    // 2. Alterar a coluna endereco_visita para permitir valores NULL
    // para estar consistente com a definição da entidade
    await queryRunner.query(
      `ALTER TABLE "agendamento_visita" ALTER COLUMN "endereco_visita" DROP NOT NULL`
    );

    // 3. Alterar o tipo da coluna para varchar(500) conforme definido na entidade
    await queryRunner.query(
      `ALTER TABLE "agendamento_visita" ALTER COLUMN "endereco_visita" TYPE varchar(500)`
    );

    // 4. Recriar a view vw_agendamentos_em_atraso
    await queryRunner.query(`
      CREATE VIEW vw_agendamentos_em_atraso AS
      SELECT 
        av.*,
        CASE 
          WHEN av.data_agendamento < CURRENT_TIMESTAMP 
            AND av.status IN ('agendado', 'confirmado') 
          THEN true 
          ELSE false 
        END as em_atraso,
        CASE 
          WHEN av.data_agendamento < CURRENT_TIMESTAMP 
            AND av.status IN ('agendado', 'confirmado') 
          THEN EXTRACT(days FROM CURRENT_TIMESTAMP - av.data_agendamento)::integer
          ELSE 0 
        END as dias_atraso
      FROM agendamento_visita av
      WHERE av.data_agendamento < CURRENT_TIMESTAMP 
        AND av.status IN ('agendado', 'confirmado');
    `);

    // 5. Adicionar comentário na view
    await queryRunner.query(`
      COMMENT ON VIEW vw_agendamentos_em_atraso IS 'View para consulta otimizada de agendamentos em atraso';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Dropar a view
    await queryRunner.query(`DROP VIEW IF EXISTS vw_agendamentos_em_atraso;`);

    // 2. Reverter as alterações na coluna
    await queryRunner.query(
      `ALTER TABLE "agendamento_visita" ALTER COLUMN "endereco_visita" TYPE text`
    );

    await queryRunner.query(
      `ALTER TABLE "agendamento_visita" ALTER COLUMN "endereco_visita" SET NOT NULL`
    );

    // 3. Recriar a view com a definição original
    await queryRunner.query(`
      CREATE VIEW vw_agendamentos_em_atraso AS
      SELECT 
        av.*,
        CASE 
          WHEN av.data_agendamento < CURRENT_TIMESTAMP 
            AND av.status IN ('agendado', 'confirmado') 
          THEN true 
          ELSE false 
        END as em_atraso,
        CASE 
          WHEN av.data_agendamento < CURRENT_TIMESTAMP 
            AND av.status IN ('agendado', 'confirmado') 
          THEN EXTRACT(days FROM CURRENT_TIMESTAMP - av.data_agendamento)::integer
          ELSE 0 
        END as dias_atraso
      FROM agendamento_visita av
      WHERE av.data_agendamento < CURRENT_TIMESTAMP 
        AND av.status IN ('agendado', 'confirmado');
    `);

    await queryRunner.query(`
      COMMENT ON VIEW vw_agendamentos_em_atraso IS 'View para consulta otimizada de agendamentos em atraso';
    `);
  }
}