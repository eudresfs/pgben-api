import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar a tabela documento_comprobatorio
 * 
 * Esta migration cria a estrutura para armazenar documentos comprobatórios
 * anexados aos resultados de benefícios cessados conforme Lei de Benefícios
 * Eventuais do SUAS (Lei nº 8.742/1993 - LOAS).
 */
export class CreateDocumentoComprobatorioTable1758477100000
  implements MigrationInterface
{
  private readonly tableName = 'documento_comprobatorio';
  private readonly tipoDocumentoEnum = 'tipo_documento_comprobatorio_enum';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enum tipo_documento_comprobatorio_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.tipoDocumentoEnum}') THEN
          CREATE TYPE ${this.tipoDocumentoEnum} AS ENUM (
            'FOTOGRAFIA',
            'DOCUMENTO_PESSOAL',
            'COMPROVANTE_RENDA',
            'COMPROVANTE_RESIDENCIA',
            'RELATORIO_TECNICO',
            'DECLARACAO_TERCEIROS',
            'LAUDO_MEDICO',
            'COMPROVANTE_ESCOLARIDADE',
            'TERMO_COMPROMISSO',
            'OUTROS'
          );
        END IF;
      END$$;
    `);

    // 2. Criar tabela documento_comprobatorio
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        resultado_beneficio_cessado_id UUID NOT NULL,
        tipo ${this.tipoDocumentoEnum} NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        tipo_mime VARCHAR(100) NOT NULL,
        tamanho_arquivo BIGINT NOT NULL,
        descricao TEXT,
        observacoes TEXT,
        hash_arquivo VARCHAR(64),
        data_upload TIMESTAMPTZ NOT NULL DEFAULT now(),
        usuario_upload_id UUID NOT NULL,
        validado BOOLEAN NOT NULL DEFAULT FALSE,
        data_validacao TIMESTAMPTZ,
        usuario_validacao_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        
        CONSTRAINT fk_documento_resultado_beneficio_cessado 
          FOREIGN KEY (resultado_beneficio_cessado_id) 
          REFERENCES resultado_beneficio_cessado(id) ON DELETE CASCADE,
        CONSTRAINT fk_documento_usuario_upload 
          FOREIGN KEY (usuario_upload_id) REFERENCES usuario(id) ON DELETE RESTRICT,
        CONSTRAINT fk_documento_usuario_validacao 
          FOREIGN KEY (usuario_validacao_id) REFERENCES usuario(id) ON DELETE RESTRICT,
        CONSTRAINT chk_nome_arquivo_length 
          CHECK (char_length(nome_arquivo) <= 255),
        CONSTRAINT chk_caminho_arquivo_length 
          CHECK (char_length(caminho_arquivo) <= 500),
        CONSTRAINT chk_tipo_mime_length 
          CHECK (char_length(tipo_mime) <= 100),
        CONSTRAINT chk_tamanho_arquivo_positivo 
          CHECK (tamanho_arquivo > 0),
        CONSTRAINT chk_descricao_length 
          CHECK (descricao IS NULL OR char_length(descricao) <= 1000),
        CONSTRAINT chk_observacoes_length 
          CHECK (observacoes IS NULL OR char_length(observacoes) <= 1000),
        CONSTRAINT chk_hash_arquivo_length 
          CHECK (hash_arquivo IS NULL OR char_length(hash_arquivo) = 64),
        CONSTRAINT chk_validacao_consistency 
          CHECK (
            (validado = FALSE AND data_validacao IS NULL AND usuario_validacao_id IS NULL) OR
            (validado = TRUE AND data_validacao IS NOT NULL AND usuario_validacao_id IS NOT NULL)
          )
      );
    `);

    // 3. Criar índices para performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_resultado_id 
        ON ${this.tableName} (resultado_beneficio_cessado_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_tipo 
        ON ${this.tableName} (tipo);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_data_upload 
        ON ${this.tableName} (data_upload);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_usuario_upload 
        ON ${this.tableName} (usuario_upload_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_validado 
        ON ${this.tableName} (validado);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documento_hash_arquivo 
        ON ${this.tableName} (hash_arquivo) WHERE hash_arquivo IS NOT NULL;
    `);

    // 4. Comentários na tabela e colunas para documentação
    await queryRunner.query(`
      COMMENT ON TABLE ${this.tableName} IS 
        'Armazena documentos comprobatórios anexados aos resultados de benefícios cessados conforme SUAS';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.resultado_beneficio_cessado_id IS 
        'Referência ao resultado de benefício cessado';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.tipo IS 
        'Tipo do documento comprobatório conforme classificação do SUAS';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.hash_arquivo IS 
        'Hash SHA-256 do arquivo para verificação de integridade';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.validado IS 
        'Indica se o documento foi validado por um técnico responsável';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS ${this.tableName};`);

    // 2. Remover enum se não utilizado por outras tabelas
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_type t ON a.atttypid = t.oid
          WHERE t.typname = '${this.tipoDocumentoEnum}'
          AND a.attrelid != '${this.tableName}'::regclass
        ) THEN
          DROP TYPE IF EXISTS ${this.tipoDocumentoEnum};
        END IF;
      END$$;
    `);
  }
}