import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed para criação de cidadãos fictícios para ambiente de desenvolvimento
 *
 * Este seed cria dados fictícios de cidadãos para testes e desenvolvimento
 */
export class CidadaoDevSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    console.log('Iniciando seed de cidadãos para desenvolvimento');

    // Obter IDs das unidades disponíveis
    const unidades = await dataSource.query(
      'SELECT id FROM unidade WHERE ativo = true',
    );
    if (unidades.length === 0) {
      console.log('Nenhuma unidade encontrada, não é possível criar cidadãos');
      return;
    }

    // Lista de cidadãos fictícios para desenvolvimento
    const cidadaosDev = [
      {
        nome: 'Maria da Silva',
        cpf: '12345678901',
        rg: '1234567',
        data_nascimento: '1980-05-10',
        genero: 'feminino',
        estado_civil: 'casado',
        telefone: '84999991111',
        email: 'maria.silva@exemplo.com',
        nis: '12345678901',
        unidade_id: unidades[0].id,
      },
      {
        nome: 'João Pereira',
        cpf: '23456789012',
        rg: '2345678',
        data_nascimento: '1975-07-15',
        genero: 'masculino',
        estado_civil: 'casado',
        telefone: '84999992222',
        email: 'joao.pereira@exemplo.com',
        nis: '23456789012',
        unidade_id: unidades[0].id,
      },
      {
        nome: 'Ana Carolina Souza',
        cpf: '34567890123',
        rg: '3456789',
        data_nascimento: '1990-03-20',
        genero: 'feminino',
        estado_civil: 'solteiro',
        telefone: '84999993333',
        email: 'ana.souza@exemplo.com',
        nis: '34567890123',
        unidade_id: unidades[0].id,
      },
      {
        nome: 'Carlos Eduardo Lima',
        cpf: '45678901234',
        rg: '4567890',
        data_nascimento: '1985-12-01',
        genero: 'masculino',
        estado_civil: 'solteiro',
        telefone: '84999994444',
        email: 'carlos.lima@exemplo.com',
        nis: '45678901234',
        unidade_id: unidades[0].id,
      },
      {
        nome: 'Mariana Oliveira',
        cpf: '56789012345',
        rg: '5678901',
        data_nascimento: '1995-08-25',
        genero: 'feminino',
        estado_civil: 'solteiro',
        telefone: '84999995555',
        email: 'mariana.oliveira@exemplo.com',
        nis: '56789012345',
        unidade_id: unidades[0].id,
      },
    ];

    // Criar cidadãos e seus dados relacionados
    for (const cidadaoData of cidadaosDev) {
      // Verificar se o cidadão já existe
      const cidadaoExistente = await dataSource.query(
        `SELECT id FROM cidadao WHERE cpf = $1`,
        [cidadaoData.cpf],
      );

      let cidadaoId;

      if (cidadaoExistente.length === 0) {
        // Inserir novo cidadão
        const result = await dataSource.query(
          `INSERT INTO cidadao (
            nome, 
            cpf, 
            rg, 
            data_nascimento, 
            genero, 
            estado_civil, 
            telefone, 
            email, 
            nis, 
            unidade_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            cidadaoData.nome,
            cidadaoData.cpf,
            cidadaoData.rg,
            cidadaoData.data_nascimento,
            cidadaoData.genero,
            cidadaoData.estado_civil,
            cidadaoData.telefone,
            cidadaoData.email,
            cidadaoData.nis,
            cidadaoData.unidade_id,
          ],
        );
        cidadaoId = result[0].id;
        console.log(`Cidadão ${cidadaoData.nome} criado com sucesso`);
      } else {
        cidadaoId = cidadaoExistente[0].id;
        console.log(
          `Cidadão ${cidadaoData.nome} já existe, atualizando dados relacionados...`,
        );
      }

      // Criar endereço para o cidadão
      await this.criarEndereco(dataSource, cidadaoId);

      // Criar dados de situação de moradia
      await this.criarSituacaoMoradia(dataSource, cidadaoId);

      // Criar dados de renda e benefícios sociais
      await this.criarBeneficioSocial(dataSource, cidadaoId);

      // Criar informações bancárias
      await this.criarInfoBancaria(dataSource, cidadaoId);
    }

    console.log('Seed de cidadãos para desenvolvimento concluído');
  }

  private static async criarEndereco(
    dataSource: DataSource,
    cidadaoId: string,
  ): Promise<void> {
    // Verificar se já existe endereço para o cidadão
    const enderecoExistente = await dataSource.query(
      `SELECT id FROM endereco WHERE cidadao_id = $1`,
      [cidadaoId],
    );

    if (enderecoExistente.length === 0) {
      // Criar novo endereço
      await dataSource.query(
        `INSERT INTO endereco (
          cidadao_id,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          cep,
          referencia,
          tipo_moradia,
          zona
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          cidadaoId,
          'Rua das Flores',
          String(Math.floor(Math.random() * 1000)),
          'Apto ' + Math.floor(Math.random() * 100),
          'Centro',
          'Natal',
          'RN',
          '59000000',
          'Próximo à praça',
          'casa',
          'urbana',
        ],
      );
    }
  }

  private static async criarSituacaoMoradia(
    dataSource: DataSource,
    cidadaoId: string,
  ): Promise<void> {
    // Verificar se já existe situação de moradia para o cidadão
    const situacaoMoradiaExistente = await dataSource.query(
      `SELECT id FROM situacao_moradia WHERE cidadao_id = $1`,
      [cidadaoId],
    );

    if (situacaoMoradiaExistente.length === 0) {
      // Criar nova situação de moradia
      await dataSource.query(
        `INSERT INTO situacao_moradia (
          cidadao_id,
          tipo_imovel,
          situacao_imovel,
          tempo_moradia,
          possui_iptu,
          valor_aluguel,
          risco_habitacional,
          condicao_moradia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          cidadaoId,
          'casa',
          'alugado',
          Math.floor(Math.random() * 10) + ' anos',
          false,
          Math.floor(Math.random() * 1000) + 300,
          false,
          'regular',
        ],
      );
    }
  }

  private static async criarBeneficioSocial(
    dataSource: DataSource,
    cidadaoId: string,
  ): Promise<void> {
    // Verificar se já existem benefícios sociais para o cidadão
    const beneficioExistente = await dataSource.query(
      `SELECT id FROM beneficio_social WHERE cidadao_id = $1`,
      [cidadaoId],
    );

    if (beneficioExistente.length === 0) {
      // Criar novo registro de benefício social
      const beneficios = ['Bolsa Família', 'BPC', 'Nenhum'];
      const beneficio =
        beneficios[Math.floor(Math.random() * beneficios.length)];

      if (beneficio !== 'Nenhum') {
        await dataSource.query(
          `INSERT INTO beneficio_social (
            cidadao_id,
            tipo_beneficio,
            valor,
            data_inicio,
            ativo
          )
          VALUES ($1, $2, $3, $4, $5)`,
          [
            cidadaoId,
            beneficio,
            beneficio === 'BPC' ? 1100 : Math.floor(Math.random() * 500) + 100,
            new Date(
              2022,
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1,
            ),
            true,
          ],
        );
      }
    }
  }

  private static async criarInfoBancaria(
    dataSource: DataSource,
    cidadaoId: string,
  ): Promise<void> {
    // Verificar se já existem informações bancárias para o cidadão
    const infoBancariaExistente = await dataSource.query(
      `SELECT id FROM info_bancaria WHERE cidadao_id = $1`,
      [cidadaoId],
    );

    if (infoBancariaExistente.length === 0) {
      // Criar nova informação bancária
      const bancos = [
        'Banco do Brasil',
        'Caixa Econômica Federal',
        'Bradesco',
        'Nubank',
      ];
      const banco = bancos[Math.floor(Math.random() * bancos.length)];

      await dataSource.query(
        `INSERT INTO info_bancaria (
          cidadao_id,
          banco,
          agencia,
          conta,
          tipo_conta,
          titular
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cidadaoId,
          banco,
          String(Math.floor(Math.random() * 9000) + 1000),
          String(Math.floor(Math.random() * 90000) + 10000) +
            '-' +
            Math.floor(Math.random() * 10),
          Math.random() > 0.5 ? 'corrente' : 'poupanca',
          true,
        ],
      );
    }
  }
}
