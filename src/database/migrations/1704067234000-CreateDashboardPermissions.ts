import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDashboardPermissions1704067223000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se as permissões já existem
    const permissaoVisualizarExists = await queryRunner.query(`
      SELECT 1 FROM permissao WHERE nome = 'dashboard.visualizar'
    `);
    
    const permissaoExportarExists = await queryRunner.query(`
      SELECT 1 FROM permissao WHERE nome = 'dashboard.exportar'
    `);

    // Inserir permissão de visualização se não existir
    if (!permissaoVisualizarExists || permissaoVisualizarExists.length === 0) {
      await queryRunner.query(`
        INSERT INTO permissao (id, nome, descricao, modulo, acao, created_at, updated_at)
        VALUES (uuid_generate_v4(), 'dashboard.visualizar', 'modulo', 'visualizar', 'Visualizar dashboard e métricas', NOW(), NOW());
      `);
    }

    // Inserir permissão de exportação se não existir
    if (!permissaoExportarExists || permissaoExportarExists.length === 0) {
      await queryRunner.query(`
        INSERT INTO permissao (id, nome, descricao, modulo, acao, created_at, updated_at)
        VALUES (uuid_generate_v4(), 'dashboard.exportar', 'Exportar dados do dashboard', 'modulo', 'exportar', NOW(), NOW());
      `);
    }

    // Obter IDs dos papéis
    const roles = await queryRunner.query(`
      SELECT id, nome FROM role
      WHERE nome IN ('ADMIN', 'GESTOR', 'TECNICO')
    `);

    // Obter IDs das permissões
    const permissoes = await queryRunner.query(`
      SELECT id, nome FROM permissao
      WHERE nome LIKE 'dashboard.%'
    `);

    // Para cada permissão, associar aos papéis
    for (const permissao of permissoes) {
      for (const role of roles) {
        // Verificar se a permissão deve ser associada ao papel
        if (
          // Admin e Gestor têm todas as permissões
          (role.nome === 'ADMIN' || role.nome === 'GESTOR') ||
          // Técnicos só podem visualizar
          (role.nome === 'TECNICO' && permissao.nome === 'dashboard.visualizar')
        ) {
          // Verificar se a associação já existe
          const relacaoExiste = await queryRunner.query(`
            SELECT 1 FROM role_permissao 
            WHERE role_id = $1 AND permissao_id = $2
          `, [role.id, permissao.id]);

          if (!relacaoExiste || relacaoExiste.length === 0) {
            await queryRunner.query(`
              INSERT INTO role_permissao (id, role_id, permissao_id, created_at, updated_at)
              VALUES (uuid_generate_v4(), $1, $2, NOW(), NOW())
            `, [role.id, permissao.id]);
          }
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Remover permissões dos papéis
      await queryRunner.query(`
        DELETE FROM role_permissao
        WHERE permissao_id IN (
          SELECT id FROM permissao WHERE nome LIKE 'dashboard.%'
        );
      `);

      // Remover permissões
      await queryRunner.query(`
        DELETE FROM permissao WHERE nome LIKE 'dashboard.%';
      `);

      console.log('\n✅ Permissões do dashboard removidas com sucesso');
    } catch (error) {
      console.error('\n❌ Erro ao remover permissões do dashboard:', error.message);
      throw error;
    }
  }
}
