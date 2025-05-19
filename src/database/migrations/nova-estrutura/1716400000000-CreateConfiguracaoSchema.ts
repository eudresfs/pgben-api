import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criação do schema de configuração do sistema
 * 
 * Esta migração cria todas as tabelas necessárias para o módulo de configuração:
 * - configuracao_parametro: Parâmetros do sistema
 * - configuracao_template: Templates para e-mails, notificações e documentos
 * - configuracao_workflow_beneficio: Workflows de benefícios
 * - configuracao_integracao: Configurações de integrações externas
 */
export class CreateConfiguracaoSchema1716400000000 implements MigrationInterface {
  name = 'CreateConfiguracaoSchema1716400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.createEnums(queryRunner);
    await this.createTables(queryRunner);
    await this.createIndexes(queryRunner);
    await this.createPolicies(queryRunner);
    await this.insertInitialData(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover tabelas em ordem reversa para evitar problemas de chave estrangeira
    await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_integracao"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_workflow_beneficio"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_template"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_parametro"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE IF EXISTS "parametro_tipo_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "template_tipo_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "workflow_acao_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "integracao_tipo_enum"`);
  }

  /**
   * Cria os tipos enumerados usados nas tabelas
   */
  private async createEnums(queryRunner: QueryRunner): Promise<void> {
    // Enum de tipos de parâmetro
    await queryRunner.query(`
      CREATE TYPE "parametro_tipo_enum" AS ENUM (
        'STRING', 
        'NUMBER', 
        'BOOLEAN', 
        'DATE', 
        'JSON'
      )
    `);

    // Enum de tipos de template
    await queryRunner.query(`
      CREATE TYPE "template_tipo_enum" AS ENUM (
        'EMAIL', 
        'SMS', 
        'NOTIFICACAO', 
        'DOCUMENTO', 
        'RELATORIO'
      )
    `);

    // Enum de ações de workflow
    await queryRunner.query(`
      CREATE TYPE "workflow_acao_enum" AS ENUM (
        'CRIAR', 
        'VISUALIZAR', 
        'EDITAR', 
        'APROVAR', 
        'REJEITAR', 
        'SOLICITAR_REVISAO', 
        'ENVIAR_DOCUMENTOS', 
        'MARCAR_ENTREVISTA', 
        'REALIZAR_ENTREVISTA', 
        'ENCAMINHAR', 
        'ARQUIVAR'
      )
    `);

    // Enum de tipos de integração
    await queryRunner.query(`
      CREATE TYPE "integracao_tipo_enum" AS ENUM (
        'EMAIL', 
        'SMS', 
        'STORAGE', 
        'API_EXTERNA', 
        'AUTENTICACAO', 
        'GEOCODING', 
        'VALIDACAO_CPF', 
        'VALIDACAO_CEP'
      )
    `);
  }

