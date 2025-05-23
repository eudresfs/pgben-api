import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado a documentos
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de documentos,
 * incluindo estruturas para armazenar metadados, histórico e verificação de documentos.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateDocumentoSchema1747961017174 implements MigrationInterface {
  name = 'CreateDocumentoSchema1747961017174';

  /**
   * Cria as estruturas relacionadas a documentos
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1080000-CreateDocumentoSchema...');
    
    // Tipos enumerados já foram criados na migration do benefício (tipo_documento)
    // Vamos verificar se existe e criar se necessário
    const tipoDocumentoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'tipo_documento'
      );
    `);
    
    if (!tipoDocumentoExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "tipo_documento" AS ENUM (
          'rg',
          'cpf',
          'comprovante_residencia',
          'comprovante_renda',
          'laudo_medico',
          'certidao_nascimento',
          'certidao_casamento',
          'titulo_eleitor',
          'contrato_aluguel',
          'declaracao_testemunhas',
          'outros'
        );
      `);
      console.log('Tipo enumerado tipo_documento criado com sucesso.');
    } else {
      console.log('Tipo enumerado tipo_documento já existe.');
    }
    
    // Criação de novos tipos enumerados específicos para o módulo de documentos
    await queryRunner.query(`
      CREATE TYPE "status_verificacao_documento_enum" AS ENUM (
        'nao_verificado',
        'verificado',
        'verificado_com_ressalvas',
        'rejeitado'
      );
      
      CREATE TYPE "resultado_verificacao_malware_enum" AS ENUM (
        'nao_verificado',
        'limpo',
        'suspeito',
        'infectado',
        'erro_verificacao'
      );
      
      CREATE TYPE "tipo_documento_enviado_enum" AS ENUM (
        'oficio',
        'notificacao',
        'parecer',
        'despacho',
        'relatorio',
        'formulario',
        'outros'
      );
    `);
    
    console.log('Tipos enumerados específicos para documentos criados com sucesso.');
    
    // Tabela principal de documentos
    const documentosExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos'
      );
    `);
    
    if (!documentosExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "documentos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "tipo" "tipo_documento" NOT NULL,
        "nome_arquivo" character varying(255) NOT NULL,
        "nome_original" character varying(255) NOT NULL,
        "caminho" character varying(500) NOT NULL,
        "thumbnail" character varying(500),
        "descricao" text,
        "tamanho" integer NOT NULL,
        "mimetype" character varying(100) NOT NULL,
        "data_upload" TIMESTAMP NOT NULL,
        "usuario_upload" uuid NOT NULL,
        "verificado" boolean NOT NULL DEFAULT false,
        "data_verificacao" TIMESTAMP,
        "usuario_verificacao" uuid,
        "observacoes_verificacao" text,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_documentos" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_SOLICITACAO_TIPO" ON "documentos" ("solicitacao_id", "tipo");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_USUARIO_UPLOAD" ON "documentos" ("usuario_upload");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_VERIFICADO" ON "documentos" ("verificado");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_DATA_UPLOAD" ON "documentos" ("data_upload");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_METADATA" ON "documentos" USING GIN ("metadados");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_documentos_update_timestamp
      BEFORE UPDATE ON "documentos"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela documentos já existe, pulando criação.');
    }
    
    console.log('Tabela de documentos criada com sucesso.');
    
    // Tabela de documentos enviados
    const documentosEnviadosExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_enviados'
      );
    `);
    
    if (!documentosEnviadosExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "documentos_enviados" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento_id" uuid,
        "nome_arquivo" character varying(255) NOT NULL,
        "caminho_arquivo" character varying(500) NOT NULL,
        "tamanho" integer NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "data_envio" TIMESTAMP NOT NULL,
        "enviado_por_id" uuid NOT NULL,
        "verificado" boolean NOT NULL DEFAULT false,
        "verificado_por_id" uuid,
        "data_verificacao" TIMESTAMP,
        "observacoes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_documentos_enviados" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_ENVIADOS_DOCUMENTO" ON "documentos_enviados" ("documento_id");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_ENVIADOS_USUARIO" ON "documentos_enviados" ("enviado_por_id");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_ENVIADOS_DATA" ON "documentos_enviados" ("data_envio");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_documentos_enviados_update_timestamp
      BEFORE UPDATE ON "documentos_enviados"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela documentos_enviados já existe, pulando criação.');
    }
    
    console.log('Tabela de documentos enviados criada com sucesso.');
    
    // Tabela para histórico de verificação de documentos
    const verificacaoDocumentoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'verificacao_documento'
      );
    `);
    
    if (!verificacaoDocumentoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "verificacao_documento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento_id" uuid NOT NULL,
        "status" "status_verificacao_documento_enum" NOT NULL DEFAULT 'nao_verificado',
        "resultado_verificacao_malware" "resultado_verificacao_malware_enum" NOT NULL DEFAULT 'nao_verificado',
        "data_verificacao" TIMESTAMP NOT NULL DEFAULT now(),
        "usuario_verificacao_id" uuid NOT NULL,
        "observacoes" text,
        "detalhes_verificacao" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verificacao_documento" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_DOCUMENTO_ID" ON "verificacao_documento" ("documento_id");
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_USUARIO" ON "verificacao_documento" ("usuario_verificacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_STATUS" ON "verificacao_documento" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_MALWARE" ON "verificacao_documento" ("resultado_verificacao_malware");
      `);
    } else {
      console.log('Tabela verificacao_documento já existe, pulando criação.');
    }
    
    console.log('Tabela de verificação de documentos criada com sucesso.');
    
    // Tabela para categorização e classificação de documentos
    const classificacaoDocumentoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'classificacao_documento'
      );
    `);
    
    if (!classificacaoDocumentoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "classificacao_documento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento_id" uuid NOT NULL,
        "categoria" character varying(100) NOT NULL,
        "subcategoria" character varying(100),
        "tags" jsonb DEFAULT '[]',
        "nivel_confidencialidade" integer NOT NULL DEFAULT 0,
        "metadados_extracao" jsonb,
        "usuario_classificacao_id" uuid NOT NULL,
        "data_classificacao" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_classificacao_documento" PRIMARY KEY ("id"),
        CONSTRAINT "UK_documento_classificacao" UNIQUE ("documento_id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_DOCUMENTO" ON "classificacao_documento" ("documento_id");
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_CATEGORIA" ON "classificacao_documento" ("categoria", "subcategoria");
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_TAGS" ON "classificacao_documento" USING GIN ("tags");
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_CONFIDENCIALIDADE" ON "classificacao_documento" ("nivel_confidencialidade");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_classificacao_documento_update_timestamp
      BEFORE UPDATE ON "classificacao_documento"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela classificacao_documento já existe, pulando criação.');
    }
    
    console.log('Tabela de classificação de documentos criada com sucesso.');
    
    // Relacionamentos e chaves estrangeiras
    await queryRunner.query(`
      -- Relacionamentos da tabela de documentos
      ALTER TABLE "documentos" ADD CONSTRAINT "FK_documentos_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "documentos" ADD CONSTRAINT "FK_documentos_usuario_upload"
      FOREIGN KEY ("usuario_upload") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "documentos" ADD CONSTRAINT "FK_documentos_usuario_verificacao"
      FOREIGN KEY ("usuario_verificacao") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de documentos enviados
      ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_documentos_enviados_documento"
      FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_documentos_enviados_usuario"
      FOREIGN KEY ("enviado_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_documentos_enviados_verificador"
      FOREIGN KEY ("verificado_por_id") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de verificação de documentos
      ALTER TABLE "verificacao_documento" ADD CONSTRAINT "FK_verificacao_documento"
      FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "verificacao_documento" ADD CONSTRAINT "FK_verificacao_usuario"
      FOREIGN KEY ("usuario_verificacao_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      -- Relacionamentos da tabela de classificação de documentos
      ALTER TABLE "classificacao_documento" ADD CONSTRAINT "FK_classificacao_documento"
      FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "classificacao_documento" ADD CONSTRAINT "FK_classificacao_usuario"
      FOREIGN KEY ("usuario_classificacao_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "documentos_enviados" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "verificacao_documento" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "classificacao_documento" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY documentos_policy ON "documentos" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY documentos_enviados_policy ON "documentos_enviados" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY verificacao_documento_policy ON "verificacao_documento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY classificacao_documento_policy ON "classificacao_documento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    // Criar log de auditoria para tabelas importantes
    // Nota: A função create_audit_log_trigger foi definida na migration base
    // Isso fica comentado até termos certeza que a função existe
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('documentos');
      SELECT create_audit_log_trigger('verificacao_documento');
    `);
    */
    
    console.log('Migration 1080000-CreateDocumentoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1080000-CreateDocumentoSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS documentos_policy ON "documentos";
      DROP POLICY IF EXISTS documentos_enviados_policy ON "documentos_enviados";
      DROP POLICY IF EXISTS verificacao_documento_policy ON "verificacao_documento";
      DROP POLICY IF EXISTS classificacao_documento_policy ON "classificacao_documento";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_solicitacao";
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_usuario_upload";
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_usuario_verificacao";
      
      ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_documentos_enviados_documento";
      ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_documentos_enviados_usuario";
      ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_documentos_enviados_verificador";
      
      ALTER TABLE "verificacao_documento" DROP CONSTRAINT IF EXISTS "FK_verificacao_documento";
      ALTER TABLE "verificacao_documento" DROP CONSTRAINT IF EXISTS "FK_verificacao_usuario";
      
      ALTER TABLE "classificacao_documento" DROP CONSTRAINT IF EXISTS "FK_classificacao_documento";
      ALTER TABLE "classificacao_documento" DROP CONSTRAINT IF EXISTS "FK_classificacao_usuario";
    `);
    
    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documentos_update_timestamp ON "documentos";
      DROP TRIGGER IF EXISTS trigger_documentos_enviados_update_timestamp ON "documentos_enviados";
      DROP TRIGGER IF EXISTS trigger_classificacao_documento_update_timestamp ON "classificacao_documento";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "classificacao_documento";
      DROP TABLE IF EXISTS "verificacao_documento";
      DROP TABLE IF EXISTS "documentos_enviados";
      DROP TABLE IF EXISTS "documentos";
    `);
    
    // Remover tipos enumerados específicos deste módulo
    // (não removemos tipo_documento pois pode ser usado em outros módulos)
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_verificacao_documento_enum";
      DROP TYPE IF EXISTS "resultado_verificacao_malware_enum";
      DROP TYPE IF EXISTS "tipo_documento_enviado_enum";
    `);
    
    console.log('Migration 1080000-CreateDocumentoSchema revertida com sucesso.');
  }
}
