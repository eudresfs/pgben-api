import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAprovadorTableName1754598606082 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Renomear tabela aprovadores para aprovador
        await queryRunner.query(`ALTER TABLE "aprovadores" RENAME TO "aprovador"`);
        
        // Renomear constraints
        await queryRunner.query(`ALTER TABLE "aprovador" RENAME CONSTRAINT "PK_aprovadores" TO "PK_aprovador"`);
        await queryRunner.query(`ALTER TABLE "aprovador" RENAME CONSTRAINT "FK_aprovadores_configuracao_aprovacao" TO "FK_aprovador_configuracao_aprovacao"`);
        await queryRunner.query(`ALTER TABLE "aprovador" RENAME CONSTRAINT "FK_aprovadores_usuario" TO "FK_aprovador_usuario"`);
        
        // Renomear índices
        await queryRunner.query(`ALTER INDEX "IDX_aprovadores_configuracao" RENAME TO "IDX_aprovador_configuracao"`);
        await queryRunner.query(`ALTER INDEX "IDX_aprovadores_usuario" RENAME TO "IDX_aprovador_usuario"`);
        await queryRunner.query(`ALTER INDEX "IDX_aprovadores_ativo" RENAME TO "IDX_aprovador_ativo"`);
        
        // Renomear trigger
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_aprovadores_updated_at ON "aprovador"`);
        await queryRunner.query(`
            CREATE TRIGGER update_aprovador_updated_at 
            BEFORE UPDATE ON "aprovador" 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter renomeação da tabela
        await queryRunner.query(`ALTER TABLE "aprovador" RENAME TO "aprovadores"`);
        
        // Reverter constraints
        await queryRunner.query(`ALTER TABLE "aprovadores" RENAME CONSTRAINT "PK_aprovador" TO "PK_aprovadores"`);
        await queryRunner.query(`ALTER TABLE "aprovadores" RENAME CONSTRAINT "FK_aprovador_configuracao_aprovacao" TO "FK_aprovadores_configuracao_aprovacao"`);
        await queryRunner.query(`ALTER TABLE "aprovadores" RENAME CONSTRAINT "FK_aprovador_usuario" TO "FK_aprovadores_usuario"`);
        
        // Reverter índices
        await queryRunner.query(`ALTER INDEX "IDX_aprovador_configuracao" RENAME TO "IDX_aprovadores_configuracao"`);
        await queryRunner.query(`ALTER INDEX "IDX_aprovador_usuario" RENAME TO "IDX_aprovadores_usuario"`);
        await queryRunner.query(`ALTER INDEX "IDX_aprovador_ativo" RENAME TO "IDX_aprovadores_ativo"`);
        
        // Reverter trigger
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_aprovador_updated_at ON "aprovadores"`);
        await queryRunner.query(`
            CREATE TRIGGER update_aprovadores_updated_at 
            BEFORE UPDATE ON "aprovadores" 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
    }

}
