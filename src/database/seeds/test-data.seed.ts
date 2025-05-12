import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { Cidadao, Sexo } from '../../modules/cidadao/entities/cidadao.entity';
import {
  ComposicaoFamiliar,
  Parentesco,
} from '../../modules/cidadao/entities/composicao-familiar.entity';
import { DadosSociais } from '../../modules/cidadao/entities/dados-sociais.entity';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../modules/solicitacao/entities/solicitacao.entity';
import { DadosBeneficios } from '../../modules/solicitacao/entities/dados-beneficios.entity';
import { User } from '../../user/entities/user.entity';
import { TipoBeneficio } from '../../modules/beneficio/entities/tipo-beneficio.entity';
import { Unidade } from '../../modules/unidade/entities/unidade.entity';
import { SituacaoMoradia } from '../../modules/cidadao/entities/situacao-moradia.entity';
import { v4 as uuidv4 } from 'uuid';

export default class TestDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // Obter os IDs necessários
    const users = await connection
      .createQueryBuilder()
      .select('id, role, unidade_id')
      .from(User, 'user')
      .getRawMany();

    const tecnicoUnidade = users.find(
      (user) => user.role === 'tecnico_unidade',
    );
    const gestorSemtas = users.find((user) => user.role === 'gestor_semtas');

    const tiposBeneficio = await connection
      .createQueryBuilder()
      .select('id, nome')
      .from(TipoBeneficio, 'tipo')
      .getRawMany();

    const unidade = await connection
      .createQueryBuilder()
      .select('id, nome')
      .from(Unidade, 'unidade')
      .getRawMany();

    const situacoesMoradia = await connection
      .createQueryBuilder()
      .select('id, nome')
      .from(SituacaoMoradia, 'situacao')
      .getRawMany();

    // Gerar dados de cidadãos
    const cidadaosData = [
      {
        id: uuidv4(),
        nome: 'Maria da Silva',
        cpf: '12345678901',
        rg: '1234567',
        data_nascimento: new Date('1985-03-10'),
        sexo: Sexo.FEMININO,
        nome_mae: 'Joana da Silva',
        endereco: {
          logradouro: 'Rua das Flores',
          numero: '123',
          bairro: 'Alecrim',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59000-000'
        },
        telefone: '84999998888',
        email: 'maria@email.com',
        pix_tipo: 'cpf',
        pix_chave: '12345678901',
      },
      {
        id: uuidv4(),
        nome: 'João Santos',
        cpf: '98765432101',
        rg: '7654321',
        data_nascimento: new Date('1990-06-15'),
        sexo: Sexo.MASCULINO,
        nome_mae: 'Ana Santos',
        endereco: {
          logradouro: 'Avenida Central',
          numero: '456',
          bairro: 'Ponta Negra',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59090-000'
        },
        telefone: '84988887777',
        email: 'joao@email.com',
        pix_tipo: 'email',
        pix_chave: 'joao@email.com',
      },
      {
        id: uuidv4(),
        nome: 'Ana Oliveira',
        cpf: '45678912301',
        rg: '4567891',
        data_nascimento: new Date('1988-11-20'),
        sexo: Sexo.FEMININO,
        nome_mae: 'Marta Oliveira',
        endereco: {
          logradouro: 'Rua dos Coqueiros',
          numero: '789',
          bairro: 'Lagoa Nova',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59064-000'
        },
        telefone: '84977776666',
        email: 'ana@email.com',
        pix_tipo: 'telefone',
        pix_chave: '84977776666',
      },
      {
        id: uuidv4(),
        nome: 'Pedro Souza',
        cpf: '78912345601',
        rg: '7891234',
        data_nascimento: new Date('1982-04-05'),
        sexo: Sexo.MASCULINO,
        nome_mae: 'Lucia Souza',
        endereco: {
          logradouro: 'Avenida das Dunas',
          numero: '1011',
          bairro: 'Candelária',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59064-000'
        },
        telefone: '84966665555',
        email: 'pedro@email.com',
        pix_tipo: 'cpf',
        pix_chave: '78912345601',
      },
      {
        id: uuidv4(),
        nome: 'Juliana Lima',
        cpf: '32165498701',
        rg: '3216549',
        data_nascimento: new Date('1995-07-25'),
        sexo: Sexo.FEMININO,
        nome_mae: 'Sandra Lima',
        endereco: {
          logradouro: 'Rua das Palmeiras',
          numero: '1213',
          bairro: 'Capim Macio',
          cidade: 'Natal',
          estado: 'RN',
          cep: '59082-000'
        },
        telefone: '84955554444',
        email: 'juliana@email.com',
        pix_tipo: 'chave_aleatoria',
        pix_chave: '87654321-abcd-1234-efgh-1234567890ab',
      },
    ];

    // Inserir cidadãos
    await Promise.all(
      cidadaosData.map(async (cidadaoData) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(Cidadao)
          .values(cidadaoData)
          .execute();
      }),
    );

    // Inserir composição familiar para Maria
    const composicaoFamiliarMaria = [
      {
        cidadao_id: cidadaosData[0].id,
        nome: 'José da Silva',
        idade: 40,
        parentesco: Parentesco.CONJUGE,
        ocupacao: 'Pedreiro',
        escolaridade: 'Medio_Completo',
        renda: 1200.0,
      },
      {
        cidadao_id: cidadaosData[0].id,
        nome: 'Pedro da Silva',
        idade: 10,
        parentesco: Parentesco.FILHO,
        escolaridade: 'Fundamental_Incompleto',
        renda: 0,
      },
      {
        cidadao_id: cidadaosData[0].id,
        nome: 'Carla da Silva',
        idade: 8,
        parentesco: Parentesco.FILHO,
        escolaridade: 'Fundamental_Incompleto',
        renda: 0,
      },
    ];

    await Promise.all(
      composicaoFamiliarMaria.map(async (membro) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(ComposicaoFamiliar)
          .values(membro)
          .execute();
      }),
    );

    // Inserir dados sociais para cada cidadão
    const dadosSociaisData = [
      {
        cidadao_id: cidadaosData[0].id,
        prontuario_suas: '123456789',
        publico_prioritario: true,
        recebe_beneficio: true,
        tipo_beneficio: 'Bolsa Família',
        valor_beneficio: 600.0,
        situacao_moradia_id: situacoesMoradia[1].id, // Alugada
        renda_familiar: 1800.0,
        numero_pessoas: 4,
        observacoes: 'Família em situação de vulnerabilidade social',
      },
      {
        cidadao_id: cidadaosData[1].id,
        prontuario_suas: '987654321',
        publico_prioritario: false,
        recebe_beneficio: false,
        situacao_moradia_id: situacoesMoradia[0].id, // Própria
        renda_familiar: 2500.0,
        numero_pessoas: 2,
        observacoes: 'Necessita de acompanhamento social',
      },
      {
        cidadao_id: cidadaosData[2].id,
        prontuario_suas: '456789123',
        publico_prioritario: true,
        recebe_beneficio: true,
        tipo_beneficio: 'BPC',
        valor_beneficio: 1212.0,
        situacao_moradia_id: situacoesMoradia[2].id, // Cedida
        renda_familiar: 1212.0,
        numero_pessoas: 1,
        observacoes: 'Pessoa com deficiência',
      },
    ];

    await Promise.all(
      dadosSociaisData.map(async (dados) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(DadosSociais)
          .values(dados)
          .execute();
      }),
    );

    // Criar solicitações de benefícios
    const solicitacoesData = [
      {
        id: uuidv4(),
        cidadao_id: cidadaosData[0].id,
        tipo_beneficio_id: tiposBeneficio[0].id, // Auxílio Natalidade
        unidade_id: unidade[0].id,
        tecnico_id: tecnicoUnidade.id,
        status: StatusSolicitacao.EM_ANALISE,
        data_solicitacao: new Date(),
        justificativa: 'Gestante em situação de vulnerabilidade social',
        observacoes: 'Família já cadastrada no CRAS',
      },
      {
        id: uuidv4(),
        cidadao_id: cidadaosData[2].id,
        tipo_beneficio_id: tiposBeneficio[1].id, // Aluguel Social
        unidade_id: unidade[1].id,
        tecnico_id: tecnicoUnidade.id,
        status: StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
        data_solicitacao: new Date(),
        justificativa:
          'Pessoa com deficiência em situação de vulnerabilidade habitacional',
        observacoes: 'Necessita de moradia adaptada',
      },
    ];

    const solicitacao = await Promise.all(
      solicitacoesData.map(async (solicitacaoData) => {
        const solicitacao = await connection
          .createQueryBuilder()
          .insert()
          .into(Solicitacao)
          .values(solicitacaoData)
          .returning('*')
          .execute();
        return solicitacao.raw[0];
      }),
    );

    // Criar dados específicos dos benefícios
    const dadosBeneficiosData = [
      {
        solicitacao_id: solicitacao[0].id,
        data_previsao_parto: new Date('2024-06-15'),
        semanas_gestacao: 28,
        realiza_pre_natal: true,
        local_pre_natal: 'UBS Alecrim',
      },
      {
        solicitacao_id: solicitacao[1].id,
        valor_aluguel: 800.0,
        tempo_solicitado: 6,
        motivo_solicitacao: 'Necessidade de moradia adaptada',
        possui_imovel: false,
        tempo_residencia_natal: 15,
      },
    ];

    await Promise.all(
      dadosBeneficiosData.map(async (dadosData) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(DadosBeneficios)
          .values(dadosData)
          .execute();
      }),
    );
  }
}
