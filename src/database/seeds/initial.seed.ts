import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Role } from '../../shared/enums/role.enum';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';
import { StatusUnidade, TipoUnidade, Unidade } from '../../modules/unidade/entities/unidade.entity';
import { Setor } from '../../modules/unidade/entities/setor.entity';
import { TipoBeneficio } from '../../modules/beneficio/entities/tipo-beneficio.entity';

export default class InitialSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // Repositórios
    const userRepository = dataSource.getRepository(Usuario);
    const unidadeRepository = dataSource.getRepository(Unidade);
    const setorRepository = dataSource.getRepository(Setor);
    const tipoBeneficioRepository = dataSource.getRepository(TipoBeneficio);

    // Criar usuário admin inicial
    try {
      // Verificar se já existe um usuário admin
      const existingAdmin = await userRepository.findOne({ where: { email: 'admin@semtas.natal.gov.br' } });
      
      if (!existingAdmin) {
        // Criar o usuário admin usando o método create para garantir a tipagem correta
        const adminUser = userRepository.create({
          nome: 'Administrador',
          email: 'admin@semtas.natal.gov.br',
          senhaHash: '$2b$10$8nGxmXRG3wY5K/YzV1ZQ8.ZJ3LzXXH.g/PlUO1zRzGz4yN8mfB5Uy', // senha123
          role: Role.ADMIN as any, // Usando 'as any' para contornar problemas de tipagem
          status: 'ativo',
          primeiro_acesso: false,
          cpf: '000.000.000-00',
          telefone: '(84) 99999-9999'
        });
        
        await userRepository.save(adminUser);
        console.log('Usuário administrador criado com sucesso.');
      } else {
        console.log('Usuário administrador já existe.');
      }
    } catch (error) {
      console.error('Erro ao criar usuário administrador:', error);
    }

    // Criar unidade SEMTAS
    let semtas;
    try {
      // Verificar se a unidade SEMTAS já existe
      const existingUnidade = await unidadeRepository.findOne({ where: { sigla: 'SEMTAS' } });
      
      if (!existingUnidade) {
        // Criar a unidade SEMTAS usando o método create para garantir a tipagem correta
        semtas = unidadeRepository.create({
          nome: 'SEMTAS - Secretaria Municipal de Trabalho e Assistência Social',
          sigla: 'SEMTAS',
          codigo: 'SEMTAS-001',
          endereco: 'Av. Bernardo Vieira, 2180',
          telefone: '(84) 3232-8228',
          email: 'semtas@natal.rn.gov.br',
          status: StatusUnidade.ATIVO as any,
          tipo: TipoUnidade.SEMTAS as any
        });
        
        await unidadeRepository.save(semtas);
        console.log('Unidade SEMTAS criada com sucesso.');
      } else {
        console.log('Unidade SEMTAS já existe.');
        semtas = existingUnidade;
      }
    } catch (error) {
      console.error('Erro ao criar unidade SEMTAS:', error);
      return; // Interromper a execução se não for possível criar a unidade SEMTAS
    }

    // Criar setores principais
    const setores = [
      {
        nome: 'Gabinete da Secretária',
        sigla: 'GAB',
        unidade: semtas,
        status: true
      },
      {
        nome: 'Departamento de Proteção Social Básica',
        sigla: 'DPSB',
        unidade: semtas,
        status: true
      },
      {
        nome: 'Departamento de Proteção Social Especial',
        sigla: 'DPSE',
        unidade: semtas,
        status: true
      }
    ];
    
    // Criar cada setor individualmente para evitar problemas de tipagem
    try {
      for (const setorData of setores) {
        // Usar o método create com tipagem explícita
        const setor = setorRepository.create({
          nome: setorData.nome,
          sigla: setorData.sigla,
          unidade: setorData.unidade,
          status: setorData.status as any // Usando 'as any' para contornar problemas de tipagem
        });
        
        await setorRepository.save(setor);
        console.log(`Setor ${setorData.nome} criado com sucesso.`);
      }
    } catch (error) {
      console.error('Erro ao criar setores:', error);
    }

    // Criar tipos de benefícios básicos
    try {
      const beneficios = [
        {
          nome: 'Auxílio Funeral',
          descricao: 'Benefício eventual para custear despesas de urna funerária, velório e sepultamento',
          status: 'ativo',
          valor_maximo: 1500.00,
          validade_dias: 0,
          renovavel: false
        },
        {
          nome: 'Auxílio Natalidade',
          descricao: 'Benefício eventual para apoiar a família em virtude de nascimento',
          status: 'ativo',
          valor_maximo: 500.00,
          validade_dias: 90,
          renovavel: false
        },
        {
          nome: 'Cesta Básica',
          descricao: 'Benefício eventual para garantir alimentação em situação de vulnerabilidade',
          status: 'ativo',
          valor_maximo: 200.00,
          validade_dias: 30,
          renovavel: true
        }
      ];
      
      // Criar cada benefício individualmente para evitar problemas de tipagem
      for (const beneficioData of beneficios) {
        // Verificar se o benefício já existe
        const existingBeneficio = await tipoBeneficioRepository.findOne({ where: { nome: beneficioData.nome } });
        
        if (!existingBeneficio) {
          const beneficio = tipoBeneficioRepository.create({
            ...beneficioData,
            ativo: beneficioData.status as any
          });
          
          await tipoBeneficioRepository.save(beneficio);
          console.log(`Benefício ${beneficioData.nome} criado com sucesso.`);
        } else {
          console.log(`Benefício ${beneficioData.nome} já existe.`);
        }
      }
    } catch (error) {
      console.error('Erro ao criar benefícios:', error);
    }
  }
}