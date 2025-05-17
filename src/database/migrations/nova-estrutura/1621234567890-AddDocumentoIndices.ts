import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar índices à tabela de documentos
 *
 * Esta migration adiciona índices para otimizar consultas frequentes
 * na tabela de documentos, melhorando a performance do sistema.
 */
export class AddDocumentoIndices1621234567890 implements MigrationInterface {
  /**
   * Executa a migration (adiciona os índices)
   * @param queryRunner Runner de consultas do TypeORM
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    this.logInfo(
      queryRunner,
      'Iniciando criação de índices na tabela de documentos',
    );

    try {
      // Adicionar índices para consultas frequentes
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_solicitacao ON documentos (solicitacao_id);
        CREATE INDEX IF NOT EXISTS idx_documento_cidadao ON documentos (cidadao_id);
        CREATE INDEX IF NOT EXISTS idx_documento_uploader ON documentos (uploader_id);
        CREATE INDEX IF NOT EXISTS idx_documento_tipo ON documentos (tipo_documento);
        CREATE INDEX IF NOT EXISTS idx_documento_data_upload ON documentos (data_upload);
        CREATE INDEX IF NOT EXISTS idx_documento_created_at ON documentos (created_at);
      `);

      // Adicionar índice GIN para busca em metadados JSON
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_metadados_gin ON documentos USING GIN (metadados);
      `);

      this.logInfo(
        queryRunner,
        'Índices criados com sucesso na tabela de documentos',
      );
    } catch (error) {
      this.logError(queryRunner, `Erro ao criar índices: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reverte a migration (remove os índices)
   * @param queryRunner Runner de consultas do TypeORM
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    this.logInfo(
      queryRunner,
      'Iniciando remoção de índices da tabela de documentos',
    );

    try {
      // Remover índices
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_documento_solicitacao;
        DROP INDEX IF EXISTS idx_documento_cidadao;
        DROP INDEX IF EXISTS idx_documento_uploader;
        DROP INDEX IF EXISTS idx_documento_tipo;
        DROP INDEX IF EXISTS idx_documento_data_upload;
        DROP INDEX IF EXISTS idx_documento_created_at;
        DROP INDEX IF EXISTS idx_documento_metadados_gin;
      `);

      this.logInfo(
        queryRunner,
        'Índices removidos com sucesso da tabela de documentos',
      );
    } catch (error) {
      this.logError(queryRunner, `Erro ao remover índices: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registra uma mensagem de informação no log
   * @param queryRunner Runner de consultas do TypeORM
   * @param message Mensagem a ser registrada
   */
  private logInfo(queryRunner: QueryRunner, message: string): void {
    queryRunner.connection.logger.log(
      'info',
      `[AddDocumentoIndices] ${message}`,
    );
  }

  /**
   * Registra uma mensagem de erro no log
   * @param queryRunner Runner de consultas do TypeORM
   * @param message Mensagem a ser registrada
   */
  private logError(queryRunner: QueryRunner, message: string): void {
    queryRunner.connection.logger.log(
      'warn',
      `[AddDocumentoIndices] ERRO: ${message}`,
    );
  }
}
