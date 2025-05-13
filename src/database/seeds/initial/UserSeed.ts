import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { User, UserRole, UserStatus } from '../../../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

export default class UserSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const userRepository = dataSource.getRepository(User);

    // Verificar se já existem usuários no sistema
    const existingUsers = await userRepository.count();
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
        senha_hash: defaultPassword,
        cpf: '00000000000',
        telefone: '84999999999',
        role: UserRole.ADMIN,
        status: UserStatus.ATIVO,
      },
      {
        nome: 'Gestor SEMTAS',
        email: 'gestor@semtas.natal.gov.br',
        senha_hash: defaultPassword,
        cpf: '11111111111',
        telefone: '84988888888',
        role: UserRole.GESTOR_SEMTAS,
        status: UserStatus.ATIVO,
      },
      {
        nome: 'Técnico SEMTAS',
        email: 'tecnico@semtas.natal.gov.br',
        senha_hash: defaultPassword,
        cpf: '22222222222',
        telefone: '84977777777',
        role: UserRole.TECNICO_SEMTAS,
        status: UserStatus.ATIVO,
      },
    ];

    // Inserir usuários no banco de dados
    for (const userData of users) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`Usuário ${userData.nome} criado com sucesso.`);
    }

    console.log('Seed de usuários concluído com sucesso!');
  }
}