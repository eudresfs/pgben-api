import { DataSource } from 'typeorm';
import { Permission } from '../../../entities/permission.entity';
import { PermissionScope } from '../../../entities/permission-scope.entity';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { Status } from '@/enums/status.enum';

/**
 * Script de seed para popular as permissões do módulo de benefício.
 * 
 * Este script cria as permissões granulares para o módulo de benefício conforme
 * definido no catálogo de permissões, incluindo permissões compostas e
 * configurações de escopo padrão.
 */
export class PermissionBeneficioSeed {
  /**
   * Executa o seed das permissões do módulo de benefício.
   * 
   * @param dataSource Conexão com o banco de dados
   */
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);
    const permissionScopeRepository = dataSource.getRepository(PermissionScope);

    // Permissão composta para todas as operações do módulo de benefício
    // Usamos SQL direto para evitar problemas com campos que não existem na entidade
    let beneficioAllPermission = await permissionRepository.findOne({ where: { nome: 'beneficio.*' } });
    
    if (!beneficioAllPermission) {
      // Inserir diretamente no banco de dados
      const result = await dataSource.query(
        `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        ['beneficio.*', 'Todas as permissões do módulo de benefício', 'beneficio', '*', Status.ATIVO]
      );
      
      beneficioAllPermission = new Permission();
      beneficioAllPermission.id = result[0].id;
      beneficioAllPermission.nome = 'beneficio.*';
      beneficioAllPermission.descricao = 'Todas as permissões do módulo de benefício';
    }

    // Permissões individuais do módulo de benefício
    const permissions = [
      {
        nome: 'beneficio.listar',
        descricao: 'Listar benefícios com filtros e paginação',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.visualizar',
        descricao: 'Visualizar detalhes de um benefício específico',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.criar',
        descricao: 'Criar um novo tipo de benefício no sistema',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.editar',
        descricao: 'Editar informações de um tipo de benefício existente',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.excluir',
        descricao: 'Excluir um tipo de benefício do sistema',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.conceder',
        descricao: 'Conceder um benefício a um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.revogar',
        descricao: 'Revogar um benefício concedido a um cidadão',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.suspender',
        descricao: 'Suspender temporariamente um benefício concedido',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.reativar',
        descricao: 'Reativar um benefício suspenso',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.renovar',
        descricao: 'Renovar um benefício com prazo de validade',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.exportar',
        descricao: 'Exportar lista de benefícios em formato CSV ou Excel',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.relatorio',
        descricao: 'Gerar relatórios de benefícios',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.historico.visualizar',
        descricao: 'Visualizar histórico de alterações em um benefício',
        scopeType: TipoEscopo.UNIDADE,
      },
      {
        nome: 'beneficio.workflow.visualizar',
        descricao: 'Visualizar workflows de concessão de benefícios',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.workflow.criar',
        descricao: 'Criar um novo workflow de concessão de benefício',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.workflow.editar',
        descricao: 'Editar um workflow de concessão de benefício existente',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.workflow.excluir',
        descricao: 'Excluir um workflow de concessão de benefício',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.parametro.visualizar',
        descricao: 'Visualizar parâmetros de benefícios',
        scopeType: TipoEscopo.GLOBAL,
      },
      {
        nome: 'beneficio.parametro.editar',
        descricao: 'Editar parâmetros de benefícios',
        scopeType: TipoEscopo.GLOBAL,
      },
    ];

    // Cria as permissões individuais e configura o escopo padrão
    for (const permissionData of permissions) {
      const { nome, descricao, scopeType } = permissionData;
      
      // Verificar se a permissão já existe
      let permission = await permissionRepository.findOne({ where: { nome } });
      
      if (!permission) {
        // Extrair módulo e ação do nome
        const parts = nome.split('.');
        const modulo = parts[0];
        const acao = parts.slice(1).join('.');
        
        // Inserir diretamente no banco de dados para evitar problemas com campos não existentes na entidade
        const result = await dataSource.query(
          `INSERT INTO permissao (nome, descricao, modulo, acao, status) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id`,
          [nome, descricao, modulo, acao, Status.ATIVO]
        );
        
        permission = new Permission();
        permission.id = result[0].id;
        permission.nome = nome;
        permission.descricao = descricao;
      }
      
      // Configura o escopo padrão
      const permissionScope = permissionScopeRepository.create({
        permissao_id: permission.id,
        tipo_escopo_padrao: scopeType,
      });
      await permissionScopeRepository.save(permissionScope);
    }

    console.log('Seed de permissões do módulo de benefício concluído com sucesso!');
  }
}
