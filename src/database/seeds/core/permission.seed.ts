import { DataSource, Repository } from 'typeorm';
import { Seeder } from '../seeder.interface';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionRepository } from '../../../auth/repositories/permission.repository';
import { Logger } from '@nestjs/common';

// Importar os seeders específicos de cada módulo
import { PermissionAuditoriaSeed } from './permission-auditoria.seed';
import { PermissionBeneficioSeed } from './permission-beneficio.seed';
import { PermissionCidadaoSeed } from './permission-cidadao.seed';
import { PermissionConfiguracaoSeed } from './permission-configuracao.seed';
import { PermissionDocumentoSeed } from './permission-documento.seed';
import { PermissionRelatorioSeed } from './permission-relatorio.seed';
import { PermissionSolicitacaoSeed } from './permission-solicitacao.seed';
import { PermissionUnidadeSeed } from './permission-unidade.seed';
import { PermissionUsuarioSeed } from './permission-usuario.seed';
// Novos seeders de permissão
import { PermissionNotificacaoSeed } from './permission-notificacao.seed';
import { PermissionMetricasSeed } from './permission-metricas.seed';
import { PermissionIntegradorSeed } from './permission-integrador.seed';
import { PermissionJudicialSeed } from './permission-judicial.seed';
import { PermissionOcorrenciaSeed } from './permission-ocorrencia.seed';
import { PermissionPagamentoSeed } from './permission-pagamento.seed';
import { PermissionRecursoSeed } from './permission-recurso.seed';
import { PermissionRelatoriosUnificadoSeed } from './permission-relatorios-unificado.seed';

/**
 * Seeder para permissões do sistema
 * 
 * Este seeder é responsável por criar as permissões básicas do sistema
 * e coordenar a execução dos seeders específicos de cada módulo.
 */
export class PermissionSeeder implements Seeder {
  private readonly logger = new Logger(PermissionSeeder.name);

  async run(dataSource: DataSource): Promise<void> {
    this.logger.log('Iniciando seed de permissões...');
    
    try {
      // Verificar a estrutura da tabela permissao
      this.logger.log('Verificando estrutura da tabela permissao...');
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'permissao'`
      );
      
      if (tableInfo.length === 0) {
        throw new Error('Tabela permissao não encontrada no banco de dados');
      }
      
      const columnNames = tableInfo.map(col => col.column_name);
      this.logger.log(`Colunas encontradas na tabela permissao: ${columnNames.join(', ')}`);
      
      // Criar permissões raiz para cada módulo diretamente com SQL
      this.logger.log('Criando permissões raiz dos módulos usando SQL direto...');
      
      // Lista de permissões raiz para os módulos
      const moduleRoots = [
        { nome: 'usuario.*', descricao: 'Todas as permissões do módulo de usuários', modulo: 'usuario', acao: '*' },
        { nome: 'cidadao.*', descricao: 'Todas as permissões do módulo de cidadãos', modulo: 'cidadao', acao: '*' },
        { nome: 'beneficio.*', descricao: 'Todas as permissões do módulo de benefícios', modulo: 'beneficio', acao: '*' },
        { nome: 'solicitacao.*', descricao: 'Todas as permissões do módulo de solicitações', modulo: 'solicitacao', acao: '*' },
        { nome: 'documento.*', descricao: 'Todas as permissões do módulo de documentos', modulo: 'documento', acao: '*' },
        { nome: 'auditoria.*', descricao: 'Todas as permissões do módulo de auditoria', modulo: 'auditoria', acao: '*' },
        { nome: 'unidade.*', descricao: 'Todas as permissões do módulo de unidades', modulo: 'unidade', acao: '*' },
        { nome: 'relatorio.*', descricao: 'Todas as permissões do módulo de relatórios', modulo: 'relatorio', acao: '*' },
        { nome: 'configuracao.*', descricao: 'Todas as permissões do módulo de configurações', modulo: 'configuracao', acao: '*' },
        { nome: 'notificacao.*', descricao: 'Todas as permissões do módulo de notificações', modulo: 'notificacao', acao: '*' },
        { nome: 'metrica.*', descricao: 'Todas as permissões do módulo de métricas', modulo: 'metrica', acao: '*' },
        { nome: 'integrador.*', descricao: 'Todas as permissões do módulo de integrador', modulo: 'integrador', acao: '*' },
        { nome: 'judicial.*', descricao: 'Todas as permissões do módulo judicial', modulo: 'judicial', acao: '*' },
        { nome: 'ocorrencia.*', descricao: 'Todas as permissões do módulo de ocorrências', modulo: 'ocorrencia', acao: '*' },
        { nome: 'pagamento.*', descricao: 'Todas as permissões do módulo de pagamentos', modulo: 'pagamento', acao: '*' },
        { nome: 'recurso.*', descricao: 'Todas as permissões do módulo de recursos', modulo: 'recurso', acao: '*' },
        { nome: 'relatorios-unificado.*', descricao: 'Todas as permissões do módulo de relatórios unificado', modulo: 'relatorios-unificado', acao: '*' },
      ];
      
      for (const rootPerm of moduleRoots) {
        // Verificar se já existe
        const existingResult = await dataSource.query(
          `SELECT id FROM permissao WHERE nome = $1`,
          [rootPerm.nome]
        );
        
        if (existingResult && existingResult.length > 0) {
          this.logger.log(`Permissão '${rootPerm.nome}' já existe, pulando...`);
          continue;
        }
        
        // Inserir nova permissão
        await dataSource.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
           VALUES ($1, $2, $3, $4, $5)`,
          [rootPerm.nome, rootPerm.descricao, rootPerm.modulo, rootPerm.acao, true]
        );
        
        this.logger.log(`Permissão '${rootPerm.nome}' criada com sucesso.`);
      }
      
