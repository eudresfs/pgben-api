import { ResultadoBeneficioCessadoController } from './resultado-beneficio-cessado.controller';
import { ResultadoBeneficioCessadoService } from '../services/resultado-beneficio-cessado.service';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

describe('ResultadoBeneficioCessadoController', () => {
  let controller: ResultadoBeneficioCessadoController;
  let service: jest.Mocked<ResultadoBeneficioCessadoService>;

  // Mock de dados para testes
  const mockUsuario = {
    id: 'user-123',
    nome: 'João Silva',
    email: 'joao@teste.com',
    perfil: 'TECNICO_SOCIAL',
  };

  const mockConcessao = {
    id: 'concessao-123',
    status: StatusConcessao.CESSADO,
    beneficiario: { id: 'beneficiario-123', nome: 'Maria Silva' },
  };

  const mockResultado = {
    id: 'resultado-123',
    concessaoId: 'concessao-123',
    motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    observacoesTecnicas: 'Família conseguiu emprego formal e superou situação de vulnerabilidade',
    tecnicoResponsavelId: 'user-123',
    dataRegistro: new Date(),
    concessao: mockConcessao,
    tecnicoResponsavel: mockUsuario,
    documentosComprobatorios: [
      {
        id: 'doc-123',
        tipo: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
        descricao: 'Carteira de trabalho assinada',
        nomeArquivo: 'carteira_trabalho.pdf', caminhoArquivo: '/uploads/carteira_trabalho.pdf', tipoMime: 'application/pdf', tamanhoArquivo: 1024,
      },
    ],
  };

  const validCreateDto = {
    concessaoId: '123e4567-e89b-12d3-a456-426614174000',
    motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    descricaoMotivo: 'Família conseguiu emprego estável e renda suficiente',
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    avaliacaoVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    observacoes: 'Família demonstrou capacidade de sustentabilidade financeira após acompanhamento de 6 meses',
    acompanhamentoPosterior: true,
    documentosComprobatorios: [
      {
        tipo: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
        nomeArquivo: 'carteira_trabalho.pdf',
        caminhoArquivo: '/uploads/documentos/carteira_trabalho.pdf',
        tipoMime: 'application/pdf',
        tamanhoArquivo: 1048576,
        descricao: 'Carteira de trabalho assinada',
      },
    ],
  };

  beforeEach(() => {
    service = {
      registrarResultado: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
    } as any;

    controller = new ResultadoBeneficioCessadoController(service);
  });

  describe('registrarResultado', () => {
    it('deve registrar resultado com sucesso', async () => {
      // Arrange
      jest.spyOn(service, 'registrarResultado').mockResolvedValue(mockResultado as any);
      const req = { user: { id: 'user-123' } };

      // Act
      const result = await controller.registrarResultado(validCreateDto, req);

      // Assert
      expect(result).toEqual(mockResultado);
      expect(service.registrarResultado).toHaveBeenCalledWith(validCreateDto, 'user-123');
    });
  });

  describe('buscarPorId', () => {
    it('deve buscar resultado por ID com sucesso', async () => {
      // Arrange
      jest.spyOn(service, 'buscarPorId').mockResolvedValue(mockResultado as any);

      // Act
      const result = await controller.buscarPorId('concessao-123', 'resultado-123');

      // Assert
      expect(result).toEqual(mockResultado);
      expect(service.buscarPorId).toHaveBeenCalledWith('resultado-123');
    });
  });

  describe('listar', () => {
    it('deve listar resultados com paginação', async () => {
      // Arrange
      const mockListagem = {
        resultados: [mockResultado],
        total: 1,
        page: 1,
        limit: 10,
      };
      jest.spyOn(service, 'listar').mockResolvedValue(mockListagem as any);

      // Act
      const result = await controller.listar(
        undefined, // concessaoId
        undefined, // tecnicoId
        undefined, // motivoEncerramento
        undefined, // statusVulnerabilidade
        undefined, // dataInicio
        undefined, // dataFim
        1, // page
        10 // limit
      );

      // Assert
      expect(result).toEqual(mockListagem);
      expect(result.resultados).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(service.listar).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('buscarPorConcessao', () => {
    it('deve buscar resultado por concessão com sucesso', async () => {
      // Arrange
      const mockListagem = {
        resultados: [mockResultado],
        total: 1,
        page: 1,
        limit: 10,
      };
      jest.spyOn(service, 'listar').mockResolvedValue(mockListagem as any);

      // Act
      const result = await controller.buscarPorConcessao('concessao-123');

      // Assert
      expect(result).toEqual(mockResultado);
      expect(service.listar).toHaveBeenCalledWith({ concessaoId: 'concessao-123', limit: 1 });
    });
  });

  describe('Validações específicas do SUAS', () => {

  });
});