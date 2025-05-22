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
      { name: 'usuario.*', description: 'Todas as permissões do módulo de usuários' },
      { name: 'cidadao.*', description: 'Todas as permissões do módulo de cidadãos' },
      { name: 'beneficio.*', description: 'Todas as permissões do módulo de benefícios' },
      { name: 'solicitacao.*', description: 'Todas as permissões do módulo de solicitações' },
      { name: 'documento.*', description: 'Todas as permissões do módulo de documentos' },
      { name: 'auditoria.*', description: 'Todas as permissões do módulo de auditoria' },
      { name: 'unidade.*', description: 'Todas as permissões do módulo de unidades' },
      { name: 'relatorio.*', description: 'Todas as permissões do módulo de relatórios' },
      { name: 'configuracao.*', description: 'Todas as permissões do módulo de configurações' },
      { name: 'notificacao.*', description: 'Todas as permissões do módulo de notificações' },
      { name: 'metrica.*', description: 'Todas as permissões do módulo de métricas' },
    ];
    
    for (const rootPerm of moduleRoots) {
      await this.createPermission(
        permissionRepository,
        rootPerm.name,
        rootPerm.description,
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
    name: string,
    description: string,
    isComposite: boolean,
    parentId?: string,
  ): Promise<Permission> {
    const existingPermission = await permissionRepository.findOneBy({ name });
    
    if (existingPermission) {
      return existingPermission;
    }
    
    const permission = new Permission();
    permission.name = name;
    permission.description = description;
    permission.isComposite = isComposite;
    
    if (parentId) {
      permission.parentId = parentId;
    }
    
    return await permissionRepository.save(permission);
  }
}
