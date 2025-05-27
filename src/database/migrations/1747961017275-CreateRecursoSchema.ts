import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecursoSchema1747961017275 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para status do recurso se não existir
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t 
                      JOIN pg_namespace n ON n.oid = t.typnamespace 
                      WHERE t.typname = 'status_recurso' AND n.nspname = 'public') THEN
          CREATE TYPE status_recurso AS ENUM (
            'pendente',
            'em_analise',
            'deferido',
            'indeferido',
            'cancelado'
          );
        END IF;
      END
      $$;
    `);

    // Criar tabela de recursos
    await queryRunner.query(`
      CREATE TABLE recurso (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        solicitacao_id UUID NOT NULL REFERENCES solicitacao(id),
        justificativa TEXT NOT NULL,
        status status_recurso NOT NULL DEFAULT 'pendente',
        data_analise TIMESTAMP,
        analista_id UUID REFERENCES usuario(id),
        parecer TEXT,
        documentos_adicionais JSONB,
        motivo_indeferimento VARCHAR(100),
        prazo_analise INTEGER NOT NULL DEFAULT 5,
        setor_responsavel_id UUID REFERENCES setor(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        removed_at TIMESTAMP
      );
    `);

    // Criar tabela de histórico de recursos
    await queryRunner.query(`
      CREATE TABLE recurso_historico (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recurso_id UUID NOT NULL REFERENCES recurso(id),
        status_anterior VARCHAR(20),
        status_novo VARCHAR(20) NOT NULL,
        usuario_id UUID REFERENCES usuario(id),
        observacao TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Criar índices para melhorar performance
    await queryRunner.query(`
      CREATE INDEX idx_recurso_solicitacao_id ON recurso(solicitacao_id);
      CREATE INDEX idx_recurso_status ON recurso(status);
      CREATE INDEX idx_recurso_setor ON recurso(setor_responsavel_id);
      CREATE INDEX idx_recurso_analista ON recurso(analista_id);
      CREATE INDEX idx_recurso_historico_recurso ON recurso_historico(recurso_id);
    `);

    // Adicionar permissões relacionadas a recursos
    const permissoesRecurso = [
      { nome: 'recurso.criar', descricao: 'Criar recursos de primeira instância', modulo: 'recurso', acao: 'criar' },
      { nome: 'recurso.listar', descricao: 'Listar recursos de primeira instância', modulo: 'recurso', acao: 'listar' },
      { nome: 'recurso.visualizar', descricao: 'Visualizar detalhes de recursos', modulo: 'recurso', acao: 'visualizar' },
      { nome: 'recurso.analisar', descricao: 'Analisar recursos de primeira instância', modulo: 'recurso', acao: 'analisar' },
      { nome: 'recurso.cancelar', descricao: 'Cancelar recursos de primeira instância', modulo: 'recurso', acao: 'cancelar' },
      { nome: 'recurso.historico.visualizar', descricao: 'Visualizar histórico de recursos', modulo: 'recurso', acao: 'historico.visualizar' }
    ];

    // Inserir cada permissão verificando se já existe
    for (const perm of permissoesRecurso) {
      // Verificar se a permissão já existe
      const permExistente = await queryRunner.query(
        `SELECT id FROM permissao WHERE nome = $1`,
        [perm.nome]
      );

      // Se não existir, inserir
      if (!permExistente || permExistente.length === 0) {
        await queryRunner.query(
          `INSERT INTO permissao (id, nome, descricao, modulo, acao, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW(), NOW())`,
          [perm.nome, perm.descricao, perm.modulo, perm.acao]
        );
      }
    }

    // Adicionar permissões aos papéis existentes
    // 1. Obter os papéis (roles)
    const roles = await queryRunner.query(
      `SELECT id, nome FROM role WHERE nome IN ('ADMIN', 'GESTOR', 'TECNICO')`
    );

    // 2. Obter as permissões de recurso
    const permissoesBD = await queryRunner.query(
      `SELECT id, nome FROM permissao WHERE nome LIKE 'recurso.%'`
    );

    // 3. Mapear quais permissões cada papel deve ter
    const permissoesPorPapel: { roleId: string; permissaoId: string }[] = [];
    
    for (const role of roles) {
      for (const perm of permissoesBD) {
        // Admin e Gestor têm todas as permissões
        if (role.nome === 'ADMIN' || role.nome === 'GESTOR') {
          permissoesPorPapel.push({
            roleId: role.id,
            permissaoId: perm.id
          });
        }
        // Técnicos têm permissões específicas
        else if (role.nome === 'TECNICO' && 
                (['recurso.listar', 'recurso.visualizar', 'recurso.analisar', 'recurso.historico.visualizar'].includes(perm.nome))) {
          permissoesPorPapel.push({
            roleId: role.id,
            permissaoId: perm.id
          });
        }
      }
    }

    // 4. Inserir as permissões verificando duplicações
    for (const item of permissoesPorPapel) {
      // Verificar se já existe esta associação
      const existente = await queryRunner.query(
        `SELECT 1 FROM role_permissao WHERE role_id = $1 AND permissao_id = $2`,
        [item.roleId, item.permissaoId]
      );

      // Se não existir, inserir
      if (!existente || existente.length === 0) {
        await queryRunner.query(
          `INSERT INTO role_permissao (role_id, permissao_id, created_at)
           VALUES ($1, $2, NOW())`,
          [item.roleId, item.permissaoId]
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover permissões de recurso para usuários não autorizados
    await queryRunner.query(`
      DELETE FROM role_permissao
      WHERE permissao_id IN (
        SELECT id FROM permissao
        WHERE nome LIKE 'recurso.%'
      ) AND role_id NOT IN (
        SELECT id FROM role
        WHERE nome IN ('ADMIN', 'GESTOR', 'TECNICO')
      );
    `);

    // Remover permissões
    await queryRunner.query(`
      DELETE FROM permissao WHERE nome LIKE 'recurso.%';
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_recurso_solicitacao_id;
      DROP INDEX IF EXISTS idx_recurso_status;
      DROP INDEX IF EXISTS idx_recurso_setor;
      DROP INDEX IF EXISTS idx_recurso_analista;
      DROP INDEX IF EXISTS idx_recurso_historico_recurso;
    `);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE IF EXISTS recurso_historico;`);
    await queryRunner.query(`DROP TABLE IF EXISTS recurso;`);

    // Remover enum status_recurso se existir
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type t 
                  JOIN pg_namespace n ON n.oid = t.typnamespace 
                  WHERE t.typname = 'status_recurso' AND n.nspname = 'public') THEN
          DROP TYPE status_recurso;
        END IF;
      END
      $$;
    `);
  }
}
