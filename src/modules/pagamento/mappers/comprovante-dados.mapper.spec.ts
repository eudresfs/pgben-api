import { ComprovanteDadosMapper } from './comprovante-dados.mapper';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { Endereco } from '../../../entities/endereco.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { PublicoPrioritarioAluguel } from '../../../enums';
import { IDadosComprovante } from '../interfaces/comprovante-pdf.interface';

describe('ComprovanteDadosMapper', () => {
  const mockEndereco: Endereco = {
    id: 'endereco-id',
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234567',
    created_at: new Date(),
    updated_at: new Date(),
  } as Endereco;

  const mockCidadao: Cidadao = {
    id: 'cidadao-id',
    nome: 'João da Silva',
    cpf: '12345678900',
    rg: '123456789',
    data_nascimento: new Date('1990-01-15'),
    telefone: '11987654321',
    email: 'joao@email.com',
    endereco_id: 'endereco-id',
    endereco: mockEndereco,
    created_at: new Date(),
    updated_at: new Date(),
  } as Cidadao;

  const mockTipoBeneficio: TipoBeneficio = {
    id: 'tipo-beneficio-id',
    nome: 'Cesta Básica',
    descricao: 'Benefício de segurança alimentar',
    valor_maximo: 200.00,
    ativo: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as TipoBeneficio;

  const mockSolicitacao: Solicitacao = {
    id: 'solicitacao-id',
    protocolo: 'PROT-2024-001',
    beneficiario_id: 'beneficiario-id',
    beneficiario: mockCidadao,
    solicitante_id: null,
    solicitante: null,
    tipo_beneficio_id: 'tipo-beneficio-id',
    tipo_beneficio: mockTipoBeneficio,
    unidade_id: 'unidade-id',
    unidade: null,
    tecnico_id: 'tecnico-id',
    tecnico: null,
    data_abertura: new Date(),
    status: 'aprovada' as any,
    sub_status: null,
    parecer_semtas: null,
    aprovador_id: null,
    aprovador: null,
    data_aprovacao: null,
    data_liberacao: null,
    liberador_id: null,
    liberador: null,
    observacoes: 'Solicitação aprovada',
    dados_complementares: null,
    valor: null,
    documentos: [],
    historico: [],
    pendencias: [],
    pagamentos: [],
    info_bancaria: [],
    concessao: null,
    version: 1,
    processo_judicial_id: null,
    processo_judicial: null,
    determinacao_judicial_id: null,
    determinacao_judicial: null,
    determinacao_judicial_flag: false,
    quantidade_parcelas: 1,
    prioridade: 3,
    solicitacao_original_id: null,
    solicitacao_original: null,
    dados_dinamicos: null,
    prazo_analise: null,
    prazo_documentos: null,
    prazo_processamento: null,
    dados_aluguel_social: mockDadosAluguelSocial,
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
  } as Solicitacao;

  const mockPagamento: Pagamento = {
    id: 'pagamento-id',
    solicitacao_id: 'solicitacao-id',
    concessao_id: null,
    info_bancaria_id: null,
    valor: 500.0,
    data_liberacao: new Date(),
    data_prevista_liberacao: null,
    data_agendamento: null,
    data_pagamento: null,
    data_conclusao: null,
    data_vencimento: null,
    data_regularizacao: null,
    status: StatusPagamentoEnum.LIBERADO,
    metodo_pagamento: 'PIX' as any,
    liberado_por: null,
    criado_por: null,
    comprovante_id: null,
    numero_parcela: 1,
    total_parcelas: 1,
    observacoes: 'Teste',
    monitorado: false,
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
    solicitacao: mockSolicitacao,
    concessao: null,
    info_bancaria: null,
    responsavel_liberacao: null,
    criador: null,
    documentos: [],
    confirmacoes: [],
  } as Pagamento;

  describe('mapearParaComprovante', () => {
    it('deve mapear pagamento completo para dados de comprovante', () => {
      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(mockPagamento);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.beneficiario.nome).toBe('João da Silva');
      expect(resultado.beneficiario.cpf).toBe('123.456.789-00');
      expect(resultado.beneficiario.rg).toBe('12.345.678-9');
      expect(resultado.beneficiario.endereco.logradouro).toBe('Rua das Flores');
      expect(resultado.beneficiario.endereco.cep).toBe('01234-567');
      expect(resultado.pagamento.valor).toBe(150.50);
      expect(resultado.pagamento.status).toBe(StatusPagamentoEnum.LIBERADO);
      expect(resultado.numeroComprovante).toMatch(/^COMP-\d{6}-[A-Z0-9]{8}$/);
    });

    it('deve mapear dados bancários quando disponíveis', () => {
      // Arrange
      const pagamentoComBanco = {
        ...mockPagamento,
        banco: 'Banco do Brasil',
        agencia: '12345',
        conta: '123456',
        tipo_conta: 'Conta Corrente',
      };

      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(pagamentoComBanco);

      // Assert
      expect(resultado.dadosBancarios).toBeDefined();
      expect(resultado.dadosBancarios?.banco).toBe('Banco do Brasil');
      expect(resultado.dadosBancarios?.agencia).toBe('1234-5');
      expect(resultado.dadosBancarios?.conta).toBe('12345-6');
    });

    it('deve mapear dados do técnico quando disponíveis', () => {
      // Arrange
      const pagamentoComTecnico = {
        ...mockPagamento,
        tecnico_responsavel: 'Maria Santos',
        matricula_tecnico: 'T12345',
        cargo_tecnico: 'Assistente Social',
      };

      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(pagamentoComTecnico);

      // Assert
      expect(resultado.tecnico).toBeDefined();
      expect(resultado.tecnico?.nome).toBe('Maria Santos');
      expect(resultado.tecnico?.matricula).toBe('T12345');
      expect(resultado.tecnico?.cargo).toBe('Assistente Social');
    });

    it('deve gerar assinaturas com dados do beneficiário e técnico', () => {
      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(mockPagamento);

      // Assert
      expect(resultado.beneficiario.nome).toBe('João da Silva');
      expect(resultado.tecnico?.nome).toBe('Técnico Responsável');
      expect(resultado.tecnico?.cargo).toBe('Assistente Social');
      expect(resultado.dataGeracao).toBeInstanceOf(Date);
    });

    it('deve definir unidade padrão quando não especificada', () => {
      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(mockPagamento);

      // Assert
      expect(resultado.unidade).toBeDefined();
      expect(resultado.unidade.nome).toBe('SEMTAS - Secretaria Municipal de Trabalho e Assistência Social');
      expect(resultado.unidade.endereco).toBe('Av. Principal, 1000 - Centro');
    });
  });





  describe('validarDadosObrigatorios', () => {
    let pagamentoValido: Pagamento;

    beforeEach(() => {
      pagamentoValido = { ...mockPagamento } as Pagamento;
    });

    it('deve validar dados completos sem erro', () => {
      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(pagamentoValido);
      }).not.toThrow();
    });

    it('deve lançar erro quando nome do beneficiário estiver ausente', () => {
      // Arrange
      pagamentoValido.solicitacao.beneficiario.nome = '';

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(pagamentoValido);
      }).toThrow('Nome do beneficiário é obrigatório');
    });

    it('deve lançar erro quando CPF estiver ausente', () => {
      // Arrange
      pagamentoValido.solicitacao.beneficiario.cpf = '';

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(pagamentoValido);
      }).toThrow('CPF do beneficiário é obrigatório');
    });

    it('deve lançar erro quando valor do pagamento for inválido', () => {
      // Arrange
      pagamentoValido.valor = 0;

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(pagamentoValido);
      }).toThrow('Valor do pagamento é obrigatório');
    });

    it('deve lançar erro quando data de liberação estiver ausente', () => {
      // Arrange
      pagamentoValido.data_liberacao = null;

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(pagamentoValido);
      }).toThrow('Data de liberação é obrigatória');
    });

    it('deve lançar erro com múltiplos campos ausentes', () => {
      // Arrange
      pagamentoValido.solicitacao.beneficiario.nome = '';
      pagamentoValido.solicitacao.beneficiario.cpf = '';
      pagamentoValido.valor = 0;

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(pagamentoValido);
      }).toThrow('Nome do beneficiário é obrigatório, CPF do beneficiário é obrigatório, Valor do pagamento é obrigatório');
    });
  });

  describe('criarDadosExemplo', () => {
    it('deve criar dados de exemplo válidos', () => {
      // Act
      const dadosExemplo = ComprovanteDadosMapper.criarDadosExemplo();

      // Assert
      expect(dadosExemplo).toBeDefined();
      expect(dadosExemplo.beneficiario.nome).toBe('João da Silva Santos');
      expect(dadosExemplo.beneficiario.cpf).toBe('123.456.789-00');
      expect(dadosExemplo.pagamento.valor).toBe(150.00);
      expect(dadosExemplo.numeroComprovante).toMatch(/^COMP-\d{6}-[A-Z0-9]{8}$/);
    });

    it('deve criar dados que são válidos', () => {
      // Act
      const dadosExemplo = ComprovanteDadosMapper.criarDadosExemplo();

      // Assert
      expect(dadosExemplo.beneficiario.nome).toBeTruthy();
      expect(dadosExemplo.beneficiario.cpf).toBeTruthy();
      expect(dadosExemplo.pagamento.valor).toBeGreaterThan(0);
    });

    it('deve incluir todos os campos obrigatórios', () => {
      // Act
      const dadosExemplo = ComprovanteDadosMapper.criarDadosExemplo();

      // Assert
      expect(dadosExemplo.beneficiario).toBeDefined();
      expect(dadosExemplo.pagamento).toBeDefined();
      expect(dadosExemplo.unidade).toBeDefined();
      expect(dadosExemplo.dataGeracao).toBeDefined();
      expect(dadosExemplo.numeroComprovante).toBeDefined();
      expect(dadosExemplo.beneficiario.nome).toBeTruthy();
      expect(dadosExemplo.beneficiario.cpf).toBeTruthy();
    });
  });

  describe('Mapeamento de dados do locador para Aluguel Social', () => {
    it('deve mapear corretamente os dados do locador quando presentes', () => {
      // Arrange
      const mockTipoBeneficioAluguel = {
        id: 'tipo-beneficio-aluguel-id',
        nome: 'aluguel-social',
        descricao: 'Aluguel Social',
        codigo: 'AS',
        valor_maximo: 600,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any;

      const mockSolicitacaoAluguel: Partial<Solicitacao> = {
        ...mockSolicitacao,
        tipo_beneficio: mockTipoBeneficioAluguel,
      };

      const mockSolicitacaoAluguelComDados = {
        ...mockSolicitacaoAluguel,
        dados_aluguel_social: {
          id: 'dados-aluguel-id',
          solicitacao_id: 'solicitacao-id',
          publico_prioritario: PublicoPrioritarioAluguel.FAMILIAS_IDOSOS,
          situacao_moradia_atual: 'Família reside em casa de parentes',
          possui_imovel_interditado: false,
          nome_locador: 'Maria Santos Silva',
          cpf_locador: '123.456.789-00',
          telefone_locador: '(11) 99999-9999',
          endereco_imovel_pretendido: 'Rua das Palmeiras, 456 - Jardim das Flores',
          valor_aluguel_pretendido: 'R$ 800,00',
          created_at: new Date(),
          updated_at: new Date(),
        } as DadosAluguelSocial,
      };

      const mockPagamentoAluguel: Partial<Pagamento> = {
         ...mockPagamento,
         solicitacao: mockSolicitacaoAluguelComDados as any,
       };

      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(mockPagamentoAluguel as Pagamento);

      // Assert
      expect(resultado.locador).toBeDefined();
      expect(resultado.locador?.nome).toBe('Maria Santos Silva');
      expect(resultado.locador?.cpf).toBe('123.456.789-00');
      expect(resultado.imovel).toBeDefined();
      expect(resultado.imovel?.endereco).toBe('Rua das Palmeiras, 456 - Jardim das Flores');
    });

    it('deve retornar undefined para dados do locador quando não presentes', () => {
      // Arrange
      const mockTipoBeneficioAluguel = {
        id: 'tipo-beneficio-aluguel-id',
        nome: 'aluguel-social',
        descricao: 'Aluguel Social',
        codigo: 'AS',
        valor_maximo: 800.00,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any;

      const mockSolicitacaoAluguel: Partial<Solicitacao> = {
        ...mockSolicitacao,
        tipo_beneficio: mockTipoBeneficioAluguel,
      };

      const mockSolicitacaoAluguelSemDados = {
        ...mockSolicitacaoAluguel,
        dados_aluguel_social: {
          id: 'dados-aluguel-id',
          solicitacao_id: 'solicitacao-id',
          publico_prioritario: PublicoPrioritarioAluguel.FAMILIAS_IDOSOS,
          situacao_moradia_atual: 'Família reside em casa de parentes',
          possui_imovel_interditado: false,
          nome_locador: undefined,
          cpf_locador: undefined,
          endereco_imovel_pretendido: undefined,
          created_at: new Date(),
          updated_at: new Date(),
        } as DadosAluguelSocial,
      };

      const mockPagamentoAluguel: Partial<Pagamento> = {
         ...mockPagamento,
         solicitacao: mockSolicitacaoAluguelSemDados as any,
       };

      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(mockPagamentoAluguel as Pagamento);

      // Assert
      expect(resultado.locador?.nome).toBeUndefined();
      expect(resultado.locador?.cpf).toBeUndefined();
      expect(resultado.imovel?.endereco).toBeUndefined();
    });

    it('deve mapear dados do locador apenas para tipo de benefício aluguel social', () => {
      // Arrange
      const mockTipoBeneficioCestaBasica = {
        id: 'tipo-beneficio-id',
        nome: 'Cesta Básica',
        descricao: 'Benefício de auxílio alimentação',
        codigo: 'cesta-basica',
        valor_maximo: 200.00,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any;

      const mockSolicitacaoCestaBasica: Partial<Solicitacao> = {
        ...mockSolicitacao,
        tipo_beneficio: mockTipoBeneficioCestaBasica,
      };

      const mockSolicitacaoCestaBasicaSemDados = {
        ...mockSolicitacaoCestaBasica,
        dados_aluguel_social: null,
      };

      const mockPagamentoCestaBasica: Partial<Pagamento> = {
         ...mockPagamento,
         solicitacao: mockSolicitacaoCestaBasicaSemDados as any,
       };

      // Act
      const resultado = ComprovanteDadosMapper.mapearParaComprovante(mockPagamentoCestaBasica as Pagamento);

      // Assert
      expect(resultado.locador).toBeUndefined();
      expect(resultado.imovel).toBeUndefined();
    });
  });
});