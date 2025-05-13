import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Role } from '../../shared/constants/role.enum';
import { User } from '../../user/entities/user.entity';
import { Unidade } from '../../modules/unidade/entities/unidade.entity';
import { Setor } from '../../modules/unidade/entities/setor.entity';
import { TipoBeneficio } from '../../modules/beneficio/entities/tipo-beneficio.entity';
import { Status } from '../../shared/constants/status.enum';

export default class InitialSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // Repositórios
    const userRepository = dataSource.getRepository(User);
    const unidadeRepository = dataSource.getRepository(Unidade);
    const setorRepository = dataSource.getRepository(Setor);
    const tipoBeneficioRepository = dataSource.getRepository(TipoBeneficio);

    // Criar usuário admin inicial
    const adminUser = await userRepository.save({
      nome: 'Administrador',
      email: 'admin@semtas.natal.gov.br',
      senha: '$2b$10$8nGxmXRG3wY5K/YzV1ZQ8.ZJ3LzXXH.g/PlUO1zRzGz4yN8mfB5Uy', // senha123
      role: Role.ADMIN,
      status: Status.ATIVO,
      primeiro_acesso: false
    });

    // Criar unidade SEMTAS
    const semtas = await unidadeRepository.save({
      nome: 'SEMTAS - Secretaria Municipal de Trabalho e Assistência Social',
      sigla: 'SEMTAS',
      endereco: 'Av. Bernardo Vieira, 2180',
      bairro: 'Dix-Sept Rosado',
      telefone: '(84) 3232-8228',
      email: 'semtas@natal.rn.gov.br',
      status: Status.ATIVO
    });

    // Criar setores principais
    await setorRepository.save([
      {
        nome: 'Gabinete da Secretária',
        sigla: 'GAB',
        unidade: semtas,
        status: Status.ATIVO
      },
      {
        nome: 'Departamento de Proteção Social Básica',
        sigla: 'DPSB',
        unidade: semtas,
        status: Status.ATIVO
      },
      {
        nome: 'Departamento de Proteção Social Especial',
        sigla: 'DPSE',
        unidade: semtas,
        status: Status.ATIVO
      }
    ]);

    // Criar tipos de benefícios básicos
    await tipoBeneficioRepository.save([
      {
        nome: 'Auxílio Funeral',
        descricao: 'Benefício eventual para custear despesas de urna funerária, velório e sepultamento',
        status: Status.ATIVO,
        valor_maximo: 1500.00,
        validade_dias: 0,
        renovavel: false
      },
      {
        nome: 'Auxílio Natalidade',
        descricao: 'Benefício eventual para apoiar a família em virtude de nascimento',
        status: Status.ATIVO,
        valor_maximo: 500.00,
        validade_dias: 90,
        renovavel: false
      },
      {
        nome: 'Cesta Básica',
        descricao: 'Benefício eventual para garantir alimentação em situação de vulnerabilidade',
        status: Status.ATIVO,
        valor_maximo: 200.00,
        validade_dias: 30,
        renovavel: true
      }
    ]);
  }
}