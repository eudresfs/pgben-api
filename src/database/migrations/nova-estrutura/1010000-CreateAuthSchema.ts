import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateAuthSchema
 *
 * Descrição: Cria a estrutura de autenticação e autorização do sistema,
 * incluindo tabelas de usuários, perfis, permissões e unidades.
 *
 * Domínio: Autenticação e Autorização
 * Dependências: 1000000-CreateBaseStructure.ts
 *
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateAuthSchema1010000 implements MigrationInterface {
  name = 'CreateAuthSchema20250516000100';

  /**
   * Cria as estruturas de autenticação e autorização
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "auth"."role_enum" AS ENUM (
        'administrador',
        'gestor_semtas',
        'tecnico_semtas',
        'coordenador_unidade',
        'tecnico_unidade'
      );

      CREATE TYPE "auth"."status_usuario_enum" AS ENUM (
        'ativo',
        'inativo',
        'bloqueado',
        'pendente_confirmacao'
      );

      CREATE TYPE "auth"."tipo_unidade_enum" AS ENUM (
        'sede',
        'cras',
        'creas',
        'centro_pop',
        'outro'
      );
    `);

    // 2. Criar tabela de unidades
    await queryRunner.createTable(
      new Table({
        name: 'unidade',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'codigo',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'sigla',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tipo_unidade',
            type: 'auth.tipo_unidade_enum',
            isNullable: false,
          },
          {
            name: 'endereco',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bairro',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'cidade',
            type: 'varchar',
            isNullable: true,
            default: "'Natal'",
          },
          {
            name: 'uf',
            type: 'varchar',
            length: '2',
            isNullable: true,
            default: "'RN'",
          },
          {
            name: 'cep',
            type: 'varchar',
            length: '8',
            isNullable: true,
          },
          {
            name: 'telefone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'horario_funcionamento',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 3. Criar tabela de setores
    await queryRunner.createTable(
      new Table({
        name: 'setor',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sigla',
            type: 'varchar',
            isNullable: true,
            default: "'N/A'",
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 4. Criar tabela de usuários
    await queryRunner.createTable(
      new Table({
        name: 'usuario',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'senha_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'cpf',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'telefone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'matricula',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'role',
            type: 'auth.role_enum',
            default: "'tecnico_unidade'",
          },
          {
            name: 'status',
            type: 'auth.status_usuario_enum',
            default: "'ativo'",
          },
          {
            name: 'primeiro_acesso',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ultimo_acesso',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tentativas_login',
            type: 'integer',
            default: 0,
          },
          {
            name: 'bloqueado_ate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'token_redefinicao',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expiracao_token_redefinicao',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 5. Criar tabela de relação entre usuários e unidades
    await queryRunner.createTable(
      new Table({
        name: 'usuario_unidade',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'setor_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'principal',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 6. Criar tabela de refresh tokens
    await queryRunner.createTable(
      new Table({
        name: 'refresh_token',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'revoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 7. Criar tabela de permissões
    await queryRunner.createTable(
      new Table({
        name: 'permissao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'descricao',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'modulo',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 8. Criar tabela de relação entre roles e permissões
    await queryRunner.createTable(
      new Table({
        name: 'role_permissao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'role',
            type: 'auth.role_enum',
            isNullable: false,
          },
          {
            name: 'permissao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 9. Criar índices
    // Índices para unidade
    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_UNIDADE_CODIGO',
        columnNames: ['codigo'],
      }),
    );

    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_UNIDADE_TIPO',
        columnNames: ['tipo_unidade'],
      }),
    );

    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_UNIDADE_STATUS',
        columnNames: ['status'],
      }),
    );

    // Índices para setor
    await queryRunner.createIndex(
      'setor',
      new TableIndex({
        name: 'IDX_SETOR_UNIDADE',
        columnNames: ['unidade_id'],
      }),
    );

    await queryRunner.createIndex(
      'setor',
      new TableIndex({
        name: 'IDX_SETOR_STATUS',
        columnNames: ['status'],
      }),
    );

    // Índices para usuário
    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIO_EMAIL',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIO_CPF',
        columnNames: ['cpf'],
      }),
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIO_MATRICULA',
        columnNames: ['matricula'],
      }),
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIO_ROLE',
        columnNames: ['role'],
      }),
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIO_STATUS',
        columnNames: ['status'],
      }),
    );

    // Índices para usuario_unidade
    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_UNIDADE',
        columnNames: ['unidade_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_SETOR',
        columnNames: ['setor_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_PRINCIPAL',
        columnNames: ['principal'],
      }),
    );

    // Índices para refresh_token
    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_TOKEN',
        columnNames: ['token'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_token',
      new TableIndex({
        name: 'IDX_REFRESH_TOKEN_EXPIRES',
        columnNames: ['expires_at'],
      }),
    );

    // Índices para permissão
    await queryRunner.createIndex(
      'permissao',
      new TableIndex({
        name: 'IDX_PERMISSAO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'permissao',
      new TableIndex({
        name: 'IDX_PERMISSAO_MODULO',
        columnNames: ['modulo'],
      }),
    );

    // Índices para role_permissao
    await queryRunner.createIndex(
      'role_permissao',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSAO_ROLE',
        columnNames: ['role'],
      }),
    );

    await queryRunner.createIndex(
      'role_permissao',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSAO_PERMISSAO',
        columnNames: ['permissao_id'],
      }),
    );

    // 10. Criar chaves estrangeiras
    // FK para setor
    await queryRunner.createForeignKey(
      'setor',
      new TableForeignKey({
        name: 'FK_SETOR_UNIDADE',
        columnNames: ['unidade_id'],
        referencedTableName: 'unidade',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK para usuario_unidade
    await queryRunner.createForeignKey(
      'usuario_unidade',
      new TableForeignKey({
        name: 'FK_USUARIO_UNIDADE_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'usuario_unidade',
      new TableForeignKey({
        name: 'FK_USUARIO_UNIDADE_UNIDADE',
        columnNames: ['unidade_id'],
        referencedTableName: 'unidade',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'usuario_unidade',
      new TableForeignKey({
        name: 'FK_USUARIO_UNIDADE_SETOR',
        columnNames: ['setor_id'],
        referencedTableName: 'setor',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // FK para refresh_token
    await queryRunner.createForeignKey(
      'refresh_token',
      new TableForeignKey({
        name: 'FK_REFRESH_TOKEN_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK para role_permissao
    await queryRunner.createForeignKey(
      'role_permissao',
      new TableForeignKey({
        name: 'FK_ROLE_PERMISSAO_PERMISSAO',
        columnNames: ['permissao_id'],
        referencedTableName: 'permissao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 11. Criar triggers para atualização automática de updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_unidade_timestamp
      BEFORE UPDATE ON unidade
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

      CREATE TRIGGER update_setor_timestamp
      BEFORE UPDATE ON setor
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

      CREATE TRIGGER update_usuario_timestamp
      BEFORE UPDATE ON usuario
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

      CREATE TRIGGER update_usuario_unidade_timestamp
      BEFORE UPDATE ON usuario_unidade
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

      CREATE TRIGGER update_permissao_timestamp
      BEFORE UPDATE ON permissao
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `);

    // 12. Configurar políticas RLS
    await queryRunner.query(`
      -- Habilitar RLS na tabela de usuários
      ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;

      -- Política para administradores (acesso total)
      CREATE POLICY admin_usuario_policy ON usuario
        USING (current_setting('app.current_user_role')::text = 'administrador')
        WITH CHECK (current_setting('app.current_user_role')::text = 'administrador');

      -- Política para gestores (acesso a usuários de suas unidades)
      CREATE POLICY gestor_usuario_policy ON usuario
        USING (
          current_setting('app.current_user_role')::text = 'gestor_semtas' AND
          id IN (
            SELECT u.id FROM usuario u
            JOIN usuario_unidade uu ON u.id = uu.usuario_id
            WHERE uu.unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        )
        WITH CHECK (
          current_setting('app.current_user_role')::text = 'gestor_semtas' AND
          id IN (
            SELECT u.id FROM usuario u
            JOIN usuario_unidade uu ON u.id = uu.usuario_id
            WHERE uu.unidade_id IN (
              SELECT unidade_id FROM usuario_unidade
              WHERE usuario_id = current_setting('app.current_user_id')::uuid
            )
          )
        );

      -- Política para usuários (acesso apenas ao próprio perfil)
      CREATE POLICY proprio_usuario_policy ON usuario
        USING (id = current_setting('app.current_user_id')::uuid)
        WITH CHECK (id = current_setting('app.current_user_id')::uuid);
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS proprio_usuario_policy ON usuario;
      DROP POLICY IF EXISTS gestor_usuario_policy ON usuario;
      DROP POLICY IF EXISTS admin_usuario_policy ON usuario;
      ALTER TABLE usuario DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_permissao_timestamp ON permissao;
      DROP TRIGGER IF EXISTS update_usuario_unidade_timestamp ON usuario_unidade;
      DROP TRIGGER IF EXISTS update_usuario_timestamp ON usuario;
      DROP TRIGGER IF EXISTS update_setor_timestamp ON setor;
      DROP TRIGGER IF EXISTS update_unidade_timestamp ON unidade;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'role_permissao',
      'FK_ROLE_PERMISSAO_PERMISSAO',
    );
    await queryRunner.dropForeignKey(
      'refresh_token',
      'FK_REFRESH_TOKEN_USUARIO',
    );
    await queryRunner.dropForeignKey(
      'usuario_unidade',
      'FK_USUARIO_UNIDADE_SETOR',
    );
    await queryRunner.dropForeignKey(
      'usuario_unidade',
      'FK_USUARIO_UNIDADE_UNIDADE',
    );
    await queryRunner.dropForeignKey(
      'usuario_unidade',
      'FK_USUARIO_UNIDADE_USUARIO',
    );
    await queryRunner.dropForeignKey('setor', 'FK_SETOR_UNIDADE');

    // 4. Remover índices
    // Índices de role_permissao
    await queryRunner.dropIndex(
      'role_permissao',
      'IDX_ROLE_PERMISSAO_PERMISSAO',
    );
    await queryRunner.dropIndex('role_permissao', 'IDX_ROLE_PERMISSAO_ROLE');

    // Índices de permissao
    await queryRunner.dropIndex('permissao', 'IDX_PERMISSAO_MODULO');
    await queryRunner.dropIndex('permissao', 'IDX_PERMISSAO_NOME');

    // Índices de refresh_token
    await queryRunner.dropIndex('refresh_token', 'IDX_REFRESH_TOKEN_EXPIRES');
    await queryRunner.dropIndex('refresh_token', 'IDX_REFRESH_TOKEN_TOKEN');
    await queryRunner.dropIndex('refresh_token', 'IDX_REFRESH_TOKEN_USUARIO');

    // Índices de usuario_unidade
    await queryRunner.dropIndex(
      'usuario_unidade',
      'IDX_USUARIO_UNIDADE_PRINCIPAL',
    );
    await queryRunner.dropIndex('usuario_unidade', 'IDX_USUARIO_UNIDADE_SETOR');
    await queryRunner.dropIndex(
      'usuario_unidade',
      'IDX_USUARIO_UNIDADE_UNIDADE',
    );
    await queryRunner.dropIndex(
      'usuario_unidade',
      'IDX_USUARIO_UNIDADE_USUARIO',
    );

    // Índices de usuario
    await queryRunner.dropIndex('usuario', 'IDX_USUARIO_STATUS');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIO_ROLE');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIO_MATRICULA');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIO_CPF');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIO_EMAIL');

    // Índices de setor
    await queryRunner.dropIndex('setor', 'IDX_SETOR_STATUS');
    await queryRunner.dropIndex('setor', 'IDX_SETOR_UNIDADE');

    // Índices de unidade
    await queryRunner.dropIndex('unidade', 'IDX_UNIDADE_STATUS');
    await queryRunner.dropIndex('unidade', 'IDX_UNIDADE_TIPO');
    await queryRunner.dropIndex('unidade', 'IDX_UNIDADE_CODIGO');

    // 5. Remover tabelas
    await queryRunner.dropTable('role_permissao');
    await queryRunner.dropTable('permissao');
    await queryRunner.dropTable('refresh_token');
    await queryRunner.dropTable('usuario_unidade');
    await queryRunner.dropTable('usuario');
    await queryRunner.dropTable('setor');
    await queryRunner.dropTable('unidade');

    // 6. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "auth"."tipo_unidade_enum";
      DROP TYPE IF EXISTS "auth"."status_usuario_enum";
      DROP TYPE IF EXISTS "auth"."role_enum";
    `);
  }
}
