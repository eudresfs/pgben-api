import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao módulo de configurações
 *
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de configurações,
 * permitindo o armazenamento centralizado de parâmetros configuráveis do sistema.
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateConfiguracaoSchema1704067229000
  implements MigrationInterface
{
  name = 'CreateConfiguracaoSchema1704067229000';

  /**
   * Cria as estruturas relacionadas às configurações
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1100000-CreateConfiguracaoSchema...');

    // Tabela de configurações de integração
    const configuracaoIntegracaoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracao_integracao'
      );
    `);

    if (!configuracaoIntegracaoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "configuracao_integracao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(50) NOT NULL,
        "tipo" "integracao_tipo_enum" NOT NULL,
        "nome" character varying(200) NOT NULL,
        "descricao" character varying(500),
        "ativo" boolean NOT NULL DEFAULT true,
        "parametros" jsonb NOT NULL DEFAULT '{}',
        "credenciais" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_by" uuid,
        CONSTRAINT "UQ_configuracao_integracao_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_configuracao_integracao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_integracao_codigo" ON "configuracao_integracao" ("codigo");
      CREATE INDEX IF NOT EXISTS "IDX_integracao_tipo" ON "configuracao_integracao" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_integracao_ativo" ON "configuracao_integracao" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_integracao_parametros" ON "configuracao_integracao" USING GIN ("parametros");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_configuracao_integracao_update_timestamp
      BEFORE UPDATE ON "configuracao_integracao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela configuracao_integracao já existe, pulando criação.');
    }

    console.log('Tabela de configurações de integração criada com sucesso.');

    // Tabela principal de configurações do sistema
    const configuracaoSistemaExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracao_sistema'
      );
    `);

    if (!configuracaoSistemaExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "configuracao_sistema" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "chave" character varying(100) NOT NULL,
        "valor" text NOT NULL,
        "tipo_valor" character varying(50) NOT NULL DEFAULT 'string',
        "categoria" character varying(100) NOT NULL,
        "tipo" "tipo_configuracao_enum" NOT NULL DEFAULT 'sistema',
        "visibilidade" "visibilidade_configuracao_enum" NOT NULL DEFAULT 'restrita',
        "descricao" text,
        "padrao" text,
        "validacao" jsonb,
        "opcoes" jsonb,
        "metadados" jsonb,
        "unidade_id" uuid,
        "modulo" character varying(100),
        "ordem" integer NOT NULL DEFAULT 0,
        "requer_reinicio" boolean NOT NULL DEFAULT false,
        -- Adicionando campo adicional para controle de versionamento
        "versao" integer DEFAULT 1,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_by" uuid,
        CONSTRAINT "PK_configuracao_sistema" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_configuracao_chave_unidade" UNIQUE ("chave", "unidade_id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_chave" ON "configuracao_sistema" ("chave");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_categoria" ON "configuracao_sistema" ("categoria");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_tipo" ON "configuracao_sistema" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_visibilidade" ON "configuracao_sistema" ("visibilidade");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_unidade" ON "configuracao_sistema" ("unidade_id");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_modulo" ON "configuracao_sistema" ("modulo");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_metadados" ON "configuracao_sistema" USING GIN ("metadados");
      
      -- Trigger para atualização automática de timestamp
      CREATE OR REPLACE TRIGGER trigger_configuracao_sistema_update_timestamp
      BEFORE UPDATE ON "configuracao_sistema"
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
      `);
    } else {
      console.log('Tabela configuracao_sistema já existe, pulando criação.');
    }

    console.log('Tabela de configurações do sistema criada com sucesso.');

    // Tabela de histórico de alterações de configuração
    const configuracaoHistoricoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracao_historico'
      );
    `);

    if (!configuracaoHistoricoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "configuracao_historico" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "configuracao_id" uuid NOT NULL,
        "valor_anterior" text,
        "valor_novo" text NOT NULL,
        "data_alteracao" TIMESTAMP NOT NULL DEFAULT now(),
        "usuario_id" uuid,
        "ip_origem" character varying(45),
        "observacao" text,
        "metadados" jsonb,
        CONSTRAINT "PK_configuracao_historico" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_historico_configuracao" ON "configuracao_historico" ("configuracao_id");
      CREATE INDEX IF NOT EXISTS "IDX_historico_data" ON "configuracao_historico" ("data_alteracao");
      CREATE INDEX IF NOT EXISTS "IDX_historico_usuario" ON "configuracao_historico" ("usuario_id");
      `);
    } else {
      console.log('Tabela configuracao_historico já existe, pulando criação.');
    }

    console.log('Tabela de histórico de configurações criada com sucesso.');

    // Tabela de configurações de interface por usuário
    const configuracaoInterfaceExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracao_interface'
      );
    `);

    if (!configuracaoInterfaceExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "configuracao_interface" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "preferencias" jsonb NOT NULL DEFAULT '{}',
        "tema" character varying(50) DEFAULT 'padrao',
        "layout" jsonb,
        "favoritos" jsonb,
        "widgets" jsonb,
        "notificacoes" jsonb,
        "ultima_atualizacao" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_configuracao_interface_usuario" UNIQUE ("usuario_id"),
        CONSTRAINT "PK_configuracao_interface" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_interface_usuario" ON "configuracao_interface" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_interface_tema" ON "configuracao_interface" ("tema");
      CREATE INDEX IF NOT EXISTS "IDX_interface_preferencias" ON "configuracao_interface" USING GIN ("preferencias");
      `);
    } else {
      console.log('Tabela configuracao_interface já existe, pulando criação.');
    }

    console.log('Tabela de configurações de interface criada com sucesso.');

    // Tabela de configurações por grupo de usuários
    const configuracaoGrupoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracao_grupo'
      );
    `);

    if (!configuracaoGrupoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "configuracao_grupo" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "grupo_id" uuid NOT NULL,
        "chave" character varying(100) NOT NULL,
        "valor" text NOT NULL,
        "descricao" text,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        CONSTRAINT "UQ_configuracao_grupo_chave" UNIQUE ("grupo_id", "chave"),
        CONSTRAINT "PK_configuracao_grupo" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_grupo_id" ON "configuracao_grupo" ("grupo_id");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_grupo_chave" ON "configuracao_grupo" ("chave");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_grupo_ativo" ON "configuracao_grupo" ("ativo");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_configuracao_grupo_update_timestamp
      BEFORE UPDATE ON "configuracao_grupo"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela configuracao_grupo já existe, pulando criação.');
    }

    console.log('Tabela de configurações de grupo criada com sucesso.');

    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      -- Relacionamentos da tabela de configurações (comentados até verificar a existência das tabelas de referência)
      -- ALTER TABLE "configuracao_sistema" ADD CONSTRAINT "FK_configuracao_unidade"
      -- FOREIGN KEY ("unidade_id") REFERENCES "unidades" ("id") ON DELETE CASCADE;
      
      -- ALTER TABLE "configuracao_sistema" ADD CONSTRAINT "FK_configuracao_created_by"
      -- FOREIGN KEY ("created_by") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- ALTER TABLE "configuracao_sistema" ADD CONSTRAINT "FK_configuracao_updated_by"
      -- FOREIGN KEY ("updated_by") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de configurações de integração
      -- ALTER TABLE "configuracao_integracao" ADD CONSTRAINT "FK_integracao_updated_by"
      -- FOREIGN KEY ("updated_by") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de histórico
      ALTER TABLE "configuracao_historico" ADD CONSTRAINT "FK_historico_configuracao"
      FOREIGN KEY ("configuracao_id") REFERENCES "configuracao_sistema" ("id") ON DELETE CASCADE;
      
      -- ALTER TABLE "configuracao_historico" ADD CONSTRAINT "FK_historico_usuario"
      -- FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de interface
      -- ALTER TABLE "configuracao_interface" ADD CONSTRAINT "FK_interface_usuario"
      -- FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE;
      
      -- Relacionamentos da tabela de grupo
      -- ALTER TABLE "configuracao_grupo" ADD CONSTRAINT "FK_grupo_created_by"
      -- FOREIGN KEY ("created_by") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- ALTER TABLE "configuracao_grupo" ADD CONSTRAINT "FK_grupo_grupo_id"
      -- FOREIGN KEY ("grupo_id") REFERENCES "grupo" ("id") ON DELETE CASCADE;
    `);

    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "configuracao_integracao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_sistema" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_historico" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_interface" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_grupo" ENABLE ROW LEVEL SECURITY;
      
      -- Configurando RLS básico para todas as tabelas
      -- Isso permite acesso total para o usuário postgres, que é o padrão para migrations
      
      ALTER TABLE "configuracao_sistema" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY configuracao_sistema_policy ON "configuracao_sistema" 
        USING (current_user = 'postgres');
      
      ALTER TABLE "configuracao_integracao" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY configuracao_integracao_policy ON "configuracao_integracao" 
        USING (current_user = 'postgres');
      
      ALTER TABLE "configuracao_historico" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY configuracao_historico_policy ON "configuracao_historico" 
        USING (current_user = 'postgres');
      
      ALTER TABLE "configuracao_interface" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY configuracao_interface_policy ON "configuracao_interface" 
        USING (current_user = 'postgres');
      
      ALTER TABLE "configuracao_grupo" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY configuracao_grupo_policy ON "configuracao_grupo" 
        USING (current_user = 'postgres');
    `);

    // Criar função para gatilho de histórico de configurações
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION configuracao_audit_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'UPDATE' AND OLD.valor <> NEW.valor) THEN
          INSERT INTO "configuracao_historico" (
            configuracao_id, 
            valor_anterior, 
            valor_novo, 
            usuario_id
          ) VALUES (
            NEW.id, 
            OLD.valor, 
            NEW.valor, 
            NEW.updated_by
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Trigger para registro automático de histórico de configurações
      CREATE TRIGGER trigger_configuracao_audit
      AFTER UPDATE ON "configuracao_sistema"
      FOR EACH ROW
      EXECUTE PROCEDURE configuracao_audit_trigger();
    `);

    // Criar log de auditoria para tabelas importantes
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('configuracao_sistema');
      SELECT create_audit_log_trigger('configuracao_integracao');
    `);
    */

    console.log(
      'Migration 1100000-CreateConfiguracaoSchema executada com sucesso.',
    );
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1100000-CreateConfiguracaoSchema...');

    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS configuracao_integracao_policy ON "configuracao_integracao";
      DROP POLICY IF EXISTS configuracao_sistema_policy ON "configuracao_sistema";
      DROP POLICY IF EXISTS configuracao_historico_policy ON "configuracao_historico";
      DROP POLICY IF EXISTS configuracao_interface_policy ON "configuracao_interface";
      DROP POLICY IF EXISTS configuracao_grupo_policy ON "configuracao_grupo";
    `);

    // Remover trigger de auditoria de configurações
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_configuracao_audit ON "configuracao_sistema";
      DROP FUNCTION IF EXISTS configuracao_audit_trigger();
    `);

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "configuracao_sistema" DROP CONSTRAINT IF EXISTS "FK_configuracao_unidade";
      ALTER TABLE "configuracao_sistema" DROP CONSTRAINT IF EXISTS "FK_configuracao_created_by";
      ALTER TABLE "configuracao_sistema" DROP CONSTRAINT IF EXISTS "FK_configuracao_updated_by";
      
      ALTER TABLE "configuracao_integracao" DROP CONSTRAINT IF EXISTS "FK_integracao_updated_by";
      
      ALTER TABLE "configuracao_historico" DROP CONSTRAINT IF EXISTS "FK_historico_configuracao";
      ALTER TABLE "configuracao_historico" DROP CONSTRAINT IF EXISTS "FK_historico_usuario";
      
      ALTER TABLE "configuracao_interface" DROP CONSTRAINT IF EXISTS "FK_interface_usuario";
      
      ALTER TABLE "configuracao_grupo" DROP CONSTRAINT IF EXISTS "FK_grupo_created_by";
      ALTER TABLE "configuracao_grupo" DROP CONSTRAINT IF EXISTS "FK_grupo_grupo_id";
    `);

    // Remover triggers de atualização de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_configuracao_sistema_update_timestamp ON "configuracao_sistema";
      DROP TRIGGER IF EXISTS trigger_configuracao_integracao_update_timestamp ON "configuracao_integracao";
      DROP TRIGGER IF EXISTS trigger_configuracao_grupo_update_timestamp ON "configuracao_grupo";
    `);

    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "configuracao_grupo";
      DROP TABLE IF EXISTS "configuracao_interface";
      DROP TABLE IF EXISTS "configuracao_historico";
      DROP TABLE IF EXISTS "configuracao_sistema";
      DROP TABLE IF EXISTS "configuracao_integracao";
    `);

    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "visibilidade_configuracao_enum";
      DROP TYPE IF EXISTS "tipo_configuracao_enum";
      DROP TYPE IF EXISTS "integracao_tipo_enum";
    `);

    console.log(
      'Migration 1100000-CreateConfiguracaoSchema revertida com sucesso.',
    );
  }
}
