import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeterminacaoJudicial1704067230000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS determinacao_judicial (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        solicitacao_id UUID NOT NULL,
        numero_processo VARCHAR(50) NOT NULL,
        orgao_judicial VARCHAR(100) NOT NULL,
        comarca VARCHAR(100) NOT NULL,
        juiz VARCHAR(100) NOT NULL,
        data_decisao TIMESTAMP WITH TIME ZONE NOT NULL,
        descricao_decisao TEXT NOT NULL,
        prazo_cumprimento TIMESTAMP WITH TIME ZONE,
        data_cumprimento TIMESTAMP WITH TIME ZONE,
        observacoes TEXT,
        documento_url VARCHAR(255),
        usuario_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_determinacao_judicial_solicitacao
          FOREIGN KEY (solicitacao_id)
          REFERENCES solicitacao(id)
          ON DELETE CASCADE
      );

      CREATE INDEX idx_determinacao_judicial_solicitacao_id_numero_processo
        ON determinacao_judicial(solicitacao_id, numero_processo);
      
      -- Adicionar campo para indicar se a solicitação é baseada em determinação judicial
      ALTER TABLE solicitacao 
      ADD COLUMN IF NOT EXISTS determinacao_judicial BOOLEAN DEFAULT FALSE;
      
      -- Adicionar campo para armazenar o ID da determinação judicial principal
      ALTER TABLE solicitacao 
      ADD COLUMN IF NOT EXISTS determinacao_judicial_id UUID;
      
      -- Adicionar constraint de chave estrangeira
      ALTER TABLE solicitacao 
      ADD CONSTRAINT fk_solicitacao_determinacao_judicial
      FOREIGN KEY (determinacao_judicial_id)
      REFERENCES determinacao_judicial(id)
      ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraint de chave estrangeira
    await queryRunner.query(`
      ALTER TABLE solicitacao 
      DROP CONSTRAINT IF EXISTS fk_solicitacao_determinacao_judicial;
    `);

    // Remover campos adicionados à tabela solicitacao
    await queryRunner.query(`
      ALTER TABLE solicitacao 
      DROP COLUMN IF EXISTS determinacao_judicial_id;
      
      ALTER TABLE solicitacao 
      DROP COLUMN IF EXISTS determinacao_judicial;
    `);

    // Remover tabela de determinação judicial
    await queryRunner.query(`
      DROP TABLE IF EXISTS determinacao_judicial;
    `);
  }
}
