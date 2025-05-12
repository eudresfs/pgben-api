import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class CreateIndicesEConstraintsConsolidado1000005 implements MigrationInterface {
  name = 'CreateIndicesEConstraintsConsolidado1000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para a tabela cidadao
    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_cidadao_nome_cpf',
        columnNames: ['nome', 'cpf']
      })
    );

    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_cidadao_data_nascimento',
        columnNames: ['data_nascimento']
      })
    );

    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_cidadao_bairro_cidade',
        columnNames: ['bairro', 'cidade']
      })
    );

    // Índices para a tabela solicitacao
    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_solicitante_id',
        columnNames: ['solicitante_id']
      })
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_tipo_beneficio_id',
        columnNames: ['tipo_beneficio_id']
      })
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_unidade_id',
        columnNames: ['unidade_id']
      })
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_status',
        columnNames: ['status']
      })
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_data_abertura',
        columnNames: ['data_abertura']
      })
    );

    // Índices compostos para consultas frequentes
    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_status_unidade',
        columnNames: ['status', 'unidade_id']
      })
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_status_tipo_beneficio',
        columnNames: ['status', 'tipo_beneficio_id']
      })
    );

    await queryRunner.createIndex(
      'solicitacao',
      new TableIndex({
        name: 'IDX_solicitacao_data_abertura_status',
        columnNames: ['data_abertura', 'status']
      })
    );

    // Índice parcial para solicitações pendentes e em análise (consultas frequentes)
    await queryRunner.query(`
      CREATE INDEX IDX_solicitacao_status_pendente_analise ON solicitacao(status, data_abertura) 
      WHERE status IN ('pendente', 'em_analise');
    `);

    // Índices para a tabela documentos_enviados
    await queryRunner.createIndex(
      'documentos_enviados',
      new TableIndex({
        name: 'IDX_documentos_enviados_solicitacao_id',
        columnNames: ['solicitacao_id']
      })
    );

    await queryRunner.createIndex(
      'documentos_enviados',
      new TableIndex({
        name: 'IDX_documentos_enviados_requisito_documento_id',
        columnNames: ['requisito_documento_id']
      })
    );

    // Índices para a tabela historico_solicitacao
    await queryRunner.createIndex(
      'historico_solicitacao',
      new TableIndex({
        name: 'IDX_historico_solicitacao_solicitacao_id',
        columnNames: ['solicitacao_id']
      })
    );

    await queryRunner.createIndex(
      'historico_solicitacao',
      new TableIndex({
        name: 'IDX_historico_solicitacao_data_alteracao',
        columnNames: ['data_alteracao']
      })
    );

    // Índices para a tabela tipos_beneficio
    await queryRunner.createIndex(
      'tipos_beneficio',
      new TableIndex({
        name: 'IDX_tipos_beneficio_nome',
        columnNames: ['nome']
      })
    );

    await queryRunner.createIndex(
      'tipos_beneficio',
      new TableIndex({
        name: 'IDX_tipos_beneficio_ativo',
        columnNames: ['ativo']
      })
    );

    // Índices para a tabela demanda_motivos
    await queryRunner.createIndex(
      'demanda_motivos',
      new TableIndex({
        name: 'IDX_demanda_motivos_tipo',
        columnNames: ['tipo']
      })
    );

    // Constraints adicionais via SQL direto
    
    // Constraint para garantir que o valor do benefício não seja negativo
    await queryRunner.query(`
      ALTER TABLE tipos_beneficio 
      ADD CONSTRAINT CK_tipos_beneficio_valor_positivo 
      CHECK (valor >= 0);
    `);

    // Constraint para garantir que o período máximo seja positivo
    await queryRunner.query(`
      ALTER TABLE tipos_beneficio 
      ADD CONSTRAINT CK_tipos_beneficio_periodo_maximo_positivo 
      CHECK (periodo_maximo > 0);
    `);

    // Constraint para garantir que a data de aprovação seja posterior à data de abertura
    await queryRunner.query(`
      ALTER TABLE solicitacao 
      ADD CONSTRAINT CK_solicitacao_data_aprovacao_posterior 
      CHECK (data_aprovacao IS NULL OR data_aprovacao >= data_abertura);
    `);

    // Constraint para garantir que a data de liberação seja posterior à data de aprovação
    await queryRunner.query(`
      ALTER TABLE solicitacao 
      ADD CONSTRAINT CK_solicitacao_data_liberacao_posterior 
      CHECK (data_liberacao IS NULL OR (data_aprovacao IS NOT NULL AND data_liberacao >= data_aprovacao));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraints
    await queryRunner.query(`ALTER TABLE solicitacao DROP CONSTRAINT IF EXISTS CK_solicitacao_data_liberacao_posterior;`);
    await queryRunner.query(`ALTER TABLE solicitacao DROP CONSTRAINT IF EXISTS CK_solicitacao_data_aprovacao_posterior;`);
    await queryRunner.query(`ALTER TABLE tipos_beneficio DROP CONSTRAINT IF EXISTS CK_tipos_beneficio_periodo_maximo_positivo;`);
    await queryRunner.query(`ALTER TABLE tipos_beneficio DROP CONSTRAINT IF EXISTS CK_tipos_beneficio_valor_positivo;`);

    // Remover índices da tabela demanda_motivos
    await queryRunner.dropIndex('demanda_motivos', 'IDX_demanda_motivos_tipo');

    // Remover índices da tabela tipos_beneficio
    await queryRunner.dropIndex('tipos_beneficio', 'IDX_tipos_beneficio_ativo');
    await queryRunner.dropIndex('tipos_beneficio', 'IDX_tipos_beneficio_nome');

    // Remover índices da tabela historico_solicitacao
    await queryRunner.dropIndex('historico_solicitacao', 'IDX_historico_solicitacao_data_alteracao');
    await queryRunner.dropIndex('historico_solicitacao', 'IDX_historico_solicitacao_solicitacao_id');

    // Remover índices da tabela documentos_enviados
    await queryRunner.dropIndex('documentos_enviados', 'IDX_documentos_enviados_requisito_documento_id');
    await queryRunner.dropIndex('documentos_enviados', 'IDX_documentos_enviados_solicitacao_id');

    // Remover índice parcial
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_solicitacao_status_pendente_analise;`);

    // Remover índices compostos da tabela solicitacao
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_data_abertura_status');
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_status_tipo_beneficio');
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_status_unidade');

    // Remover índices simples da tabela solicitacao
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_data_abertura');
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_status');
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_unidade_id');
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_tipo_beneficio_id');
    await queryRunner.dropIndex('solicitacao', 'IDX_solicitacao_solicitante_id');

    // Remover índices da tabela cidadao
    await queryRunner.dropIndex('cidadao', 'IDX_cidadao_bairro_cidade');
    await queryRunner.dropIndex('cidadao', 'IDX_cidadao_data_nascimento');
    await queryRunner.dropIndex('cidadao', 'IDX_cidadao_nome_cpf');
  }
}