import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migração para adicionar índices compostos na tabela cidadao
 * 
 * Estes índices melhoram a performance das consultas frequentes
 */
export class AddCidadaoCompositeIndices1716558823000 implements MigrationInterface {
    name = 'AddCidadaoCompositeIndices1716558823000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Índice para busca por bairro e status
        await queryRunner.query(`
            CREATE INDEX "IDX_cidadao_bairro_ativo" ON "cidadao" 
            ((endereco->>'bairro'), "ativo")
        `);

        // Índice para busca por cidade, bairro e status
        await queryRunner.query(`
            CREATE INDEX "IDX_cidadao_cidade_bairro_ativo" ON "cidadao" 
            ((endereco->>'cidade'), (endereco->>'bairro'), "ativo")
        `);

        // Índice para busca por nome e status
        await queryRunner.query(`
            CREATE INDEX "IDX_cidadao_nome_ativo" ON "cidadao" 
            ("nome", "ativo")
        `);

        // Índice para busca por data de criação e status
        await queryRunner.query(`
            CREATE INDEX "IDX_cidadao_created_at_ativo" ON "cidadao" 
            ("created_at", "ativo")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_cidadao_bairro_ativo"`);
        await queryRunner.query(`DROP INDEX "IDX_cidadao_cidade_bairro_ativo"`);
        await queryRunner.query(`DROP INDEX "IDX_cidadao_nome_ativo"`);
        await queryRunner.query(`DROP INDEX "IDX_cidadao_created_at_ativo"`);
    }
}
