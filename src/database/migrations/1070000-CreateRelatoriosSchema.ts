import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado aos relatórios
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de relatórios,
 * incluindo estruturas para templates, configurações e histórico de geração de relatórios.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateRelatoriosSchema1685468879188 implements MigrationInterface {
  name = 'CreateRelatoriosSchema1685468879188';

  /**
   * Cria as estruturas relacionadas aos relatórios
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1070000-CreateRelatoriosSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "formato_relatorio_enum" AS ENUM (
        'pdf',
        'excel',
        'csv'
      );
      
      CREATE TYPE "tipo_relatorio_enum" AS ENUM (
        'beneficios',
        'solicitacoes',
        'atendimentos',
        'financeiro',
        'indicadores',
        'auditoria',
        'personalizado'
      );
      
      CREATE TYPE "status_geracao_enum" AS ENUM (
        'pendente',
        'em_processamento',
        'concluido',
        'erro',
        'cancelado'
      );
    `);
    
    console.log('Tipos enumerados criados com sucesso.');
    
    // Tabela de templates de relatórios
    await queryRunner.query(`
      CREATE TABLE "relatorio_template" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying(100) NOT NULL,
        "descricao" text,
        "tipo" "tipo_relatorio_enum" NOT NULL,
        "caminho_template" character varying(255) NOT NULL,
        "parametros_requeridos" jsonb NOT NULL DEFAULT '[]',
        "filtros_disponiveis" jsonb NOT NULL DEFAULT '[]',
        "formatos_suportados" jsonb NOT NULL DEFAULT '["pdf"]',
        "query_base" text,
        "script_processamento" text,
        "ativo" boolean NOT NULL DEFAULT true,
        "versao" character varying(10) NOT NULL DEFAULT '1.0.0',
        "criado_por" uuid,
        "atualizado_por" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_relatorio_template" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_template_nome" ON "relatorio_template" ("nome");
      CREATE INDEX "IDX_template_tipo" ON "relatorio_template" ("tipo");
      CREATE INDEX "IDX_template_ativo" ON "relatorio_template" ("ativo");
      CREATE INDEX "IDX_template_parametros" ON "relatorio_template" USING GIN ("parametros_requeridos");
      CREATE INDEX "IDX_template_filtros" ON "relatorio_template" USING GIN ("filtros_disponiveis");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_template_update_timestamp
      BEFORE UPDATE ON "relatorio_template"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de templates de relatórios criada com sucesso.');
    
    // Tabela de configurações de relatórios
    await queryRunner.query(`
      CREATE TABLE "relatorio_config" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "nome" character varying(100) NOT NULL,
        "descricao" text,
        "parametros_padrao" jsonb NOT NULL DEFAULT '{}',
        "programacao" jsonb,
        "notificacoes" jsonb,
        "usuarios_autorizados" jsonb,
        "unidades_autorizadas" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_relatorio_config" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_config_template" ON "relatorio_config" ("template_id");
      CREATE INDEX "IDX_config_nome" ON "relatorio_config" ("nome");
      CREATE INDEX "IDX_config_parametros" ON "relatorio_config" USING GIN ("parametros_padrao");
      CREATE INDEX "IDX_config_programacao" ON "relatorio_config" USING GIN ("programacao");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_config_update_timestamp
      BEFORE UPDATE ON "relatorio_config"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de configurações de relatórios criada com sucesso.');
    
    // Tabela de histórico de geração de relatórios
    await queryRunner.query(`
      CREATE TABLE "relatorio_geracao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "config_id" uuid,
        "usuario_id" uuid NOT NULL,
        "parametros_utilizados" jsonb NOT NULL,
        "formato" "formato_relatorio_enum" NOT NULL,
        "status" "status_geracao_enum" NOT NULL DEFAULT 'pendente',
        "caminho_arquivo" character varying(255),
        "tamanho_bytes" integer,
        "tempo_geracao_ms" integer,
        "erro_mensagem" text,
        "data_inicio" TIMESTAMP NOT NULL DEFAULT now(),
        "data_conclusao" TIMESTAMP,
        "ip_origem" character varying(45),
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_relatorio_geracao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_geracao_template" ON "relatorio_geracao" ("template_id");
      CREATE INDEX "IDX_geracao_config" ON "relatorio_geracao" ("config_id");
      CREATE INDEX "IDX_geracao_usuario" ON "relatorio_geracao" ("usuario_id");
      CREATE INDEX "IDX_geracao_status" ON "relatorio_geracao" ("status");
      CREATE INDEX "IDX_geracao_data" ON "relatorio_geracao" ("data_inicio");
      CREATE INDEX "IDX_geracao_parametros" ON "relatorio_geracao" USING GIN ("parametros_utilizados");
    `);
    
    console.log('Tabela de histórico de geração de relatórios criada com sucesso.');
    
    // Tabela de permissões de relatórios
    await queryRunner.query(`
      CREATE TABLE "relatorio_permissao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "tipo_entidade" character varying(20) NOT NULL,
        "entidade_id" uuid NOT NULL,
        "acoes_permitidas" jsonb NOT NULL DEFAULT '["visualizar"]',
        "criado_por" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_relatorio_permissao" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_relatorio_permissao" UNIQUE ("template_id", "tipo_entidade", "entidade_id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_permissao_template" ON "relatorio_permissao" ("template_id");
      CREATE INDEX "IDX_permissao_entidade" ON "relatorio_permissao" ("tipo_entidade", "entidade_id");
      CREATE INDEX "IDX_permissao_acoes" ON "relatorio_permissao" USING GIN ("acoes_permitidas");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_permissao_update_timestamp
      BEFORE UPDATE ON "relatorio_permissao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de permissões de relatórios criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "relatorio_config" ADD CONSTRAINT "FK_config_template"
      FOREIGN KEY ("template_id") REFERENCES "relatorio_template" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "relatorio_geracao" ADD CONSTRAINT "FK_geracao_template"
      FOREIGN KEY ("template_id") REFERENCES "relatorio_template" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "relatorio_geracao" ADD CONSTRAINT "FK_geracao_config"
      FOREIGN KEY ("config_id") REFERENCES "relatorio_config" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "relatorio_geracao" ADD CONSTRAINT "FK_geracao_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "relatorio_permissao" ADD CONSTRAINT "FK_permissao_template"
      FOREIGN KEY ("template_id") REFERENCES "relatorio_template" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "relatorio_template" ADD CONSTRAINT "FK_template_criado_por"
      FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "relatorio_template" ADD CONSTRAINT "FK_template_atualizado_por"
      FOREIGN KEY ("atualizado_por") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "relatorio_permissao" ADD CONSTRAINT "FK_permissao_criado_por"
      FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "relatorio_template" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "relatorio_config" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "relatorio_geracao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "relatorio_permissao" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY relatorio_template_policy ON "relatorio_template" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY relatorio_config_policy ON "relatorio_config" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY relatorio_geracao_policy ON "relatorio_geracao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY relatorio_permissao_policy ON "relatorio_permissao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    // Criar log de auditoria para tabelas importantes
    // Nota: A função create_audit_log_trigger foi definida na migration base
    // Isso fica comentado até termos certeza que a função existe
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('relatorio_template');
      SELECT create_audit_log_trigger('relatorio_config');
      SELECT create_audit_log_trigger('relatorio_permissao');
    `);
    */
    
    console.log('Migration 1070000-CreateRelatoriosSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1070000-CreateRelatoriosSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS relatorio_template_policy ON "relatorio_template";
      DROP POLICY IF EXISTS relatorio_config_policy ON "relatorio_config";
      DROP POLICY IF EXISTS relatorio_geracao_policy ON "relatorio_geracao";
      DROP POLICY IF EXISTS relatorio_permissao_policy ON "relatorio_permissao";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "relatorio_config" DROP CONSTRAINT IF EXISTS "FK_config_template";
      ALTER TABLE "relatorio_geracao" DROP CONSTRAINT IF EXISTS "FK_geracao_template";
      ALTER TABLE "relatorio_geracao" DROP CONSTRAINT IF EXISTS "FK_geracao_config";
      ALTER TABLE "relatorio_geracao" DROP CONSTRAINT IF EXISTS "FK_geracao_usuario";
      ALTER TABLE "relatorio_permissao" DROP CONSTRAINT IF EXISTS "FK_permissao_template";
      ALTER TABLE "relatorio_template" DROP CONSTRAINT IF EXISTS "FK_template_criado_por";
      ALTER TABLE "relatorio_template" DROP CONSTRAINT IF EXISTS "FK_template_atualizado_por";
      ALTER TABLE "relatorio_permissao" DROP CONSTRAINT IF EXISTS "FK_permissao_criado_por";
    `);
    
    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_template_update_timestamp ON "relatorio_template";
      DROP TRIGGER IF EXISTS trigger_config_update_timestamp ON "relatorio_config";
      DROP TRIGGER IF EXISTS trigger_permissao_update_timestamp ON "relatorio_permissao";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "relatorio_permissao";
      DROP TABLE IF EXISTS "relatorio_geracao";
      DROP TABLE IF EXISTS "relatorio_config";
      DROP TABLE IF EXISTS "relatorio_template";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_geracao_enum";
      DROP TYPE IF EXISTS "tipo_relatorio_enum";
      DROP TYPE IF EXISTS "formato_relatorio_enum";
    `);
    
    console.log('Migration 1070000-CreateRelatoriosSchema revertida com sucesso.');
  }
}
