import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para adicionar os novos tipos PROVA_SOCIAL e DOCUMENTACAO_TECNICA
 * ao enum tipo_documento_comprobatorio_enum.
 * 
 * Esta migração suporta a separação clara entre:
 * - Prova social: fotos e testemunhos do cidadão
 * - Documentação técnica: laudos, entrevistas e relatórios
 */
export class AddProvaSocialDocumentacaoTecnicaToEnum1758477200000 implements MigrationInterface {
  name = 'AddProvaSocialDocumentacaoTecnicaToEnum1758477200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar novos valores ao enum tipo_documento_comprobatorio_enum
    await queryRunner.query(`
      ALTER TYPE tipo_documento_comprobatorio_enum 
      ADD VALUE IF NOT EXISTS 'prova_social';
    `);

    await queryRunner.query(`
      ALTER TYPE tipo_documento_comprobatorio_enum 
      ADD VALUE IF NOT EXISTS 'documentacao_tecnica';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nota: PostgreSQL não permite remover valores de enum diretamente
    // Para reverter esta migração, seria necessário:
    // 1. Criar um novo enum sem os valores
    // 2. Migrar os dados
    // 3. Substituir o enum antigo
    // 
    // Como esta é uma operação complexa e potencialmente destrutiva,
    // deixamos a reversão como um processo manual se necessário.
    
    console.warn(
      'Reversão desta migração requer processo manual. ' +
      'PostgreSQL não permite remover valores de enum diretamente.'
    );
  }
}