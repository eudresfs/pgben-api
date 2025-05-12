/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Factory, Seeder } from 'typeorm-seeding';
import { Connection } from 'typeorm';
import { User, UserRole } from '../../user/entities/user.entity';
import { StatusUnidade, TipoUnidade, Unidade } from '../../modules/unidade/entities/unidade.entity';
import { Setor, StatusSetor } from '../../modules/setor/entities/setor.entity';
import { Periodicidade, TipoBeneficio } from '../../modules/beneficio/entities/tipo-beneficio.entity';
import { RequisitoDocumento } from '../../modules/beneficio/entities/requisito-documento.entity';
import { SituacaoMoradia, TipoMoradiaEnum } from '../../modules/cidadao/entities/situacao-moradia.entity';
import { DemandaMotivo } from '../../modules/ocorrencia/entities/demanda-motivo.entity';
import * as bcrypt from 'bcrypt';

export default class InitialDataSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<void> {
    // 1. Criar situações de moradia
    const situacoesMoradia = [
      { nome: 'Própria', tipo_moradia: TipoMoradiaEnum.PROPRIA },
      { nome: 'Alugada', tipo_moradia: TipoMoradiaEnum.ALUGADA },
      { nome: 'Cedida', tipo_moradia: TipoMoradiaEnum.CEDIDA },
      { nome: 'Ocupada', tipo_moradia: TipoMoradiaEnum.OCUPACAO },
      { nome: 'Situação de Rua', tipo_moradia: TipoMoradiaEnum.SITUACAO_RUA },
      { nome: 'Abrigo', tipo_moradia: TipoMoradiaEnum.ABRIGO },
      { nome: 'Casa de Parentes/Amigos', tipo_moradia: TipoMoradiaEnum.OUTRO },
    ];

