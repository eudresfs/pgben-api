import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para remover trigger e função que ainda referenciam a tabela papel_cidadao
 * Esta migração corrige o erro "relation 'papel_cidadao' does not exist" que ocorre
 * ao tentar criar membros da composição familiar
 */
export class RemovePapelTriggerFunction1704067301000
  implements MigrationInterface
{
  name = 'RemovePapelTriggerFunction1704067301000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover o trigger que verifica exclusividade usando papel_cidadao
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_composicao ON composicao_familiar;
    `);

    // Remover a função que referencia papel_cidadao
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS fn_verificar_exclusividade_composicao();
    `);

    // Criar nova função de validação de exclusividade sem depender de papel_cidadao
    // Esta função verifica se o CPF já existe como beneficiário na tabela cidadao
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_verificar_exclusividade_composicao_v2()
      RETURNS TRIGGER AS $$
      DECLARE
        v_count INTEGER;
      BEGIN
        -- Verificar se o CPF já existe como cidadão beneficiário
        -- Um cidadão é considerado beneficiário se está cadastrado na tabela cidadao e não foi removido
        SELECT COUNT(*) INTO v_count 
        FROM cidadao c 
        WHERE c.cpf = NEW.cpf AND c.removed_at IS NULL;
        
        IF v_count > 0 THEN
          RAISE EXCEPTION 'CPF % não pode ser adicionado à composição familiar, pois já é beneficiário cadastrado no sistema', NEW.cpf;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Criar novo trigger usando a função atualizada
    await queryRunner.query(`
      CREATE TRIGGER trg_verificar_exclusividade_composicao_v2
        BEFORE INSERT OR UPDATE ON composicao_familiar
        FOR EACH ROW
        EXECUTE FUNCTION fn_verificar_exclusividade_composicao_v2();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover o novo trigger e função
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_verificar_exclusividade_composicao_v2 ON composicao_familiar;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS fn_verificar_exclusividade_composicao_v2();
    `);

    // Recriar a função original (mesmo que ela não funcione sem papel_cidadao)
    // Isso é necessário para permitir rollback da migração
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_verificar_exclusividade_composicao()
      RETURNS TRIGGER AS $$
      DECLARE
        v_count INTEGER;
      BEGIN
        -- NOTA: Esta função não funcionará sem a tabela papel_cidadao
        -- Verificar se o cidadão já é beneficiário
        SELECT COUNT(*) INTO v_count FROM papel_cidadao p
        JOIN cidadao c ON p.cidadao_id = c.id
        WHERE c.cpf = NEW.cpf AND p.tipo_papel = 'beneficiario' AND p.ativo = true;
        
        IF v_count > 0 THEN
          RAISE EXCEPTION 'Cidadão não pode ser adicionado à composição familiar, pois já é beneficiário';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Recriar o trigger original
    await queryRunner.query(`
      CREATE TRIGGER trg_verificar_exclusividade_composicao
        BEFORE INSERT OR UPDATE ON composicao_familiar
        FOR EACH ROW
        EXECUTE FUNCTION fn_verificar_exclusividade_composicao();
    `);
  }
}
