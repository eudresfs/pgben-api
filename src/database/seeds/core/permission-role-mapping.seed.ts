import { DataSource } from 'typeorm';
import { RolePermission } from '../../../auth/entities/role-permission.entity';
import { Permission } from '../../../auth/entities/permission.entity';

/**
 * Seed para mapear as roles existentes para as novas permissões granulares.
 * 
 * Este seed cria mapeamentos entre as roles existentes e as novas permissões granulares,
 * facilitando a transição do modelo baseado em roles para o modelo de permissões granulares.
 */
export class PermissionRoleMappingSeed {
  /**
   * Executa o seed para criar os mapeamentos entre roles e permissões.
   * 
   * @param dataSource Conexão com o banco de dados
   * @returns Promise que resolve quando o seed for concluído
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const rolePermissionRepository = dataSource.getRepository(RolePermission);

    console.log('Iniciando seed de mapeamento de roles para permissões...');

    // Mapeia as roles para permissões
    await this.mapRoleToPermissions(
      dataSource,
      'ADMIN',
      [
        'cidadao.*',
        'solicitacao.*',
        'beneficio.*',
        'documento.*',
        'auditoria.*',
        'usuario.*',
        'unidade.*',
        'relatorio.*',
        'configuracao.*',
      ],
    );

    await this.mapRoleToPermissions(
      dataSource,
      'GESTOR',
      [
        'cidadao.*',
        'solicitacao.*',
        'beneficio.*',
        'documento.*',
        'auditoria.listar',
        'auditoria.visualizar',
        'auditoria.buscar.usuario',
        'auditoria.buscar.entidade',
        'auditoria.buscar.operacao',
        'auditoria.buscar.data',
        'auditoria.exportar',
        'usuario.listar',
        'usuario.visualizar',
        'usuario.criar',
        'usuario.editar',
        'usuario.desativar',
        'usuario.ativar',
        'usuario.resetar_senha',
        'usuario.alterar_senha',
        'usuario.exportar',
        'usuario.role.listar',
        'usuario.role.visualizar',
        'usuario.role.atribuir',
        'usuario.role.revogar',
        'usuario.permissao.listar',
        'usuario.permissao.visualizar',
        'usuario.permissao.atribuir',
        'usuario.permissao.revogar',
        'unidade.listar',
        'unidade.visualizar',
        'unidade.editar',
        'unidade.hierarquia.visualizar',
        'unidade.configuracao.listar',
        'unidade.configuracao.editar',
        'relatorio.*',
      ],
    );

    await this.mapRoleToPermissions(
      dataSource,
      'TECNICO',
      [
        'cidadao.listar',
        'cidadao.visualizar',
        'cidadao.criar',
        'cidadao.editar',
        'cidadao.buscar.cpf',
        'cidadao.buscar.nis',
        'cidadao.endereco.*',
        'cidadao.contato.*',
        'solicitacao.listar',
        'solicitacao.visualizar',
        'solicitacao.criar',
        'solicitacao.editar',
        'solicitacao.status.transicao.RASCUNHO.ENVIADA',
        'solicitacao.status.transicao.ENVIADA.EM_ANALISE',
        'solicitacao.status.transicao.EM_ANALISE.APROVADA',
        'solicitacao.status.transicao.EM_ANALISE.PENDENTE',
        'solicitacao.status.transicao.EM_ANALISE.REJEITADA',
        'solicitacao.status.transicao.PENDENTE.EM_ANALISE',
        'solicitacao.observacao.*',
        'beneficio.listar',
        'beneficio.visualizar',
        'beneficio.criar',
        'beneficio.editar',
        'beneficio.conceder',
        'beneficio.revogar',
        'documento.listar',
        'documento.visualizar',
        'documento.upload',
        'documento.download',
        'documento.validar',
        'documento.invalidar',
        'usuario.alterar_senha',
        'relatorio.listar',
        'relatorio.gerar',
        'relatorio.exportar',
        'relatorio.cidadao',
        'relatorio.solicitacao',
        'relatorio.beneficio',
        'relatorio.atendimento',
      ],
    );

    await this.mapRoleToPermissions(
      dataSource,
      'ASSISTENTE_SOCIAL',
      [
        'cidadao.listar',
        'cidadao.visualizar',
        'cidadao.criar',
        'cidadao.editar',
        'cidadao.buscar.cpf',
        'cidadao.buscar.nis',
        'cidadao.endereco.*',
        'cidadao.contato.*',
        'solicitacao.listar',
        'solicitacao.visualizar',
        'solicitacao.criar',
        'solicitacao.editar',
        'solicitacao.status.transicao.RASCUNHO.ENVIADA',
        'solicitacao.observacao.listar',
        'solicitacao.observacao.criar',
        'beneficio.listar',
        'beneficio.visualizar',
        'documento.listar',
        'documento.visualizar',
        'documento.upload',
        'documento.download',
        'usuario.alterar_senha',
        'relatorio.listar',
        'relatorio.gerar',
        'relatorio.exportar',
        'relatorio.atendimento',
      ],
    );

    await this.mapRoleToPermissions(
      dataSource,
      'CIDADAO',
      [
        'cidadao.visualizar.proprio',
        'cidadao.editar.proprio',
        'cidadao.endereco.visualizar.proprio',
        'cidadao.endereco.editar.proprio',
        'cidadao.contato.visualizar.proprio',
        'cidadao.contato.editar.proprio',
        'solicitacao.listar.proprio',
        'solicitacao.visualizar.proprio',
        'solicitacao.criar.proprio',
        'solicitacao.editar.proprio',
        'solicitacao.status.transicao.RASCUNHO.ENVIADA',
        'beneficio.listar.proprio',
        'beneficio.visualizar.proprio',
        'documento.listar.proprio',
        'documento.visualizar.proprio',
        'documento.upload.proprio',
        'documento.download.proprio',
        'usuario.alterar_senha',
      ],
    );

    console.log('Seed de mapeamento de roles para permissões concluído com sucesso!');
  }

  /**
   * Mapeia uma role para um conjunto de permissões.
   * 
   * @param dataSource Conexão com o banco de dados
   * @param roleName Nome da role
   * @param permissionNames Nomes das permissões
   * @returns Promise que resolve quando o mapeamento for concluído
   */
  private static async mapRoleToPermissions(
    dataSource: DataSource,
    roleName: string,
    permissionNames: string[],
  ): Promise<void> {
    console.log(`Mapeando role '${roleName}' para permissões...`);

    // Busca a role pelo nome
    const role = await dataSource.query(
      'SELECT id FROM role WHERE name = $1',
      [roleName],
    );

    if (!role || role.length === 0) {
      console.log(`Role '${roleName}' não encontrada, pulando mapeamento...`);
      return;
    }

    const roleId = role[0].id;

    // Busca as permissões pelos nomes
    for (const permissionName of permissionNames) {
      const permission = await dataSource
        .getRepository(Permission)
        .findOne({ where: { name: permissionName } });

      if (!permission) {
        console.log(`Permissão '${permissionName}' não encontrada, pulando...`);
        continue;
      }

      // Verifica se o mapeamento já existe
      const existingMapping = await dataSource
        .getRepository(RolePermission)
        .findOne({
          where: {
            roleId,
            permissionId: permission.id,
          },
        });

      if (existingMapping) {
        console.log(`Mapeamento entre role '${roleName}' e permissão '${permissionName}' já existe, pulando...`);
        continue;
      }

      // Cria o mapeamento
      const rolePermission = new RolePermission();
      rolePermission.roleId = roleId;
      rolePermission.permissionId = permission.id;

      await dataSource.getRepository(RolePermission).save(rolePermission);
      console.log(`Mapeamento entre role '${roleName}' e permissão '${permissionName}' criado com sucesso!`);
    }
  }
}
