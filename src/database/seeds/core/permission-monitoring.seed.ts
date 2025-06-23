import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Status } from '../../../enums/status.enum';

/**
 * Seed de permissões para o módulo de monitoring / performance
 *
 * Este seed cria a permissão composta `monitoring.*` e permissões
 * granulares utilizadas pelo `PerformanceController`.
 */
export class PermissionMonitoringSeed {
  private static readonly logger = new Logger(PermissionMonitoringSeed.name);

  /**
   * Executa o seed de permissões do módulo de monitoring
   */
  static async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões do módulo de monitoring...');

    try {
      // Criar permissão composta
      await this.createCompositePermission(dataSource);

      // Criar permissões granulares
      await this.createGranularPermissions(dataSource);

      this.logger.log('Seed de permissões de monitoring concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de monitoring: ${error.message}`);
      throw error;
    }
  }

  /** Cria a permissão composta `monitoring.*` se não existir. */
  private static async createCompositePermission(dataSource: DataSource): Promise<void> {
    const existing = await dataSource.query(`SELECT id FROM permissao WHERE nome = $1`, ['monitoring.*']);
    if (existing && existing.length > 0) {
      this.logger.log('Permissão monitoring.* já existe, pulando...');
      return;
    }

    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) VALUES ($1, $2, $3, $4, $5)`,
      ['monitoring.*', 'Todas as permissões do módulo de monitoring', 'monitoring', '*', Status.ATIVO],
    );

    this.logger.log('Permissão composta monitoring.* criada.');
  }

  /** Cria as permissões granulares usadas pelo PerformanceController. */
  private static async createGranularPermissions(dataSource: DataSource): Promise<void> {
    const granular = [
      {
        nome: 'monitoring.performance.stats.visualizar',
        descricao: 'Visualizar estatísticas gerais de performance',
        acao: 'performance.stats.visualizar',
      },
      {
        nome: 'monitoring.performance.metrics.visualizar',
        descricao: 'Visualizar métricas detalhadas de performance',
        acao: 'performance.metrics.visualizar',
      },
      {
        nome: 'monitoring.performance.metrics.limpar',
        descricao: 'Limpar métricas de performance em cache',
        acao: 'performance.metrics.limpar',
      },
      {
        nome: 'monitoring.performance.system.visualizar',
        descricao: 'Visualizar informações do sistema',
        acao: 'performance.system.visualizar',
      },
    ];

    for (const perm of granular) {
      await this.createPermissionIfNotExists(dataSource, perm.nome, perm.descricao, perm.acao);
    }
  }

  /** Cria a permissão se ela não existir. */
  private static async createPermissionIfNotExists(
    dataSource: DataSource,
    nome: string,
    descricao: string,
    acao: string,
  ): Promise<void> {
    const existing = await dataSource.query(`SELECT id FROM permissao WHERE nome = $1`, [nome]);
    if (existing && existing.length > 0) {
      this.logger.log(`Permissão '${nome}' já existe, pulando...`);
      return;
    }

    await dataSource.query(
      `INSERT INTO permissao (nome, descricao, modulo, acao, status) VALUES ($1, $2, $3, $4, $5)`,
      [nome, descricao, 'monitoring', acao, Status.ATIVO],
    );

    this.logger.log(`Permissão '${nome}' criada.`);
  }
}
