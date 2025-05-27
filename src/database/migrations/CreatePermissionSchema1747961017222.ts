import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar o esquema de permissões do sistema
 * 
 * Esta migração cria todas as tabelas necessárias para o sistema de permissões granulares:
 * - permissao: Armazena as permissões individuais
 * - grupo_permissao: Armazena os grupos de permissões
 * - mapeamento_grupo_permissao: Mapeia permissões para grupos
 * - role_permissao: Associa permissões a papéis (roles)
 * - permissao_usuario: Associa permissões diretamente a usuários
 * - escopo_permissao: Define o escopo de uma permissão
 */
export class CreatePermissionSchema1747961017222 implements MigrationInterface {
  name = 'CreatePermissionSchema1747961017222';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela de permissões já existe
    const permissaoTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissao'
      );
    `);
    
    // Criar tabela de permissões apenas se não existir
    if (!permissaoTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "nome" VARCHAR(100) NOT NULL UNIQUE,
          "descricao" VARCHAR(255) NOT NULL,
          "composta" BOOLEAN NOT NULL DEFAULT false,
          "permissao_pai_id" UUID NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          "atualizado_por" UUID NULL,
          CONSTRAINT "fk_permissao_pai" FOREIGN KEY ("permissao_pai_id") 
            REFERENCES "permissao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_permissao_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "fk_permissao_atualizado_por" FOREIGN KEY ("atualizado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);
      console.log('✅ Tabela permissao criada com sucesso');
    } else {
      console.log('⚠️ Tabela permissao já existe, pulando criação');
    }

    // Verificar se a tabela de grupos de permissões já existe
    const grupoPermissaoTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'grupo_permissao'
      );
    `);
    
    // Criar tabela de grupos de permissões apenas se não existir
    if (!grupoPermissaoTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "grupo_permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "nome" VARCHAR(100) NOT NULL UNIQUE,
          "descricao" VARCHAR(255) NOT NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          "atualizado_por" UUID NULL,
          CONSTRAINT "fk_grupo_permissao_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "fk_grupo_permissao_atualizado_por" FOREIGN KEY ("atualizado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);
      console.log('✅ Tabela grupo_permissao criada com sucesso');
    } else {
      console.log('⚠️ Tabela grupo_permissao já existe, pulando criação');
    }

    // Verificar se a tabela de mapeamento de permissões para grupos já existe
    const mapeamentoGrupoPermissaoTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mapeamento_grupo_permissao'
      );
    `);
    
    // Criar tabela de mapeamento de permissões para grupos apenas se não existir
    if (!mapeamentoGrupoPermissaoTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "mapeamento_grupo_permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "permissao_id" UUID NOT NULL,
          "grupo_id" UUID NOT NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          CONSTRAINT "fk_mapeamento_grupo_permissao_permissao" FOREIGN KEY ("permissao_id") 
            REFERENCES "permissao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_mapeamento_grupo_permissao_grupo" FOREIGN KEY ("grupo_id") 
            REFERENCES "grupo_permissao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_mapeamento_grupo_permissao_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "uq_mapeamento_grupo_permissao" UNIQUE ("permissao_id", "grupo_id")
        )
      `);
      console.log('✅ Tabela mapeamento_grupo_permissao criada com sucesso');
    } else {
      console.log('⚠️ Tabela mapeamento_grupo_permissao já existe, pulando criação');
    }

    // Verificar se a tabela de permissões de role já existe
    const rolePermissaoTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissao'
      );
    `);
    
    // Criar tabela de permissões de role apenas se não existir
    if (!rolePermissaoTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "role_permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "role_id" UUID NOT NULL,
          "permissao_id" UUID NOT NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          CONSTRAINT "fk_role_permissao_role" FOREIGN KEY ("role_id") 
            REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_role_permissao_permissao" FOREIGN KEY ("permissao_id") 
            REFERENCES "permissao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_role_permissao_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "uq_role_permissao" UNIQUE ("role_id", "permissao_id")
        )
      `);
      console.log('✅ Tabela role_permissao criada com sucesso');
    } else {
      console.log('⚠️ Tabela role_permissao já existe, pulando criação');
    }

    // Verificar se a tabela de permissões de usuário já existe
    const permissaoUsuarioTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissao_usuario'
      );
    `);
    
    // Criar tabela de permissões de usuário apenas se não existir
    if (!permissaoUsuarioTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "permissao_usuario" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "usuario_id" UUID NOT NULL,
          "permissao_id" UUID NOT NULL,
          "tipo_escopo" VARCHAR(50) NOT NULL,
          "escopo_id" UUID NULL,
          "valido_ate" TIMESTAMP NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          "atualizado_por" UUID NULL,
          CONSTRAINT "fk_permissao_usuario_usuario" FOREIGN KEY ("usuario_id") 
            REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_permissao_usuario_permissao" FOREIGN KEY ("permissao_id") 
            REFERENCES "permissao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_permissao_usuario_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "fk_permissao_usuario_atualizado_por" FOREIGN KEY ("atualizado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "uq_permissao_usuario" UNIQUE ("usuario_id", "permissao_id", "tipo_escopo", "escopo_id")
        )
      `);
      console.log('✅ Tabela permissao_usuario criada com sucesso');
    } else {
      console.log('⚠️ Tabela permissao_usuario já existe, pulando criação');
    }
    
    // Verificar se a tabela role_usuario já existe
    const roleUsuarioTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'role_usuario'
      );
    `);
    
    // Criar tabela role_usuario apenas se não existir
    if (!roleUsuarioTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "role_usuario" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "usuario_id" UUID NOT NULL,
          "role_id" UUID NOT NULL,
          "tipo_escopo" VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
          "escopo_id" UUID NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          CONSTRAINT "fk_role_usuario_usuario" FOREIGN KEY ("usuario_id") 
            REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_role_usuario_role" FOREIGN KEY ("role_id") 
            REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_role_usuario_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT "uq_role_usuario" UNIQUE ("usuario_id", "role_id", "tipo_escopo", "escopo_id")
        )
      `);
      console.log('✅ Tabela role_usuario criada com sucesso');
    } else {
      console.log('⚠️ Tabela role_usuario já existe, pulando criação');
    }

    // Verificar se a tabela de escopos de permissão já existe
    const escopoPermissaoTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'escopo_permissao'
      );
    `);
    
    // Criar tabela de escopos de permissão apenas se não existir
    if (!escopoPermissaoTableExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "escopo_permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "permissao_usuario_id" UUID NOT NULL,
          "tipo_escopo" VARCHAR(50) NOT NULL,
          "escopo_id" UUID NULL,
          "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
          "criado_por" UUID NULL,
          CONSTRAINT "fk_escopo_permissao_permissao_usuario" FOREIGN KEY ("permissao_usuario_id") 
            REFERENCES "permissao_usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "fk_escopo_permissao_criado_por" FOREIGN KEY ("criado_por") 
            REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);
      console.log('✅ Tabela escopo_permissao criada com sucesso');
    } else {
      console.log('⚠️ Tabela escopo_permissao já existe, pulando criação');
    }

    // Criar índices para melhorar a performance (verificando existência primeiro)
    const createIndexIfNotExists = async (indexName: string, tableName: string, columnName: string) => {
      // Verificar se o índice já existe
      const indexExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = '${indexName}'
        );
      `);
      
      // Verificar se a coluna existe na tabela
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}' 
          AND column_name = '${columnName}'
        );
      `);
      
      if (!indexExists[0].exists) {
        if (columnExists[0].exists) {
          try {
            await queryRunner.query(`CREATE INDEX "${indexName}" ON "${tableName}" ("${columnName}")`);
            console.log(`✅ Índice ${indexName} criado com sucesso`);
          } catch (error) {
            console.log(`⚠️ Erro ao criar índice ${indexName}: ${error.message}`);
          }
        } else {
          console.log(`⚠️ Coluna ${columnName} não existe na tabela ${tableName}, pulando criação do índice ${indexName}`);
        }
      } else {
        console.log(`⚠️ Índice ${indexName} já existe, pulando criação`);
      }
    };
    
    await createIndexIfNotExists('idx_permissao_pai_id', 'permissao', 'permissao_pai_id');
    await createIndexIfNotExists('idx_grupo_permissao_nome', 'grupo_permissao', 'nome');
    await createIndexIfNotExists('idx_mapeamento_grupo_permissao_permissao_id', 'mapeamento_grupo_permissao', 'permissao_id');
    await createIndexIfNotExists('idx_mapeamento_grupo_permissao_grupo_id', 'mapeamento_grupo_permissao', 'grupo_id');
    await createIndexIfNotExists('idx_permissao_usuario_usuario_id', 'permissao_usuario', 'usuario_id');
    await createIndexIfNotExists('idx_permissao_usuario_permissao_id', 'permissao_usuario', 'permissao_id');
    await createIndexIfNotExists('idx_permissao_usuario_tipo_escopo', 'permissao_usuario', 'tipo_escopo');
    await createIndexIfNotExists('idx_permissao_usuario_escopo_id', 'permissao_usuario', 'escopo_id');
    await createIndexIfNotExists('idx_escopo_permissao_permissao_usuario_id', 'escopo_permissao', 'permissao_usuario_id');
    await createIndexIfNotExists('idx_escopo_permissao_tipo_escopo', 'escopo_permissao', 'tipo_escopo');
    await createIndexIfNotExists('idx_escopo_permissao_escopo_id', 'escopo_permissao', 'escopo_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando remoção de índices...');
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_escopo_permissao_escopo_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_escopo_permissao_tipo_escopo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_escopo_permissao_permissao_usuario_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissao_usuario_escopo_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissao_usuario_tipo_escopo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissao_usuario_permissao_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissao_usuario_usuario_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mapeamento_grupo_permissao_grupo_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mapeamento_grupo_permissao_permissao_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_grupo_permissao_nome"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permissao_pai_id"`);
    console.log('✅ Índices removidos com sucesso');

    console.log('Iniciando remoção de tabelas...');
    // Remover tabelas na ordem inversa para evitar problemas de chave estrangeira
    await queryRunner.query(`DROP TABLE IF EXISTS "escopo_permissao"`);
    console.log('✅ Tabela escopo_permissao removida com sucesso');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "permissao_usuario"`);
    console.log('✅ Tabela permissao_usuario removida com sucesso');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "role_usuario"`);
    console.log('✅ Tabela role_usuario removida com sucesso');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissao"`);
    console.log('✅ Tabela role_permissao removida com sucesso');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "mapeamento_grupo_permissao"`);
    console.log('✅ Tabela mapeamento_grupo_permissao removida com sucesso');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "grupo_permissao"`);
    console.log('✅ Tabela grupo_permissao removida com sucesso');
    
    await queryRunner.query(`DROP TABLE IF EXISTS "permissao"`);
    console.log('✅ Tabela permissao removida com sucesso');
    
    console.log('✅ Migration revertida com sucesso');
  }
}
