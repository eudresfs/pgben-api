import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriaLog1704067226000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela log_auditoria existe
    const logAuditoriaExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'log_auditoria'
      );
    `);

    // Criar tabela log_auditoria se não existir
    if (!logAuditoriaExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE log_auditoria (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          usuario_id UUID,
          acao VARCHAR(100) NOT NULL,
          entidade VARCHAR(100),
          entidade_id UUID,
          dados JSONB,
          ip VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await queryRunner.query(`
        CREATE INDEX idx_log_auditoria_usuario_id ON log_auditoria(usuario_id);
        CREATE INDEX idx_log_auditoria_acao ON log_auditoria(acao);
        CREATE INDEX idx_log_auditoria_entidade ON log_auditoria(entidade);
        CREATE INDEX idx_log_auditoria_created_at ON log_auditoria(created_at);
      `);

      console.log('\n✅ Tabela log_auditoria criada com sucesso');
    } else {
      console.log('\n⚠️ Tabela log_auditoria já existe, pulando criação');
    }

    // Criar tabela de categorias de log
    await queryRunner.query(`
      CREATE TABLE categoria_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#CCCCCC',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Adicionar índice para melhorar performance
    await queryRunner.query(`
      CREATE INDEX idx_categoria_log_nome ON categoria_log(nome);
    `);

    // Criar tabela de relação entre logs e categorias
    await queryRunner.query(`
      CREATE TABLE log_categoria (
        log_id UUID NOT NULL REFERENCES log_auditoria(id),
        categoria_id UUID NOT NULL REFERENCES categoria_log(id),
        PRIMARY KEY (log_id, categoria_id)
      );
    `);

    // Criar índice para melhorar performance
    await queryRunner.query(`
      CREATE INDEX idx_log_categoria_log_id ON log_categoria(log_id);
      CREATE INDEX idx_log_categoria_categoria_id ON log_categoria(categoria_id);
    `);

    // Adicionar restrição de unicidade para a coluna nome
    await queryRunner.query(`
      ALTER TABLE categoria_log ADD CONSTRAINT uk_categoria_log_nome UNIQUE (nome);
    `);

    // Inserir categorias padrão
    await queryRunner.query(`
      INSERT INTO categoria_log (id, nome, descricao, cor, created_at, updated_at)
      VALUES 
        (uuid_generate_v4(), 'Segurança', 'Eventos relacionados à segurança do sistema', '#FF0000', NOW(), NOW()),
        (uuid_generate_v4(), 'Operação', 'Operações de CRUD e outras ações de negócio', '#0000FF', NOW(), NOW()),
        (uuid_generate_v4(), 'Sistema', 'Eventos do sistema, erros e avisos', '#00FF00', NOW(), NOW()),
        (uuid_generate_v4(), 'Auditoria', 'Ações de auditores e alterações em configurações', '#FFFF00', NOW(), NOW())
      ON CONFLICT (nome) DO NOTHING;
    `);

    // Adicionar coluna de módulo e criticidade à tabela de logs
    await queryRunner.query(`
      -- Adicionar coluna de módulo
      ALTER TABLE log_auditoria 
      ADD COLUMN IF NOT EXISTS modulo VARCHAR(50);

      -- Adicionar coluna de criticidade
      ALTER TABLE log_auditoria 
      ADD COLUMN IF NOT EXISTS criticidade VARCHAR(20) NOT NULL DEFAULT 'NORMAL';

      -- Adicionar coluna de detalhes
      ALTER TABLE log_auditoria 
      ADD COLUMN IF NOT EXISTS detalhes TEXT;

      -- Adicionar índices para as novas colunas
      CREATE INDEX IF NOT EXISTS idx_log_auditoria_modulo ON log_auditoria(modulo);
      CREATE INDEX IF NOT EXISTS idx_log_auditoria_criticidade ON log_auditoria(criticidade);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_log_auditoria_criticidade;
      DROP INDEX IF EXISTS idx_log_auditoria_modulo;
    `);

    // Remover colunas da tabela de logs
    await queryRunner.query(`
      ALTER TABLE log_auditoria DROP COLUMN IF EXISTS detalhes;
      ALTER TABLE log_auditoria DROP COLUMN IF EXISTS criticidade;
      ALTER TABLE log_auditoria DROP COLUMN IF EXISTS modulo;
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_log_categoria_categoria_id;
      DROP INDEX IF EXISTS idx_log_categoria_log_id;
      DROP INDEX IF EXISTS idx_categoria_log_nome;
    `);

    // Remover restrição de unicidade
    await queryRunner.query(`
      ALTER TABLE IF EXISTS categoria_log DROP CONSTRAINT IF EXISTS uk_categoria_log_nome;
    `);

    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS log_categoria;
      DROP TABLE IF EXISTS categoria_log;
    `);
  }
}