  /**
   * Cria as tabelas do módulo de configuração
   */
  private async createTables(queryRunner: QueryRunner): Promise<void> {
    // Tabela de parâmetros do sistema
    await queryRunner.query(`
      CREATE TABLE "configuracao_parametro" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "chave" VARCHAR(100) NOT NULL,
        "valor" TEXT NOT NULL,
        "tipo" "parametro_tipo_enum" NOT NULL DEFAULT 'STRING',
        "descricao" VARCHAR(500) NOT NULL,
        "categoria" VARCHAR(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_by" UUID,
        CONSTRAINT "UQ_configuracao_parametro_chave" UNIQUE ("chave"),
        CONSTRAINT "PK_configuracao_parametro" PRIMARY KEY ("id")
      )
    `);

    // Tabela de templates
    await queryRunner.query(`
      CREATE TABLE "configuracao_template" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" VARCHAR(100) NOT NULL,
        "nome" VARCHAR(200) NOT NULL,
        "descricao" VARCHAR(500) NOT NULL,
        "tipo" "template_tipo_enum" NOT NULL,
        "conteudo" TEXT NOT NULL,
        "ativo" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_by" UUID,
        CONSTRAINT "UQ_configuracao_template_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_configuracao_template" PRIMARY KEY ("id")
      )
    `);

    // Tabela de workflows de benefícios
    await queryRunner.query(`
      CREATE TABLE "configuracao_workflow_beneficio" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" UUID NOT NULL,
        "etapas" JSONB NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "ativo" BOOLEAN NOT NULL DEFAULT true,
        "sla_total" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_by" UUID,
        CONSTRAINT "UQ_configuracao_workflow_tipo_beneficio" UNIQUE ("tipo_beneficio_id"),
        CONSTRAINT "PK_configuracao_workflow_beneficio" PRIMARY KEY ("id")
      )
    `);

    // Tabela de configurações de integração
    await queryRunner.query(`
      CREATE TABLE "configuracao_integracao" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" VARCHAR(100) NOT NULL,
        "nome" VARCHAR(200) NOT NULL,
        "descricao" VARCHAR(500) NOT NULL,
        "tipo" "integracao_tipo_enum" NOT NULL,
        "configuracao" JSONB NOT NULL,
        "credenciais" TEXT,
        "ativo" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_by" UUID,
        CONSTRAINT "UQ_configuracao_integracao_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_configuracao_integracao" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "configuracao_workflow_beneficio" 
      ADD CONSTRAINT "FK_workflow_tipo_beneficio" 
      FOREIGN KEY ("tipo_beneficio_id") 
      REFERENCES "tipo_beneficio"("id") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
  }

  /**
   * Cria índices para otimização de consultas
   */
  private async createIndexes(queryRunner: QueryRunner): Promise<void> {
    // Índices para parâmetros
    await queryRunner.query(`
      CREATE INDEX "idx_parametro_chave" ON "configuracao_parametro" ("chave");
      CREATE INDEX "idx_parametro_categoria" ON "configuracao_parametro" ("categoria");
    `);

    // Índices para templates
    await queryRunner.query(`
      CREATE INDEX "idx_template_codigo" ON "configuracao_template" ("codigo");
      CREATE INDEX "idx_template_tipo" ON "configuracao_template" ("tipo");
      CREATE INDEX "idx_template_ativo" ON "configuracao_template" ("ativo");
    `);

    // Índices para workflows
    await queryRunner.query(`
      CREATE INDEX "idx_workflow_tipo_beneficio" ON "configuracao_workflow_beneficio" ("tipo_beneficio_id");
      CREATE INDEX "idx_workflow_ativo" ON "configuracao_workflow_beneficio" ("ativo");
    `);

    // Índices para integrações
    await queryRunner.query(`
      CREATE INDEX "idx_integracao_codigo" ON "configuracao_integracao" ("codigo");
      CREATE INDEX "idx_integracao_tipo" ON "configuracao_integracao" ("tipo");
      CREATE INDEX "idx_integracao_ativo" ON "configuracao_integracao" ("ativo");
    `);

    // Índice GIN para pesquisa em campos JSONB
    await queryRunner.query(`
      CREATE INDEX "idx_workflow_etapas_gin" ON "configuracao_workflow_beneficio" USING GIN ("etapas");
      CREATE INDEX "idx_integracao_configuracao_gin" ON "configuracao_integracao" USING GIN ("configuracao");
    `);
  }

  /**
   * Cria políticas RLS (Row-Level Security) para as tabelas
   */
  private async createPolicies(queryRunner: QueryRunner): Promise<void> {
    // Habilitar RLS nas tabelas
    await queryRunner.query(`
      ALTER TABLE "configuracao_parametro" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_template" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_workflow_beneficio" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_integracao" ENABLE ROW LEVEL SECURITY;
    `);

    // Criar políticas para administradores (acesso total)
    await queryRunner.query(`
      CREATE POLICY "admin_all_parametro" ON "configuracao_parametro" 
      FOR ALL TO "pg_role_admin" USING (true);

      CREATE POLICY "admin_all_template" ON "configuracao_template" 
      FOR ALL TO "pg_role_admin" USING (true);

      CREATE POLICY "admin_all_workflow" ON "configuracao_workflow_beneficio" 
      FOR ALL TO "pg_role_admin" USING (true);

      CREATE POLICY "admin_all_integracao" ON "configuracao_integracao" 
      FOR ALL TO "pg_role_admin" USING (true);
    `);

    // Políticas de leitura para assistentes sociais
    await queryRunner.query(`
      CREATE POLICY "assistente_select_parametro" ON "configuracao_parametro" 
      FOR SELECT TO "pg_role_social_worker" USING (true);

      CREATE POLICY "assistente_select_template" ON "configuracao_template" 
      FOR SELECT TO "pg_role_social_worker" USING (ativo = true);

      CREATE POLICY "assistente_select_workflow" ON "configuracao_workflow_beneficio" 
      FOR SELECT TO "pg_role_social_worker" USING (ativo = true);
    `);

    // Políticas de leitura para outros usuários
    await queryRunner.query(`
      CREATE POLICY "user_select_parametro" ON "configuracao_parametro" 
      FOR SELECT TO "pg_role_user" USING (true);

      CREATE POLICY "user_select_template" ON "configuracao_template" 
      FOR SELECT TO "pg_role_user" USING (ativo = true);
    `);
  }

  /**
   * Insere dados iniciais nas tabelas
   */
  private async insertInitialData(queryRunner: QueryRunner): Promise<void> {
    // Parâmetros iniciais do sistema
    await queryRunner.query(`
      INSERT INTO "configuracao_parametro" 
      (chave, valor, tipo, descricao, categoria) VALUES
      ('sistema.nome', 'PGBen - Plataforma de Gestão de Benefícios Eventuais', 'STRING', 'Nome do sistema exibido na interface', 'sistema'),
      ('sistema.versao', '1.0.0', 'STRING', 'Versão atual do sistema', 'sistema'),
      ('sistema.contato.email', 'suporte@pgben.gov.br', 'STRING', 'Email de contato para suporte', 'sistema'),
      ('upload.tamanho_maximo', '10485760', 'NUMBER', 'Tamanho máximo de arquivos para upload (em bytes)', 'upload'),
      ('upload.arquivos_maximo', '20', 'NUMBER', 'Número máximo de arquivos por cidadão', 'upload'),
      ('upload.tipos_permitidos', '["jpg","jpeg","png","pdf","doc","docx"]', 'JSON', 'Tipos de arquivo permitidos para upload', 'upload'),
      ('upload.max_por_requisicao', '5', 'NUMBER', 'Número máximo de arquivos por requisição de upload', 'upload'),
      ('prazo.analise_solicitacao', '15', 'NUMBER', 'Prazo para análise de solicitação de benefício (em dias)', 'prazos'),
      ('prazo.agendamento_entrevista', '7', 'NUMBER', 'Prazo para agendamento de entrevista (em dias)', 'prazos'),
      ('prazo.entrada_recurso', '10', 'NUMBER', 'Prazo para entrada de recurso (em dias)', 'prazos'),
      ('prazo.validade_documentos', '90', 'NUMBER', 'Prazo de validade de documentos (em dias)', 'prazos')
    `);

    // Template de e-mail de boas-vindas
    await queryRunner.query(`
      INSERT INTO "configuracao_template"
      (codigo, nome, descricao, tipo, conteudo) VALUES
      ('email-bem-vindo', 'E-mail de Boas-vindas', 'Template para e-mail de boas-vindas enviado aos novos usuários', 'EMAIL',
      '<html><body><h1>Bem-vindo(a) ao PGBen, {{nome}}!</h1><p>Sua conta foi criada com sucesso.</p><p>Para acessar o sistema, utilize o seguinte link: <a href="{{link}}">Acessar PGBen</a></p><p>Atenciosamente,<br>Equipe PGBen</p></body></html>')
    `);

    // Template de notificação de solicitação recebida
    await queryRunner.query(`
      INSERT INTO "configuracao_template"
      (codigo, nome, descricao, tipo, conteudo) VALUES
      ('notificacao-solicitacao-recebida', 'Notificação de Solicitação Recebida', 'Template para notificação enviada ao cidadão quando sua solicitação é recebida', 'NOTIFICACAO',
      'Sua solicitação de {{tipo_beneficio}} foi recebida com sucesso. O número do protocolo é {{protocolo}}. Acompanhe o status pelo sistema ou pelo telefone (84) 3232-1234.')
    `);

    // Configurações iniciais de integração
    await queryRunner.query(`
      INSERT INTO "configuracao_integracao"
      (codigo, nome, descricao, tipo, configuracao, credenciais) VALUES
      ('smtp-padrao', 'Servidor SMTP Padrão', 'Configuração padrão para envio de e-mails', 'EMAIL',
      '{"host": "smtp.example.com", "port": 587, "secure": false, "requireTLS": true, "from": "noreply@pgben.gov.br"}',
      '{"user": "usuario_smtp", "password": "senha_temporaria"}')
    `);
  }
}
