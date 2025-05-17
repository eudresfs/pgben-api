import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Seed para criação dos perfis e usuários essenciais do sistema
 *
 * Este seed cria os perfis básicos do sistema (administrador, gestor, técnico)
 * e um usuário administrador inicial para acesso ao sistema
 */
export class UsuarioPerfilSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de usuários e perfis essenciais');

    // Criação dos perfis básicos
    const perfisBasicos = [
      {
        nome: 'administrador',
        descricao: 'Acesso total ao sistema',
        permissoes: ['*'],
        ativo: true,
      },
      {
        nome: 'gestor_semtas',
        descricao:
          'Gestor de secretaria com acesso a relatórios e configurações',
        permissoes: [
          'gerenciar_usuarios',
          'gerenciar_beneficios',
          'gerenciar_configuracoes',
          'visualizar_relatorios',
          'aprovar_solicitacoes',
        ],
        ativo: true,
      },
      {
        nome: 'tecnico_semtas',
        descricao:
          'Técnico de secretaria com acesso a cadastros e solicitações',
        permissoes: [
          'cadastrar_cidadaos',
          'criar_solicitacoes',
          'avaliar_solicitacoes',
          'anexar_documentos',
        ],
        ativo: true,
      },
      {
        nome: 'tecnico_unidade',
        descricao:
          'Técnico de unidade com acesso limitado a cadastros e solicitações',
        permissoes: ['cadastrar_cidadaos', 'criar_solicitacoes'],
        ativo: true,
      },
    ];

    // Inserção de perfis
    for (const perfil of perfisBasicos) {
      const perfilExistente = await dataSource.query(
        `SELECT id FROM perfil WHERE nome = $1`,
        [perfil.nome],
      );

      if (perfilExistente.length === 0) {
        await dataSource.query(
          `INSERT INTO perfil (nome, descricao, permissoes, ativo)
           VALUES ($1, $2, $3, $4)`,
          [
            perfil.nome,
            perfil.descricao,
            JSON.stringify(perfil.permissoes),
            perfil.ativo,
          ],
        );
        console.log(`Perfil ${perfil.nome} criado com sucesso`);
      } else {
        console.log(`Perfil ${perfil.nome} já existe, atualizando...`);
        await dataSource.query(
          `UPDATE perfil 
           SET descricao = $2, permissoes = $3, ativo = $4
           WHERE nome = $1`,
          [
            perfil.nome,
            perfil.descricao,
            JSON.stringify(perfil.permissoes),
            perfil.ativo,
          ],
        );
      }
    }

    // Criação do usuário administrador
    const senhaHash = await bcrypt.hash('admin@pgben2025', 10);

    const adminExistente = await dataSource.query(
      `SELECT id FROM usuario WHERE email = $1`,
      ['admin@pgben.gov.br'],
    );

    const perfilAdmin = await dataSource.query(
      `SELECT id FROM perfil WHERE nome = $1`,
      ['administrador'],
    );

    if (adminExistente.length === 0 && perfilAdmin.length > 0) {
      await dataSource.query(
        `INSERT INTO usuario 
          (nome, email, senha, perfil_id, ativo, ultimo_acesso, falhas_login, bloqueado)
         VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'Administrador PGBen',
          'admin@pgben.gov.br',
          senhaHash,
          perfilAdmin[0].id,
          true,
          new Date(),
          0,
          false,
        ],
      );
      console.log('Usuário administrador criado com sucesso');
    } else if (adminExistente.length > 0) {
      console.log('Usuário administrador já existe');
    } else {
      console.log(
        'Não foi possível criar o usuário administrador: perfil não encontrado',
      );
    }

    console.log('Seed de usuários e perfis essenciais concluído');
  }
}
