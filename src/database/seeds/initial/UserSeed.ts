import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Usuario } from '../../../modules/usuario/entities/usuario.entity';
import { Role } from '../../../shared/enums/role.enum';
import * as bcrypt from 'bcrypt';

export default class UserSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const usuarioRepository = dataSource.getRepository(Usuario);

    // Verificar se já existem usuários no sistema
    const existingUsers = await usuarioRepository.count();
    if (existingUsers > 0) {
      console.log('Usuários já existem no sistema. Pulando seed de usuários.');
      return;
    }

    // Gerar hash da senha padrão
    const saltRounds = 10;
    const defaultPassword = await bcrypt.hash('Semtas@2023', saltRounds);

    // Criar usuários administrativos iniciais
    const users = [
      {
        nome: 'Administrador do Sistema',
        email: 'admin@semtas.natal.gov.br',
        senhaHash: defaultPassword,
        cpf: '00000000000',
        telefone: '84999999999',
        role: Role.ADMIN,
        status: 'ativo',
        primeiro_acesso: true
      },
      {
        nome: 'Gestor SEMTAS',
        email: 'gestor@semtas.natal.gov.br',
        senhaHash: defaultPassword,
        cpf: '11111111111',
        telefone: '84988888888',
        role: Role.GESTOR_SEMTAS,
        status: 'ativo',
        primeiro_acesso: true
      },
      {
        nome: 'Técnico SEMTAS',
        email: 'tecnico@semtas.natal.gov.br',
        senhaHash: defaultPassword,
        cpf: '22222222222',
        telefone: '84977777777',
        role: Role.TECNICO_SEMTAS,
        status: 'ativo',
        primeiro_acesso: true
      },
    ];

    // Inserir usuários no banco de dados
    for (const userData of users) {
      try {
        // Criar uma nova instância de Usuário com os campos corretos
        const usuario = new Usuario();
        usuario.nome = userData.nome;
        usuario.email = userData.email;
        usuario.senhaHash = userData.senhaHash;
        usuario.cpf = userData.cpf;
        usuario.telefone = userData.telefone;
        usuario.role = userData.role as any; // Usando 'as any' para contornar problemas de tipagem
        usuario.status = userData.status;
        usuario.primeiro_acesso = userData.primeiro_acesso;
        
        // Salvar o usuário
        await usuarioRepository.save(usuario);
        console.log(`Usuário ${userData.nome} criado com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar usuário ${userData.nome}:`, error);
      }
    }

    console.log('Seed de usuários concluído com sucesso!');
  }
}