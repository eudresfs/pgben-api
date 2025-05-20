import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao módulo de integradores
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de integradores,
 * permitindo que sistemas externos se conectem ao PGBen através de APIs seguras.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateIntegradorSchema1685468879190 implements MigrationInterface {
  name = 'CreateIntegradorSchema1685468879190';

  /**
   * Cria as estruturas relacionadas aos integradores
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1090000-CreateIntegradorSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "escopo_acesso_enum" AS ENUM (
        'leitura',
        'escrita',
        'admin'
      );
      
      CREATE TYPE "tipo_evento_integracao_enum" AS ENUM (
        'acesso',
        'operacao',
        'erro',
        'seguranca'
      );
    `);
    
    console.log('Tipos enumerados criados com sucesso.');
    
    // Tabela principal de integradores
    const integradoresExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'integradores'
      );
    `);
    
    if (!integradoresExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "integradores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying(100) NOT NULL,
        "descricao" character varying(500),
        "responsavel" character varying(100),
        "emailContato" character varying(255),
        "telefoneContato" character varying(20),
        "ativo" boolean NOT NULL DEFAULT true,
        "permissoesEscopo" text[],
        "ipPermitidos" text[],
        "ultimoAcesso" TIMESTAMP WITH TIME ZONE,
        "dataCriacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "dataAtualizacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_integradores_nome" UNIQUE ("nome"),
        CONSTRAINT "PK_integradores" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_integradores_ativo') THEN
          CREATE INDEX "IDX_integradores_ativo" ON "integradores" ("ativo");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_integradores_data_criacao') THEN
          CREATE INDEX "IDX_integradores_data_criacao" ON "integradores" ("dataCriacao");
        END IF;
      END $$;
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_integradores_update_timestamp
      BEFORE UPDATE ON "integradores"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela integradores já existe, pulando criação.');
    }
    
    console.log('Tabela de integradores criada com sucesso.');
    
    // Tabela de tokens de acesso para integradores
    const integradorTokensExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'integrador_tokens'
      );
    `);
    
    if (!integradorTokensExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "integrador_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integrador_id" uuid NOT NULL,
        "nome" character varying(100) NOT NULL,
        "descricao" character varying(500),
        "tokenHash" character varying(64) NOT NULL,
        "escopos" text[],
        "dataExpiracao" TIMESTAMP WITH TIME ZONE,
        "revogado" boolean NOT NULL DEFAULT false,
        "dataRevogacao" TIMESTAMP WITH TIME ZONE,
        "motivoRevogacao" character varying(255),
        "ultimoUso" TIMESTAMP WITH TIME ZONE,
        "dataCriacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integrador_tokens" PRIMARY KEY ("id")
      );
      
      CREATE INDEX IF NOT EXISTS "IDX_integrador_tokens_integrador" ON "integrador_tokens" ("integrador_id");
      CREATE INDEX IF NOT EXISTS "IDX_integrador_tokens_revogado" ON "integrador_tokens" ("revogado");
      CREATE INDEX IF NOT EXISTS "IDX_integrador_tokens_token_hash" ON "integrador_tokens" ("tokenHash");
      CREATE INDEX IF NOT EXISTS "IDX_integrador_tokens_data_expiracao" ON "integrador_tokens" ("dataExpiracao");
      `);
    } else {
      console.log('Tabela integrador_tokens já existe, pulando criação.');
    }
    
    console.log('Tabela de tokens de integradores criada com sucesso.');
    
    // Tabela de logs de acesso dos integradores
    const integradorLogsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'integrador_logs'
      );
    `);
    
    if (!integradorLogsExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "integrador_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integrador_id" uuid NOT NULL,
        "token_id" uuid NOT NULL,
        "endpoint" character varying(255) NOT NULL,
        "metodo" character varying(10) NOT NULL,
        "ip_origem" character varying(45) NOT NULL,
        "user_agent" character varying(255),
        "data_acesso" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "status_resposta" integer NOT NULL,
        "tempo_resposta_ms" integer NOT NULL,
        "payload_requisicao" jsonb,
        "detalhes_erro" jsonb,
        CONSTRAINT "PK_integrador_logs" PRIMARY KEY ("id")
      );
      
      CREATE INDEX IF NOT EXISTS "IDX_log_integrador" ON "integrador_logs" ("integrador_id");
      CREATE INDEX IF NOT EXISTS "IDX_log_token" ON "integrador_logs" ("token_id");
      CREATE INDEX IF NOT EXISTS "IDX_log_data" ON "integrador_logs" ("data_acesso");
      CREATE INDEX IF NOT EXISTS "IDX_log_status" ON "integrador_logs" ("status_resposta");
      CREATE INDEX IF NOT EXISTS "IDX_log_endpoint" ON "integrador_logs" ("endpoint");
      `);
    } else {
      console.log('Tabela integrador_logs já existe, pulando criação.');
    }
    
    console.log('Tabela de logs de integradores criada com sucesso.');
    
    // Tabela de permissões específicas para integradores
    const integradorPermissoesExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'integrador_permissoes'
      );
    `);
    
    if (!integradorPermissoesExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "integrador_permissoes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integrador_id" uuid NOT NULL,
        "recurso" character varying(100) NOT NULL,
        "escopo" "escopo_acesso_enum" NOT NULL DEFAULT 'leitura',
        "condicoes" jsonb,
        "criado_por" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integrador_permissoes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_integrador_permissoes_recurso" UNIQUE ("integrador_id", "recurso")
      );
      
      CREATE INDEX IF NOT EXISTS "IDX_permissao_integrador" ON "integrador_permissoes" ("integrador_id");
      CREATE INDEX IF NOT EXISTS "IDX_permissao_recurso" ON "integrador_permissoes" ("recurso");
      CREATE INDEX IF NOT EXISTS "IDX_permissao_escopo" ON "integrador_permissoes" ("escopo");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_integrador_permissoes_update_timestamp
      BEFORE UPDATE ON "integrador_permissoes"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela integrador_permissoes já existe, pulando criação.');
    }
    
    console.log('Tabela de permissões de integradores criada com sucesso.');
    
    // Tabela de eventos de integração
    const integradorEventosExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'integrador_eventos'
      );
    `);
    
    if (!integradorEventosExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "integrador_eventos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "integrador_id" uuid NOT NULL,
        "token_id" uuid,
        "tipo" "tipo_evento_integracao_enum" NOT NULL,
        "descricao" text NOT NULL,
        "dados" jsonb,
        "ip_origem" character varying(45),
        "data_evento" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "severidade" integer NOT NULL DEFAULT 0,
        "notificado" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_integrador_eventos" PRIMARY KEY ("id")
      );
      
      CREATE INDEX IF NOT EXISTS "IDX_evento_integrador" ON "integrador_eventos" ("integrador_id");
      CREATE INDEX IF NOT EXISTS "IDX_evento_tipo" ON "integrador_eventos" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_evento_data" ON "integrador_eventos" ("data_evento");
      CREATE INDEX IF NOT EXISTS "IDX_evento_severidade" ON "integrador_eventos" ("severidade");
      CREATE INDEX IF NOT EXISTS "IDX_evento_dados" ON "integrador_eventos" USING GIN ("dados");
      `);
    } else {
      console.log('Tabela integrador_eventos já existe, pulando criação.');
    }
    
    console.log('Tabela de eventos de integradores criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      -- Relacionamentos da tabela de tokens
      ALTER TABLE "integrador_tokens" ADD CONSTRAINT "FK_integrador_tokens_integrador"
      FOREIGN KEY ("integrador_id") REFERENCES "integradores" ("id") ON DELETE CASCADE;
      
      -- Relacionamentos da tabela de logs
      ALTER TABLE "integrador_logs" ADD CONSTRAINT "FK_integrador_logs_integrador"
      FOREIGN KEY ("integrador_id") REFERENCES "integradores" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "integrador_logs" ADD CONSTRAINT "FK_integrador_logs_token"
      FOREIGN KEY ("token_id") REFERENCES "integrador_tokens" ("id") ON DELETE CASCADE;
      
      -- Relacionamentos da tabela de permissões
      ALTER TABLE "integrador_permissoes" ADD CONSTRAINT "FK_integrador_permissoes_integrador"
      FOREIGN KEY ("integrador_id") REFERENCES "integradores" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "integrador_permissoes" ADD CONSTRAINT "FK_integrador_permissoes_criado_por"
      FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      -- Relacionamentos da tabela de eventos
      ALTER TABLE "integrador_eventos" ADD CONSTRAINT "FK_integrador_eventos_integrador"
      FOREIGN KEY ("integrador_id") REFERENCES "integradores" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "integrador_eventos" ADD CONSTRAINT "FK_integrador_eventos_token"
      FOREIGN KEY ("token_id") REFERENCES "integrador_tokens" ("id") ON DELETE SET NULL;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "integradores" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "integrador_tokens" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "integrador_logs" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "integrador_permissoes" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "integrador_eventos" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY integradores_policy ON "integradores" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY integrador_tokens_policy ON "integrador_tokens" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY integrador_logs_policy ON "integrador_logs" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY integrador_permissoes_policy ON "integrador_permissoes" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY integrador_eventos_policy ON "integrador_eventos" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    // Criar log de auditoria para tabelas importantes
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('integradores');
      SELECT create_audit_log_trigger('integrador_tokens');
      SELECT create_audit_log_trigger('integrador_permissoes');
    `);
    */
    
    console.log('Migration 1090000-CreateIntegradorSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1090000-CreateIntegradorSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS integradores_policy ON "integradores";
      DROP POLICY IF EXISTS integrador_tokens_policy ON "integrador_tokens";
      DROP POLICY IF EXISTS integrador_logs_policy ON "integrador_logs";
      DROP POLICY IF EXISTS integrador_permissoes_policy ON "integrador_permissoes";
      DROP POLICY IF EXISTS integrador_eventos_policy ON "integrador_eventos";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "integrador_tokens" DROP CONSTRAINT IF EXISTS "FK_integrador_tokens_integrador";
      
      ALTER TABLE "integrador_logs" DROP CONSTRAINT IF EXISTS "FK_integrador_logs_integrador";
      ALTER TABLE "integrador_logs" DROP CONSTRAINT IF EXISTS "FK_integrador_logs_token";
      
      ALTER TABLE "integrador_permissoes" DROP CONSTRAINT IF EXISTS "FK_integrador_permissoes_integrador";
      ALTER TABLE "integrador_permissoes" DROP CONSTRAINT IF EXISTS "FK_integrador_permissoes_criado_por";
      
      ALTER TABLE "integrador_eventos" DROP CONSTRAINT IF EXISTS "FK_integrador_eventos_integrador";
      ALTER TABLE "integrador_eventos" DROP CONSTRAINT IF EXISTS "FK_integrador_eventos_token";
    `);
    
    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_integradores_update_timestamp ON "integradores";
      DROP TRIGGER IF EXISTS trigger_integrador_permissoes_update_timestamp ON "integrador_permissoes";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "integrador_eventos";
      DROP TABLE IF EXISTS "integrador_permissoes";
      DROP TABLE IF EXISTS "integrador_logs";
      DROP TABLE IF EXISTS "integrador_tokens";
      DROP TABLE IF EXISTS "integradores";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "escopo_acesso_enum";
      DROP TYPE IF EXISTS "tipo_evento_integracao_enum";
    `);
    
    console.log('Migration 1090000-CreateIntegradorSchema revertida com sucesso.');
  }
}
