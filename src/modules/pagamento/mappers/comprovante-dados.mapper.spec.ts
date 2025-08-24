import { ComprovanteDadosMapper } from './comprovante-dados.mapper';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { Endereco } from '../../../entities/endereco.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
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
    beneficiario_id: 'cidadao-id',
    beneficiario: mockCidadao,
    tipo_beneficio_id: 'tipo-beneficio-id',
    tipo_beneficio: mockTipoBeneficio,
    data_solicitacao: new Date('2024-01-10'),
    status: 'aprovada',
    observacoes: 'Solicitação aprovada',
    created_at: new Date(),
    updated_at: new Date(),
  } as Solicitacao;

  const mockPagamento: Pagamento = {
    id: 'pagamento-id',
    solicitacao_id: 'solicitacao-id',
    solicitacao: mockSolicitacao,
    valor: 150.50,
    data_liberacao: new Date('2024-01-15'),
    metodo_pagamento: 'PIX',
    numero_parcelas: 1,
    status: StatusPagamentoEnum.LIBERADO,
    observacoes: 'Pagamento liberado',
    created_at: new Date(),
    updated_at: new Date(),
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
      expect(resultado.assinaturas).toBeDefined();
      expect(resultado.assinaturas.beneficiario.nome).toBe('João da Silva');
      expect(resultado.assinaturas.beneficiario.data).toBeInstanceOf(Date);
      expect(resultado.assinaturas.tecnico.nome).toBe('Técnico Responsável');
      expect(resultado.assinaturas.tecnico.cargo).toBe('Assistente Social');
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

  describe('formatarCpf', () => {
    it('deve formatar CPF com pontos e hífen', () => {
      // Act
      const cpfFormatado = ComprovanteDadosMapper.formatarCpf('12345678900');

      // Assert
      expect(cpfFormatado).toBe('123.456.789-00');
    });

    it('deve retornar CPF já formatado sem alteração', () => {
      // Act
      const cpfFormatado = ComprovanteDadosMapper.formatarCpf('123.456.789-00');

      // Assert
      expect(cpfFormatado).toBe('123.456.789-00');
    });

    it('deve lidar com CPF vazio', () => {
      // Act
      const cpfFormatado = ComprovanteDadosMapper.formatarCpf('');

      // Assert
      expect(cpfFormatado).toBe('');
    });

    it('deve lidar com CPF null ou undefined', () => {
      // Act
      const cpfNull = ComprovanteDadosMapper.formatarCpf(null as any);
      const cpfUndefined = ComprovanteDadosMapper.formatarCpf(undefined as any);

      // Assert
      expect(cpfNull).toBe('');
      expect(cpfUndefined).toBe('');
    });
  });

  describe('formatarCep', () => {
    it('deve formatar CEP com hífen', () => {
      // Act
      const cepFormatado = ComprovanteDadosMapper.formatarCep('01234567');

      // Assert
      expect(cepFormatado).toBe('01234-567');
    });

    it('deve retornar CEP já formatado sem alteração', () => {
      // Act
      const cepFormatado = ComprovanteDadosMapper.formatarCep('01234-567');

      // Assert
      expect(cepFormatado).toBe('01234-567');
    });

    it('deve lidar com CEP vazio', () => {
      // Act
      const cepFormatado = ComprovanteDadosMapper.formatarCep('');

      // Assert
      expect(cepFormatado).toBe('');
    });

    it('deve lidar com CEP de tamanho incorreto', () => {
      // Act
      const cepCurto = ComprovanteDadosMapper.formatarCep('12345');
      const cepLongo = ComprovanteDadosMapper.formatarCep('123456789');

      // Assert
      expect(cepCurto).toBe('12345');
      expect(cepLongo).toBe('123456789');
    });
  });

  describe('gerarNumeroComprovante', () => {
    it('deve gerar número de comprovante com formato correto', () => {
      // Arrange
      const data = new Date('2024-01-15');

      // Act
      const numero = ComprovanteDadosMapper.gerarNumeroComprovante(data);

      // Assert
      expect(numero).toMatch(/^COMP-202401-[A-Z0-9]{8}$/);
    });

    it('deve gerar números diferentes para chamadas consecutivas', () => {
      // Arrange
      const data = new Date('2024-01-15');

      // Act
      const numero1 = ComprovanteDadosMapper.gerarNumeroComprovante(data);
      const numero2 = ComprovanteDadosMapper.gerarNumeroComprovante(data);

      // Assert
      expect(numero1).not.toBe(numero2);
    });

    it('deve incluir ano e mês corretos no número', () => {
      // Arrange
      const dataMarco = new Date('2024-03-15');
      const dataDezembo = new Date('2023-12-25');

      // Act
      const numeroMarco = ComprovanteDadosMapper.gerarNumeroComprovante(dataMarco);
      const numeroDezembro = ComprovanteDadosMapper.gerarNumeroComprovante(dataDezembo);

      // Assert
      expect(numeroMarco).toContain('202403');
      expect(numeroDezembro).toContain('202312');
    });
  });

  describe('validarDadosObrigatorios', () => {
    let dadosValidos: IDadosComprovante;

    beforeEach(() => {
      dadosValidos = ComprovanteDadosMapper.mapearParaComprovante(mockPagamento);
    });

    it('deve validar dados completos sem erro', () => {
      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosValidos);
      }).not.toThrow();
    });

    it('deve lançar erro quando nome do beneficiário estiver ausente', () => {
      // Arrange
      dadosValidos.beneficiario.nome = '';

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosValidos);
      }).toThrow('Nome do beneficiário é obrigatório');
    });

    it('deve lançar erro quando CPF estiver ausente', () => {
      // Arrange
      dadosValidos.beneficiario.cpf = '';

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosValidos);
      }).toThrow('CPF do beneficiário é obrigatório');
    });

    it('deve lançar erro quando valor do pagamento for inválido', () => {
      // Arrange
      dadosValidos.pagamento.valor = 0;

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosValidos);
      }).toThrow('Valor do pagamento deve ser maior que zero');
    });

    it('deve lançar erro quando endereço estiver incompleto', () => {
      // Arrange
      dadosValidos.beneficiario.endereco.logradouro = '';

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosValidos);
      }).toThrow('Logradouro é obrigatório');
    });

    it('deve lançar erro com múltiplos campos ausentes', () => {
      // Arrange
      dadosValidos.beneficiario.nome = '';
      dadosValidos.beneficiario.cpf = '';
      dadosValidos.pagamento.valor = 0;

      // Act & Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosValidos);
      }).toThrow('Nome do beneficiário é obrigatório, CPF do beneficiário é obrigatório, Valor do pagamento deve ser maior que zero');
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

    it('deve criar dados que passam na validação', () => {
      // Act
      const dadosExemplo = ComprovanteDadosMapper.criarDadosExemplo();

      // Assert
      expect(() => {
        ComprovanteDadosMapper.validarDadosObrigatorios(dadosExemplo);
      }).not.toThrow();
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
      expect(dadosExemplo.assinaturas).toBeDefined();
    });
  });
});