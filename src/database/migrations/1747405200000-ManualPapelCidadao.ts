import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migração para criar manualmente a tabela de papéis de cidadão e remover o campo tipo_cidadao
 */
export class ManualPapelCidadao1747405200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a tabela já existe
        const tableExists = await queryRunner.hasTable('papel_cidadao');
        
        if (!tableExists) {
            // Criar tabela papel_cidadao
            await queryRunner.query(`
                CREATE TABLE papel_cidadao (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    cidadao_id UUID NOT NULL,
                    tipo_papel VARCHAR(50) NOT NULL,
                    metadados JSONB DEFAULT '{}',
                    ativo BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    removed_at TIMESTAMP,
                    CONSTRAINT fk_papel_cidadao_cidadao FOREIGN KEY (cidadao_id) REFERENCES cidadao(id) ON DELETE CASCADE,
                    CONSTRAINT uk_cidadao_tipo_papel UNIQUE (cidadao_id, tipo_papel)
                );
                
                CREATE INDEX idx_papel_cidadao_cidadao_id ON papel_cidadao(cidadao_id);
                CREATE INDEX idx_papel_cidadao_tipo_papel ON papel_cidadao(tipo_papel);
                CREATE INDEX idx_papel_cidadao_ativo ON papel_cidadao(ativo);
            `);
        }

        // Verificar se a coluna tipo_cidadao existe na tabela cidadao
        const table = await queryRunner.getTable('cidadao');
        const columnExists = table?.findColumnByName('tipo_cidadao');
        
        if (columnExists) {
            // Migrar dados existentes para a nova estrutura
            await queryRunner.query(`
                INSERT INTO papel_cidadao (cidadao_id, tipo_papel)
                SELECT id, tipo_cidadao FROM cidadao WHERE tipo_cidadao IS NOT NULL;
                
                -- Remover a coluna tipo_cidadao
                ALTER TABLE cidadao DROP COLUMN tipo_cidadao;
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Adicionar o campo tipo_cidadao de volta à tabela cidadao
        await queryRunner.query(`
            ALTER TABLE cidadao ADD COLUMN tipo_cidadao VARCHAR(50);
            
            -- Migrar dados de volta para a estrutura antiga
            UPDATE cidadao c
            SET tipo_cidadao = pc.tipo_papel
            FROM papel_cidadao pc
            WHERE c.id = pc.cidadao_id AND pc.ativo = true;
        `);

        // Remover a tabela papel_cidadao
        await queryRunner.query(`
            DROP TABLE IF EXISTS papel_cidadao;
        `);
    }
}
