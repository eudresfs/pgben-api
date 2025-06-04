import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfiguracaoRenovacao1704067228000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS configuracao_renovacao (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tipo_beneficio_id UUID NOT NULL,
        renovacao_automatica BOOLEAN DEFAULT FALSE,
        dias_antecedencia_renovacao INTEGER DEFAULT 7,
        numero_maximo_renovacoes INTEGER,
        requer_aprovacao_renovacao BOOLEAN DEFAULT TRUE,
        ativo BOOLEAN DEFAULT TRUE,
        usuario_id UUID NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_configuracao_renovacao_tipo_beneficio
          FOREIGN KEY (tipo_beneficio_id)
          REFERENCES tipo_beneficio(id)
          ON DELETE CASCADE
      );

      CREATE INDEX idx_configuracao_renovacao_tipo_beneficio_id
        ON configuracao_renovacao(tipo_beneficio_id);
      
      -- Adicionar campo para controlar renovações na tabela solicitacao
      ALTER TABLE solicitacao 
      ADD COLUMN IF NOT EXISTS renovacao_automatica BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE solicitacao 
      ADD COLUMN IF NOT EXISTS solicitacao_original_id UUID;
      
      ALTER TABLE solicitacao 
      ADD COLUMN IF NOT EXISTS contador_renovacoes INTEGER DEFAULT 0;
      
      ALTER TABLE solicitacao 
      ADD COLUMN IF NOT EXISTS data_proxima_renovacao TIMESTAMP WITH TIME ZONE;
      
      -- Adicionar constraint de chave estrangeira para solicitação original
      ALTER TABLE solicitacao 
      ADD CONSTRAINT fk_solicitacao_original
      FOREIGN KEY (solicitacao_original_id)
      REFERENCES solicitacao(id)
      ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraint de chave estrangeira
    await queryRunner.query(`
      ALTER TABLE solicitacao 
      DROP CONSTRAINT IF EXISTS fk_solicitacao_original;
    `);

    // Remover campos adicionados à tabela solicitacao
    await queryRunner.query(`
      ALTER TABLE solicitacao 
      DROP COLUMN IF EXISTS data_proxima_renovacao;
      
      ALTER TABLE solicitacao 
      DROP COLUMN IF EXISTS contador_renovacoes;
      
      ALTER TABLE solicitacao 
      DROP COLUMN IF EXISTS solicitacao_original_id;
      
      ALTER TABLE solicitacao 
      DROP COLUMN IF EXISTS renovacao_automatica;
    `);

    // Remover tabela de configuração de renovação
    await queryRunner.query(`
      DROP TABLE IF EXISTS configuracao_renovacao;
    `);
  }
}
