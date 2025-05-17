import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateSolicitacaoSchema
 *
 * Descrição: Cria a estrutura do módulo de solicitação, incluindo tabelas para
 * solicitações de benefícios, histórico de status, avaliações e documentos anexados.
 *
 * Domínio: Solicitação
 * Dependências: 1030000-CreateBeneficioSchema.ts
 *
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateSolicitacaoSchema1040000 implements MigrationInterface {
  name = 'CreateSolicitacaoSchema20250516000400';

  /**
   * Cria as estruturas do módulo de solicitação
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "status_solicitacao_enum" AS ENUM (
        'rascunho',
        'submetida',
        'em_analise',
        'em_complementacao',
        'deferida',
        'indeferida',
        'cancelada',
        'em_pagamento',
        'concluida'
      );
      
      CREATE TYPE "tipo_avaliacao_enum" AS ENUM (
        'tecnica',
        'social',
        'administrativa',
        'financeira'
      );
      
      CREATE TYPE "resultado_avaliacao_enum" AS ENUM (
        'aprovada',
        'reprovada',
        'pendente',
        'necessita_complementacao'
      );
      
      CREATE TYPE "tipo_beneficio_enum" AS ENUM (
        'auxilio_natalidade',
        'aluguel_social',
        'outro'
      );
      
      CREATE TYPE "origem_solicitacao_enum" AS ENUM (
        'presencial',
        'whatsapp',
        'online',
        'outro'
      );
      
      CREATE TYPE "tipo_solicitacao_enum" AS ENUM (
        'novo',
        'renovacao',
        'prorrogacao'
      );
    `);

    // 2. Criar tabela de solicitações
    await queryRunner.createTable(
      new Table({
        name: 'solicitacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'numero',
            type: 'varchar',
            length: '20',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'status_solicitacao_enum',
            default: "'rascunho'",
          },
          {
            name: 'dados_solicitacao',
            type: 'jsonb',
            isNullable: true,
            comment:
              'Dados específicos da solicitação conforme schema do benefício',
          },
          {
            name: 'justificativa',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'setor_atual_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'responsavel_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'data_deferimento',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'data_indeferimento',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'data_cancelamento',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'data_conclusao',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 3. Criar tabela de histórico de status
    await queryRunner.createTable(
      new Table({
        name: 'historico_status_solicitacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status_anterior',
            type: 'status_solicitacao_enum',
            isNullable: true,
          },
          {
            name: 'status_novo',
            type: 'status_solicitacao_enum',
            isNullable: false,
          },
          {
            name: 'observacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 4. Criar tabela de avaliações
    await queryRunner.createTable(
      new Table({
        name: 'avaliacao_solicitacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo',
            type: 'tipo_avaliacao_enum',
            isNullable: false,
          },
          {
            name: 'resultado',
            type: 'resultado_avaliacao_enum',
            isNullable: false,
          },
          {
            name: 'parecer',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'avaliador_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'data_avaliacao',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 5. Criar tabela de documentos da solicitação
    await queryRunner.createTable(
      new Table({
        name: 'documento_solicitacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'requisito_documento_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'caminho_arquivo',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'tipo_arquivo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'tamanho',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'validado',
            type: 'boolean',
            default: false,
          },
          {
            name: 'usuario_upload_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 5. Criar tabela de dados de benefícios (compatibilidade com estrutura original)
    await queryRunner.createTable(
      new Table({
        name: 'dados_beneficios',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_beneficio',
            type: 'tipo_beneficio_enum',
            isNullable: false,
          },
          {
            name: 'valor_solicitado',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'periodo_meses',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'data_prevista_parto',
            type: 'date',
            isNullable: true,
            comment: 'Campo específico para Auxílio Natalidade',
          },
          {
            name: 'data_nascimento',
            type: 'date',
            isNullable: true,
            comment: 'Campo específico para Auxílio Natalidade',
          },
          {
            name: 'pre_natal',
            type: 'boolean',
            isNullable: true,
            comment: 'Campo específico para Auxílio Natalidade',
          },
          {
            name: 'psf_ubs',
            type: 'boolean',
            isNullable: true,
            comment: 'Campo específico para Auxílio Natalidade',
          },
          {
            name: 'gravidez_risco',
            type: 'boolean',
            isNullable: true,
            comment: 'Campo específico para Auxílio Natalidade',
          },
          {
            name: 'gravidez_gemelar',
            type: 'boolean',
            isNullable: true,
            comment: 'Campo específico para Auxílio Natalidade',
          },
          {
            name: 'motivo',
            type: 'text',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'valor_aluguel',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'endereco_aluguel',
            type: 'text',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'bairro_aluguel',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'cep_aluguel',
            type: 'varchar',
            length: '8',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'nome_proprietario',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'cpf_proprietario',
            type: 'varchar',
            length: '11',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'telefone_proprietario',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'banco_proprietario',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'agencia_proprietario',
            type: 'varchar',
            length: '10',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'conta_proprietario',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: 'Campo específico para Aluguel Social',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 6. Criar tabela de parcelas de pagamento
    await queryRunner.createTable(
      new Table({
        name: 'parcela_pagamento',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'numero_parcela',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'valor',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'data_prevista',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'data_pagamento',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'pendente'",
          },
          {
            name: 'comprovante_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'observacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 7. Criar índices
    // Índices para a tabela dados_beneficios
    await queryRunner.createIndex(
      'dados_beneficios',
      new TableIndex({
        name: 'IDX_DADOS_BENEFICIOS_SOLICITACAO',
        columnNames: ['solicitacao_id'],
      }),
    );

    await queryRunner.createIndex(
      'dados_beneficios',
      new TableIndex({
        name: 'IDX_DADOS_BENEFICIOS_TIPO',
        columnNames: ['tipo_beneficio'],
      }),
    );

    // Índices para a tabela solicitacao
    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_SOLICITACAO_NUMERO',
        columnNames: ['numero'],
      }),
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_SOLICITACAO_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_SOLICITACAO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
      }),
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_SOLICITACAO_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_SOLICITACAO_SETOR_ATUAL',
        columnNames: ['setor_atual_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_status_solicitacao',
      new TableIndex({
        name: 'IDX_HISTORICO_STATUS_SOLICITACAO',
        columnNames: ['solicitacao_id'],
      }),
    );

    await queryRunner.createIndex(
      'avaliacao_solicitacao',
      new TableIndex({
        name: 'IDX_AVALIACAO_SOLICITACAO',
        columnNames: ['solicitacao_id'],
      }),
    );

    await queryRunner.createIndex(
      'avaliacao_solicitacao',
      new TableIndex({
        name: 'IDX_AVALIACAO_TIPO',
        columnNames: ['tipo'],
      }),
    );

    await queryRunner.createIndex(
      'documento_solicitacao',
      new TableIndex({
        name: 'IDX_DOCUMENTO_SOLICITACAO',
        columnNames: ['solicitacao_id'],
      }),
    );

    await queryRunner.createIndex(
      'parcela_pagamento',
      new TableIndex({
        name: 'IDX_PARCELA_SOLICITACAO',
        columnNames: ['solicitacao_id'],
      }),
    );

    // 8. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'solicitacao',
      new TableForeignKey({
        name: 'FK_SOLICITACAO_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacao',
      new TableForeignKey({
        name: 'FK_SOLICITACAO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacao',
      new TableForeignKey({
        name: 'FK_SOLICITACAO_SETOR_ATUAL',
        columnNames: ['setor_atual_id'],
        referencedTableName: 'setor',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'solicitacao',
      new TableForeignKey({
        name: 'FK_SOLICITACAO_RESPONSAVEL',
        columnNames: ['responsavel_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_status_solicitacao',
      new TableForeignKey({
        name: 'FK_HISTORICO_STATUS_SOLICITACAO',
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_status_solicitacao',
      new TableForeignKey({
        name: 'FK_HISTORICO_STATUS_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'avaliacao_solicitacao',
      new TableForeignKey({
        name: 'FK_AVALIACAO_SOLICITACAO',
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Chave estrangeira para dados_beneficios
    await queryRunner.createForeignKey(
      'dados_beneficios',
      new TableForeignKey({
        name: 'FK_DADOS_BENEFICIOS_SOLICITACAO',
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'avaliacao_solicitacao',
      new TableForeignKey({
        name: 'FK_AVALIACAO_AVALIADOR',
        columnNames: ['avaliador_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_solicitacao',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_SOLICITACAO',
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_solicitacao',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_REQUISITO',
        columnNames: ['requisito_documento_id'],
        referencedTableName: 'requisito_documento',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_solicitacao',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_USUARIO_UPLOAD',
        columnNames: ['usuario_upload_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'parcela_pagamento',
      new TableForeignKey({
        name: 'FK_PARCELA_SOLICITACAO',
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'parcela_pagamento',
      new TableForeignKey({
        name: 'FK_PARCELA_COMPROVANTE',
        columnNames: ['comprovante_id'],
        referencedTableName: 'documento_solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 9. Criar triggers para atualização automática de timestamps
    await queryRunner.query(`
      -- Trigger para solicitacao
      CREATE TRIGGER update_solicitacao_timestamp
      BEFORE UPDATE ON solicitacao
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para avaliacao_solicitacao
      CREATE TRIGGER update_avaliacao_solicitacao_timestamp
      BEFORE UPDATE ON avaliacao_solicitacao
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para documento_solicitacao
      CREATE TRIGGER update_documento_solicitacao_timestamp
      BEFORE UPDATE ON documento_solicitacao
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para parcela_pagamento
      CREATE TRIGGER update_parcela_pagamento_timestamp
      BEFORE UPDATE ON parcela_pagamento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 10. Criar políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS para tabelas do módulo de solicitação
      ALTER TABLE solicitacao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE historico_status_solicitacao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE avaliacao_solicitacao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE documento_solicitacao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE parcela_pagamento ENABLE ROW LEVEL SECURITY;

      -- Política para solicitacao
      CREATE POLICY solicitacao_policy ON solicitacao
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para historico_status_solicitacao
      CREATE POLICY historico_status_solicitacao_policy ON historico_status_solicitacao
      USING (true)
      WITH CHECK (true);

      -- Política para avaliacao_solicitacao
      CREATE POLICY avaliacao_solicitacao_policy ON avaliacao_solicitacao
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para documento_solicitacao
      CREATE POLICY documento_solicitacao_policy ON documento_solicitacao
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para parcela_pagamento
      CREATE POLICY parcela_pagamento_policy ON parcela_pagamento
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para dados_beneficios
      CREATE POLICY dados_beneficios_policy ON dados_beneficios
      USING (removed_at IS NULL)
      WITH CHECK (true);
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS parcela_pagamento_policy ON parcela_pagamento;
      DROP POLICY IF EXISTS documento_solicitacao_policy ON documento_solicitacao;
      DROP POLICY IF EXISTS avaliacao_solicitacao_policy ON avaliacao_solicitacao;
      DROP POLICY IF EXISTS historico_status_solicitacao_policy ON historico_status_solicitacao;
      DROP POLICY IF EXISTS solicitacao_policy ON solicitacao;
      DROP POLICY IF EXISTS dados_beneficios_policy ON dados_beneficios;

      ALTER TABLE parcela_pagamento DISABLE ROW LEVEL SECURITY;
      ALTER TABLE documento_solicitacao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE avaliacao_solicitacao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE historico_status_solicitacao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE solicitacao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE dados_beneficios DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_parcela_pagamento_timestamp ON parcela_pagamento;
      DROP TRIGGER IF EXISTS update_documento_solicitacao_timestamp ON documento_solicitacao;
      DROP TRIGGER IF EXISTS update_avaliacao_solicitacao_timestamp ON avaliacao_solicitacao;
      DROP TRIGGER IF EXISTS update_solicitacao_timestamp ON solicitacao;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'parcela_pagamento',
      'FK_PARCELA_COMPROVANTE',
    );
    await queryRunner.dropForeignKey(
      'parcela_pagamento',
      'FK_PARCELA_SOLICITACAO',
    );
    await queryRunner.dropForeignKey(
      'documento_solicitacao',
      'FK_DOCUMENTO_USUARIO_UPLOAD',
    );
    await queryRunner.dropForeignKey(
      'documento_solicitacao',
      'FK_DOCUMENTO_REQUISITO',
    );
    await queryRunner.dropForeignKey(
      'documento_solicitacao',
      'FK_DOCUMENTO_SOLICITACAO',
    );
    await queryRunner.dropForeignKey(
      'avaliacao_solicitacao',
      'FK_AVALIACAO_AVALIADOR',
    );
    await queryRunner.dropForeignKey(
      'avaliacao_solicitacao',
      'FK_AVALIACAO_SOLICITACAO',
    );
    await queryRunner.dropForeignKey(
      'historico_status_solicitacao',
      'FK_HISTORICO_STATUS_USUARIO',
    );
    await queryRunner.dropForeignKey(
      'historico_status_solicitacao',
      'FK_HISTORICO_STATUS_SOLICITACAO',
    );
    await queryRunner.dropForeignKey(
      'solicitacao',
      'FK_SOLICITACAO_RESPONSAVEL',
    );
    await queryRunner.dropForeignKey(
      'solicitacao',
      'FK_SOLICITACAO_SETOR_ATUAL',
    );
    await queryRunner.dropForeignKey(
      'solicitacao',
      'FK_SOLICITACAO_TIPO_BENEFICIO',
    );
    await queryRunner.dropForeignKey('solicitacao', 'FK_SOLICITACAO_CIDADAO');
    await queryRunner.dropForeignKey(
      'dados_beneficios',
      'FK_DADOS_BENEFICIOS_SOLICITACAO',
    );

    // 4. Remover índices
    await queryRunner.dropIndex('parcela_pagamento', 'IDX_PARCELA_SOLICITACAO');
    await queryRunner.dropIndex(
      'documento_solicitacao',
      'IDX_DOCUMENTO_SOLICITACAO',
    );
    await queryRunner.dropIndex('avaliacao_solicitacao', 'IDX_AVALIACAO_TIPO');
    await queryRunner.dropIndex(
      'avaliacao_solicitacao',
      'IDX_AVALIACAO_SOLICITACAO',
    );
    await queryRunner.dropIndex(
      'historico_status_solicitacao',
      'IDX_HISTORICO_STATUS_SOLICITACAO',
    );
    await queryRunner.dropIndex('solicitacao', 'IDX_SOLICITACAO_SETOR_ATUAL');
    await queryRunner.dropIndex('solicitacao', 'IDX_SOLICITACAO_STATUS');
    await queryRunner.dropIndex(
      'solicitacao',
      'IDX_SOLICITACAO_TIPO_BENEFICIO',
    );
    await queryRunner.dropIndex('solicitacao', 'IDX_SOLICITACAO_CIDADAO');
    await queryRunner.dropIndex('solicitacao', 'IDX_SOLICITACAO_NUMERO');
    await queryRunner.dropIndex(
      'dados_beneficios',
      'IDX_DADOS_BENEFICIOS_SOLICITACAO',
    );
    await queryRunner.dropIndex(
      'dados_beneficios',
      'IDX_DADOS_BENEFICIOS_TIPO',
    );

    // 5. Remover tabelas
    await queryRunner.dropTable('parcela_pagamento');
    await queryRunner.dropTable('documento_solicitacao');
    await queryRunner.dropTable('avaliacao_solicitacao');
    await queryRunner.dropTable('historico_status_solicitacao');
    await queryRunner.dropTable('solicitacao');
    await queryRunner.dropTable('dados_beneficios');

    // 6. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "resultado_avaliacao_enum";
      DROP TYPE IF EXISTS "tipo_avaliacao_enum";
      DROP TYPE IF EXISTS "status_solicitacao_enum";
      DROP TYPE IF EXISTS "tipo_beneficio_enum";
      DROP TYPE IF EXISTS "origem_solicitacao_enum";
      DROP TYPE IF EXISTS "tipo_solicitacao_enum";
    `);
  }
}
