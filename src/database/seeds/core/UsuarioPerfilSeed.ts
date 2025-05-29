import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BaseSeed } from '../base-seed';

/**
 * Seed para criação de perfis e usuários essenciais
 *
 * Este seed cria os perfis básicos do sistema e um usuário administrador
 * para acesso inicial ao sistema
 */
export class UsuarioPerfilSeed extends BaseSeed {
  protected getNome(): string {
    return 'UsuarioPerfilSeed';
  }

  protected async verificarEstruturaDasTabelas(dataSource: DataSource): Promise<void> {
    // Verificar se as tabelas role e usuario existem
    const roleInfo = await this.executarComTratamento(
      'Verificar tabela role',
      async () => await this.obterInformacoesTabela(dataSource, 'role')
    );

    if (!roleInfo) {
      throw new Error('Tabela role não encontrada no banco de dados');
    }

    const usuarioInfo = await this.executarComTratamento(
      'Verificar tabela usuario',
      async () => await this.obterInformacoesTabela(dataSource, 'usuario')
    );

    if (!usuarioInfo) {
      throw new Error('Tabela usuario não encontrada no banco de dados');
    }
  }

  protected async executarSeed(dataSource: DataSource): Promise<void> {
    // Criar perfis (roles)
    await this.criarPerfis(dataSource);
    
    // Criar usuário administrador
    await this.criarUsuarioAdmin(dataSource);
  }

  private async criarPerfis(dataSource: DataSource): Promise<void> {
    // Obter informações da tabela role
    const { colunas, statusColumnName } = await this.obterInformacoesTabela(dataSource, 'role');
    
    // Lista de perfis básicos do sistema
    const perfis = [
      {
        nome: 'Administrador',
        descricao: 'Acesso total ao sistema',
        ativo: true,
      },
      {
        nome: 'Gestor SEMTAS',
        descricao: 'Gestão de todas as unidades',
        ativo: true,
      },
      {
        nome: 'Técnico SEMTAS',
        descricao: 'Operações técnicas em todas as unidades',
        ativo: true,
      },
      {
        nome: 'Técnico Unidade',
        descricao: 'Operações técnicas na unidade específica',
        ativo: true,
      },
    ];

    // Inserir ou atualizar cada role
    for (const role of perfis) {
      await this.executarComTratamento(
        `Processar role ${role.nome}`,
        async () => {
          // Verificar se o role já existe
          const roleExistente = await dataSource.query(
            'SELECT id FROM role WHERE nome = $1',
            [role.nome]
          );

          if (roleExistente.length === 0) {
            console.log(`Criando role ${role.nome}...`);
            
            // Preparar colunas e valores para inserção
            const colunasInsercao = ['nome', 'descricao', statusColumnName];
            const valoresInsercao = [role.nome, role.descricao, role.ativo];
            
            // Adicionar timestamps obrigatórios
          if (colunas.includes('created_at')) {
            colunasInsercao.push('created_at');
            valoresInsercao.push(new Date().toISOString());
          }
          
          if (colunas.includes('updated_at')) {
            colunasInsercao.push('updated_at');
            valoresInsercao.push(new Date().toISOString());
          }
            
            // Construir e executar a query de inserção
            const { query, params } = this.construirQueryInsercao('role', colunasInsercao, valoresInsercao);
            await dataSource.query(query, params);
            
            console.log(`Perfil ${role.nome} criado com sucesso`);
          } else {
            console.log(`Perfil ${role.nome} já existe, atualizando...`);
            
            // Preparar colunas e valores para atualização
            const colunasAtualizacao = ['descricao', statusColumnName];
            const valoresAtualizacao = [role.descricao, role.ativo];
            
            // Construir e executar a query de atualização
            const { query, params } = this.construirQueryAtualizacao(
              'role', 
              colunasAtualizacao, 
              valoresAtualizacao, 
              'nome = $1', 
              [role.nome]
            );
            
            await dataSource.query(query, params);
            console.log(`Perfil ${role.nome} atualizado com sucesso`);
          }
        }
      );
    }
  }

  private async criarUsuarioAdmin(dataSource: DataSource): Promise<void> {
    // Obter informações da tabela usuario
    const { colunas, statusColumnName } = await this.obterInformacoesTabela(dataSource, 'usuario');
    
    // Buscar o ID do role Administrador
    const roleAdmin = await dataSource.query(
      'SELECT id FROM role WHERE nome = $1',
      ['Administrador']
    );
    
    if (roleAdmin.length === 0) {
      throw new Error('Perfil Administrador não encontrado. Verifique a execução do seed de perfis.');
    }
    
    const roleId = roleAdmin[0].id;
    
    // Dados do usuário administrador
    const admin = {
      nome: 'Administrador do Sistema',
      email: 'admin@pgben.gov.br',
      senha_hash: await bcrypt.hash('admin123', 10), // Senha criptografada
      role_id: roleId,
      status: true,
      matricula: 'ADMIN001',
      cpf: '00000000000', // CPF fictício para o administrador
    };

    await this.executarComTratamento(
      'Criar usuário administrador',
      async () => {
        // Verificar se o usuário já existe
        const usuarioExistente = await dataSource.query(
          'SELECT id FROM usuario WHERE email = $1',
          [admin.email]
        );

        if (usuarioExistente.length === 0) {
          console.log('Criando usuário administrador...');
          
          // Preparar colunas e valores para inserção
          const colunasInsercao = ['nome', 'email', 'senha_hash', 'role_id', 'status', 'matricula', 'cpf'];
          const valoresInsercao = [
            admin.nome, 
            admin.email, 
            admin.senha_hash, 
            admin.role_id, 
            admin.status,
            admin.matricula,
            admin.cpf
          ];
          
          // Adicionar timestamps obrigatórios
          if (colunas.includes('created_at')) {
            colunasInsercao.push('created_at');
            valoresInsercao.push(new Date().toISOString());
          }
          
          if (colunas.includes('updated_at')) {
            colunasInsercao.push('updated_at');
            valoresInsercao.push(new Date().toISOString());
          }
          
          // Construir e executar a query de inserção
          const { query, params } = this.construirQueryInsercao('usuario', colunasInsercao, valoresInsercao);
          await dataSource.query(query, params);
          
          console.log('Usuário administrador criado com sucesso');
        } else {
          console.log('Usuário administrador já existe, atualizando...');
          
          // Preparar colunas e valores para atualização
          const colunasAtualizacao = ['nome', 'role_id', 'status', 'matricula'];
          const valoresAtualizacao = [admin.nome, admin.role_id, admin.status, admin.matricula];
          
          // Construir e executar a query de atualização
          const { query, params } = this.construirQueryAtualizacao(
            'usuario', 
            colunasAtualizacao, 
            valoresAtualizacao, 
            'email = $1', 
            [admin.email]
          );
          
          await dataSource.query(query, params);
          console.log('Usuário administrador atualizado com sucesso');
        }
      }
    );
  }
}
