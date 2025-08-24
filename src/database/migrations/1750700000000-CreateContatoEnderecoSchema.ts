import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContatoEnderecoSchema1750700000000
  implements MigrationInterface
{
  name = 'CreateContatoEnderecoSchema1750700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- CONTATO ---
    await queryRunner.query(`
      CREATE TABLE "contato" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "telefone" character varying,
        "is_whatsapp" boolean NOT NULL DEFAULT false,
        "possui_smartphone" boolean NOT NULL DEFAULT false,
        "email" character varying,
        "instagram" character varying,
        "facebook" character varying,
        "proprietario" boolean NOT NULL DEFAULT true,
        "nome_contato" character varying,
        "grau_parentesco" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contato_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contato_cidadao" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_contato_cidadao_whatsapp" ON "contato" ("cidadao_id", "is_whatsapp")`,
    );

    // --- ENDERECO ---
    await queryRunner.query(`
      CREATE TABLE "endereco" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "logradouro" character varying NOT NULL,
        "numero" character varying NOT NULL,
        "complemento" character varying,
        "bairro" character varying NOT NULL,
        "cidade" character varying NOT NULL,
        "estado" character varying(2) NOT NULL,
        "cep" character varying(8) NOT NULL,
        "ponto_referencia" character varying,
        "tempo_de_residencia" integer,
        "data_inicio_vigencia" date NOT NULL,
        "data_fim_vigencia" date,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_endereco_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_endereco_cidadao" FOREIGN KEY ("cidadao_id") REFERENCES "cidadao"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_endereco_atual" ON "endereco" ("cidadao_id", "data_fim_vigencia")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_endereco_atual"`);
    await queryRunner.query(`DROP TABLE "endereco"`);
    await queryRunner.query(`DROP INDEX "IDX_contato_cidadao_whatsapp"`);
    await queryRunner.query(`DROP TABLE "contato"`);
  }
}
