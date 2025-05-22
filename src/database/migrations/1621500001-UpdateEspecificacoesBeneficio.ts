import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migração para atualizar as tabelas de especificações de benefícios
 * 
 * Adiciona novos campos às tabelas de especificações de benefícios:
 * - especificacao_funeral: campos adicionais para o Auxílio Funeral
 * - especificacao_cesta_basica: campos adicionais para a Cesta Básica
 */
export class UpdateEspecificacoesBeneficio1621500001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipos de urna funerária
    await queryRunner.query(`
      CREATE TYPE tipo_urna_funeraria_enum AS ENUM (
        'padrao',
        'especial',
        'infantil',
        'obeso'
      )
    `);

    // Criar enum para periodicidade de entrega
    await queryRunner.query(`
      CREATE TYPE periodicidade_entrega_enum AS ENUM (
        'unica',
        'mensal',
        'bimestral',
        'trimestral',
        'semestral',
        'anual'
      )
    `);

    // Atualizar a tabela de especificação de Auxílio Funeral
    await queryRunner.addColumns('especificacao_funeral', [
      new TableColumn({
        name: 'limitado_ao_municipio',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
      new TableColumn({
        name: 'inclui_urna_funeraria',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
      new TableColumn({
        name: 'inclui_edredom_funebre',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
      new TableColumn({
        name: 'inclui_despesas_sepultamento',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
      new TableColumn({
        name: 'servico_sobreaviso',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    ]);

    // Atualizar a tabela de especificação de Cesta Básica
    await queryRunner.addColumns('especificacao_cesta_basica', [
      new TableColumn({
        name: 'periodicidade',
        type: 'enum',
        enum: ['unica', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'],
        enumName: 'periodicidade_entrega_enum',
        default: "'unica'",
        isNullable: false,
      }),
      new TableColumn({
        name: 'exige_comprovacao_vulnerabilidade',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
      new TableColumn({
        name: 'permite_substituicao_itens',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
      new TableColumn({
        name: 'itens_obrigatorios',
        type: 'simple-json',
        isNullable: true,
      }),
      new TableColumn({
        name: 'itens_opcionais',
        type: 'simple-json',
        isNullable: true,
      }),
      new TableColumn({
        name: 'local_entrega',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'horario_entrega',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'exige_agendamento',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    ]);

    // Renomear a coluna requer_comprovante_residencia para exige_comprovante_residencia na tabela de cesta básica
    await queryRunner.renameColumn(
      'especificacao_cesta_basica',
      'requer_comprovante_residencia',
      'exige_comprovante_residencia'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter renomeação de coluna
    await queryRunner.renameColumn(
      'especificacao_cesta_basica',
      'exige_comprovante_residencia',
      'requer_comprovante_residencia'
    );

    // Remover colunas da tabela de especificação de Cesta Básica
    await queryRunner.dropColumns('especificacao_cesta_basica', [
      'periodicidade',
      'exige_comprovacao_vulnerabilidade',
      'permite_substituicao_itens',
      'itens_obrigatorios',
      'itens_opcionais',
      'local_entrega',
      'horario_entrega',
      'exige_agendamento',
    ]);

    // Remover colunas da tabela de especificação de Auxílio Funeral
    await queryRunner.dropColumns('especificacao_funeral', [
      'limitado_ao_municipio',
      'inclui_urna_funeraria',
      'inclui_edredom_funebre',
      'inclui_despesas_sepultamento',
      'servico_sobreaviso',
    ]);

    // Remover enums
    await queryRunner.query(`DROP TYPE periodicidade_entrega_enum`);
    await queryRunner.query(`DROP TYPE tipo_urna_funeraria_enum`);
  }
}
