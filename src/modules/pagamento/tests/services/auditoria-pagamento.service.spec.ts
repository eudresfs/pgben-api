import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaPagamentoService } from '../../services/auditoria-pagamento.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../enums/metodo-pagamento.enum';

/**
 * Testes unitários para o serviço de auditoria de pagamento
 * 
 * Verifica o funcionamento correto das operações de registro de logs
 * para ações sensíveis relacionadas a pagamentos.
 * 
 * @author Equipe PGBen
 */
describe('AuditoriaPagamentoService', () => {
  let service: AuditoriaPagamentoService;
  let logger: Logger;
  let configService: ConfigService;

  // Mock do Logger
  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };

  // Mock do ConfigService
  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'auditoria.nivel') {return 'completo';}
      if (key === 'auditoria.mascaraDados') {return true;}
      return null;
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaPagamentoService,
        {
          provide: Logger,
          useValue: mockLogger
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ],
    }).compile();

    service = module.get<AuditoriaPagamentoService>(AuditoriaPagamentoService);
    logger = module.get<Logger>(Logger);
    configService = module.get<ConfigService>(ConfigService);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('logCriacaoPagamento', () => {
    const pagamento = {
      id: 'pagamento-id',
      solicitacaoId: 'solicitacao-id',
      valor: 500.00,
      status: StatusPagamentoEnum.AGENDADO,
      metodoPagamento: MetodoPagamentoEnum.PIX,
      dadosBancarios: {
        pixTipo: 'cpf',
        pixChave: '12345678909'
      }
    };
    const usuarioId = 'usuario-id';

    it('deve registrar log de criação de pagamento com dados mascarados', () => {
      // Executar método
      service.logCriacaoPagamento(pagamento, usuarioId);

      // Verificar resultado
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Pagamento criado'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém dados mascarados
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).not.toContain('12345678909');
      expect(logMessage).toContain('***');
    });

    it('deve registrar log sem mascaramento quando configurado', () => {
      // Alterar configuração para não mascarar dados
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'auditoria.nivel') {return 'completo';}
        if (key === 'auditoria.mascaraDados') {return false;}
        return null;
      });

      // Executar método
      service.logCriacaoPagamento(pagamento, usuarioId);

      // Verificar resultado
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Pagamento criado'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém dados completos
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain(pagamento.id);
      expect(logMessage).toContain(pagamento.solicitacaoId);
    });
  });

  describe('logMudancaStatus', () => {
    const pagamentoId = 'pagamento-id';
    const statusAntigo = StatusPagamentoEnum.AGENDADO;
    const statusNovo = StatusPagamentoEnum.LIBERADO;
    const usuarioId = 'usuario-id';

    it('deve registrar log de mudança de status', () => {
      // Executar método
      service.logMudancaStatus(pagamentoId, statusAntigo, statusNovo, usuarioId);

      // Verificar resultado
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Status alterado'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém os status
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain(statusAntigo);
      expect(logMessage).toContain(statusNovo);
      expect(logMessage).toContain(pagamentoId);
    });
  });

  describe('logCancelamentoPagamento', () => {
    const pagamentoId = 'pagamento-id';
    const motivo = 'Pagamento cancelado a pedido do beneficiário';
    const usuarioId = 'usuario-id';

    it('deve registrar log de cancelamento de pagamento', () => {
      // Executar método
      service.logCancelamentoPagamento(pagamentoId, motivo, usuarioId);

      // Verificar resultado
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Pagamento cancelado'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém o motivo
      const logMessage = mockLogger.warn.mock.calls[0][0];
      expect(logMessage).toContain(motivo);
      expect(logMessage).toContain(pagamentoId);
    });
  });

  describe('logUploadComprovante', () => {
    const pagamentoId = 'pagamento-id';
    const comprovanteId = 'comprovante-id';
    const usuarioId = 'usuario-id';
    const nomeArquivo = 'comprovante.pdf';

    it('deve registrar log de upload de comprovante', () => {
      // Executar método
      service.logUploadComprovante(pagamentoId, comprovanteId, nomeArquivo, usuarioId);

      // Verificar resultado
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Comprovante enviado'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém os dados do comprovante
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain(pagamentoId);
      expect(logMessage).toContain(comprovanteId);
      expect(logMessage).toContain(nomeArquivo);
    });
  });

  describe('logRemocaoComprovante', () => {
    const pagamentoId = 'pagamento-id';
    const comprovanteId = 'comprovante-id';
    const usuarioId = 'usuario-id';
    const motivo = 'Documento incorreto';

    it('deve registrar log de remoção de comprovante', () => {
      // Executar método
      service.logRemocaoComprovante(pagamentoId, comprovanteId, motivo, usuarioId);

      // Verificar resultado
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Comprovante removido'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém os dados da remoção
      const logMessage = mockLogger.warn.mock.calls[0][0];
      expect(logMessage).toContain(pagamentoId);
      expect(logMessage).toContain(comprovanteId);
      expect(logMessage).toContain(motivo);
    });
  });

  describe('logConfirmacaoRecebimento', () => {
    const pagamentoId = 'pagamento-id';
    const confirmacaoId = 'confirmacao-id';
    const usuarioId = 'usuario-id';

    it('deve registrar log de confirmação de recebimento', () => {
      // Executar método
      service.logConfirmacaoRecebimento(pagamentoId, confirmacaoId, usuarioId);

      // Verificar resultado
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Recebimento confirmado'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém os dados da confirmação
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain(pagamentoId);
      expect(logMessage).toContain(confirmacaoId);
    });
  });

  describe('logErroProcessamento', () => {
    const pagamentoId = 'pagamento-id';
    const erro = new Error('Erro ao processar pagamento');
    const contexto = 'atualizarStatus';

    it('deve registrar log de erro de processamento', () => {
      // Executar método
      service.logErroProcessamento(pagamentoId, erro, contexto);

      // Verificar resultado
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao processar pagamento'),
        expect.stringContaining('AuditoriaPagamento')
      );
      
      // Verificar que o log contém os dados do erro
      const logMessage = mockLogger.error.mock.calls[0][0];
      expect(logMessage).toContain(pagamentoId);
      expect(logMessage).toContain(contexto);
      expect(logMessage).toContain(erro.message);
    });
  });
});
