import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado à solicitação
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de solicitação,
 * incluindo estruturas para gerenciar solicitações de benefícios, histórico de status,
 * avaliações, documentos e parcelas de pagamento.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateSolicitacaoSchema1747961017138 implements MigrationInterface {
  name = 'CreateSolicitacaoSchema1747961017138';

  /**
   * Cria as estruturas relacionadas à solicitação
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1040000-CreateSolicitacaoSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "status_solicitacao_enum" AS ENUM (
        'rascunho',
        'pendente',
        'em_analise',
        'aguardando_documentos',
        'aprovada',
        'reprovada',
        'liberada',
        'cancelada'
      );
      
      CREATE TYPE "tipo_avaliacao_enum" AS ENUM (
        'tecnica',
        'social',
        'administrativa',
        'financeira'
      );
      
      CREATE TYPE "resultado_avaliacao_enum" AS ENUM (
        'favoravel',
        'desfavoravel',
        'pendente',
        'cancelada'
      );
      
      CREATE TYPE "tipo_beneficio_enum" AS ENUM (
        'aluguel_social',
        'cesta_basica',
        'auxilio_funeral',
        'material_construcao',
        'beneficio_natalidade',
        'outro'
      );
      
      CREATE TYPE "origem_solicitacao_enum" AS ENUM (
        'atendimento_presencial',
        'encaminhamento',
        'demanda_espontanea',
        'oficio',
        'whatsapp',
        'outro'
      );
      
      CREATE TYPE "tipo_solicitacao_enum" AS ENUM (
        'novo',
        'renovacao',
        'prorrogacao'
      );
    `);
    
    console.log('Tipos enumerados criados com sucesso.');
    
    // Tabela principal de solicitação
    await queryRunner.query(`
      CREATE TABLE "solicitacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "protocolo" character varying NOT NULL,
        "beneficiario_id" uuid NOT NULL,
        "tipo_beneficio_id" uuid NOT NULL,
        "unidade_id" uuid NOT NULL,
        "tecnico_id" uuid NOT NULL,
        "data_abertura" TIMESTAMP NOT NULL,
        "status" "status_solicitacao_enum" NOT NULL DEFAULT 'rascunho',
        "parecer_semtas" text,
        "aprovador_id" uuid,
        "data_aprovacao" TIMESTAMP,
        "data_liberacao" TIMESTAMP,
        "liberador_id" uuid,
        "observacoes" text,
        "dados_complementares" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_solicitacao" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_solicitacao_protocolo" UNIQUE ("protocolo")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_solicitacao_beneficiario" ON "solicitacao" ("beneficiario_id");
      CREATE INDEX "IDX_solicitacao_tipo_beneficio" ON "solicitacao" ("tipo_beneficio_id");
      CREATE INDEX "IDX_solicitacao_unidade" ON "solicitacao" ("unidade_id");
      CREATE INDEX "IDX_solicitacao_status_unidade" ON "solicitacao" ("status", "unidade_id");
      CREATE INDEX "IDX_solicitacao_status_tipo" ON "solicitacao" ("status", "tipo_beneficio_id");
      CREATE INDEX "IDX_solicitacao_data_status" ON "solicitacao" ("data_abertura", "status");
      CREATE INDEX "IDX_solicitacao_pendentes" ON "solicitacao" ("status") WHERE status IN ('pendente', 'em_analise');
      CREATE INDEX "IDX_solicitacao_dados" ON "solicitacao" USING GIN ("dados_complementares");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_solicitacao_update_timestamp
      BEFORE UPDATE ON "solicitacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de solicitação criada com sucesso.');
    
    // Tabela de histórico de solicitação
    await queryRunner.query(`
      CREATE TABLE "historico_status_solicitacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "status_anterior" "status_solicitacao_enum" NOT NULL,
        "status_atual" "status_solicitacao_enum" NOT NULL,
        "usuario_id" uuid NOT NULL,
        "observacao" text,
        "dados_alterados" jsonb,
        "ip_usuario" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_historico_status_solicitacao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_historico_solicitacao" ON "historico_status_solicitacao" ("solicitacao_id", "created_at");
      CREATE INDEX "IDX_historico_usuario" ON "historico_status_solicitacao" ("usuario_id");
      CREATE INDEX "IDX_historico_status" ON "historico_status_solicitacao" ("status_anterior", "status_atual");
      CREATE INDEX "IDX_historico_dados" ON "historico_status_solicitacao" USING GIN ("dados_alterados");
    `);
    
    console.log('Tabela de histórico de solicitação criada com sucesso.');
    
    // Tabela de dados de benefícios
    await queryRunner.query(`
      CREATE TABLE "dados_beneficios" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "tipo_beneficio" "tipo_beneficio_enum" NOT NULL,
        "valor_solicitado" decimal(10,2),
        "periodo_meses" integer,
        "data_prevista_parto" date,
        "data_nascimento" date,
        "pre_natal" boolean,
        "psf_ubs" boolean,
        "gravidez_risco" boolean,
        "gravidez_gemelar" boolean,
        "motivo" text,
        "valor_aluguel" decimal(10,2),
        "endereco_aluguel" text,
        "bairro_aluguel" character varying(100),
        "cep_aluguel" character varying(8),
        "nome_proprietario" character varying(255),
        "cpf_proprietario" character varying(11),
        "telefone_proprietario" character varying(20),
        "banco_proprietario" character varying(100),
        "agencia_proprietario" character varying(10),
        "conta_proprietario" character varying(20),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_dados_beneficios" PRIMARY KEY ("id"),
        CONSTRAINT "UK_dados_beneficios_solicitacao" UNIQUE ("solicitacao_id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_DADOS_BENEFICIOS_SOLICITACAO" ON "dados_beneficios" ("solicitacao_id");
      CREATE INDEX "IDX_DADOS_BENEFICIOS_TIPO" ON "dados_beneficios" ("tipo_beneficio");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_dados_beneficios_update_timestamp
      BEFORE UPDATE ON "dados_beneficios"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de dados de benefícios criada com sucesso.');
    
    // Criando tipo enumerado para status de pendência
    await queryRunner.query(`
      CREATE TYPE "status_pendencia_enum" AS ENUM (
        'aberta',
        'resolvida',
        'cancelada'
      );
    `);
    
    // Tabela de pendências
    await queryRunner.query(`
      CREATE TABLE "pendencias" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "descricao" text NOT NULL,
        "registrado_por_id" uuid NOT NULL,
        "status" "status_pendencia_enum" NOT NULL DEFAULT 'aberta',
        "resolvido_por_id" uuid,
        "data_resolucao" TIMESTAMP,
        "observacao_resolucao" text,
        "prazo_resolucao" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_pendencias" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_pendencias_solicitacao" ON "pendencias" ("solicitacao_id", "created_at");
      CREATE INDEX "IDX_pendencias_status" ON "pendencias" ("status");
      CREATE INDEX "IDX_pendencias_registrado" ON "pendencias" ("registrado_por_id");
      CREATE INDEX "IDX_pendencias_resolvido" ON "pendencias" ("resolvido_por_id");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_pendencias_update_timestamp
      BEFORE UPDATE ON "pendencias"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de pendências criada com sucesso.');
    
    // Tabela de avaliação de solicitação
    await queryRunner.query(`
      CREATE TABLE "avaliacao_solicitacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "tipo_avaliacao" "tipo_avaliacao_enum" NOT NULL,
        "resultado" "resultado_avaliacao_enum" NOT NULL DEFAULT 'pendente',
        "avaliador_id" uuid NOT NULL,
        "parecer" text,
        "data_avaliacao" TIMESTAMP NOT NULL,
        "documentos_analisados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_avaliacao_solicitacao" PRIMARY KEY ("id"),
        CONSTRAINT "UK_avaliacao_solicitacao_tipo" UNIQUE ("solicitacao_id", "tipo_avaliacao")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_avaliacao_solicitacao" ON "avaliacao_solicitacao" ("solicitacao_id");
      CREATE INDEX "IDX_avaliacao_tipo" ON "avaliacao_solicitacao" ("tipo_avaliacao");
      CREATE INDEX "IDX_avaliacao_resultado" ON "avaliacao_solicitacao" ("resultado");
      CREATE INDEX "IDX_avaliacao_avaliador" ON "avaliacao_solicitacao" ("avaliador_id");
      CREATE INDEX "IDX_avaliacao_docs" ON "avaliacao_solicitacao" USING GIN ("documentos_analisados");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_avaliacao_update_timestamp
      BEFORE UPDATE ON "avaliacao_solicitacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de avaliação de solicitação criada com sucesso.');
    
    // Tabela de documento de solicitação
    await queryRunner.query(`
      CREATE TABLE "documento_solicitacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "tipo_documento" character varying NOT NULL,
        "nome_arquivo" character varying NOT NULL,
        "tamanho_bytes" integer NOT NULL,
        "path" character varying NOT NULL,
        "mime_type" character varying NOT NULL,
        "upload_por_id" uuid NOT NULL,
        "hash_arquivo" character varying,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_documento_solicitacao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_documento_solicitacao" ON "documento_solicitacao" ("solicitacao_id");
      CREATE INDEX "IDX_documento_tipo" ON "documento_solicitacao" ("tipo_documento");
      CREATE INDEX "IDX_documento_upload" ON "documento_solicitacao" ("upload_por_id");
      CREATE INDEX "IDX_documento_metadata" ON "documento_solicitacao" USING GIN ("metadados");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_documento_update_timestamp
      BEFORE UPDATE ON "documento_solicitacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de documento de solicitação criada com sucesso.');
    
    // Tabela de parcela de pagamento
    await queryRunner.query(`
      CREATE TABLE "parcela_pagamento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "numero_parcela" integer NOT NULL,
        "valor" decimal(10,2) NOT NULL,
        "data_prevista" date NOT NULL,
        "data_pagamento" date,
        "comprovante_id" uuid,
        "observacao" text,
        "status" character varying NOT NULL DEFAULT 'pendente',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_parcela_pagamento" PRIMARY KEY ("id"),
        CONSTRAINT "UK_parcela_solicitacao_numero" UNIQUE ("solicitacao_id", "numero_parcela")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_parcela_solicitacao" ON "parcela_pagamento" ("solicitacao_id");
      CREATE INDEX "IDX_parcela_status" ON "parcela_pagamento" ("status");
      CREATE INDEX "IDX_parcela_data_prevista" ON "parcela_pagamento" ("data_prevista");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_parcela_update_timestamp
      BEFORE UPDATE ON "parcela_pagamento"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de parcela de pagamento criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "historico_status_solicitacao" ADD CONSTRAINT "FK_historico_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "historico_status_solicitacao" ADD CONSTRAINT "FK_historico_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "dados_beneficios" ADD CONSTRAINT "FK_dados_beneficios_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "pendencias" ADD CONSTRAINT "FK_pendencias_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "pendencias" ADD CONSTRAINT "FK_pendencias_registrado_por"
      FOREIGN KEY ("registrado_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "pendencias" ADD CONSTRAINT "FK_pendencias_resolvido_por"
      FOREIGN KEY ("resolvido_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "avaliacao_solicitacao" ADD CONSTRAINT "FK_avaliacao_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "avaliacao_solicitacao" ADD CONSTRAINT "FK_avaliacao_avaliador"
      FOREIGN KEY ("avaliador_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "documento_solicitacao" ADD CONSTRAINT "FK_documento_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "documento_solicitacao" ADD CONSTRAINT "FK_documento_upload_por"
      FOREIGN KEY ("upload_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "parcela_pagamento" ADD CONSTRAINT "FK_parcela_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "parcela_pagamento" ADD CONSTRAINT "FK_parcela_comprovante"
      FOREIGN KEY ("comprovante_id") REFERENCES "documento_solicitacao" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_beneficiario"
      FOREIGN KEY ("beneficiario_id") REFERENCES "cidadao" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_tipo_beneficio"
      FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_unidade"
      FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_tecnico"
      FOREIGN KEY ("tecnico_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_aprovador"
      FOREIGN KEY ("aprovador_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_liberador"
      FOREIGN KEY ("liberador_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "solicitacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "historico_status_solicitacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "dados_beneficios" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "pendencias" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "avaliacao_solicitacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "documento_solicitacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "parcela_pagamento" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY solicitacao_policy ON "solicitacao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY historico_solicitacao_policy ON "historico_status_solicitacao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY dados_beneficios_policy ON "dados_beneficios" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY pendencias_policy ON "pendencias" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY avaliacao_solicitacao_policy ON "avaliacao_solicitacao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY documento_solicitacao_policy ON "documento_solicitacao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY parcela_pagamento_policy ON "parcela_pagamento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    console.log('Migration 1040000-CreateSolicitacaoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1040000-CreateSolicitacaoSchema...');
    
    // Remover triggers de log de auditoria
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_log_trigger_solicitacao ON "solicitacao";
      DROP TRIGGER IF EXISTS audit_log_trigger_historico_status_solicitacao ON "historico_status_solicitacao";
      DROP TRIGGER IF EXISTS audit_log_trigger_dados_beneficios ON "dados_beneficios";
      DROP TRIGGER IF EXISTS audit_log_trigger_pendencias ON "pendencias";
      DROP TRIGGER IF EXISTS audit_log_trigger_avaliacao_solicitacao ON "avaliacao_solicitacao";
      DROP TRIGGER IF EXISTS audit_log_trigger_documento_solicitacao ON "documento_solicitacao";
      DROP TRIGGER IF EXISTS audit_log_trigger_parcela_pagamento ON "parcela_pagamento";
    `);
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS solicitacao_policy ON "solicitacao";
      DROP POLICY IF EXISTS historico_solicitacao_policy ON "historico_status_solicitacao";
      DROP POLICY IF EXISTS dados_beneficios_policy ON "dados_beneficios";
      DROP POLICY IF EXISTS pendencias_policy ON "pendencias";
      DROP POLICY IF EXISTS avaliacao_solicitacao_policy ON "avaliacao_solicitacao";
      DROP POLICY IF EXISTS documento_solicitacao_policy ON "documento_solicitacao";
      DROP POLICY IF EXISTS parcela_pagamento_policy ON "parcela_pagamento";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "historico_status_solicitacao" DROP CONSTRAINT IF EXISTS "FK_historico_solicitacao";
      ALTER TABLE "historico_status_solicitacao" DROP CONSTRAINT IF EXISTS "FK_historico_usuario";
      ALTER TABLE "dados_beneficios" DROP CONSTRAINT IF EXISTS "FK_dados_beneficios_solicitacao";
      ALTER TABLE "pendencias" DROP CONSTRAINT IF EXISTS "FK_pendencias_solicitacao";
      ALTER TABLE "pendencias" DROP CONSTRAINT IF EXISTS "FK_pendencias_registrado_por";
      ALTER TABLE "pendencias" DROP CONSTRAINT IF EXISTS "FK_pendencias_resolvido_por";
      ALTER TABLE "avaliacao_solicitacao" DROP CONSTRAINT IF EXISTS "FK_avaliacao_solicitacao";
      ALTER TABLE "avaliacao_solicitacao" DROP CONSTRAINT IF EXISTS "FK_avaliacao_avaliador";
      ALTER TABLE "documento_solicitacao" DROP CONSTRAINT IF EXISTS "FK_documento_solicitacao";
      ALTER TABLE "documento_solicitacao" DROP CONSTRAINT IF EXISTS "FK_documento_upload_por";
      ALTER TABLE "parcela_pagamento" DROP CONSTRAINT IF EXISTS "FK_parcela_solicitacao";
      ALTER TABLE "parcela_pagamento" DROP CONSTRAINT IF EXISTS "FK_parcela_comprovante";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_beneficiario";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_tipo_beneficio";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_unidade";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_tecnico";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_aprovador";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_liberador";
    `);
    
    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_solicitacao_update_timestamp ON "solicitacao";
      DROP TRIGGER IF EXISTS trigger_dados_beneficios_update_timestamp ON "dados_beneficios";
      DROP TRIGGER IF EXISTS trigger_pendencias_update_timestamp ON "pendencias";
      DROP TRIGGER IF EXISTS trigger_avaliacao_update_timestamp ON "avaliacao_solicitacao";
      DROP TRIGGER IF EXISTS trigger_documento_update_timestamp ON "documento_solicitacao";
      DROP TRIGGER IF EXISTS trigger_parcela_update_timestamp ON "parcela_pagamento";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "parcela_pagamento";
      DROP TABLE IF EXISTS "documento_solicitacao";
      DROP TABLE IF EXISTS "avaliacao_solicitacao";
      DROP TABLE IF EXISTS "pendencias";
      DROP TABLE IF EXISTS "dados_beneficios";
      DROP TABLE IF EXISTS "historico_status_solicitacao";
      DROP TABLE IF EXISTS "solicitacao";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_pendencia_enum";
      DROP TYPE IF EXISTS "tipo_solicitacao_enum";
      DROP TYPE IF EXISTS "origem_solicitacao_enum";
      DROP TYPE IF EXISTS "tipo_beneficio_enum";
      DROP TYPE IF EXISTS "resultado_avaliacao_enum";
      DROP TYPE IF EXISTS "tipo_avaliacao_enum";
      DROP TYPE IF EXISTS "status_solicitacao_enum";
    `);
    
    console.log('Migration 1040000-CreateSolicitacaoSchema revertida com sucesso.');
  }
}
