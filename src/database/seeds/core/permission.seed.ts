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
      
      // Verificar se a coluna composta existe
      const hasCompostaColumn = columnNames.includes('composta');
      if (!hasCompostaColumn) {
        this.logger.warn('Coluna "composta" não encontrada na tabela permissao. Usando valor padrão FALSE.');
      }
      
      // Criar repositório de permissões personalizado usando o DataSource
      const permissionRepository = new PermissionRepository(dataSource);
      
      // Armazenar a informação sobre a coluna composta para uso posterior
      (permissionRepository as any).hasCompostaColumn = hasCompostaColumn;

      // Criar permissão raiz para cada módulo
      await this.createModuleRootPermissions(permissionRepository);
      
      // Executar os seeders específicos de cada módulo
      await this.runModuleSeeders(dataSource, permissionRepository);
      
      this.logger.log('Seed de permissões concluído com sucesso!');
    } catch (error) {
      this.logger.error(`Erro ao executar seed de permissões: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria as permissões raiz para cada módulo do sistema
   */
  private async createModuleRootPermissions(
    permissionRepository: PermissionRepository
  ): Promise<void> {
    this.logger.log('Criando permissões raiz dos módulos...');
    
    // Permissões raiz para cada módulo (permissões compostas)
    const moduleRoots = [
      { nome: 'usuario.*', descricao: 'Todas as permissões do módulo de usuários' },
      { nome: 'cidadao.*', descricao: 'Todas as permissões do módulo de cidadãos' },
      { nome: 'beneficio.*', descricao: 'Todas as permissões do módulo de benefícios' },
      { nome: 'solicitacao.*', descricao: 'Todas as permissões do módulo de solicitações' },
      { nome: 'documento.*', descricao: 'Todas as permissões do módulo de documentos' },
      { nome: 'auditoria.*', descricao: 'Todas as permissões do módulo de auditoria' },
      { nome: 'unidade.*', descricao: 'Todas as permissões do módulo de unidades' },
      { nome: 'relatorio.*', descricao: 'Todas as permissões do módulo de relatórios' },
      { nome: 'configuracao.*', descricao: 'Todas as permissões do módulo de configurações' },
      { nome: 'notificacao.*', descricao: 'Todas as permissões do módulo de notificações' },
      { nome: 'metrica.*', descricao: 'Todas as permissões do módulo de métricas' },
    ];
    
    for (const rootPerm of moduleRoots) {
      await this.createPermission(
        permissionRepository,
        rootPerm.nome,
        rootPerm.descricao,
        true,
      );
    }
  }

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
    permissao_pai_id?: string,
  ): Promise<Permission> {
    const existingPermission = await permissionRepository.findOneBy({ nome });
    
    if (existingPermission) {
      return existingPermission;
    }
    
    const permission = new Permission();
    permission.nome = nome;
    permission.descricao = descricao;
    
    // Verificar se a coluna composta existe antes de atribuir o valor
    const hasCompostaColumn = (permissionRepository as any).hasCompostaColumn;
    if (hasCompostaColumn !== false) {
      permission.composta = composta;
    }
    
    if (permissao_pai_id) {
      permission.permissao_pai_id = permissao_pai_id;
    }
    
    return await permissionRepository.save(permission);
  }
}
