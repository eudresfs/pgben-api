import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para padronizar o campo tipo_operacao seguindo o padrão CRUD
 * 
 * Esta migration mapeia os valores existentes para os padrões:
 * - CREATE: Operações de criação
 * - READ: Operações de leitura/acesso
 * - UPDATE: Operações de atualização
 * - DELETE: Operações de exclusão
 * - LOGIN: Operações de autenticação
 * - LOGOUT: Operações de logout
 * - FAILED_LOGIN: Tentativas de login falharam
 * - APPROVE: Operações de aprovação
 * - REJECT: Operações de rejeição
 * - ACCESS: Acesso a dados sensíveis (LGPD)
 * - EXPORT: Exportação de dados
 * - ANONYMIZE: Anonimização de dados
 * - EXECUTION: Execução de operações
 * - CANCEL: Cancelamento de operações
 */
export class StandardizeTipoOperacao1755984200000 implements MigrationInterface {
  name = 'StandardizeTipoOperacao1755984200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando padronização do campo tipo_operacao...');

    // Primeiro, vamos adicionar os novos valores ao enum existente
    await queryRunner.query(`
      ALTER TYPE "tipo_operacao" ADD VALUE IF NOT EXISTS 'approve';
    `);
    
    await queryRunner.query(`
      ALTER TYPE "tipo_operacao" ADD VALUE IF NOT EXISTS 'reject';
    `);
    
    await queryRunner.query(`
      ALTER TYPE "tipo_operacao" ADD VALUE IF NOT EXISTS 'execution';
    `);
    
    await queryRunner.query(`
      ALTER TYPE "tipo_operacao" ADD VALUE IF NOT EXISTS 'cancel';
    `);

    // Mapear valores existentes para o padrão CRUD
    const mappings = [
      // Operações de criação
      { from: 'entity.created', to: 'create' },
      
      // Operações de leitura/acesso
      { from: 'entity.accessed', to: 'read' },
      { from: 'lgpd.sensitive.accessed', to: 'access' },
      
      // Operações de atualização
      { from: 'entity.updated', to: 'update' },
      
      // Operações de exclusão
      { from: 'entity.deleted', to: 'delete' },
      
      // Operações de sistema e segurança
      { from: 'security.login.success', to: 'login' },
      { from: 'security.token.refresh', to: 'login' },
      { from: 'SECURITY_EVENT', to: 'failed_login' },
      { from: 'PASSWORD_RESET_REQUEST', to: 'execution' },
      { from: 'PASSWORD_RESET_SUCCESS', to: 'execution' },
      
      // Operações de sistema
      { from: 'operation.success', to: 'execution' },
      { from: 'operation.start', to: 'execution' },
      { from: 'operation.error', to: 'execution' },
      { from: 'system.info', to: 'execution' },
      { from: 'system.error', to: 'execution' },
      { from: 'TEST_DIRECT', to: 'execution' }
    ];

    // Aplicar os mapeamentos
    for (const mapping of mappings) {
      console.log(`Mapeando '${mapping.from}' para '${mapping.to}'...`);
      
      await queryRunner.query(`
        UPDATE logs_auditoria 
        SET tipo_operacao = $1 
        WHERE tipo_operacao = $2
      `, [mapping.to, mapping.from]);
      
      const result = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM logs_auditoria 
        WHERE tipo_operacao = $1
      `, [mapping.to]);
      
      console.log(`Registros atualizados para '${mapping.to}': ${result[0].count}`);
    }

    // Verificar se ainda existem valores não padronizados
    const nonStandardValues = await queryRunner.query(`
      SELECT DISTINCT tipo_operacao, COUNT(*) as quantidade
      FROM logs_auditoria 
      WHERE tipo_operacao NOT IN (
        'create', 'read', 'update', 'delete', 'access', 'export', 
        'anonymize', 'login', 'logout', 'failed_login', 'approve', 
        'reject', 'execution', 'cancel'
      )
      GROUP BY tipo_operacao
      ORDER BY quantidade DESC
    `);

    if (nonStandardValues.length > 0) {
      console.log('Valores não padronizados encontrados:');
      nonStandardValues.forEach((row: any) => {
        console.log(`- ${row.tipo_operacao}: ${row.quantidade} registros`);
      });
    } else {
      console.log('Todos os valores foram padronizados com sucesso!');
    }

    console.log('Padronização do campo tipo_operacao concluída.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo padronização do campo tipo_operacao...');
    
    // Reverter os mapeamentos (apenas os principais para não perder dados)
    const reverseMappings = [
      { from: 'create', to: 'entity.created' },
      { from: 'update', to: 'entity.updated' },
      { from: 'delete', to: 'entity.deleted' },
      { from: 'login', to: 'security.login.success' },
      { from: 'failed_login', to: 'SECURITY_EVENT' },
      { from: 'execution', to: 'operation.success' }
    ];

    for (const mapping of reverseMappings) {
      await queryRunner.query(`
        UPDATE logs_auditoria 
        SET tipo_operacao = $1 
        WHERE tipo_operacao = $2
      `, [mapping.to, mapping.from]);
    }

    console.log('Reversão da padronização concluída.');
  }
}