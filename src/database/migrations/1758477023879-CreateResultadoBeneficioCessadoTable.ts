import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

/**
 * Migration para criar a tabela resultado_beneficio_cessado
 * 
 * Esta migration cria a estrutura completa para registrar resultados
 * de benefícios cessados conforme Lei de Benefícios Eventuais do SUAS
 * (Lei nº 8.742/1993 - LOAS) e regulamentações do CNAS.
 */
export class CreateResultadoBeneficioCessadoTable1758477023879
  implements MigrationInterface
{
  private readonly tableName = 'resultado_beneficio_cessado';
  private readonly statusVulnerabilidadeEnum = 'status_vulnerabilidade_enum';
  private readonly tipoMotivoEncerramentoEnum = 'tipo_motivo_encerramento_enum';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enum status_vulnerabilidade_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.statusVulnerabilidadeEnum}') THEN
          CREATE TYPE ${this.statusVulnerabilidadeEnum} AS ENUM (
            'superada',
            'em_superacao',
            'reduzida',
            'mantida',
            'agravada',
            'temporariamente_resolvida',
            'necessita_reavaliacao'
          );
        END IF;
      END$$;
    `);

    // 2. Criar enum tipo_motivo_encerramento_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${this.tipoMotivoEncerramentoEnum}') THEN
          CREATE TYPE ${this.tipoMotivoEncerramentoEnum} AS ENUM (
            'superacao_vulnerabilidade',
            'melhoria_socioeconomica',
            'insercao_trabalho',
            'acesso_outros_programas',
            'mudanca_municipio',
            'nao_comparecimento',
            'descumprimento_condicionalidades',
            'informacoes_incorretas',
            'fim_periodo_vulnerabilidade',
            'obito_beneficiario',
            'solicitacao_familia',
            'revisao_tecnica',
            'agravamento_situacao',
            'outros'
          );
        END IF;
      END$$;
    `);

    // 3. Criar tabela resultado_beneficio_cessado
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        concessao_id UUID NOT NULL UNIQUE,
        tecnico_responsavel_id UUID NOT NULL,
        data_registro TIMESTAMP NOT NULL,
        tipo_motivo_encerramento ${this.tipoMotivoEncerramentoEnum} NOT NULL,
        motivo_detalhado TEXT NOT NULL,
        status_vulnerabilidade ${this.statusVulnerabilidadeEnum} NOT NULL,
        descricao_vulnerabilidade TEXT NOT NULL,
        vulnerabilidade_superada BOOLEAN NOT NULL,
        observacoes_tecnicas TEXT,
        recomendacoes_acompanhamento TEXT,
        encaminhado_outros_servicos BOOLEAN NOT NULL DEFAULT FALSE,
        servicos_encaminhamento TEXT,
        avaliacao_efetividade TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        
        CONSTRAINT fk_resultado_concessao 
          FOREIGN KEY (concessao_id) REFERENCES concessao(id) ON DELETE CASCADE,
        CONSTRAINT fk_resultado_tecnico_responsavel 
          FOREIGN KEY (tecnico_responsavel_id) REFERENCES usuario(id) ON DELETE RESTRICT,
        CONSTRAINT chk_motivo_detalhado_length 
          CHECK (char_length(motivo_detalhado) <= 2000),
        CONSTRAINT chk_descricao_vulnerabilidade_length 
          CHECK (char_length(descricao_vulnerabilidade) <= 1500),
        CONSTRAINT chk_observacoes_tecnicas_length 
          CHECK (observacoes_tecnicas IS NULL OR char_length(observacoes_tecnicas) <= 1000),
        CONSTRAINT chk_recomendacoes_acompanhamento_length 
          CHECK (recomendacoes_acompanhamento IS NULL OR char_length(recomendacoes_acompanhamento) <= 1000),
        CONSTRAINT chk_servicos_encaminhamento_length 
          CHECK (servicos_encaminhamento IS NULL OR char_length(servicos_encaminhamento) <= 800),
        CONSTRAINT chk_avaliacao_efetividade_length 
          CHECK (avaliacao_efetividade IS NULL OR char_length(avaliacao_efetividade) <= 1200),
        CONSTRAINT chk_servicos_encaminhamento_required 
          CHECK (
            (encaminhado_outros_servicos = FALSE AND servicos_encaminhamento IS NULL) OR
            (encaminhado_outros_servicos = TRUE AND servicos_encaminhamento IS NOT NULL)
          )
      );
    `);

    // 4. Criar índices para performance
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_resultado_concessao_id 
        ON ${this.tableName} (concessao_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resultado_data_registro 
        ON ${this.tableName} (data_registro);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resultado_tecnico_responsavel 
        ON ${this.tableName} (tecnico_responsavel_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resultado_status_vulnerabilidade 
        ON ${this.tableName} (status_vulnerabilidade);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resultado_tipo_motivo_encerramento 
        ON ${this.tableName} (tipo_motivo_encerramento);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resultado_vulnerabilidade_superada 
        ON ${this.tableName} (vulnerabilidade_superada);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resultado_encaminhado_outros_servicos 
        ON ${this.tableName} (encaminhado_outros_servicos);
    `);

    // 5. Comentários na tabela e colunas para documentação
    await queryRunner.query(`
      COMMENT ON TABLE ${this.tableName} IS 
        'Registra resultados de benefícios cessados conforme Lei de Benefícios Eventuais do SUAS (Lei nº 8.742/1993)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.concessao_id IS 
        'Referência única à concessão que foi cessada';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.tecnico_responsavel_id IS 
        'Técnico responsável pelo registro do resultado';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.data_registro IS 
        'Data de registro do resultado do benefício cessado';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.tipo_motivo_encerramento IS 
        'Tipo do motivo de encerramento conforme regulamentações do CNAS';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.status_vulnerabilidade IS 
        'Status da vulnerabilidade social conforme tipificação do SUAS';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.vulnerabilidade_superada IS 
        'Indica se a vulnerabilidade foi superada pela família';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${this.tableName}.encaminhado_outros_servicos IS 
        'Indica se a família foi encaminhada para outros serviços socioassistenciais';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS ${this.tableName};`);

    // 2. Remover enums se não utilizados por outras tabelas
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_type t ON a.atttypid = t.oid
          WHERE t.typname = '${this.statusVulnerabilidadeEnum}'
          AND a.attrelid != '${this.tableName}'::regclass
        ) THEN
          DROP TYPE IF EXISTS ${this.statusVulnerabilidadeEnum};
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_type t ON a.atttypid = t.oid
          WHERE t.typname = '${this.tipoMotivoEncerramentoEnum}'
          AND a.attrelid != '${this.tableName}'::regclass
        ) THEN
          DROP TYPE IF EXISTS ${this.tipoMotivoEncerramentoEnum};
        END IF;
      END$$;
    `);
  }
}