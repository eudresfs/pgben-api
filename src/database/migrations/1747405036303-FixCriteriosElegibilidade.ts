import { MigrationInterface, QueryRunner } from "typeorm"

/**
 * Migração para adicionar a coluna criterios_elegibilidade à tabela tipos_beneficio
 */
export class FixCriteriosElegibilidade1747405036303 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a coluna já existe
        const table = await queryRunner.getTable('tipos_beneficio');
        const columnExists = table?.findColumnByName('criterios_elegibilidade');
        
        if (!columnExists) {
            await queryRunner.query(`
                ALTER TABLE tipos_beneficio 
                ADD COLUMN IF NOT EXISTS criterios_elegibilidade JSONB DEFAULT '{}'::jsonb;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Não removemos a coluna no down para evitar perda de dados
        // Se for necessário reverter, isso deve ser feito manualmente
    }

}
