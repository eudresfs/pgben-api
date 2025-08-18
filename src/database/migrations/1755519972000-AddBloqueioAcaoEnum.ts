import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBloqueioAcaoEnum1755519972000 implements MigrationInterface {
  name = 'AddBloqueioAcaoEnum1755519972000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona o novo valor 'bloqueio_beneficio' ao enum tipo_acao_critica_enum
    await queryRunner.query(
      `ALTER TYPE "public"."tipo_acao_critica_enum" ADD VALUE 'bloqueio_beneficio'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nota: PostgreSQL não permite remover valores de enum diretamente
    // Para reverter, seria necessário recriar o enum sem o valor
    // Por simplicidade, deixamos vazio pois é uma operação complexa
    console.warn(
      'Reverting enum value removal is complex in PostgreSQL. Manual intervention may be required.',
    );
  }
}