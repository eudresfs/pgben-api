import { Test, TestingModule } from '@nestjs/testing';
import { SolicitacaoService } from './solicitacao.service';
import { RenovacaoService } from '../../beneficio/services/renovacao.service';
import { Logger } from '@nestjs/common';

/**
 * Testes específicos para funcionalidades de renovação no SolicitacaoService
 * Foca apenas nos métodos implementados na Fase 5
 */
describe('SolicitacaoService - Renovação', () => {
  let service: SolicitacaoService;
  let renovacaoService: RenovacaoService;

  const mockRenovacaoService = {
    listarSolicitacoesComElegibilidade: jest.fn(),
    validarElegibilidadeRenovacao: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SolicitacaoService,
          useValue: {
            listarComElegibilidadeRenovacao: jest.fn(),
            verificarElegibilidadeRenovacao: jest.fn(),
          },
        },
        {
          provide: RenovacaoService,
          useValue: mockRenovacaoService,
        },
      ],
    }).compile();

    service = module.get<SolicitacaoService>(SolicitacaoService);
    renovacaoService = module.get<RenovacaoService>(RenovacaoService);
  });

  describe('listarComElegibilidadeRenovacao', () => {
    it('deve delegar para o RenovacaoService', async () => {
      // Arrange
      const usuarioId = 'usuario-123';
      const mockResultado = [
        {
          id: 'sol-1',
          protocolo: 'SOL202400001',
          elegibilidade: {
            podeRenovar: true,
            motivo: 'Benefício elegível para renovação',
          },
        },
      ];

      mockRenovacaoService.listarSolicitacoesComElegibilidade.mockResolvedValue(mockResultado);
      jest.spyOn(service, 'listarComElegibilidadeRenovacao').mockImplementation(
        async (id) => await renovacaoService.listarSolicitacoesComElegibilidade(id)
      );

      // Act
      const resultado = await service.listarComElegibilidadeRenovacao(usuarioId);

      // Assert
      expect(renovacaoService.listarSolicitacoesComElegibilidade).toHaveBeenCalledWith(usuarioId);
      expect(resultado).toEqual(mockResultado);
    });
  });

  describe('verificarElegibilidadeRenovacao', () => {
    it('deve delegar para o RenovacaoService', async () => {
      // Arrange
      const concessaoId = 'concessao-123';
      const usuarioId = 'usuario-123';
      const mockResultado = {
        podeRenovar: true,
        motivo: 'Benefício elegível para renovação',
        proximaRenovacao: new Date('2024-12-31'),
      };

      mockRenovacaoService.validarElegibilidadeRenovacao.mockResolvedValue(mockResultado);
      jest.spyOn(service, 'verificarElegibilidadeRenovacao').mockImplementation(
        async (concessaoId, usuarioId) => await renovacaoService.validarElegibilidadeRenovacao(concessaoId, usuarioId)
      );

      // Act
      const resultado = await service.verificarElegibilidadeRenovacao(concessaoId, usuarioId);

      // Assert
      expect(renovacaoService.validarElegibilidadeRenovacao).toHaveBeenCalledWith(concessaoId, usuarioId);
      expect(resultado).toEqual(mockResultado);
    });
  });
});