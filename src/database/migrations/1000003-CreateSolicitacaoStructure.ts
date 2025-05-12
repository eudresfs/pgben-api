import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSolicitacaoStructure1000003 implements MigrationInterface {

  name = 'CreateSolicitacaoStructure20250512122200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enums para solicitação
    await queryRunner.query(`
      CREATE TYPE "status_solicitacao_enum" AS ENUM (
        'rascunho', 'aberta', 'em_analise', 'pendente', 'aprovada', 'indeferida',
        'liberada', 'concluida', 'cancelada'
      );

      CREATE TYPE "tipo_solicitacao_enum" AS ENUM ('novo', 'renovacao', 'prorrogacao');
      
      CREATE TYPE "origem_solicitacao_enum" AS ENUM ('presencial', 'whatsapp');
      
      CREATE TYPE "tipo_beneficio_enum" AS ENUM ('auxilio_natalidade', 'aluguel_social');
    `);

    // Criar tabela de solicitação
    await queryRunner.query(`
      CREATE TABLE "solicitacao" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "protocolo" VARCHAR(20) UNIQUE NOT NULL,
        "beneficiario_id" UUID NOT NULL,
        "solicitante_id" UUID NOT NULL,
        "tipo_beneficio_id" UUID NOT NULL,
        "unidade_id" UUID NOT NULL,
        "tecnico_id" UUID NOT NULL,
        "tipo_solicitacao" tipo_solicitacao_enum DEFAULT 'novo',
        "quantidade_parcelas" INTEGER DEFAULT 1,
        "data_abertura" TIMESTAMP NOT NULL,
        "status" status_solicitacao_enum DEFAULT 'rascunho',
        "origem" origem_solicitacao_enum DEFAULT 'presencial',
        "parecer_tecnico" TEXT,
        "parecer_semtas" TEXT,
        "aprovador_id" UUID,
        "data_aprovacao" TIMESTAMP,
        "data_liberacao" TIMESTAMP,
        "liberador_id" UUID,
        "destinatario_pagamento_id" UUID,
        "valor_pago" DECIMAL(10,2),
        "observacoes" TEXT,
        "parentesco" VARCHAR(50),
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_solicitacao_beneficiario" FOREIGN KEY ("beneficiario_id")
          REFERENCES "cidadao"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_solicitante" FOREIGN KEY ("solicitante_id")
          REFERENCES "cidadao"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_tipo_beneficio" FOREIGN KEY ("tipo_beneficio_id")
          REFERENCES "tipos_beneficio"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_unidade" FOREIGN KEY ("unidade_id")
          REFERENCES "unidade"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_tecnico" FOREIGN KEY ("tecnico_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_aprovador" FOREIGN KEY ("aprovador_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_liberador" FOREIGN KEY ("liberador_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_solicitacao_destinatario" FOREIGN KEY ("destinatario_pagamento_id")
          REFERENCES "cidadao"("id") ON DELETE RESTRICT
      );
    `);

    // Criar tabela de dados de benefícios
    await queryRunner.query(`
      CREATE TABLE "dados_beneficios" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitacao_id" UUID NOT NULL,
        "tipo_beneficio" tipo_beneficio_enum NOT NULL,
        "valor_solicitado" DECIMAL(10,2),
        "periodo_meses" INTEGER,
        
        -- Campos específicos para Auxílio Natalidade
        "data_prevista_parto" DATE,
        "data_nascimento" DATE,
        "pre_natal" BOOLEAN,
        "psf_ubs" BOOLEAN,
        "gravidez_risco" BOOLEAN,
        "gravidez_gemelar" BOOLEAN,
        
        -- Campos específicos para Aluguel Social
        "motivo" TEXT,
        "valor_aluguel" DECIMAL(10,2),
        "endereco_aluguel" TEXT,
        "bairro_aluguel" VARCHAR(100),
        "cep_aluguel" VARCHAR(8),
        "nome_proprietario" VARCHAR(255),
        "cpf_proprietario" VARCHAR(11),
        "telefone_proprietario" VARCHAR(20),
        "banco_proprietario" VARCHAR(100),
        "agencia_proprietario" VARCHAR(10),
        "conta_proprietario" VARCHAR(20),
        
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_dados_beneficios_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE CASCADE
      );
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX "idx_solicitacao_protocolo" ON "solicitacao"("protocolo");
      CREATE INDEX "idx_solicitacao_solicitante" ON "solicitacao"("solicitante_id");
      CREATE INDEX "idx_solicitacao_tipo_beneficio" ON "solicitacao"("tipo_beneficio_id");
      CREATE INDEX "idx_solicitacao_unidade" ON "solicitacao"("unidade_id");
      CREATE INDEX "idx_solicitacao_status" ON "solicitacao"("status");
      CREATE INDEX "idx_solicitacao_status_tipo" ON "solicitacao"("status", "tipo_beneficio_id");
      CREATE INDEX "idx_dados_beneficios_tipo" ON "dados_beneficios"("tipo_beneficio");
    `);

    // Criar constraints de validação
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validar_valor_pago_maximo()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.valor_pago IS NOT NULL THEN
          IF NEW.valor_pago > (SELECT tb.valor_maximo 
                             FROM tipos_beneficio tb 
                             WHERE tb.id = NEW.tipo_beneficio_id) THEN
            RAISE EXCEPTION 'Valor pago (%) excede o valor máximo permitido para este benefício', NEW.valor_pago;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
  
      CREATE TRIGGER trigger_validar_valor_pago_maximo
      BEFORE INSERT OR UPDATE ON solicitacao
      FOR EACH ROW EXECUTE FUNCTION validar_valor_pago_maximo();
    `);
    
    // As outras constraints CHECK estão corretas e podem ser mantidas
    await queryRunner.query(`
      ALTER TABLE "dados_beneficios" ADD CONSTRAINT "ck_dados_natalidade"
        CHECK (tipo_beneficio != 'auxilio_natalidade' OR 
              (data_prevista_parto IS NOT NULL OR data_nascimento IS NOT NULL));
  
      ALTER TABLE "dados_beneficios" ADD CONSTRAINT "ck_dados_aluguel"
        CHECK (tipo_beneficio != 'aluguel_social' OR 
              (motivo IS NOT NULL AND valor_aluguel IS NOT NULL));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraints de validação
    await queryRunner.query(`
      ALTER TABLE "dados_beneficios" DROP CONSTRAINT IF EXISTS "ck_dados_aluguel";
      ALTER TABLE "dados_beneficios" DROP CONSTRAINT IF EXISTS "ck_dados_natalidade";
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "ck_valor_pago_maximo";
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_dados_beneficios_tipo";
      DROP INDEX IF EXISTS "idx_solicitacao_status_tipo";
      DROP INDEX IF EXISTS "idx_solicitacao_status";
      DROP INDEX IF EXISTS "idx_solicitacao_unidade";
      DROP INDEX IF EXISTS "idx_solicitacao_tipo_beneficio";
      DROP INDEX IF EXISTS "idx_solicitacao_solicitante";
      DROP INDEX IF EXISTS "idx_solicitacao_protocolo";
    `);

    // Remover tabelas
    await queryRunner.query('DROP TABLE IF EXISTS "dados_beneficios";');
    await queryRunner.query('DROP TABLE IF EXISTS "solicitacao";');

    // Remover enums
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_beneficio_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "origem_solicitacao_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_solicitacao_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "status_solicitacao_enum";');
  }
}