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
    console.log('Iniciando seed de mapeamento de roles para permissões...');
    
    try {
      // Verificar a estrutura das tabelas para confirmar os nomes das colunas
      console.log('Verificando estrutura da tabela role_permissao...');
      const tableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'role_permissao'`
      );
      
      // Mapear nomes de colunas para uso posterior
      const columnNames = tableInfo.map(column => column.column_name);
      console.log(`Colunas encontradas na tabela role_permissao: ${columnNames.join(', ')}`);
      
      // Verificar se a tabela de permissões existe
      console.log('Verificando estrutura da tabela permissao...');
      const permissionTableInfo = await dataSource.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_name = 'permissao'`
      );
      
      if (permissionTableInfo.length === 0) {
        throw new Error('Tabela de permissões não encontrada. Execute o seed de permissões primeiro.');
      }
      
      const permissionRepository = dataSource.getRepository(Permission);
      const rolePermissionRepository = dataSource.getRepository(RolePermission);

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
    } catch (error) {
      console.error(`Erro ao executar seed de mapeamento de roles para permissões: ${error.message}`);
      throw error;
    }
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

    try {
      // Busca a role pelo nome
      const role = await dataSource.query(
        'SELECT id FROM role WHERE nome = $1',
        [roleName],
      );

      if (!role || role.length === 0) {
        console.log(`Role '${roleName}' não encontrada, pulando mapeamento...`);
        return;
      }

      const roleId = role[0].id;
      console.log(`Role '${roleName}' encontrada com ID: ${roleId}`);

      // Busca as permissões pelos nomes
      for (const permissionName of permissionNames) {
        try {
          // Buscar permissão pelo nome
          const permission = await dataSource
            .getRepository(Permission)
            .findOne({ 
              where: { nome: permissionName }
            });

          if (!permission) {
            console.log(`Permissão '${permissionName}' não encontrada, pulando...`);
            continue;
          }

          const permissionId = permission.id;
          console.log(`Permissão '${permissionName}' encontrada com ID: ${permissionId}`);

          // Verifica se o mapeamento já existe
          const existingMapping = await dataSource
            .getRepository(RolePermission)
            .findOne({
              where: {
                role_id: roleId,
                permissao_id: permissionId,
              },
            });

          if (existingMapping) {
            console.log(`Mapeamento entre role '${roleName}' e permissão '${permissionName}' já existe, pulando...`);
            continue;
          }

          // Cria o mapeamento
          const rolePermission = new RolePermission();
          rolePermission.role_id = roleId;
          rolePermission.permissao_id = permissionId;

          await dataSource.getRepository(RolePermission).save(rolePermission);
          console.log(`Mapeamento entre role '${roleName}' e permissão '${permissionName}' criado com sucesso!`);
        } catch (error) {
          console.error(`Erro ao processar permissão '${permissionName}' para role '${roleName}': ${error.message}`);
          // Continua para a próxima permissão mesmo se houver erro
        }
      }
    } catch (error) {
      console.error(`Erro ao mapear role '${roleName}' para permissões: ${error.message}`);
      throw error;
    }
  }
}
