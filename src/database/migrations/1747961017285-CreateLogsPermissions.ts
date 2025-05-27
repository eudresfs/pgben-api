import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLogsPermissions1747961017285 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar permissões relacionadas aos logs
    const permissoesLog = [
      { nome: 'log.ler', descricao: 'Visualizar logs de auditoria', modulo: 'log', acao: 'ler' },
      { nome: 'log.exportar', descricao: 'Exportar logs de auditoria', modulo: 'log', acao: 'exportar' }
    ];

    // Inserir cada permissão verificando se já existe
    for (const perm of permissoesLog) {
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
      `SELECT id, nome FROM role WHERE nome IN ('ADMIN', 'GESTOR')`
    );

    // 2. Obter as permissões de logs
    const permissoesBD = await queryRunner.query(
      `SELECT id, nome FROM permissao WHERE nome LIKE 'log.%'`
    );

    // 3. Mapear quais permissões cada papel deve ter
    const permissoesPorPapel: { roleId: string; permissaoId: string }[] = [];
    
    for (const role of roles) {
      for (const perm of permissoesBD) {
        // Admin e Gestor têm todas as permissões de log
        permissoesPorPapel.push({
          roleId: role.id,
          permissaoId: perm.id
        });
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
          `INSERT INTO role_permissao (role_id, permissao_id, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [item.roleId, item.permissaoId]
        );
      }
    }

    // Remover permissões de log para usuários não autorizados
    await queryRunner.query(`
      DELETE FROM role_permissao
      WHERE permissao_id IN (
        SELECT id FROM permissao
        WHERE nome LIKE 'log.%'
      ) AND role_id NOT IN (
        SELECT id FROM role
        WHERE nome IN ('ADMIN', 'GESTOR')
      );
    `);

    // Remover permissões obsoletas
    await queryRunner.query(`
      DELETE FROM permissao
      WHERE nome LIKE 'log.%' 
      AND nome NOT IN ('log.ler', 'log.exportar');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover permissões de logs dos papéis
    await queryRunner.query(`
      DELETE FROM role_permissao
      WHERE permissao_id IN (
        SELECT id FROM permissao
        WHERE nome LIKE 'log.%'
      );
    `);

    // Remover permissões de logs
    await queryRunner.query(`
      DELETE FROM permissao
      WHERE nome LIKE 'log.%';
    `);
  }
}
