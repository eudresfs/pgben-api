import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar o esquema de auditoria com suporte a particionamento
 *
 * Esta migração cria:
 * 1. Tipos enumerados para operações de auditoria
 * 2. Tabela principal de logs de auditoria com suporte a particionamento por data
 * 3. Tabela de histórico para logs antigos
 * 4. Índices para melhorar a performance das consultas
 * 5. Partições iniciais para os próximos 12 meses
 */
export class CreateAuditoriaSchema1090001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tipo enum para operações de auditoria
    await queryRunner.query(`
      CREATE TYPE "tipo_operacao_enum" AS ENUM (
        'CREATE', 
        'READ', 
        'UPDATE', 
        'DELETE', 
        'ACCESS', 
        'EXPORT', 
        'ANONYMIZE', 
        'LOGIN', 
        'LOGOUT', 
        'FAILED_LOGIN'
      );
    `);

    // Criar tabela de logs de auditoria com particionamento
    await queryRunner.query(`
      CREATE TABLE "logs_auditoria" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_operacao" "tipo_operacao_enum" NOT NULL,
        "entidade_afetada" character varying(100) NOT NULL,
        "entidade_id" character varying(36),
        "dados_anteriores" jsonb,
        "dados_novos" jsonb,
        "usuario_id" uuid,
        "ip_origem" character varying(45),
        "user_agent" text,
        "endpoint" character varying(255),
        "metodo_http" character varying(10),
        "dados_sensiveis_acessados" jsonb,
        "motivo" text,
        "descricao" text,
        "data_hora" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_logs_auditoria" PRIMARY KEY ("id", "created_at")
      ) PARTITION BY RANGE (created_at);
    `);

    // Criar tabela para histórico de logs de auditoria (para logs antigos)
    await queryRunner.query(`
      CREATE TABLE "logs_auditoria_historico" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_operacao" "tipo_operacao_enum" NOT NULL,
        "entidade_afetada" character varying(100) NOT NULL,
        "entidade_id" character varying(36),
        "dados_anteriores" jsonb,
        "dados_novos" jsonb,
        "usuario_id" uuid,
        "ip_origem" character varying(45),
        "user_agent" text,
        "endpoint" character varying(255),
        "metodo_http" character varying(10),
        "dados_sensiveis_acessados" jsonb,
        "motivo" text,
        "descricao" text,
        "data_hora" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_logs_auditoria_historico" PRIMARY KEY ("id")
      );
    `);

    // Criar tabela para armazenar assinaturas de logs (integridade)
    await queryRunner.query(`
      CREATE TABLE "logs_auditoria_assinaturas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "log_id" uuid NOT NULL,
        "assinatura" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_logs_auditoria_assinaturas" PRIMARY KEY ("id"),
        CONSTRAINT "fk_logs_auditoria_assinaturas_log" FOREIGN KEY ("log_id") 
          REFERENCES "logs_auditoria" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      );
    `);

    // Criar índices para melhorar a performance
    await queryRunner.query(`
      CREATE INDEX "idx_logs_auditoria_usuario_id" ON "logs_auditoria" ("usuario_id", "created_at");
      CREATE INDEX "idx_logs_auditoria_entidade" ON "logs_auditoria" ("entidade_afetada", "entidade_id", "created_at");
      CREATE INDEX "idx_logs_auditoria_tipo_operacao" ON "logs_auditoria" ("tipo_operacao", "created_at");
      CREATE INDEX "idx_logs_auditoria_endpoint" ON "logs_auditoria" ("endpoint", "created_at");
      CREATE INDEX "idx_logs_auditoria_ip_origem" ON "logs_auditoria" ("ip_origem", "created_at");
      CREATE INDEX "idx_logs_auditoria_data_hora" ON "logs_auditoria" ("data_hora");
      
      CREATE INDEX "idx_logs_auditoria_historico_usuario_id" ON "logs_auditoria_historico" ("usuario_id", "created_at");
      CREATE INDEX "idx_logs_auditoria_historico_entidade" ON "logs_auditoria_historico" ("entidade_afetada", "entidade_id", "created_at");
      CREATE INDEX "idx_logs_auditoria_historico_tipo_operacao" ON "logs_auditoria_historico" ("tipo_operacao", "created_at");
    `);

    // Criar índice GIN para busca em dados JSON
    await queryRunner.query(`
      CREATE INDEX "idx_logs_auditoria_dados_anteriores" ON "logs_auditoria" USING GIN ("dados_anteriores");
      CREATE INDEX "idx_logs_auditoria_dados_novos" ON "logs_auditoria" USING GIN ("dados_novos");
      CREATE INDEX "idx_logs_auditoria_dados_sensiveis" ON "logs_auditoria" USING GIN ("dados_sensiveis_acessados");
    `);

    // Criar partições para os próximos 12 meses
    const dataAtual = new Date();

    for (let i = 0; i < 12; i++) {
      const dataInicio = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth() + i,
        1,
      );
      const dataFim = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth() + i + 1,
        1,
      );

      const anoMes = `${dataInicio.getFullYear()}_${(dataInicio.getMonth() + 1).toString().padStart(2, '0')}`;
      const dataInicioStr = dataInicio.toISOString().split('T')[0];
      const dataFimStr = dataFim.toISOString().split('T')[0];

      await queryRunner.query(`
        CREATE TABLE "logs_auditoria_${anoMes}" PARTITION OF "logs_auditoria"
        FOR VALUES FROM ('${dataInicioStr}') TO ('${dataFimStr}');
      `);
    }

    // Criar função para manutenção automática de partições
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION criar_particao_logs_auditoria()
      RETURNS void AS $$
      DECLARE
          ano_mes TEXT;
          data_inicio DATE;
          data_fim DATE;
          particao_nome TEXT;
          particao_existe BOOLEAN;
      BEGIN
          -- Calcular o próximo mês após o último existente
          data_inicio := (SELECT CASE 
                              WHEN MAX(TO_DATE(SUBSTRING(table_name FROM 16), 'YYYY_MM')) IS NULL THEN CURRENT_DATE
                              ELSE (TO_DATE(SUBSTRING(MAX(table_name) FROM 16), 'YYYY_MM') + INTERVAL '1 month')::DATE
                          END
                          FROM information_schema.tables 
                          WHERE table_name LIKE 'logs_auditoria_%' AND table_name != 'logs_auditoria_historico');
          
          -- Criar partições para os próximos 3 meses
          FOR i IN 0..2 LOOP
              data_inicio := (DATE_TRUNC('month', data_inicio) + (i || ' month')::INTERVAL)::DATE;
              data_fim := (DATE_TRUNC('month', data_inicio) + '1 month'::INTERVAL)::DATE;
              
              ano_mes := TO_CHAR(data_inicio, 'YYYY_MM');
              particao_nome := 'logs_auditoria_' || ano_mes;
              
              -- Verificar se a partição já existe
              SELECT EXISTS (
                  SELECT FROM information_schema.tables 
                  WHERE table_name = particao_nome
              ) INTO particao_existe;
              
              -- Criar partição se não existir
              IF NOT particao_existe THEN
                  EXECUTE 'CREATE TABLE ' || particao_nome || ' PARTITION OF logs_auditoria
                          FOR VALUES FROM (''' || data_inicio || ''') TO (''' || data_fim || ''')';
                  
                  RAISE NOTICE 'Partição % criada para o período % a %', particao_nome, data_inicio, data_fim;
              END IF;
          END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Criar trigger para executar a função automaticamente
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_criar_particao_logs_auditoria()
      RETURNS TRIGGER AS $$
      BEGIN
          PERFORM criar_particao_logs_auditoria();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER manter_particoes_logs_auditoria
      AFTER INSERT ON logs_auditoria
      FOR EACH STATEMENT
      EXECUTE FUNCTION trigger_criar_particao_logs_auditoria();
    `);

    // Criar função para arquivar logs antigos
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION arquivar_logs_auditoria_antigos(meses_retencao INTEGER)
      RETURNS void AS $$
      DECLARE
          data_limite DATE;
          particoes_antigas TEXT[];
          particao TEXT;
      BEGIN
          -- Definir data limite para arquivamento
          data_limite := (CURRENT_DATE - (meses_retencao || ' month')::INTERVAL)::DATE;
          
          -- Mover logs antigos para tabela de histórico
          EXECUTE 'INSERT INTO logs_auditoria_historico
                  SELECT * FROM logs_auditoria
                  WHERE created_at < ''' || data_limite || '''';
          
          -- Identificar partições antigas
          SELECT ARRAY_AGG(table_name)
          INTO particoes_antigas
          FROM information_schema.tables 
          WHERE table_name LIKE 'logs_auditoria_%' 
            AND table_name != 'logs_auditoria_historico'
            AND TO_DATE(SUBSTRING(table_name FROM 16), 'YYYY_MM') < DATE_TRUNC('month', data_limite);
          
          -- Remover partições antigas
          IF particoes_antigas IS NOT NULL THEN
              FOREACH particao IN ARRAY particoes_antigas
              LOOP
                  EXECUTE 'DROP TABLE IF EXISTS ' || particao;
                  RAISE NOTICE 'Partição % removida', particao;
              END LOOP;
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger e funções
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS manter_particoes_logs_auditoria ON logs_auditoria`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS trigger_criar_particao_logs_auditoria()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS criar_particao_logs_auditoria()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS arquivar_logs_auditoria_antigos(INTEGER)`,
    );

    // Remover partições (não é necessário listar todas, pois a tabela principal será removida)

    // Remover índices
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_usuario_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_entidade"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_tipo_operacao"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_endpoint"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_ip_origem"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_data_hora"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_dados_anteriores"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_dados_novos"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_dados_sensiveis"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_historico_usuario_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_historico_entidade"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_logs_auditoria_historico_tipo_operacao"`,
    );

    // Remover tabelas
    await queryRunner.query(
      `DROP TABLE IF EXISTS "logs_auditoria_assinaturas"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "logs_auditoria_historico"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "logs_auditoria"`);

    // Remover tipo enum
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_operacao_enum"`);
  }
}
