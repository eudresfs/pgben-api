import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHistoricoConversaoPapel1704067232000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS historico_conversao_papel (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cidadao_id UUID NOT NULL,
        papel_anterior tipo_papel_enum NOT NULL,
        papel_novo tipo_papel_enum NOT NULL,
        composicao_familiar_id UUID,
        usuario_id UUID NOT NULL,
        justificativa TEXT NOT NULL,
        notificacao_enviada BOOLEAN DEFAULT FALSE,
        tecnico_notificado_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_historico_conversao_papel_cidadao
          FOREIGN KEY (cidadao_id)
          REFERENCES cidadao(id)
          ON DELETE CASCADE
      );

      CREATE INDEX idx_historico_conversao_papel_cidadao_id_created_at
        ON historico_conversao_papel(cidadao_id, created_at);
    `);

    // Adicionar constraint para impedir que um cidadão seja beneficiário e membro de composição familiar
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_verificar_exclusividade_papel()
      RETURNS TRIGGER AS $$
      DECLARE
        v_count INTEGER;
      BEGIN
        -- Verificar se o cidadão já está em uma composição familiar
        IF NEW.tipo_papel = 'BENEFICIARIO' THEN
          SELECT COUNT(*) INTO v_count FROM composicao_familiar 
          WHERE cpf = (SELECT cpf FROM cidadao WHERE id = NEW.cidadao_id) 
            AND removed_at IS NULL;
          
          IF v_count > 0 THEN
            RAISE EXCEPTION 'Cidadão não pode ser beneficiário, pois já está em uma composição familiar';
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_papel ON papel_cidadao;
      
      CREATE TRIGGER trg_verificar_exclusividade_papel
        BEFORE INSERT OR UPDATE ON papel_cidadao
        FOR EACH ROW
        EXECUTE FUNCTION fn_verificar_exclusividade_papel();
    `);

    // Adicionar coluna CPF na tabela composicao_familiar
    await queryRunner.query(`
      ALTER TABLE composicao_familiar 
      ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
      
      CREATE OR REPLACE FUNCTION fn_verificar_exclusividade_composicao()
      RETURNS TRIGGER AS $$
      DECLARE
        v_count INTEGER;
      BEGIN
        -- Verificar se o cidadão já é beneficiário
        SELECT COUNT(*) INTO v_count FROM papel_cidadao p
        JOIN cidadao c ON p.cidadao_id = c.id
        WHERE c.cpf = NEW.cpf AND p.tipo_papel = 'BENEFICIARIO' AND p.ativo = true;
        
        IF v_count > 0 THEN
          RAISE EXCEPTION 'Cidadão não pode ser adicionado à composição familiar, pois já é beneficiário';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_composicao ON composicao_familiar;
      
      CREATE TRIGGER trg_verificar_exclusividade_composicao
        BEFORE INSERT OR UPDATE ON composicao_familiar
        FOR EACH ROW
        EXECUTE FUNCTION fn_verificar_exclusividade_composicao();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers e funções
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_papel ON papel_cidadao;
      DROP FUNCTION IF EXISTS fn_verificar_exclusividade_papel();
      
      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_composicao ON composicao_familiar;
      DROP FUNCTION IF EXISTS fn_verificar_exclusividade_composicao();
    `);

    // Remover coluna CPF da tabela composicao_familiar
    await queryRunner.query(`
      ALTER TABLE composicao_familiar DROP COLUMN IF EXISTS cpf;
    `);

    // Remover tabela de histórico
    await queryRunner.query(`
      DROP TABLE IF EXISTS historico_conversao_papel;
    `);
  }
}
