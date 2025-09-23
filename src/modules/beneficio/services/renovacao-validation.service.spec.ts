import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RenovacaoValidationService } from './renovacao-validation.service';
import { Concessao, Solicitacao, TipoBeneficio } from '../../../entities';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import { TipoSolicitacaoEnum } from '../../../enums/tipo-solicitacao.enum';

/**
 * Testes unitários para o serviço de validação de renovação
 * Valida todas as regras de elegibilidade para renovação de benefícios
 */
describe('RenovacaoValidationService', () => {
  let service: RenovacaoValidationService;
  let concessaoRepository: Repository<Concessao>;
  let solicitacaoRepository: Repository<Solicitacao>;
  let tipoBeneficioRepository: Repository<TipoBeneficio>;

  // Mocks dos repositórios
  const mockConcessaoRepository = {
    findOne: jest.fn(),
  };

  const mockSolicitacaoRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTipoBeneficioRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenovacaoValidationService,
        {
          provide: getRepositoryToken(Concessao),
          useValue: mockConcessaoRepository,
        },
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: mockTipoBeneficioRepository,
        },
      ],
    }).compile();

    service = module.get<RenovacaoValidationService>(RenovacaoValidationService);
    concessaoRepository = module.get<Repository<Concessao>>(getRepositoryToken(Concessao));
    solicitacaoRepository = module.get<Repository<Solicitacao>>(getRepositoryToken(Solicitacao));
    tipoBeneficioRepository = module.get<Repository<TipoBeneficio>>(getRepositoryToken(TipoBeneficio));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validarElegibilidade', () => {
    const concessaoId = 'concessao-123';
    const usuarioId = 'usuario-123';

    it('deve retornar elegível quando todas as validações passarem', async () => {
      // Arrange
      const mockConcessao = {
        id: concessaoId,
        status: StatusConcessao.CESSADO,
        solicitacao: {
          beneficiario_id: usuarioId,
          tipo_beneficio_id: 'tipo-123',
          beneficiario: { id: usuarioId }
        }
      };

      mockConcessaoRepository.findOne.mockResolvedValue(mockConcessao);
      mockTipoBeneficioRepository.findOne.mockResolvedValue({ permiteRenovacao: true });
      mockSolicitacaoRepository.findOne.mockResolvedValue(null); // Sem renovação em andamento
      
      // Mock do query builder para verificação de período mínimo
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null) // Sem renovação anterior
      };
      mockSolicitacaoRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const resultado = await service.validarElegibilidade(concessaoId, usuarioId);

      // Assert
      expect(resultado.podeRenovar).toBe(true);
      expect(resultado.motivos).toBeUndefined();
    });

    it('deve retornar não elegível quando concessão não for encontrada', async () => {
      // Arrange
      mockConcessaoRepository.findOne.mockResolvedValue(null);

      // Act
      const resultado = await service.validarElegibilidade(concessaoId, usuarioId);

      // Assert
      expect(resultado.podeRenovar).toBe(false);
      expect(resultado.motivos).toContain('Concessão não encontrada ou não pertence ao usuário');
    });

    it('deve retornar não elegível quando usuário não for o beneficiário', async () => {
      // Arrange
      const mockConcessao = {
        id: concessaoId,
        status: StatusConcessao.CESSADO,
        solicitacao: {
          beneficiario_id: 'outro-usuario',
          tipo_beneficio_id: 'tipo-123',
          beneficiario: { id: 'outro-usuario' }
        }
      };

      mockConcessaoRepository.findOne.mockResolvedValue(mockConcessao);

      // Act
      const resultado = await service.validarElegibilidade(concessaoId, usuarioId);

      // Assert
      expect(resultado.podeRenovar).toBe(false);
      expect(resultado.motivos).toContain('Usuário não é o beneficiário desta concessão');
    });

    it('deve retornar não elegível quando status da concessão for inválido', async () => {
      // Arrange
      const mockConcessao = {
        id: concessaoId,
        status: StatusConcessao.ATIVO,
        solicitacao: {
          beneficiario_id: usuarioId,
          tipo_beneficio_id: 'tipo-123',
          beneficiario: { id: usuarioId }
        }
      };

      mockConcessaoRepository.findOne.mockResolvedValue(mockConcessao);

      // Act
      const resultado = await service.validarElegibilidade(concessaoId, usuarioId);

      // Assert
      expect(resultado.podeRenovar).toBe(false);
      expect(resultado.motivos).toContain('Concessão deve estar com status CESSADO para ser renovada');
    });

    it('deve retornar não elegível quando tipo de benefício não permitir renovação', async () => {
      // Arrange
      const mockConcessao = {
        id: concessaoId,
        status: StatusConcessao.CESSADO,
        solicitacao: {
          beneficiario_id: usuarioId,
          tipo_beneficio_id: 'tipo-123',
          beneficiario: { id: usuarioId }
        }
      };

      mockConcessaoRepository.findOne.mockResolvedValue(mockConcessao);
      mockTipoBeneficioRepository.findOne.mockResolvedValue({ permiteRenovacao: false });

      // Act
      const resultado = await service.validarElegibilidade(concessaoId, usuarioId);

      // Assert
      expect(resultado.podeRenovar).toBe(false);
      expect(resultado.motivos).toContain('Este tipo de benefício não permite renovação');
    });
  });

  // Testes para métodos privados são testados indiretamente através do método validarElegibilidade
  describe('integração dos métodos de validação', () => {
    it('deve validar todos os critérios através do método principal', async () => {
      const concessaoId = 'concessao-123';
      const usuarioId = 'usuario-123';
      
      const concessao = {
        id: concessaoId,
        status: StatusConcessao.CESSADO,
        solicitacao: {
          beneficiario_id: usuarioId,
          tipo_beneficio_id: 'tipo-123'
        }
      } as Concessao;

      const tipoBeneficio = { permiteRenovacao: true } as TipoBeneficio;

      mockConcessaoRepository.findOne.mockResolvedValue(concessao);
      mockTipoBeneficioRepository.findOne.mockResolvedValue(tipoBeneficio);
      mockSolicitacaoRepository.findOne.mockResolvedValue(null); // Sem renovação em andamento

      const resultado = await service.validarElegibilidade(concessaoId, usuarioId);

      expect(resultado.podeRenovar).toBe(true);
      expect(resultado.motivos).toBeUndefined();
    });
  });
});