      // Criar repositório de permissões personalizado para passar aos seeders de módulos
      const permissionRepository = new PermissionRepository(dataSource);
      
      // Executar os seeders específicos de cada módulo
      await this.runModuleSeeders(dataSource, permissionRepository);
      
      this.logger.log('Seed de permissões concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões: ${error.message}`);
      throw error;
    }
  }

  // O método createModuleRootPermissions foi removido pois as permissões raiz
  // agora são criadas diretamente no método run usando SQL nativo

  /**
   * Executa os seeders específicos de cada módulo
   */
  private async runModuleSeeders(
    dataSource: DataSource,
    permissionRepository: PermissionRepository
  ): Promise<void> {
    this.logger.log('Executando seeders específicos de cada módulo...');
    
    try {
      // Executar os seeders de módulos em sequência
      this.logger.log('Executando seed de permissões de usuário');
      await PermissionUsuarioSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de cidadão');
      await PermissionCidadaoSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de benefício');
      await PermissionBeneficioSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de solicitação');
      await PermissionSolicitacaoSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de documento');
      await PermissionDocumentoSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de auditoria');
      await PermissionAuditoriaSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de unidade');
      await PermissionUnidadeSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de relatório');
      await PermissionRelatorioSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de configuração');
      await PermissionConfiguracaoSeed.run(dataSource);
      
      // Executar os novos seeders de permissão
      this.logger.log('Executando seed de permissões de notificação');
      await PermissionNotificacaoSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de métricas');
      await PermissionMetricasSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de integrador');
      await PermissionIntegradorSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões judicial');
      await PermissionJudicialSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de ocorrência');
      await PermissionOcorrenciaSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de pagamento');
      await PermissionPagamentoSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de recurso');
      await PermissionRecursoSeed.run(dataSource);
      
      this.logger.log('Executando seed de permissões de relatórios unificado');
      await PermissionRelatoriosUnificadoSeed.run(dataSource);
      
      this.logger.log('Todos os seeders de módulos executados com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seeders de módulos: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria uma permissão se ela não existir
   */
  private async createPermission(
    permissionRepository: PermissionRepository,
    nome: string,
    descricao: string,
    composta: boolean,
  ): Promise<Permission> {
    try {
      // Usar SQL nativo para todas as operações para evitar problemas com mapeamento de colunas
      const dataSource = permissionRepository.manager.connection;
      
      // Verificar se a permissão já existe
      const existingPermissionResult = await dataSource.query(
        `SELECT * FROM permissao WHERE nome = $1 LIMIT 1`,
        [nome]
      );
      
      if (existingPermissionResult && existingPermissionResult.length > 0) {
        // Converter o resultado para uma entidade Permission
        const permission = new Permission();
        const row = existingPermissionResult[0];
        permission.id = row.id;
        permission.nome = row.nome;
        permission.descricao = row.descricao;
        permission.modulo = row.modulo;
        permission.acao = row.acao;
        permission.created_at = row.created_at;
        permission.updated_at = row.updated_at;
        return permission;
      }
      
      // Extrair módulo e ação do nome da permissão
      const parts = nome.split('.');
      const modulo = parts[0];
      const acao = parts.length > 1 ? parts.slice(1).join('.') : null;
      
      // Inserir nova permissão diretamente no banco de dados
      const result = await dataSource.query(
        `INSERT INTO permissao (nome, descricao, modulo, acao, ativo) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, nome, descricao, modulo, acao, created_at, updated_at`,
        [nome, descricao, modulo, acao, true]
      );
      
      if (!result || result.length === 0) {
        throw new Error(`Falha ao inserir permissão: ${nome}`);
      }
      
      // Converter o resultado para uma entidade Permission
      const permission = new Permission();
      const row = result[0];
      permission.id = row.id;
      permission.nome = row.nome;
      permission.descricao = row.descricao;
      permission.modulo = row.modulo;
      permission.acao = row.acao;
      permission.created_at = row.created_at;
      permission.updated_at = row.updated_at;
      return permission;
    } catch (error) {
      this.logger.error(`Erro ao criar permissão ${nome}: ${error.message}`);
      throw error;
    }
  }
}
