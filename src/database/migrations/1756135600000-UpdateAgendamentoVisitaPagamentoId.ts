import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAgendamentoVisitaPagamentoId1756135600000 implements MigrationInterface {
  name = 'UpdateAgendamentoVisitaPagamentoId1756135600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela existe
    const tableExists = await queryRunner.hasTable('agendamento_visita');
    if (!tableExists) {
      console.log('Tabela agendamento_visita não existe, pulando migração');
      return;
    }

    // 1. Primeiro, remover a view que depende das colunas antigas
    await queryRunner.query(`DROP VIEW IF EXISTS vw_agendamentos_em_atraso;`);
    console.log('View vw_agendamentos_em_atraso removida');

    // Adicionar coluna pagamento_id
    const hasColumn = await queryRunner.hasColumn('agendamento_visita', 'pagamento_id');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        ADD COLUMN "pagamento_id" uuid;
      `);
    }

    // Criar índice para pagamento_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_agendamento_visita_pagamento_id" 
      ON "agendamento_visita" ("pagamento_id");
    `);

    // Adicionar foreign key constraint para pagamento_id
    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      ADD CONSTRAINT "FK_agendamento_visita_pagamento" 
      FOREIGN KEY ("pagamento_id") REFERENCES "pagamento"("id") 
      ON DELETE CASCADE;
    `);

    // Remover foreign keys antigas se existirem
    try {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP CONSTRAINT IF EXISTS "FK_agendamento_visita_beneficiario";
      `);
    } catch (error) {
      console.log('Constraint FK_agendamento_visita_beneficiario não existe');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP CONSTRAINT IF EXISTS "FK_agendamento_visita_tecnico";
      `);
    } catch (error) {
      console.log('Constraint FK_agendamento_visita_tecnico não existe');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP CONSTRAINT IF EXISTS "FK_agendamento_visita_unidade";
      `);
    } catch (error) {
      console.log('Constraint FK_agendamento_visita_unidade não existe');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP CONSTRAINT IF EXISTS "FK_agendamento_visita_concessao";
      `);
    } catch (error) {
      console.log('Constraint FK_agendamento_visita_concessao não existe');
    }

    // Remover índices antigos
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_agendamento_visita_beneficiario_id";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_agendamento_visita_tecnico_id";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_agendamento_visita_unidade_id";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_agendamento_visita_concessao_id";
    `);

    // Remover colunas antigas
    const hasBeneficiarioId = await queryRunner.hasColumn('agendamento_visita', 'beneficiario_id');
    if (hasBeneficiarioId) {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP COLUMN "beneficiario_id";
      `);
    }

    const hasTecnicoId = await queryRunner.hasColumn('agendamento_visita', 'tecnico_id');
    if (hasTecnicoId) {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP COLUMN "tecnico_id";
      `);
    }

    const hasUnidadeId = await queryRunner.hasColumn('agendamento_visita', 'unidade_id');
    if (hasUnidadeId) {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP COLUMN "unidade_id";
      `);
    }

    const hasConcessaoId = await queryRunner.hasColumn('agendamento_visita', 'concessao_id');
    if (hasConcessaoId) {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP COLUMN "concessao_id";
      `);
    }

    // 2. Recriar a view vw_agendamentos_em_atraso com a nova estrutura
    await queryRunner.query(`
      CREATE VIEW vw_agendamentos_em_atraso AS
      SELECT 
        av.*,
        p.numero_parcela,
        p.total_parcelas,
        s.beneficiario_id,
        s.tecnico_id,
        s.unidade_id,
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
      LEFT JOIN pagamento p ON av.pagamento_id = p.id
      LEFT JOIN solicitacao s ON p.solicitacao_id = s.id
      WHERE av.data_agendamento < CURRENT_TIMESTAMP 
        AND av.status IN ('agendado', 'confirmado');
    `);

    // 3. Adicionar comentário na view
    await queryRunner.query(`
      COMMENT ON VIEW vw_agendamentos_em_atraso IS 'View para consulta otimizada de agendamentos em atraso com nova estrutura usando pagamento_id';
    `);

    console.log('View vw_agendamentos_em_atraso recriada com nova estrutura');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela existe
    const tableExists = await queryRunner.hasTable('agendamento_visita');
    if (!tableExists) {
      return;
    }

    // 1. Remover a view atual
    await queryRunner.query(`DROP VIEW IF EXISTS vw_agendamentos_em_atraso;`);
    console.log('View vw_agendamentos_em_atraso removida para rollback');

    // Remover foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      DROP CONSTRAINT IF EXISTS "FK_agendamento_visita_pagamento";
    `);

    // Remover índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_agendamento_visita_pagamento_id";
    `);

    // Remover coluna pagamento_id
    const hasColumn = await queryRunner.hasColumn('agendamento_visita', 'pagamento_id');
    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE "agendamento_visita" 
        DROP COLUMN "pagamento_id";
      `);
    }

    // Recriar colunas antigas
    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      ADD COLUMN "beneficiario_id" uuid,
      ADD COLUMN "tecnico_id" uuid,
      ADD COLUMN "unidade_id" uuid,
      ADD COLUMN "concessao_id" uuid;
    `);

    // Recriar índices
    await queryRunner.query(`
      CREATE INDEX "IDX_agendamento_visita_beneficiario_id" 
      ON "agendamento_visita" ("beneficiario_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_agendamento_visita_tecnico_id" 
      ON "agendamento_visita" ("tecnico_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_agendamento_visita_unidade_id" 
      ON "agendamento_visita" ("unidade_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_agendamento_visita_concessao_id" 
      ON "agendamento_visita" ("concessao_id");
    `);

    // Recriar foreign keys
    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      ADD CONSTRAINT "FK_agendamento_visita_beneficiario" 
      FOREIGN KEY ("beneficiario_id") REFERENCES "cidadao"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      ADD CONSTRAINT "FK_agendamento_visita_tecnico" 
      FOREIGN KEY ("tecnico_id") REFERENCES "usuario"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      ADD CONSTRAINT "FK_agendamento_visita_unidade" 
      FOREIGN KEY ("unidade_id") REFERENCES "unidade"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "agendamento_visita" 
      ADD CONSTRAINT "FK_agendamento_visita_concessao" 
      FOREIGN KEY ("concessao_id") REFERENCES "concessao"("id") ON DELETE CASCADE;
    `);

    // 2. Recriar a view original
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

    // 3. Adicionar comentário na view
    await queryRunner.query(`
      COMMENT ON VIEW vw_agendamentos_em_atraso IS 'View para consulta otimizada de agendamentos em atraso';
    `);

    console.log('View vw_agendamentos_em_atraso recriada com estrutura original');
  }
}