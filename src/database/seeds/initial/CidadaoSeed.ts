import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { faker } from '@faker-js/faker/locale/pt_BR';

export default class CidadaoSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const cidadaoRepository = dataSource.getRepository('cidadao');
    const situacaoMoradiaRepository = dataSource.getRepository('situacao_moradia');
    const composicaoFamiliarRepository = dataSource.getRepository('composicao_familiar');
    const beneficioSocialRepository = dataSource.getRepository('beneficio_social');
    const infoBancariaRepository = dataSource.getRepository('info_bancaria');
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
    const cidadaos = [];
    for (let i = 0; i < 50; i++) {
      const sexo = faker.helpers.arrayElement(['masculino', 'feminino']);
      const tipoCidadao = faker.helpers.arrayElement(['beneficiario', 'solicitante', 'representante_legal']);
      
      const cidadao = cidadaoRepository.create({
        unidade_id: faker.helpers.arrayElement(unidades).id,
        nome: faker.person.fullName(),
        nome_social: Math.random() > 0.8 ? faker.person.fullName() : null,
        cpf: faker.string.numeric(11),
        rg: faker.string.numeric(9),
        nis: Math.random() > 0.7 ? faker.string.numeric(11) : null,
        data_nascimento: faker.date.between({ from: '1950-01-01', to: '2005-01-01' }),
        sexo: sexo,
        tipo_cidadao: tipoCidadao,
        nome_mae: faker.person.fullName({ sex: 'female' }),
        naturalidade: faker.location.city(),
        endereco: faker.location.street(),
        numero: faker.string.numeric(3),
        complemento: Math.random() > 0.7 ? faker.location.secondaryAddress() : null,
        bairro: faker.helpers.arrayElement([
          'Alecrim', 'Tirol', 'Petrópolis', 'Candelária', 'Capim Macio',
          'Ponta Negra', 'Lagoa Nova', 'Nova Descoberta', 'Cidade Alta', 'Ribeira',
          'Rocas', 'Areia Preta', 'Mãe Luíza', 'Barro Vermelho', 'Cidade da Esperança'
        ]),
        cidade: 'Natal',
        uf: 'RN',
        cep: faker.location.zipCode('########'),
        telefone: faker.string.numeric(11),
        email: Math.random() > 0.6 ? faker.internet.email() : null,
        escolaridade: faker.helpers.arrayElement([
          'Infantil',
          'Fundamental_Incompleto',
          'Fundamental_Completo',
          'Medio_Incompleto',
          'Medio_Completo',
          'Superior_Incompleto',
          'Superior_Completo',
          'Pos_Graduacao',
          'Mestrado',
          'Doutorado'
        ]),
        profissao: faker.person.jobTitle(),
        renda: parseFloat(faker.finance.amount(600, 3000, 2)),
        observacoes: Math.random() > 0.7 ? faker.lorem.paragraph() : null,
      });

      cidadaos.push(await cidadaoRepository.save(cidadao));
      console.log(`Cidadão ${cidadao.nome} criado com sucesso.`);
    }

    // Criar situação de moradia para cada cidadão
    for (const cidadao of cidadaos) {
      const tipoMoradia = faker.helpers.arrayElement([
        'propria', 'alugada', 'cedida', 'ocupacao', 'situacao_rua', 'outro', 'abrigo'
      ]);
      
      const situacaoMoradia = situacaoMoradiaRepository.create({
        cidadao_id: cidadao.id,
        tipo_moradia: tipoMoradia,
        valor_aluguel: tipoMoradia === 'alugada' ? parseFloat(faker.finance.amount(400, 1500, 2)) : null,
        tempo_moradia: faker.number.int({ min: 1, max: 240 }),
      });
      
      await situacaoMoradiaRepository.save(situacaoMoradia);
      console.log(`Situação de moradia para ${cidadao.nome} criada com sucesso.`);
    }

    // Criar composição familiar para alguns cidadãos (70%)
    for (const cidadao of cidadaos) {
      if (Math.random() <= 0.7) {
        // Gerar entre 1 e 5 membros familiares
        const numFamiliares = faker.number.int({ min: 1, max: 5 });
        
        for (let i = 0; i < numFamiliares; i++) {
          const parentesco = faker.helpers.arrayElement([
            'pai', 'mae', 'filho', 'filha', 'irmao', 'irma', 'avô', 'avó', 'outro'
          ]);
          
          const composicaoFamiliar = composicaoFamiliarRepository.create({
            cidadao_id: cidadao.id,
            nome: faker.person.fullName(),
            data_nascimento: faker.date.between({ from: '1940-01-01', to: '2020-01-01' }),
            parentesco: parentesco,
            escolaridade: faker.helpers.arrayElement([
              'Infantil',
              'Fundamental_Incompleto',
              'Fundamental_Completo',
              'Medio_Incompleto',
              'Medio_Completo',
              'Superior_Incompleto',
              'Superior_Completo',
              'Pos_Graduacao',
              null
            ]),
            renda: Math.random() > 0.4 ? parseFloat(faker.finance.amount(600, 2500, 2)) : null,
          });
          
          await composicaoFamiliarRepository.save(composicaoFamiliar);
          console.log(`Membro familiar ${composicaoFamiliar.nome} para ${cidadao.nome} criado com sucesso.`);
        }
      }
    }

    // Criar benefícios sociais para alguns cidadãos (50%)
    for (const cidadao of cidadaos) {
      if (Math.random() <= 0.5) {
        const tipoBeneficio = faker.helpers.arrayElement(['pbf', 'bpc']);
        const tipoBpc = tipoBeneficio === 'bpc' ? faker.helpers.arrayElement(['idoso', 'deficiente']) : null;
        
        const beneficioSocial = beneficioSocialRepository.create({
          cidadao_id: cidadao.id,
          tipo: tipoBeneficio,
          tipo_bpc: tipoBpc,
          valor: tipoBeneficio === 'pbf' 
            ? parseFloat(faker.finance.amount(600, 800, 2)) 
            : parseFloat(faker.finance.amount(1200, 1300, 2)),
          data_inicio: faker.date.past({ years: 5 }),
          data_fim: Math.random() > 0.8 ? faker.date.future({ years: 2 }) : null,
        });
        
        await beneficioSocialRepository.save(beneficioSocial);
        console.log(`Benefício social ${tipoBeneficio} para ${cidadao.nome} criado com sucesso.`);
      }
    }

    // Criar informações bancárias para alguns cidadãos (60%)
    for (const cidadao of cidadaos) {
      if (Math.random() <= 0.6) {
        const banco = faker.helpers.arrayElement([
          'Banco do Brasil', 'Caixa Econômica Federal', 'Bradesco', 'Itaú', 'Santander', 'Nubank', 'Inter'
        ]);
        
        const pixTipo = faker.helpers.arrayElement(['cpf', 'email', 'telefone', 'chave_aleatoria']);
        let pixChave;
        
        switch (pixTipo) {
          case 'cpf':
            pixChave = cidadao.cpf;
            break;
          case 'email':
            pixChave = cidadao.email || faker.internet.email();
            break;
          case 'telefone':
            pixChave = cidadao.telefone;
            break;
          case 'chave_aleatoria':
            pixChave = faker.string.alphanumeric(32);
            break;
        }
        
        const infoBancaria = infoBancariaRepository.create({
          cidadao_id: cidadao.id,
          banco: banco,
          agencia: faker.string.numeric(4),
          conta: faker.string.numeric(8),
          tipo_conta: faker.helpers.arrayElement(['corrente', 'poupança']),
          pix_tipo: pixTipo,
          pix_chave: pixChave,
        });
        
        await infoBancariaRepository.save(infoBancaria);
        console.log(`Informação bancária para ${cidadao.nome} criada com sucesso.`);
      }
    }

    console.log('Seed de cidadãos concluído com sucesso!');
  }
}
