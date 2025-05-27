import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';
import { MotivoAluguelSocial } from '../../modules/beneficio/entities/especificacao-aluguel-social.entity';
import { TipoEntregaCestaBasica, PeriodicidadeCestaBasica } from '../../modules/beneficio/entities/especificacao-cesta-basica.entity';

/**
 * Migração para criação das tabelas de especificações de benefícios
 * 
 * Cria as tabelas para armazenar configurações específicas por tipo de benefício:
 * - especificacao_natalidade: para o Auxílio Natalidade
 * - especificacao_aluguel_social: para o Aluguel Social
 * - especificacao_funeral: para o Auxílio Funeral (com campos adicionais)
 * - especificacao_cesta_basica: para a Cesta Básica (com campos adicionais)
 */
export class CreateEspecificacoesBeneficio1747961017229 implements MigrationInterface {
  name = 'CreateEspecificacoesBeneficio1747961017229';  
  public async up(queryRunner: QueryRunner): Promise<void> {

    // Criar tabela de especificação de Auxílio Natalidade
    await queryRunner.createTable(
      new Table({
        name: 'especificacao_natalidade',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tempo_gestacao_minimo',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'prazo_maximo_apos_nascimento',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'requer_pre_natal',
            type: 'boolean',
            default: false,
          },
          {
            name: 'requer_comprovante_residencia',
            type: 'boolean',
            default: false,
          },
          {
            name: 'numero_maximo_filhos',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'valor_complementar',
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

    // Criar tabela de especificação de Aluguel Social
    await queryRunner.createTable(
      new Table({
        name: 'especificacao_aluguel_social',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'duracao_maxima_meses',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'permite_prorrogacao',
            type: 'boolean',
            default: false,
          },
          {
            name: 'tempo_maximo_prorrogacao_meses',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'valor_maximo',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'motivos_validos',
            type: 'motivo_aluguel_social_enum[]',
            isNullable: false,
          },
          {
            name: 'requer_comprovante_aluguel',
            type: 'boolean',
            default: true,
          },
          {
            name: 'requer_vistoria',
            type: 'boolean',
            default: false,
          },
          {
            name: 'pago_diretamente_locador',
            type: 'boolean',
            default: false,
          },
          {
            name: 'percentual_maximo_renda',
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

    // Criar tabela de especificação de Auxílio Funeral
    await queryRunner.createTable(
      new Table({
        name: 'especificacao_funeral',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'prazo_maximo_apos_obito',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'requer_certidao_obito',
            type: 'boolean',
            default: true,
          },
          {
            name: 'requer_comprovante_residencia',
            type: 'boolean',
            default: false,
          },
          {
            name: 'requer_comprovante_vinculo_familiar',
            type: 'boolean',
            default: false,
          },
          {
            name: 'requer_comprovante_despesas',
            type: 'boolean',
            default: false,
          },
          {
            name: 'permite_reembolso',
            type: 'boolean',
            default: false,
          },
          {
            name: 'valor_maximo_reembolso',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'valor_fixo',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'inclui_translado',
            type: 'boolean',
            default: false,
          },
          {
            name: 'inclui_isencao_taxas',
            type: 'boolean',
            default: false,
          },
          {
            name: 'limitado_ao_municipio',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'inclui_urna_funeraria',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'tipo_urna',
            type: 'tipo_urna_funeraria_enum',
            default: "'PADRAO'",
            isNullable: true,
          },
          {
            name: 'inclui_edredom_funebre',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'inclui_despesas_sepultamento',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'servico_sobreaviso',
            type: 'varchar',
            length: '255',
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

    // Criar tabela de especificação de Cesta Básica
    await queryRunner.createTable(
      new Table({
        name: 'especificacao_cesta_basica',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_entrega',
            type: 'tipo_entrega_cesta_basica_enum',
            default: `'DOMICILIAR'`,
          },
          {
            name: 'periodicidade',
            type: 'periodicidade_entrega_enum',
            default: "'UNICA'",
            isNullable: false,
          },
          {
            name: 'quantidade_entregas',
            type: 'integer',
            default: 1,
          },
          {
            name: 'exige_comprovante_residencia',
            type: 'boolean',
            default: true,
          },
          {
            name: 'exige_comprovacao_vulnerabilidade',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'permite_substituicao_itens',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'itens_obrigatorios',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'itens_opcionais',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'local_entrega',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'horario_entrega',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'exige_agendamento',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'requer_comprovante_renda',
            type: 'boolean',
            default: true,
          },
          {
            name: 'renda_maxima_per_capita',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'quantidade_minima_dependentes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'prioriza_familias_com_criancas',
            type: 'boolean',
            default: false,
          },
          {
            name: 'prioriza_idosos',
            type: 'boolean',
            default: false,
          },
          {
            name: 'prioriza_pcd',
            type: 'boolean',
            default: false,
          },
          {
            name: 'valor_cesta',
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

    // Adicionar índices
    await queryRunner.createIndex(
      'especificacao_natalidade',
      new TableIndex({
        name: 'IDX_ESPECIFICACAO_NATALIDADE_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'especificacao_aluguel_social',
      new TableIndex({
        name: 'IDX_ESPECIFICACAO_ALUGUEL_SOCIAL_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        isUnique: true,
      }),
    );
    
    await queryRunner.createIndex(
      'especificacao_funeral',
      new TableIndex({
        name: 'IDX_ESPECIFICACAO_FUNERAL_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        isUnique: true,
      }),
    );
    
    await queryRunner.createIndex(
      'especificacao_cesta_basica',
      new TableIndex({
        name: 'IDX_ESPECIFICACAO_CESTA_BASICA_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        isUnique: true,
      }),
    );

    // Adicionar chaves estrangeiras
    await queryRunner.createForeignKey(
      'especificacao_natalidade',
      new TableForeignKey({
        name: 'FK_ESPECIFICACAO_NATALIDADE_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'especificacao_aluguel_social',
      new TableForeignKey({
        name: 'FK_ESPECIFICACAO_ALUGUEL_SOCIAL_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    
    await queryRunner.createForeignKey(
      'especificacao_funeral',
      new TableForeignKey({
        name: 'FK_ESPECIFICACAO_FUNERAL_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    
    await queryRunner.createForeignKey(
      'especificacao_cesta_basica',
      new TableForeignKey({
        name: 'FK_ESPECIFICACAO_CESTA_BASICA_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'especificacao_natalidade',
      'FK_ESPECIFICACAO_NATALIDADE_TIPO_BENEFICIO',
    );

    await queryRunner.dropForeignKey(
      'especificacao_aluguel_social',
      'FK_ESPECIFICACAO_ALUGUEL_SOCIAL_TIPO_BENEFICIO',
    );
    
    await queryRunner.dropForeignKey(
      'especificacao_funeral',
      'FK_ESPECIFICACAO_FUNERAL_TIPO_BENEFICIO',
    );
    
    await queryRunner.dropForeignKey(
      'especificacao_cesta_basica',
      'FK_ESPECIFICACAO_CESTA_BASICA_TIPO_BENEFICIO',
    );

    // Remover índices
    await queryRunner.dropIndex(
      'especificacao_natalidade',
      'IDX_ESPECIFICACAO_NATALIDADE_TIPO_BENEFICIO',
    );

    await queryRunner.dropIndex(
      'especificacao_aluguel_social',
      'IDX_ESPECIFICACAO_ALUGUEL_SOCIAL_TIPO_BENEFICIO',
    );
    
    await queryRunner.dropIndex(
      'especificacao_funeral',
      'IDX_ESPECIFICACAO_FUNERAL_TIPO_BENEFICIO',
    );
    
    await queryRunner.dropIndex(
      'especificacao_cesta_basica',
      'IDX_ESPECIFICACAO_CESTA_BASICA_TIPO_BENEFICIO',
    );

    // Remover tabelas
    await queryRunner.dropTable('especificacao_natalidade');
    await queryRunner.dropTable('especificacao_aluguel_social');
    await queryRunner.dropTable('especificacao_funeral');
    await queryRunner.dropTable('especificacao_cesta_basica');
    
    // Função auxiliar para verificar se um enum existe
    const enumExists = async (enumName: string): Promise<boolean> => {
      const result = await queryRunner.query(`
        SELECT 1 FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typname = '${enumName}' AND n.nspname = 'public'
      `);
      return result.length > 0;
    };
    
    // Remover enums se existirem
    const dropEnumIfExists = async (enumName: string) => {
      if (await enumExists(enumName)) {
        try {
          await queryRunner.query(`DROP TYPE IF EXISTS ${enumName}`);
        } catch (error) {
          console.log(`Erro ao remover enum ${enumName}: ${error.message}`);
        }
      }
    };
  }
}
