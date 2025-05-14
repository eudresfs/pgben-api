import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { faker } from '@faker-js/faker/locale/pt_BR';

export default class CidadaoSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const cidadaoRepository = dataSource.getRepository('cidadao');
    const unidadeRepository = dataSource.getRepository('unidade');

    // Verificar se já existem cidadãos no sistema
    const existingCidadaos = await cidadaoRepository.count();
    if (existingCidadaos > 0) {
      console.log('Cidadãos já existem no sistema. Pulando seed de cidadãos.');
      return;
    }

    // Buscar unidades para associar aos cidadãos
    const unidades = await unidadeRepository.find();
    if (unidades.length === 0) {
      console.log('Nenhuma unidade encontrada. Não é possível criar cidadãos.');
      return;
    }

    // Gerar 50 cidadãos de exemplo
    const cidadaos: any[] = [];
    for (let i = 0; i < 50; i++) {
      const sexo = faker.helpers.arrayElement(['masculino', 'feminino']);
      
      try {
        // Criar cidadão usando o método create do repositório
        const cidadao = cidadaoRepository.create({
          unidade_id: faker.helpers.arrayElement(unidades).id,
          nome: faker.person.fullName(),
          cpf: faker.string.numeric(11),
          rg: faker.string.numeric(9),
          data_nascimento: faker.date.between({ from: '1950-01-01', to: '2005-01-01' }),
          sexo,
          endereco: JSON.stringify({
            logradouro: faker.location.street(),
            numero: faker.string.numeric(3),
            complemento: Math.random() > 0.7 ? faker.location.secondaryAddress() : null,
            bairro: faker.helpers.arrayElement([
              'Alecrim', 'Tirol', 'Petrópolis', 'Candelária', 'Capim Macio',
              'Ponta Negra', 'Lagoa Nova', 'Nova Descoberta', 'Cidade Alta', 'Ribeira'
            ]),
            cidade: 'Natal',
            estado: 'RN',
            cep: faker.location.zipCode('#####-###')
          }),
          telefone: faker.string.numeric(11),
          email: Math.random() > 0.6 ? faker.internet.email() : null,
          nis: Math.random() > 0.7 ? faker.string.numeric(11) : null,
          escolaridade: faker.helpers.arrayElement([
            'Infantil',
            'Fundamental_Incompleto',
            'Fundamental_Completo',
            'Medio_Incompleto',
            'Medio_Completo',
            'Superior_Incompleto',
            'Superior_Completo'
          ])
        });
        
        // Salvar o cidadão
        const cidadaoSalvo = await cidadaoRepository.save(cidadao);
        cidadaos.push(cidadaoSalvo);
        console.log(`Cidadão ${cidadao.nome} criado com sucesso.`);
      } catch (error) {
        console.error(`Erro ao criar cidadão:`, error);
      }
    }

    console.log(`Total de ${cidadaos.length} cidadãos criados com sucesso.`);
    return;
  }
}
