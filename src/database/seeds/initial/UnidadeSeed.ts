import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Unidade, TipoUnidade, StatusUnidade } from '../../../modules/unidade/entities/unidade.entity';

export default class UnidadeSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const unidadeRepository = dataSource.getRepository(Unidade);

    // Verificar se já existem unidades no sistema
    const existingUnidades = await unidadeRepository.count();
    if (existingUnidades > 0) {
      console.log('Unidades já existem no sistema. Pulando seed de unidades.');
      return;
    }

    // Criar unidades iniciais
    const unidades = [
      {
        nome: 'Secretaria Municipal de Trabalho e Assistência Social',
        sigla: 'SEMTAS',
        tipo: TipoUnidade.SEMTAS,
        status: StatusUnidade.ATIVO,
        endereco: {
          logradouro: 'Rua Princesa Isabel',
          numero: '799',
          bairro: 'Cidade Alta',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59025-400'
        },
        telefone: '(84) 3232-8748',
        email: 'contato@semtas.natal.gov.br',
      },
      {
        nome: 'CRAS Oeste',
        sigla: 'CRAS-O',
        tipo: TipoUnidade.CRAS,
        status: StatusUnidade.ATIVO,
        endereco: {
          logradouro: 'Av. Rio Doce',
          numero: '680',
          bairro: 'Quintas',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59035-100'
        },
        telefone: '(84) 3232-9924',
        email: 'cras.oeste@semtas.natal.gov.br',
      },
      {
        nome: 'CRAS Leste',
        sigla: 'CRAS-L',
        tipo: TipoUnidade.CRAS,
        status: StatusUnidade.ATIVO,
        endereco: {
          logradouro: 'Rua Trairi',
          numero: '578',
          bairro: 'Petrópolis',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59020-150'
        },
        telefone: '(84) 3232-9925',
        email: 'cras.leste@semtas.natal.gov.br',
      },
      {
        nome: 'CREAS Norte',
        sigla: 'CREAS-N',
        tipo: TipoUnidade.CREAS,
        status: StatusUnidade.ATIVO,
        endereco: {
          logradouro: 'Av. Jaguarari',
          numero: '2120',
          bairro: 'Lagoa Nova',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59062-500'
        },
        telefone: '(84) 3232-9930',
        email: 'creas.norte@semtas.natal.gov.br',
      },
      {
        nome: 'Centro POP',
        sigla: 'CPOP',
        tipo: TipoUnidade.CENTRO_POP,
        status: StatusUnidade.ATIVO,
        endereco: {
          logradouro: 'Rua Jandira',
          numero: '1222',
          bairro: 'Alecrim',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59030-090'
        },
        telefone: '(84) 3232-9940',
        email: 'centropop@semtas.natal.gov.br',
      },
    ];

    // Inserir unidades no banco de dados
    for (const unidadeData of unidades) {
      const unidade = unidadeRepository.create(unidadeData);
      await unidadeRepository.save(unidade);
      console.log(`Unidade ${unidadeData.nome} criada com sucesso.`);
    }

    console.log('Seed de unidades concluído com sucesso!');
  }
}