    await Promise.all(
      situacoesMoradia.map(async (situacao) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(SituacaoMoradia)
          .values(situacao)
          .orIgnore()
          .execute();
      }),
    );

    // 2. Criar motivos de demanda
    const motivosDemanda = [
      { nome: 'Solicitação de Benefício', slug: 'solicitacao-de-beneficio' },
      { nome: 'Acompanhamento Social', slug: 'acompanhamento-social' },
      { nome: 'Violação de Direitos', slug: 'violacao-de-direitos' },
      { nome: 'Violência Doméstica', slug: 'violencia-domestica' },
      { nome: 'Trabalho Infantil', slug: 'trabalho-infantil' },
      { nome: 'Abuso/Violência Sexual', slug: 'abuso-violencia-sexual' },
      { nome: 'Negligência', slug: 'negligencia' },
      { nome: 'Situação de Rua', slug: 'situacao-de-rua' },
      { nome: 'Calamidade Pública', slug: 'calamidade-publica' },
      { nome: 'Outros', slug: 'outros' },
    ];

    await Promise.all(
      motivosDemanda.map(async (motivo) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(DemandaMotivo)
          .values(motivo)
          .orIgnore()
          .execute();
      }),
    );

    // 3. Criar setor
    const setorData = [
      { nome: 'Administrativo', sigla: 'ADM', descricao: 'Setor administrativo', status: StatusSetor.ATIVO },
      { nome: 'Atendimento', sigla: 'ATD', descricao: 'Setor de atendimento ao público', status: StatusSetor.ATIVO },
      { nome: 'Análise Técnica', sigla: 'TEC', descricao: 'Setor técnico de análise', status: StatusSetor.ATIVO },
      { nome: 'Gestão', sigla: 'GST', descricao: 'Setor de gestão e coordenação', status: StatusSetor.ATIVO },
    ];

    // Buscar setores existentes ou criar novos
    const setor: Setor[] = [];
    for (const data of setorData) {
      // Verificar se o setor já existe
      const existingSetor = await connection
        .createQueryBuilder()
        .select('setor')
        .from(Setor, 'setor')
        .where('setor.sigla = :sigla', { sigla: data.sigla })
        .getOne();

      if (existingSetor) {
        setor.push(existingSetor);
      } else {
        // Criar novo setor se não existir
        const result = await connection
          .createQueryBuilder()
          .insert()
          .into(Setor)
          .values(data)
          .returning('*')
          .execute();
        setor.push(result.raw[0]);
      }
    }

    // 4. Criar unidade
    const unidadeData = [
      { 
        nome: 'CRAS Guarapes', 
        sigla: 'CRAS-GUA', 
        tipo: TipoUnidade.CRAS, 
        endereco: {
          logradouro: 'Rua Principal',
          numero: '123',
          bairro: 'Guarapes',
          cidade: 'Natal',
          uf: 'RN',
          cep: '59000-000'
        },
        telefone: '84999999999'
      },
      { 
        nome: 'CRAS Ponta Negra', 
        sigla: 'CRAS-PN', 
        tipo: TipoUnidade.CRAS, 
        endereco: {
          logradouro: 'Rua da Praia',
          numero: '456',
          bairro: 'Ponta Negra',
          cidade: 'Natal',
          uf: 'RN',
          cep: '59000-000'
        },
        telefone: '84999999998'
      },
      { 
        nome: 'CREAS Oeste', 
        sigla: 'CREAS-O', 
        tipo: TipoUnidade.CREAS, 
        endereco: {
          logradouro: 'Avenida Central',
          numero: '789',
          bairro: 'Centro',
          cidade: 'Natal',
          uf: 'RN',
          cep: '59000-000'
        },
        telefone: '84999999997'
      },
      { 
        nome: 'SEMTAS Sede', 
        sigla: 'SEMTAS', 
        tipo: TipoUnidade.SEMTAS, 
        endereco: {
          logradouro: 'Avenida Principal',
          numero: '1000',
          bairro: 'Centro',
          cidade: 'Natal',
          uf: 'RN',
          cep: '59000-000'
        },
        telefone: '84999999996'
      },
    ];

    const unidade = await Promise.all(
      unidadeData.map(async (unidadeData) => {
        // Usando SQL direto para evitar problemas com mapeamento de colunas
        // Verificar se a unidade já existe
        const existingUnidade = await connection
          .createQueryBuilder()
          .select('unidade')
          .from(Unidade, 'unidade')
          .where('unidade.sigla = :sigla', { sigla: unidadeData.sigla })
          .getOne();

        if (existingUnidade) {
          return existingUnidade;
        }

        // Usar SQL direto para evitar problemas com mapeamento de colunas
        const query = `
          INSERT INTO unidade (nome, sigla, tipo, endereco, bairro, telefone, ativo, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
          RETURNING *
        `;
        
        const result = await connection.query(
          query,
          [
            unidadeData.nome,
            unidadeData.sigla,
            unidadeData.tipo,
            JSON.stringify(unidadeData.endereco),
            unidadeData.endereco.bairro,
            unidadeData.telefone,
            true
          ]
        );
        
        return result[0];
      }),
    );

    // 5. Vincular setor a unidade
    const setorUnidadeData = [
      { setor_id: setor[0].id, unidade_id: unidade[3].id }, // Administrativo na SEMTAS
      { setor_id: setor[1].id, unidade_id: unidade[0].id }, // Atendimento no CRAS Guarapes
      { setor_id: setor[1].id, unidade_id: unidade[1].id }, // Atendimento no CRAS Ponta Negra
      { setor_id: setor[1].id, unidade_id: unidade[2].id }, // Atendimento no CREAS Oeste
      { setor_id: setor[2].id, unidade_id: unidade[3].id }, // Análise Técnica na SEMTAS
      { setor_id: setor[3].id, unidade_id: unidade[3].id }, // Gestão na SEMTAS
    ];

    await Promise.all(
      setorUnidadeData.map(async (vinculo) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into('setor_unidade')
          .values(vinculo)
          .execute();
      }),
    );

    // 6. Criar usuários iniciais
    const senha_hash = await bcrypt.hash('Senha@123', 10);
    
    const usersData = [
      {
        nome: 'Administrador',
        email: 'admin@semtas.gov.br',
        senha_hash,
        role: UserRole.ADMIN,
        unidade_id: unidade[3].id,
        setor_id: setor[3].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Gestor SEMTAS',
        email: 'gestor@semtas.gov.br',
        senha_hash,
        role: UserRole.GESTOR_SEMTAS,
        unidade_id: unidade[3].id,
        setor_id: setor[3].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico SEMTAS',
        email: 'tecnico@semtas.gov.br',
        senha_hash,
        role: UserRole.TECNICO_SEMTAS,
        unidade_id: unidade[3].id,
        setor_id: setor[2].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico CRAS Guarapes',
        email: 'tecnico.guarapes@semtas.gov.br',
        senha_hash,
        role: UserRole.TECNICO_UNIDADE,
        unidade_id: unidade[0].id,
        setor_id: setor[1].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico CRAS Ponta Negra',
        email: 'tecnico.pontanegra@semtas.gov.br',
        senha_hash,
        role: UserRole.TECNICO_UNIDADE,
        unidade_id: unidade[1].id,
        setor_id: setor[1].id,
        primeiro_acesso: false,
      },
      {
        nome: 'Técnico CREAS Oeste',
        email: 'tecnico.creas@semtas.gov.br',
        senha_hash,
        role: UserRole.TECNICO_UNIDADE,
        unidade_id: unidade[2].id,
        setor_id: setor[1].id,
        primeiro_acesso: false,
      },
    ];

    await Promise.all(
      usersData.map(async (userData) => {
        await connection
          .createQueryBuilder()
          .insert()
          .into(User)
          .values(userData)
          .execute();
      }),
    );

    // 7. Criar tipos de benefício
    const tiposBeneficioData = [
      {
        nome: 'Auxílio Natalidade',
        descricao: 'Kit enxoval para recém-nascidos',
        base_legal: 'Arts. 9º-16 da Lei Municipal 7.205/2021',
        periodicidade: Periodicidade.UNICO,
        periodo_maximo: 1,
        permite_renovacao: false,
        permite_prorrogacao: false,
        ativo: true,
      },
      {
        nome: 'Aluguel Social',
        descricao: 'Auxílio para pagamento de aluguel por período temporário',
        base_legal: 'Arts. 32-34 da Lei Municipal 7.205/2021',
        periodicidade: Periodicidade.MENSAL,
        periodo_maximo: 6,
        permite_renovacao: true,
        permite_prorrogacao: true,
        valor_maximo: 1000.00,
        ativo: true,
      },
    ];

    const tiposBeneficio = await Promise.all(
      tiposBeneficioData.map(async (tipoData) => {
        const tipo = await connection
          .createQueryBuilder()
          .insert()
          .into(TipoBeneficio)
          .values(tipoData)
          .returning('*')
          .execute();
        return tipo.raw[0];
      }),
    );

    // 8. Criar requisitos de documentos para Auxílio Natalidade
    const requisitosNatalidade = [
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'RG',
        descricao: 'Documento de identidade',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 1,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'CPF',
        descricao: 'Cadastro de Pessoa Física',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 2,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Cartão de Gestante',
        descricao: 'Cartão de acompanhamento pré-natal',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 3,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Comprovante de Residência',
        descricao: 'Comprovante de residência em Natal (últimos 3 meses)',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 4,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Comprovante de Renda',
        descricao: 'Comprovante de renda familiar',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 5,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Certidão de Nascimento',
        descricao: 'Certidão de nascimento da criança (caso já tenha nascido)',
        fase: 'solicitacao',
        obrigatorio: false,
        ordem: 6,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Termo de Responsabilidade',
        descricao: 'Termo de responsabilidade assinado pelo beneficiário',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 7,
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        nome: 'Comprovante de Recebimento',
        descricao: 'Comprovante de recebimento do benefício assinado',
        fase: 'liberacao',
        obrigatorio: true,
        ordem: 8,
      },
    ];

    // 9. Criar requisitos de documentos para Aluguel Social
    const requisitosAluguel = [
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'RG',
        descricao: 'Documento de identidade',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 1,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'CPF',
        descricao: 'Cadastro de Pessoa Física',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 2,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Residência Atual',
        descricao: 'Comprovante de residência atual',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 3,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Residência Anterior',
        descricao: 'Comprovante de residência em Natal há pelo menos 2 anos',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 4,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Renda',
        descricao: 'Comprovante de renda familiar',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 5,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Laudo de Interdição',
        descricao: 'Laudo de interdição ou documento similar (quando aplicável)',
        fase: 'solicitacao',
        obrigatorio: false,
        ordem: 6,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Contrato de Aluguel',
        descricao: 'Contrato de aluguel ou declaração do proprietário',
        fase: 'solicitacao',
        obrigatorio: true,
        ordem: 7,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Recibo de Aluguel Anterior',
        descricao: 'Recibo do aluguel do mês anterior (para renovação/prorrogação)',
        fase: 'solicitacao',
        obrigatorio: false,
        ordem: 8,
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        nome: 'Comprovante de Pagamento',
        descricao: 'Comprovante de pagamento do aluguel',
        fase: 'liberacao',
        obrigatorio: true,
        ordem: 9,
      },
    ];

    await Promise.all([
      ...requisitosNatalidade,
      ...requisitosAluguel,
    ].map(async (requisitoData) => {
      await connection
        .createQueryBuilder()
        .insert()
        .into(RequisitoDocumento)
        .values(requisitoData)
        .execute();
    }));

    // 10. Criar fluxo de trabalho para benefícios
    const fluxoNatalidade = [
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[1].id,
        ordem: 1,
        tipo_acao: 'cadastro',
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[2].id,
        ordem: 2,
        tipo_acao: 'analise',
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[3].id,
        ordem: 3,
        tipo_acao: 'aprovacao',
      },
      {
        tipo_beneficio_id: tiposBeneficio[0].id,
        setor_id: setor[1].id,
        ordem: 4,
        tipo_acao: 'liberacao',
      },
    ];

    const fluxoAluguel = [
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[1].id,
        ordem: 1,
        tipo_acao: 'cadastro',
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[2].id,
        ordem: 2,
        tipo_acao: 'analise',
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[3].id,
        ordem: 3,
        tipo_acao: 'aprovacao',
      },
      {
        tipo_beneficio_id: tiposBeneficio[1].id,
        setor_id: setor[1].id,
        ordem: 4,
        tipo_acao: 'liberacao',
      },
    ];

    await Promise.all([
      ...fluxoNatalidade,
      ...fluxoAluguel,
    ].map(async (fluxoData) => {
      await connection
        .createQueryBuilder()
        .insert()
        .into('fluxo_beneficio')
        .values(fluxoData)
        .execute();
    }));
  }
}