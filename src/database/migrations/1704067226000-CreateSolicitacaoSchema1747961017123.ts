import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

/**
 * Migration para criar o schema relacionado à solicitação
 * 
 * Esta migration cria as tabelas e restrições para o módulo de solicitação,
 * incluindo estruturas para gerenciar solicitações de benefícios, histórico de status,
 * avaliações, documentos e parcelas de pagamento.
 * 
 * Inclui também campos para:
 * - Determinações judiciais
 * - Renovação automática de solicitações
 * 
 * Os enums necessários são criados na migration CreateAllEnums
 * A tabela de benefícios é criada na migration CreateBeneficioSchema
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateSolicitacaoSchema1704067226000 implements MigrationInterface {
  name = 'CreateSolicitacaoSchema1704067226000';

  /**
   * Cria as estruturas relacionadas à solicitação
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateSolicitacaoSchema...');
    
    // Tabela principal de solicitação
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "solicitacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "protocolo" character varying NOT NULL,
        "beneficiario_id" uuid NOT NULL,
        "solicitante_id" uuid,
        "tipo_beneficio_id" uuid NOT NULL,
        "unidade_id" uuid NOT NULL,
        "tecnico_id" uuid NOT NULL,
        "data_abertura" TIMESTAMP NOT NULL,
        "status" "status_solicitacao_enum" NOT NULL DEFAULT 'pendente',
        "parecer_semtas" text,
        "aprovador_id" uuid,
        "data_aprovacao" TIMESTAMP,
        "data_liberacao" TIMESTAMP,
        "liberador_id" uuid,
        "observacoes" text,
        "dados_complementares" jsonb,
        
        -- Campos para determinação judicial
        "processo_judicial_id" uuid,
        "determinacao_judicial_id" uuid,
        "determinacao_judicial_flag" boolean NOT NULL DEFAULT false,
        "solicitacao_original_id" uuid,
        
        -- Campos para renovação automática
        "renovacao_automatica" boolean NOT NULL DEFAULT false,
        "contador_renovacoes" integer NOT NULL DEFAULT 0,
        "data_proxima_renovacao" timestamp with time zone,
        "dados_dinamicos" jsonb,
        "prazo_analise" timestamp with time zone,
        "prazo_documentos" timestamp with time zone,
        "prazo_processamento" timestamp with time zone,

        "version" integer not null default 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_solicitacao" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_solicitacao_protocolo" UNIQUE ("protocolo")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_beneficiario" ON "solicitacao" ("beneficiario_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_solicitante" ON "solicitacao" ("solicitante_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_tipo_beneficio" ON "solicitacao" ("tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_unidade" ON "solicitacao" ("unidade_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_status_unidade" ON "solicitacao" ("status", "unidade_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_status_tipo" ON "solicitacao" ("status", "tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_data_status" ON "solicitacao" ("data_abertura", "status");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_pendentes" ON "solicitacao" ("status") WHERE status IN ('pendente', 'em_analise');
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_dados" ON "solicitacao" USING GIN ("dados_complementares");
      
      -- Índices para campos de determinação judicial
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_processo_judicial" ON "solicitacao" ("processo_judicial_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_determinacao_judicial" ON "solicitacao" ("determinacao_judicial_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_determinacao_judicial_flag" ON "solicitacao" ("determinacao_judicial_flag") WHERE determinacao_judicial_flag = true;
      
      -- Índices para campos de renovação automática
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_renovacao_automatica" ON "solicitacao" ("renovacao_automatica") WHERE renovacao_automatica = true;
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_solicitacao_original" ON "solicitacao" ("solicitacao_original_id");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_data_proxima_renovacao" ON "solicitacao" ("data_proxima_renovacao");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_prazo_analise" ON "solicitacao" ("prazo_analise");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_prazo_documentos" ON "solicitacao" ("prazo_documentos");
      CREATE INDEX IF NOT EXISTS "IDX_solicitacao_prazo_processamento" ON "solicitacao" ("prazo_processamento");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_solicitacao_update_timestamp ON "solicitacao";
      CREATE TRIGGER trigger_solicitacao_update_timestamp
        BEFORE UPDATE ON "solicitacao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de solicitação criada com sucesso.');
    
    // Tabela de histórico de solicitação
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "historico_status_solicitacao" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_historico_solicitacao" ON "historico_status_solicitacao" ("solicitacao_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_historico_usuario" ON "historico_status_solicitacao" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_historico_status" ON "historico_status_solicitacao" ("status_anterior", "status_atual");
      CREATE INDEX IF NOT EXISTS "IDX_historico_dados" ON "historico_status_solicitacao" USING GIN ("dados_alterados");
    `);
    
    console.log('Tabela de histórico de solicitação criada com sucesso.');
    
    // Tabela de dados de benefícios
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dados_beneficios" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DADOS_BENEFICIOS_SOLICITACAO" ON "dados_beneficios" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_DADOS_BENEFICIOS_TIPO" ON "dados_beneficios" ("tipo_beneficio");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_dados_beneficios_update_timestamp ON "dados_beneficios";
      CREATE TRIGGER trigger_dados_beneficios_update_timestamp
        BEFORE UPDATE ON "dados_beneficios"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de dados de benefícios criada com sucesso.');
    
    // Tabela de pendências
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pendencias" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pendencias_solicitacao" ON "pendencias" ("solicitacao_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_pendencias_status" ON "pendencias" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_pendencias_registrado" ON "pendencias" ("registrado_por_id");
      CREATE INDEX IF NOT EXISTS "IDX_pendencias_resolvido" ON "pendencias" ("resolvido_por_id");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_pendencias_update_timestamp ON "pendencias";
      CREATE TRIGGER trigger_pendencias_update_timestamp
        BEFORE UPDATE ON "pendencias"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de pendências criada com sucesso.');
    
    // Tabela de avaliação de solicitação
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "avaliacao_solicitacao" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_avaliacao_solicitacao" ON "avaliacao_solicitacao" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_avaliacao_tipo" ON "avaliacao_solicitacao" ("tipo_avaliacao");
      CREATE INDEX IF NOT EXISTS "IDX_avaliacao_resultado" ON "avaliacao_solicitacao" ("resultado");
      CREATE INDEX IF NOT EXISTS "IDX_avaliacao_avaliador" ON "avaliacao_solicitacao" ("avaliador_id");
      CREATE INDEX IF NOT EXISTS "IDX_avaliacao_docs" ON "avaliacao_solicitacao" USING GIN ("documentos_analisados");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_avaliacao_update_timestamp ON "avaliacao_solicitacao";
      CREATE TRIGGER trigger_avaliacao_update_timestamp
        BEFORE UPDATE ON "avaliacao_solicitacao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de avaliação de solicitação criada com sucesso.');
    
    // Tabela de documento de solicitação
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documento_solicitacao" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_documento_solicitacao" ON "documento_solicitacao" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_documento_tipo" ON "documento_solicitacao" ("tipo_documento");
      CREATE INDEX IF NOT EXISTS "IDX_documento_upload" ON "documento_solicitacao" ("upload_por_id");
      CREATE INDEX IF NOT EXISTS "IDX_documento_metadata" ON "documento_solicitacao" USING GIN ("metadados");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documento_update_timestamp ON "documento_solicitacao";
      CREATE TRIGGER trigger_documento_update_timestamp
        BEFORE UPDATE ON "documento_solicitacao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de documento de solicitação criada com sucesso.');
    
    // Tabela de parcela de pagamento
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parcela_pagamento" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_parcela_solicitacao" ON "parcela_pagamento" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_parcela_status" ON "parcela_pagamento" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_parcela_data_prevista" ON "parcela_pagamento" ("data_prevista");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_parcela_update_timestamp ON "parcela_pagamento";
      CREATE TRIGGER trigger_parcela_update_timestamp
        BEFORE UPDATE ON "parcela_pagamento"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de parcela de pagamento criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_historico_solicitacao'
        ) THEN
          ALTER TABLE "historico_status_solicitacao" ADD CONSTRAINT "FK_historico_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_historico_usuario'
        ) THEN
          ALTER TABLE "historico_status_solicitacao" ADD CONSTRAINT "FK_historico_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_dados_beneficios_solicitacao'
        ) THEN
          ALTER TABLE "dados_beneficios" ADD CONSTRAINT "FK_dados_beneficios_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pendencias_solicitacao'
        ) THEN
          ALTER TABLE "pendencias" ADD CONSTRAINT "FK_pendencias_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pendencias_registrado_por'
        ) THEN
          ALTER TABLE "pendencias" ADD CONSTRAINT "FK_pendencias_registrado_por"
          FOREIGN KEY ("registrado_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pendencias_resolvido_por'
        ) THEN
          ALTER TABLE "pendencias" ADD CONSTRAINT "FK_pendencias_resolvido_por"
          FOREIGN KEY ("resolvido_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_avaliacao_solicitacao'
        ) THEN
          ALTER TABLE "avaliacao_solicitacao" ADD CONSTRAINT "FK_avaliacao_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_avaliacao_avaliador'
        ) THEN
          ALTER TABLE "avaliacao_solicitacao" ADD CONSTRAINT "FK_avaliacao_avaliador"
          FOREIGN KEY ("avaliador_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documento_solicitacao'
        ) THEN
          ALTER TABLE "documento_solicitacao" ADD CONSTRAINT "FK_documento_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documento_upload_por'
        ) THEN
          ALTER TABLE "documento_solicitacao" ADD CONSTRAINT "FK_documento_upload_por"
          FOREIGN KEY ("upload_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_parcela_solicitacao'
        ) THEN
          ALTER TABLE "parcela_pagamento" ADD CONSTRAINT "FK_parcela_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_parcela_comprovante'
        ) THEN
          ALTER TABLE "parcela_pagamento" ADD CONSTRAINT "FK_parcela_comprovante"
          FOREIGN KEY ("comprovante_id") REFERENCES "documento_solicitacao" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_beneficiario'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_beneficiario"
          FOREIGN KEY ("beneficiario_id") REFERENCES "cidadao" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_solicitante'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_solicitante"
          FOREIGN KEY ("solicitante_id") REFERENCES "cidadao" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_tipo_beneficio'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_tipo_beneficio"
          FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_unidade'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_unidade"
          FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_tecnico'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_tecnico"
          FOREIGN KEY ("tecnico_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_aprovador'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_aprovador"
          FOREIGN KEY ("aprovador_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_liberador'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_liberador"
          FOREIGN KEY ("liberador_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    
    // Verificar se a tabela tipo_beneficio existe
    const tipoBeneficioExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tipo_beneficio'
      );
    `);
    
    if (!tipoBeneficioExists[0].exists) {
      console.log('ERRO: A tabela tipo_beneficio não existe. Esta tabela é necessária para a chave estrangeira da tabela solicitacao.');
      console.log('Execute a migração CreateBeneficioSchema1747961017133 primeiro.');
      throw new Error('Tabela tipo_beneficio não encontrada. Execute a migração CreateBeneficioSchema1747961017133 primeiro.');
    }
    
    // Verificar se as tabelas de processo judicial existem
    const processoJudicialExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'processo_judicial'
      );
    `);
    
    const determinacaoJudicialExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'determinacao_judicial_flag'
      );
    `);
    
    if (!processoJudicialExists[0].exists) {
      console.log('AVISO: A tabela processo_judicial não existe. Execute a migração CreateProcessoJudicialSchema1747961017135 primeiro.');
      console.log('Continuando sem adicionar as chaves estrangeiras para processo judicial...');
    }
    
    if (!determinacaoJudicialExists[0].exists) {
      console.log('AVISO: A tabela determinacao_judicial_flag não existe. Execute a migração CreateProcessoJudicialSchema1747961017135 primeiro.');
      console.log('Continuando sem adicionar as chaves estrangeiras para determinação judicial...');
    }
    
    // Adicionar chaves estrangeiras para os novos campos
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_solicitacao_original'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_solicitacao_original"
          FOREIGN KEY ("solicitacao_original_id") REFERENCES "solicitacao" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    
    // Adicionar chaves estrangeiras para processo judicial apenas se a tabela existir
    if (processoJudicialExists[0].exists) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_solicitacao_processo_judicial'
          ) THEN
            ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_processo_judicial"
            FOREIGN KEY ("processo_judicial_id") REFERENCES "processo_judicial" ("id") ON DELETE RESTRICT;
          END IF;
        END $$;
      `);
    }
    
    // Adicionar chaves estrangeiras para determinação judicial apenas se a tabela existir
    if (determinacaoJudicialExists[0].exists) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'FK_solicitacao_determinacao_judicial'
          ) THEN
            ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_determinacao_judicial"
            FOREIGN KEY ("determinacao_judicial_id") REFERENCES "determinacao_judicial" ("id") ON DELETE RESTRICT;
          END IF;
        END $$;
      `);
    }
    
    console.log('Migration CreateSolicitacaoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateSolicitacaoSchema...');
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      -- Remover chaves estrangeiras adicionadas para campos de renovação e determinação judicial
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_solicitacao_original";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_processo_judicial";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_determinacao_judicial";
      
      -- Remover chaves estrangeiras originais
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
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_solicitante";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_tipo_beneficio";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_unidade";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_tecnico";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_aprovador";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_liberador";
    `);
    
    // Remover índices adicionados para os novos campos
    await queryRunner.query(`
      -- Remover índices para campos de determinação judicial
      DROP INDEX IF EXISTS "IDX_solicitacao_processo_judicial";
      DROP INDEX IF EXISTS "IDX_solicitacao_determinacao_judicial";
      DROP INDEX IF EXISTS "IDX_solicitacao_determinacao_judicial_flag";
      
      -- Remover índices para campos de renovação automática
      DROP INDEX IF EXISTS "IDX_solicitacao_renovacao_automatica";
      DROP INDEX IF EXISTS "IDX_solicitacao_solicitacao_original";
      DROP INDEX IF EXISTS "IDX_solicitacao_data_proxima_renovacao";
      DROP INDEX IF EXISTS "IDX_solicitacao_renovacao";
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
    
    console.log('Migration CreateSolicitacaoSchema revertida com sucesso.');
  }
}