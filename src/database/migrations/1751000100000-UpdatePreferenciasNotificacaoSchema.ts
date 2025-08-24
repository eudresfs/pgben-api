import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

/**
 * Migration para atualizar a estrutura da tabela preferencias_notificacao
 * Esta migration atualiza a estrutura existente para a nova versão da entidade
 */
export class UpdatePreferenciasNotificacaoSchema1751000100000
  implements MigrationInterface
{
  name = 'UpdatePreferenciasNotificacaoSchema1751000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela existe
    const tableExists = await queryRunner.hasTable('preferencias_notificacao');

    if (!tableExists) {
      throw new Error(
        'Tabela preferencias_notificacao não existe. Execute primeiro a migration de criação.',
      );
    }

    // Remover colunas antigas que não existem na nova estrutura
    await queryRunner.dropColumn('preferencias_notificacao', 'canais_ativos');
    await queryRunner.dropColumn('preferencias_notificacao', 'silenciar_todos');
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'horario_inicio_silencio',
    );
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'horario_fim_silencio',
    );
    await queryRunner.dropColumn('preferencias_notificacao', 'dias_silencio');
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'excecoes_silencio',
    );
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'configuracoes_especificas',
    );

    // Adicionar novas colunas
    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'ativo',
        type: 'boolean',
        default: true,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'configuracoes_globais',
        type: 'jsonb',
        default: "'{}'",
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'tipos',
        type: 'jsonb',
        default: "'[]'",
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'configuracoes_canais',
        type: 'jsonb',
        default: "'{}'",
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'estatisticas',
        type: 'jsonb',
        default: "'{}'",
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'configuracoes_privacidade',
        type: 'jsonb',
        default: "'{}'",
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'versao_schema',
        type: 'integer',
        default: 1,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'metadata',
        type: 'jsonb',
        default: "'{}'",
      }),
    );

    // Criar índice único para usuario_id
    await queryRunner.createIndex(
      'preferencias_notificacao',
      new TableIndex({
        name: 'IDX_preferencias_usuario_unique',
        columnNames: ['usuario_id'],
        isUnique: true,
      }),
    );

    // Criar foreign key para usuario
    await queryRunner.createForeignKey(
      'preferencias_notificacao',
      new TableForeignKey({
        name: 'FK_preferencias_notificacao_usuario',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Criar trigger para updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_preferencias_notificacao_updated_at
        BEFORE UPDATE ON preferencias_notificacao
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Atualizar registros existentes com valores padrão para as novas colunas
    await queryRunner.query(`
      UPDATE preferencias_notificacao SET
        configuracoes_globais = '{
          "limite_diario": 50,
          "pausar_todas": false,
          "canais_preferidos": ["sistema", "email"],
          "horario_silencioso_global": {
            "ativo": false,
            "inicio": "22:00",
            "fim": "08:00"
          }
        }'::jsonb,
        tipos = '[]'::jsonb,
        configuracoes_canais = '{
          "email": {
            "ativo": true,
            "formato": "html",
            "incluir_anexos": true
          },
          "sistema": {
            "ativo": true,
            "persistir_historico": true,
            "auto_marcar_lida": false
          },
          "push": {
            "ativo": true,
            "vibrar": true
          },
          "sms": {
            "ativo": false,
            "horario_permitido": {
              "inicio": "08:00",
              "fim": "20:00"
            }
          }
        }'::jsonb,
        estatisticas = '{
          "total_enviadas": 0,
          "total_lidas": 0,
          "total_clicadas": 0,
          "canais_mais_usados": {},
          "tipos_mais_frequentes": {}
        }'::jsonb,
        configuracoes_privacidade = '{
          "consentimento_marketing": false,
          "consentimento_analytics": true,
          "permitir_personalizacao": true,
          "reter_historico": true
        }'::jsonb,
        versao_schema = 1,
        metadata = '{}'::jsonb
      WHERE configuracoes_globais IS NULL;
    `);

    // Comentários para documentação
    await queryRunner.query(`
      COMMENT ON TABLE preferencias_notificacao IS 'Armazena as preferências de notificação personalizáveis por usuário';
      COMMENT ON COLUMN preferencias_notificacao.usuario_id IS 'ID do usuário proprietário das preferências';
      COMMENT ON COLUMN preferencias_notificacao.ativo IS 'Indica se as notificações estão ativas para o usuário';
      COMMENT ON COLUMN preferencias_notificacao.configuracoes_globais IS 'Configurações globais de notificação (limite diário, horário silencioso, etc.)';
      COMMENT ON COLUMN preferencias_notificacao.tipos IS 'Preferências específicas por tipo de notificação';
      COMMENT ON COLUMN preferencias_notificacao.configuracoes_canais IS 'Configurações específicas por canal de entrega (email, SMS, push, etc.)';
      COMMENT ON COLUMN preferencias_notificacao.estatisticas IS 'Estatísticas de uso das notificações para análise e otimização';
      COMMENT ON COLUMN preferencias_notificacao.configuracoes_privacidade IS 'Configurações de privacidade e LGPD';
      COMMENT ON COLUMN preferencias_notificacao.versao_schema IS 'Versão das preferências para controle de migração';
      COMMENT ON COLUMN preferencias_notificacao.metadata IS 'Metadados adicionais';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_preferencias_notificacao_updated_at ON preferencias_notificacao;
    `);

    // Remover foreign key
    await queryRunner.dropForeignKey(
      'preferencias_notificacao',
      'FK_preferencias_notificacao_usuario',
    );

    // Remover índices
    await queryRunner.dropIndex(
      'preferencias_notificacao',
      'IDX_preferencias_usuario_unique',
    );

    // Remover colunas adicionadas
    await queryRunner.dropColumn('preferencias_notificacao', 'ativo');
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'configuracoes_globais',
    );
    await queryRunner.dropColumn('preferencias_notificacao', 'tipos');
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'configuracoes_canais',
    );
    await queryRunner.dropColumn('preferencias_notificacao', 'estatisticas');
    await queryRunner.dropColumn(
      'preferencias_notificacao',
      'configuracoes_privacidade',
    );
    await queryRunner.dropColumn('preferencias_notificacao', 'versao_schema');
    await queryRunner.dropColumn('preferencias_notificacao', 'metadata');

    // Restaurar colunas antigas
    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'canais_ativos',
        type: 'text[]',
        default: "'{app}'",
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'silenciar_todos',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'horario_inicio_silencio',
        type: 'time',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'horario_fim_silencio',
        type: 'time',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'dias_silencio',
        type: 'integer[]',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'excecoes_silencio',
        type: 'text[]',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'preferencias_notificacao',
      new TableColumn({
        name: 'configuracoes_especificas',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }
}
