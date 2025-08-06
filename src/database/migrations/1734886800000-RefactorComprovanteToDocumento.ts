import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para refatorar comprovantes de pagamento para usar a entidade Documento
 * 
 * Esta migração:
 * 1. Remove a tabela comprovante_pagamento
 * 2. Remove índices e constraints relacionados
 * 3. Mantém o campo comprovante_id na tabela pagamento para referência ao documento
 */
export class RefactorComprovanteToDocumento1734886800000 implements MigrationInterface {
  name = 'RefactorComprovanteToDocumento1734886800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove constraint de foreign key da tabela pagamento que referencia comprovante_pagamento
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_pagamento_comprovante";
    `);
    
    // Remove índices da tabela comprovante_pagamento
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_comprovante_pagamento_pagamento_id";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_comprovante_pagamento_tipo_documento";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_comprovante_pagamento_data_upload";
    `);
    
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_comprovante_pagamento_responsavel_upload";
    `);

    // Remove constraints de foreign key da tabela comprovante_pagamento
    await queryRunner.query(`
      ALTER TABLE "comprovante_pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_comprovante_pagamento_pagamento_id";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "comprovante_pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_comprovante_pagamento_responsavel_upload";
    `);

    // Remove a tabela comprovante_pagamento
    await queryRunner.query(`
      DROP TABLE IF EXISTS "comprovante_pagamento";
    `);

    // Nota: Não removemos o enum tipo_documento_enum pois pode ser usado pela entidade Documento

    console.log('✅ Migração RefactorComprovanteToDocumento executada com sucesso');
    console.log('📝 Tabela comprovante_pagamento removida');
    console.log('🔗 Campo comprovante_id mantido na tabela pagamento para referência ao documento');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Esta migração é irreversível pois remove completamente a entidade ComprovantePagamento
    // Os dados de comprovantes agora são gerenciados pela entidade Documento
    throw new Error(
      'Esta migração não pode ser revertida. ' +
      'A entidade ComprovantePagamento foi completamente removida e substituída pela entidade Documento. ' +
      'Para reverter, seria necessário migrar dados da tabela documento de volta para comprovante_pagamento.'
    );
  }
}