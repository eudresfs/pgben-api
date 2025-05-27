import { DataSource, Repository } from 'typeorm';
import { Seeder } from '../seeder.interface';
import { Permission } from '../../../auth/entities/permission.entity';
import { PermissionRepository } from '../../../auth/repositories/permission.repository';
import { Logger } from '@nestjs/common';

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
    
    // Criar repositório de permissões personalizado usando o DataSource
    const permissionRepository = new PermissionRepository(dataSource);

    // Criar permissão raiz para cada módulo
    await this.createModuleRootPermissions(permissionRepository);
    
    // Executar os seeders específicos de cada módulo
    await this.runModuleSeeders(dataSource, permissionRepository);
    
    this.logger.log('Seed de permissões concluído com sucesso!');
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
    
    // Importar e executar os seeders específicos de cada módulo
    // Isso será implementado conforme os seeders específicos forem criados
    
    // Exemplo de como será feito:
    // const usuarioPermissionSeeder = new UsuarioPermissionSeeder();
    // await usuarioPermissionSeeder.run(dataSource, permissionRepository);
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
    permission.composta = composta;
    
    if (permissao_pai_id) {
      permission.permissao_pai_id = permissao_pai_id;
    }
    
    return await permissionRepository.save(permission);
  }
}
