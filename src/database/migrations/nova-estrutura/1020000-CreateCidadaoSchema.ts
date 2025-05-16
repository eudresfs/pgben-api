import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateCidadaoSchema
 * 
 * Descrição: Cria a estrutura do módulo de cidadão, incluindo tabelas para
 * dados pessoais, composição familiar, situação socioeconômica e papéis.
 * 
 * Domínio: Cidadão
 * Dependências: 1010000-CreateAuthSchema.ts
 * 
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateCidadaoSchema1020000 implements MigrationInterface {
  name = 'CreateCidadaoSchema20250516000200';

  /**
   * Cria as estruturas do módulo de cidadão
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "sexo_enum" AS ENUM ('masculino', 'feminino', 'outro', 'nao_informado');
      
      CREATE TYPE "parentesco_enum" AS ENUM (
        'pai',
        'mae',
        'filho',
        'filha',
        'irmao',
        'irma',
        'avo',
        'avoh',
        'tio',
        'tia',
        'sobrinho',
        'sobrinha',
        'conjuge',
        'companheiro',
        'outro'
      );
      
      CREATE TYPE "escolaridade_enum" AS ENUM (
        'infantil',
        'fundamental_incompleto',
        'fundamental_completo',
        'medio_incompleto',
        'medio_completo',
        'superior_incompleto',
        'superior_completo',
        'pos_graduacao',
        'mestrado',
        'doutorado',
        'nao_informado'
      );
      
      CREATE TYPE "tipo_moradia_enum" AS ENUM (
        'propria',
        'alugada',
        'cedida',
        'ocupacao',
        'situacao_rua',
        'abrigo',
        'outro'
      );
      
      CREATE TYPE "tipo_papel_enum" AS ENUM (
        'responsavel_familiar',
        'dependente',
        'representante_legal'
      );
      
      CREATE TYPE "tipo_beneficio_social_enum" AS ENUM (
        'pbf',
        'bpc',
        'outro'
      );
      
      CREATE TYPE "tipo_bpc_enum" AS ENUM (
        'idoso',
        'deficiente'
      );
      
      CREATE TYPE "pix_tipo_enum" AS ENUM (
        'cpf',
        'email',
        'telefone',
        'chave_aleatoria'
      );
    `);

    // 2. Criar tabela de cidadãos
    await queryRunner.createTable(
      new Table({
        name: 'cidadao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'nome_social',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'cpf',
            type: 'varchar',
            length: '11',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'rg',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'nis',
            type: 'varchar',
            length: '11',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'data_nascimento',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'sexo',
            type: 'sexo_enum',
            isNullable: false,
          },
          {
            name: 'nome_mae',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'naturalidade',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'endereco',
            type: 'jsonb',
            isNullable: false,
            comment: 'Formato: {logradouro, numero, complemento, bairro, cidade, uf, cep}',
          },
          {
            name: 'telefone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'escolaridade',
            type: 'escolaridade_enum',
            isNullable: true,
            default: "'nao_informado'",
          },
          {
            name: 'profissao',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'renda',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'dados_complementares',
            type: 'jsonb',
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

    // 3. Criar tabela de grupo familiar
    await queryRunner.createTable(
      new Table({
        name: 'grupo_familiar',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_moradia',
            type: 'tipo_moradia_enum',
            isNullable: true,
          },
          {
            name: 'tempo_moradia',
            type: 'integer',
            isNullable: true,
            comment: 'Tempo em meses',
          },
          {
            name: 'dados_socioeconomicos',
            type: 'jsonb',
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

    // 4. Criar tabela de papel cidadão
    await queryRunner.createTable(
      new Table({
        name: 'papel_cidadao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_papel',
            type: 'tipo_papel_enum',
            isNullable: false,
          },
          {
            name: 'grupo_familiar_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'parentesco',
            type: 'parentesco_enum',
            isNullable: true,
          },
          {
            name: 'dados_papel',
            type: 'jsonb',
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

    // 5. Criar índices
    // Índices para cidadão
    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_CIDADAO_CPF',
        columnNames: ['cpf'],
        where: "removed_at IS NULL",
      }),
    );

    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_CIDADAO_NIS',
        columnNames: ['nis'],
        where: "removed_at IS NULL",
      }),
    );

    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_CIDADAO_UNIDADE',
        columnNames: ['unidade_id'],
      }),
    );

    // Índice para busca por nome (usando índice GIN para busca textual)
    await queryRunner.query(`
      CREATE INDEX IDX_CIDADAO_NOME_GIN ON cidadao 
      USING gin(to_tsvector('portuguese', nome));
    `);

    // Índice para busca em campos JSON
    await queryRunner.query(`
      CREATE INDEX IDX_CIDADAO_ENDERECO_BAIRRO ON cidadao 
      USING gin((endereco->'bairro') jsonb_path_ops);
    `);

    // Índices para grupo familiar
    await queryRunner.createIndex(
      'grupo_familiar',
      new TableIndex({
        name: 'IDX_GRUPO_FAMILIAR_RESPONSAVEL',
        columnNames: ['responsavel_id'],
      }),
    );

    // Índices para papel cidadão
    await queryRunner.createIndex(
      'papel_cidadao',
      new TableIndex({
        name: 'IDX_PAPEL_CIDADAO_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'papel_cidadao',
      new TableIndex({
        name: 'IDX_PAPEL_CIDADAO_GRUPO',
        columnNames: ['grupo_familiar_id'],
      }),
    );

    await queryRunner.createIndex(
      'papel_cidadao',
      new TableIndex({
        name: 'IDX_PAPEL_CIDADAO_TIPO',
        columnNames: ['tipo_papel'],
      }),
    );

    // 6. Criar chaves estrangeiras
    // FK para cidadão
    await queryRunner.createForeignKey(
      'cidadao',
      new TableForeignKey({
        name: 'FK_CIDADAO_UNIDADE',
        columnNames: ['unidade_id'],
        referencedTableName: 'unidade',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // FK para grupo familiar
    await queryRunner.createForeignKey(
      'grupo_familiar',
      new TableForeignKey({
        name: 'FK_GRUPO_FAMILIAR_RESPONSAVEL',
        columnNames: ['responsavel_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK para papel cidadão
    await queryRunner.createForeignKey(
      'papel_cidadao',
      new TableForeignKey({
        name: 'FK_PAPEL_CIDADAO_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'papel_cidadao',
      new TableForeignKey({
        name: 'FK_PAPEL_CIDADAO_GRUPO',
        columnNames: ['grupo_familiar_id'],
        referencedTableName: 'grupo_familiar',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 7. Criar triggers para atualização automática de updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_cidadao_timestamp
      BEFORE UPDATE ON cidadao
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

      CREATE TRIGGER update_grupo_familiar_timestamp
      BEFORE UPDATE ON grupo_familiar
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

      CREATE TRIGGER update_papel_cidadao_timestamp
      BEFORE UPDATE ON papel_cidadao
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `);

    // 8. Adicionar constraints de validação
    await queryRunner.query(`
      -- Constraint para validar CPF
      ALTER TABLE cidadao ADD CONSTRAINT check_cpf_valido 
        CHECK (validar_cpf(cpf) OR cpf IS NULL);

      -- Constraint para validar NIS
      ALTER TABLE cidadao ADD CONSTRAINT check_nis_valido 
        CHECK (validar_nis(nis) OR nis IS NULL);
    `);

    // 9. Criar tabela de situação de moradia
    await queryRunner.createTable(
      new Table({
        name: 'situacao_moradia',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_moradia',
            type: 'tipo_moradia_enum',
            isNullable: false,
          },
          {
            name: 'tempo_moradia',
            type: 'integer',
            isNullable: true,
            comment: 'Tempo de moradia em meses',
          },
          {
            name: 'valor_aluguel',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'possui_iptu',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'observacoes',
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

    // 10. Criar tabela de composição familiar
    await queryRunner.createTable(
      new Table({
        name: 'composicao_familiar',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'data_nascimento',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'parentesco',
            type: 'parentesco_enum',
            isNullable: false,
          },
          {
            name: 'escolaridade',
            type: 'escolaridade_enum',
            isNullable: true,
          },
          {
            name: 'renda',
            type: 'decimal',
            precision: 10,
            scale: 2,
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

    // 11. Criar tabela de benefícios sociais
    await queryRunner.createTable(
      new Table({
        name: 'beneficio_social',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo',
            type: 'tipo_beneficio_social_enum',
            isNullable: false,
          },
          {
            name: 'tipo_bpc',
            type: 'tipo_bpc_enum',
            isNullable: true,
          },
          {
            name: 'valor',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'data_inicio',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'data_fim',
            type: 'date',
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

    // 12. Criar tabela de informações bancárias
    await queryRunner.createTable(
      new Table({
        name: 'info_bancaria',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'banco',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'agencia',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'conta',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'tipo_conta',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'pix_tipo',
            type: 'pix_tipo_enum',
            isNullable: true,
          },
          {
            name: 'pix_chave',
            type: 'varchar',
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

    // 13. Criar índices para as novas tabelas
    await queryRunner.createIndex(
      'situacao_moradia',
      new TableIndex({
        name: 'IDX_SITUACAO_MORADIA_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'composicao_familiar',
      new TableIndex({
        name: 'IDX_COMPOSICAO_FAMILIAR_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'beneficio_social',
      new TableIndex({
        name: 'IDX_BENEFICIO_SOCIAL_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'info_bancaria',
      new TableIndex({
        name: 'IDX_INFO_BANCARIA_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    // 14. Criar chaves estrangeiras para as novas tabelas
    await queryRunner.createForeignKey(
      'situacao_moradia',
      new TableForeignKey({
        name: 'FK_SITUACAO_MORADIA_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'composicao_familiar',
      new TableForeignKey({
        name: 'FK_COMPOSICAO_FAMILIAR_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'beneficio_social',
      new TableForeignKey({
        name: 'FK_BENEFICIO_SOCIAL_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'info_bancaria',
      new TableForeignKey({
        name: 'FK_INFO_BANCARIA_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 15. Criar triggers para atualização automática de timestamps para as novas tabelas
    await queryRunner.query(`
      -- Trigger para situacao_moradia
      CREATE TRIGGER update_situacao_moradia_timestamp
      BEFORE UPDATE ON situacao_moradia
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para composicao_familiar
      CREATE TRIGGER update_composicao_familiar_timestamp
      BEFORE UPDATE ON composicao_familiar
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para beneficio_social
      CREATE TRIGGER update_beneficio_social_timestamp
      BEFORE UPDATE ON beneficio_social
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para info_bancaria
      CREATE TRIGGER update_info_bancaria_timestamp
      BEFORE UPDATE ON info_bancaria
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 16. Configurar políticas RLS
    await queryRunner.query(`
      -- Habilitar RLS para todas as tabelas do módulo cidadão
      ALTER TABLE cidadao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE grupo_familiar ENABLE ROW LEVEL SECURITY;
      ALTER TABLE papel_cidadao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE situacao_moradia ENABLE ROW LEVEL SECURITY;
      ALTER TABLE composicao_familiar ENABLE ROW LEVEL SECURITY;
      ALTER TABLE beneficio_social ENABLE ROW LEVEL SECURITY;
      ALTER TABLE info_bancaria ENABLE ROW LEVEL SECURITY;
      
      -- Políticas para cidadão
      CREATE POLICY admin_cidadao_policy ON cidadao
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');
        
      CREATE POLICY gestor_cidadao_policy ON cidadao
        USING (current_setting('app.current_user_role')::text = 'gestor_semtas' AND
               unidade_id IN (
                 SELECT unidade_id FROM usuario_unidade 
                 WHERE usuario_id = current_setting('app.current_user_id')::uuid
               )
        )
        WITH CHECK (current_setting('app.current_user_role')::text = 'gestor_semtas' AND
                    unidade_id IN (
                      SELECT unidade_id FROM usuario_unidade 
                      WHERE usuario_id = current_setting('app.current_user_id')::uuid
                    )
        );
        
      CREATE POLICY tecnico_cidadao_policy ON cidadao
        USING (
          (current_setting('app.current_user_role')::text = 'tecnico_semtas' OR
           current_setting('app.current_user_role')::text = 'tecnico_unidade') AND
          unidade_id IN (
            SELECT unidade_id FROM usuario_unidade 
            WHERE usuario_id = current_setting('app.current_user_id')::uuid
          )
        )
        WITH CHECK (
          (current_setting('app.current_user_role')::text = 'tecnico_semtas' OR
           current_setting('app.current_user_role')::text = 'tecnico_unidade') AND
          unidade_id IN (
            SELECT unidade_id FROM usuario_unidade 
            WHERE usuario_id = current_setting('app.current_user_id')::uuid
          )
        );

      -- Políticas para grupo familiar (baseadas no responsável)
      CREATE POLICY admin_grupo_familiar_policy ON grupo_familiar
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      CREATE POLICY tecnico_grupo_familiar_policy ON grupo_familiar
        USING (
          responsavel_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          responsavel_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );

      -- Políticas para papel cidadão (baseadas no cidadão)
      CREATE POLICY admin_papel_cidadao_policy ON papel_cidadao
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      CREATE POLICY tecnico_papel_cidadao_policy ON papel_cidadao
        USING (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );

      -- Políticas para situação de moradia
      CREATE POLICY admin_situacao_moradia_policy ON situacao_moradia
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      CREATE POLICY tecnico_situacao_moradia_policy ON situacao_moradia
        USING (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );

      -- Políticas para composição familiar
      CREATE POLICY admin_composicao_familiar_policy ON composicao_familiar
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      CREATE POLICY tecnico_composicao_familiar_policy ON composicao_familiar
        USING (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );

      -- Políticas para benefício social
      CREATE POLICY admin_beneficio_social_policy ON beneficio_social
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      CREATE POLICY tecnico_beneficio_social_policy ON beneficio_social
        USING (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );

      -- Políticas para informação bancária
      CREATE POLICY admin_info_bancaria_policy ON info_bancaria
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      CREATE POLICY tecnico_info_bancaria_policy ON info_bancaria
        USING (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          cidadao_id IN (
            SELECT id FROM cidadao
            WHERE unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover políticas RLS
    await queryRunner.query(`
      -- Remover políticas para info_bancaria
      DROP POLICY IF EXISTS tecnico_info_bancaria_policy ON info_bancaria;
      DROP POLICY IF EXISTS admin_info_bancaria_policy ON info_bancaria;
      
      -- Remover políticas para beneficio_social
      DROP POLICY IF EXISTS tecnico_beneficio_social_policy ON beneficio_social;
      DROP POLICY IF EXISTS admin_beneficio_social_policy ON beneficio_social;
      
      -- Remover políticas para composicao_familiar
      DROP POLICY IF EXISTS tecnico_composicao_familiar_policy ON composicao_familiar;
      DROP POLICY IF EXISTS admin_composicao_familiar_policy ON composicao_familiar;
      
      -- Remover políticas para situacao_moradia
      DROP POLICY IF EXISTS tecnico_situacao_moradia_policy ON situacao_moradia;
      DROP POLICY IF EXISTS admin_situacao_moradia_policy ON situacao_moradia;
      
      -- Remover políticas originais
      DROP POLICY IF EXISTS tecnico_papel_cidadao_policy ON papel_cidadao;
      DROP POLICY IF EXISTS admin_papel_cidadao_policy ON papel_cidadao;
      DROP POLICY IF EXISTS tecnico_grupo_familiar_policy ON grupo_familiar;
      DROP POLICY IF EXISTS admin_grupo_familiar_policy ON grupo_familiar;
      DROP POLICY IF EXISTS tecnico_cidadao_policy ON cidadao;
      DROP POLICY IF EXISTS gestor_cidadao_policy ON cidadao;
      DROP POLICY IF EXISTS admin_cidadao_policy ON cidadao;
      
      -- Desabilitar RLS em todas as tabelas
      ALTER TABLE info_bancaria DISABLE ROW LEVEL SECURITY;
      ALTER TABLE beneficio_social DISABLE ROW LEVEL SECURITY;
      ALTER TABLE composicao_familiar DISABLE ROW LEVEL SECURITY;
      ALTER TABLE situacao_moradia DISABLE ROW LEVEL SECURITY;
      ALTER TABLE papel_cidadao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE grupo_familiar DISABLE ROW LEVEL SECURITY;
      ALTER TABLE cidadao DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover constraints de validação
    await queryRunner.query(`
      ALTER TABLE cidadao DROP CONSTRAINT IF EXISTS check_nis_valido;
      ALTER TABLE cidadao DROP CONSTRAINT IF EXISTS check_cpf_valido;
    `);

    // 3. Remover triggers
    await queryRunner.query(`
      -- Remover triggers das novas tabelas
      DROP TRIGGER IF EXISTS update_info_bancaria_timestamp ON info_bancaria;
      DROP TRIGGER IF EXISTS update_beneficio_social_timestamp ON beneficio_social;
      DROP TRIGGER IF EXISTS update_composicao_familiar_timestamp ON composicao_familiar;
      DROP TRIGGER IF EXISTS update_situacao_moradia_timestamp ON situacao_moradia;
      
      -- Remover triggers originais
      DROP TRIGGER IF EXISTS update_papel_cidadao_timestamp ON papel_cidadao;
      DROP TRIGGER IF EXISTS update_grupo_familiar_timestamp ON grupo_familiar;
      DROP TRIGGER IF EXISTS update_cidadao_timestamp ON cidadao;
    `);

    // 4. Remover chaves estrangeiras
    // Remover chaves estrangeiras das novas tabelas
    await queryRunner.dropForeignKey('info_bancaria', 'FK_INFO_BANCARIA_CIDADAO');
    await queryRunner.dropForeignKey('beneficio_social', 'FK_BENEFICIO_SOCIAL_CIDADAO');
    await queryRunner.dropForeignKey('composicao_familiar', 'FK_COMPOSICAO_FAMILIAR_CIDADAO');
    await queryRunner.dropForeignKey('situacao_moradia', 'FK_SITUACAO_MORADIA_CIDADAO');
    
    // Remover chaves estrangeiras originais
    await queryRunner.dropForeignKey('papel_cidadao', 'FK_PAPEL_CIDADAO_GRUPO');
    await queryRunner.dropForeignKey('papel_cidadao', 'FK_PAPEL_CIDADAO_CIDADAO');
    await queryRunner.dropForeignKey('grupo_familiar', 'FK_GRUPO_FAMILIAR_RESPONSAVEL');
    await queryRunner.dropForeignKey('cidadao', 'FK_CIDADAO_UNIDADE');

    // 5. Remover índices
    // Remover índices das novas tabelas
    await queryRunner.dropIndex('info_bancaria', 'IDX_INFO_BANCARIA_CIDADAO');
    await queryRunner.dropIndex('beneficio_social', 'IDX_BENEFICIO_SOCIAL_CIDADAO');
    await queryRunner.dropIndex('composicao_familiar', 'IDX_COMPOSICAO_FAMILIAR_CIDADAO');
    await queryRunner.dropIndex('situacao_moradia', 'IDX_SITUACAO_MORADIA_CIDADAO');
    
    // Remover índices originais
    await queryRunner.dropIndex('papel_cidadao', 'IDX_PAPEL_CIDADAO_TIPO');
    await queryRunner.dropIndex('papel_cidadao', 'IDX_PAPEL_CIDADAO_GRUPO');
    await queryRunner.dropIndex('papel_cidadao', 'IDX_PAPEL_CIDADAO_CIDADAO');
    await queryRunner.dropIndex('grupo_familiar', 'IDX_GRUPO_FAMILIAR_RESPONSAVEL');
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_CIDADAO_ENDERECO_BAIRRO;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_CIDADAO_NOME_GIN;`);
    await queryRunner.dropIndex('cidadao', 'IDX_CIDADAO_UNIDADE');
    await queryRunner.dropIndex('cidadao', 'IDX_CIDADAO_NIS');
    await queryRunner.dropIndex('cidadao', 'IDX_CIDADAO_CPF');

    // 6. Remover tabelas
    // Remover novas tabelas
    await queryRunner.dropTable('info_bancaria');
    await queryRunner.dropTable('beneficio_social');
    await queryRunner.dropTable('composicao_familiar');
    await queryRunner.dropTable('situacao_moradia');
    
    // Remover tabelas originais
    await queryRunner.dropTable('papel_cidadao');
    await queryRunner.dropTable('grupo_familiar');
    await queryRunner.dropTable('cidadao');
    
    // 7. Remover tipos enumerados
    await queryRunner.query(`
      -- Remover novos tipos enumerados
      DROP TYPE IF EXISTS "pix_tipo_enum";
      DROP TYPE IF EXISTS "tipo_bpc_enum";
      DROP TYPE IF EXISTS "tipo_beneficio_social_enum";
      
      -- Remover tipos enumerados originais
      DROP TYPE IF EXISTS "tipo_papel_enum";
      DROP TYPE IF EXISTS "tipo_moradia_enum";
      DROP TYPE IF EXISTS "escolaridade_enum";
      DROP TYPE IF EXISTS "parentesco_enum";
      DROP TYPE IF EXISTS "tipo_cidadao_enum";
      DROP TYPE IF EXISTS "sexo_enum";
    `);
  }
}
