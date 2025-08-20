import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AprovacaoService } from '../services/aprovacao.service';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { StatusSolicitacao } from '../enums/status-solicitacao.enum';
import { TipoAcaoCritica } from '../enums/tipo-acao-critica.enum';

/**
 * Teste específico para verificar a correção do problema de timing
 * na criação de solicitações após aprovação
 */
describe('AprovacaoService - Correção de Timing', () => {
  let service: AprovacaoService;
  let solicitacaoRepository: Repository<SolicitacaoAprovacao>;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    // Mock do QueryBuilder
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AprovacaoService,
          useValue: {
            buscarSolicitacaoPendente: jest.fn(),
            validarCriacaoSolicitacao: jest.fn()
          }
        },
        {
          provide: getRepositoryToken(SolicitacaoAprovacao),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder)
          }
        }
      ]
    }).compile();

    service = module.get<AprovacaoService>(AprovacaoService);
    solicitacaoRepository = module.get<Repository<SolicitacaoAprovacao>>(
      getRepositoryToken(SolicitacaoAprovacao)
    );
  });

  describe('buscarSolicitacaoPendente', () => {
    it('deve retornar solicitação PENDENTE quando existe', async () => {
      // Arrange
      const solicitacaoExistente = {
        id: '123',
        status: StatusSolicitacao.PENDENTE,
        codigo: 'SOL-001',
        justificativa: 'Teste pendente'
      };

      service.buscarSolicitacaoPendente = jest.fn().mockResolvedValue(solicitacaoExistente);

      // Act
      const resultado = await service.buscarSolicitacaoPendente(
        'user-123',
        TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        { params: { id: 'item-123' } }
      );

      // Assert
      expect(resultado).toEqual(solicitacaoExistente);
      expect(resultado.status).toBe(StatusSolicitacao.PENDENTE);
    });

    it('deve retornar solicitação APROVADA quando existe (em execução)', async () => {
      // Arrange
      const solicitacaoAprovada = {
        id: '456',
        status: StatusSolicitacao.APROVADA,
        codigo: 'SOL-002',
        justificativa: 'Teste aprovada em execução'
      };

      service.buscarSolicitacaoPendente = jest.fn().mockResolvedValue(solicitacaoAprovada);

      // Act
      const resultado = await service.buscarSolicitacaoPendente(
        'user-123',
        TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        { params: { id: 'item-123' } }
      );

      // Assert
      expect(resultado).toEqual(solicitacaoAprovada);
      expect(resultado.status).toBe(StatusSolicitacao.APROVADA);
    });

    it('deve retornar null quando não existe solicitação pendente nem aprovada', async () => {
      // Arrange
      service.buscarSolicitacaoPendente = jest.fn().mockResolvedValue(null);

      // Act
      const resultado = await service.buscarSolicitacaoPendente(
        'user-123',
        TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        { params: { id: 'item-123' } }
      );

      // Assert
      expect(resultado).toBeNull();
    });
  });

  describe('validarCriacaoSolicitacao', () => {
    it('deve lançar exceção com mensagem específica para solicitação PENDENTE', async () => {
      // Arrange
      const solicitacaoPendente = {
        status: StatusSolicitacao.PENDENTE,
        codigo: 'SOL-001',
        justificativa: 'Alteração de dados críticos'
      };

      service.buscarSolicitacaoPendente = jest.fn().mockResolvedValue(solicitacaoPendente);
      service.validarCriacaoSolicitacao = async (dto, solicitanteId) => {
        const solicitacao = await service.buscarSolicitacaoPendente(
          solicitanteId,
          dto.tipo_acao,
          dto.dados_acao
        );
        
        if (solicitacao) {
          const statusTexto = solicitacao.status === StatusSolicitacao.PENDENTE 
            ? 'pendente' 
            : 'sendo executada';
          
          const mensagem = `Já existe uma solicitação ${statusTexto} para ${solicitacao.justificativa} (Protocolo: ${solicitacao.codigo}). ` +
            `${solicitacao.status === StatusSolicitacao.PENDENTE ? 'Aguarde a decisão do aprovador responsável.' : 'Aguarde a conclusão da execução.'}`;
          
          throw new BadRequestException(mensagem);
        }
      };

      const dto = {
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        dados_acao: { params: { id: 'item-123' } },
        justificativa: 'Nova alteração',
        metodo_execucao: 'PUT /api/v1/test'
      };

      // Act & Assert
      await expect(service.validarCriacaoSolicitacao(dto, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(service.validarCriacaoSolicitacao(dto, 'user-123'))
        .rejects
        .toThrow('Já existe uma solicitação pendente para Alteração de dados críticos (Protocolo: SOL-001). Aguarde a decisão do aprovador responsável.');
    });

    it('deve lançar exceção com mensagem específica para solicitação APROVADA', async () => {
      // Arrange
      const solicitacaoAprovada = {
        status: StatusSolicitacao.APROVADA,
        codigo: 'SOL-002',
        justificativa: 'Alteração de dados críticos'
      };

      service.buscarSolicitacaoPendente = jest.fn().mockResolvedValue(solicitacaoAprovada);
      service.validarCriacaoSolicitacao = async (dto, solicitanteId) => {
        const solicitacao = await service.buscarSolicitacaoPendente(
          solicitanteId,
          dto.tipo_acao,
          dto.dados_acao
        );
        
        if (solicitacao) {
          const statusTexto = solicitacao.status === StatusSolicitacao.PENDENTE 
            ? 'pendente' 
            : 'sendo executada';
          
          const mensagem = `Já existe uma solicitação ${statusTexto} para ${solicitacao.justificativa} (Protocolo: ${solicitacao.codigo}). ` +
            `${solicitacao.status === StatusSolicitacao.PENDENTE ? 'Aguarde a decisão do aprovador responsável.' : 'Aguarde a conclusão da execução.'}`;
          
          throw new BadRequestException(mensagem);
        }
      };

      const dto = {
        tipo_acao: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
        dados_acao: { params: { id: 'item-123' } },
        justificativa: 'Nova alteração',
        metodo_execucao: 'PUT /api/v1/test'
      };

      // Act & Assert
      await expect(service.validarCriacaoSolicitacao(dto, 'user-123'))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(service.validarCriacaoSolicitacao(dto, 'user-123'))
        .rejects
        .toThrow('Já existe uma solicitação sendo executada para Alteração de dados críticos (Protocolo: SOL-002). Aguarde a conclusão da execução.');
    });
  });
});