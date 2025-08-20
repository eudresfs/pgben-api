import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ComprovanteController } from './comprovante.controller';
import { ComprovanteService } from '../services/comprovante.service';
import { TipoComprovante } from '../dtos/gerar-comprovante.dto';
import { ComprovanteGeradoDto } from '../dtos/gerar-comprovante.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ComprovanteController - Geração de PDF (e2e)', () => {
  let app: INestApplication;
  let comprovanteService: jest.Mocked<ComprovanteService>;

  const mockComprovanteGerado: ComprovanteGeradoDto = {
    nomeArquivo: 'comprovante-cesta-basica-202401.pdf',
    tipoMime: 'application/pdf',
    tamanho: 2048,
    dataGeracao: new Date('2024-01-15T10:30:00Z'),
    tipoComprovante: TipoComprovante.CESTA_BASICA,
  };

  const mockComprovanteBase64: ComprovanteGeradoDto = {
    ...mockComprovanteGerado,
    conteudoBase64: 'JVBERi0xLjQKJcOkw7zDtsO4CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0K',
  };

  beforeEach(async () => {
    const mockComprovanteService = {
      gerarComprovantePdf: jest.fn(),
      upload: jest.fn(),
      findById: jest.fn(),
      findByPagamento: jest.fn(),
      remove: jest.fn(),
      download: jest.fn(),
      hasComprovantes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComprovanteController],
      providers: [
        {
          provide: ComprovanteService,
          useValue: mockComprovanteService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    comprovanteService = module.get(ComprovanteService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /pagamentos/:pagamentoId/gerar-comprovante', () => {
    const pagamentoId = 'pagamento-123';
    const baseUrl = `/pagamentos/${pagamentoId}/gerar-comprovante`;

    it('deve gerar comprovante de cesta básica em PDF com sucesso', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockResolvedValue(mockComprovanteGerado);

      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        })
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        nomeArquivo: 'comprovante-cesta-basica-202401.pdf',
        tipoMime: 'application/pdf',
        tamanho: 2048,
        dataGeracao: '2024-01-15T10:30:00.000Z',
        tipoComprovante: TipoComprovante.CESTA_BASICA,
      });
      expect(comprovanteService.gerarComprovantePdf).toHaveBeenCalledWith(
        pagamentoId,
        {
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        },
      );
    });

    it('deve gerar comprovante de aluguel social em base64 com sucesso', async () => {
      // Arrange
      const mockAluguelBase64 = {
        ...mockComprovanteBase64,
        tipoComprovante: TipoComprovante.ALUGUEL_SOCIAL,
        nomeArquivo: 'comprovante-aluguel-social-202401.pdf',
      };
      comprovanteService.gerarComprovantePdf.mockResolvedValue(mockAluguelBase64);

      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.ALUGUEL_SOCIAL,
          formato: 'base64',
        })
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        nomeArquivo: 'comprovante-aluguel-social-202401.pdf',
        tipoMime: 'application/pdf',
        tamanho: 2048,
        dataGeracao: '2024-01-15T10:30:00.000Z',
        tipoComprovante: TipoComprovante.ALUGUEL_SOCIAL,
        conteudoBase64: 'JVBERi0xLjQKJcOkw7zDtsO4CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0K',
      });
    });

    it('deve usar formato PDF como padrão quando não especificado', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockResolvedValue(mockComprovanteGerado);

      // Act
      await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
        })
        .expect(200);

      // Assert
      expect(comprovanteService.gerarComprovantePdf).toHaveBeenCalledWith(
        pagamentoId,
        {
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        },
      );
    });

    it('deve retornar 400 quando tipoComprovante não for fornecido', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          formato: 'pdf',
        })
        .expect(400);

      // Assert
      expect(response.body.message).toContain('tipo');
    });

    it('deve retornar 400 quando tipoComprovante for inválido', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: 'tipo_invalido',
          formato: 'pdf',
        })
        .expect(400);

      // Assert
      expect(response.body.message).toContain('tipo');
    });

    it('deve retornar 400 quando formato for inválido', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'formato_invalido',
        })
        .expect(400);

      // Assert
      expect(response.body.message).toContain('formato');
    });

    it('deve retornar 404 quando pagamento não for encontrado', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockRejectedValue(
        new NotFoundException('Pagamento não encontrado'),
      );

      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        })
        .expect(404);

      // Assert
      expect(response.body.message).toBe('Pagamento não encontrado');
    });

    it('deve retornar 400 quando dados obrigatórios estiverem ausentes', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockRejectedValue(
        new BadRequestException('Dados obrigatórios ausentes: Nome do beneficiário é obrigatório'),
      );

      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        })
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Dados obrigatórios ausentes');
    });

    it('deve retornar 500 quando ocorrer erro interno', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockRejectedValue(
        new Error('Erro interno do servidor'),
      );

      // Act
      await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        })
        .expect(500);
    });

    it('deve validar parâmetros de query corretamente', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockResolvedValue(mockComprovanteGerado);

      // Act
      await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
          parametroExtra: 'valor', // Parâmetro extra deve ser ignorado
        })
        .expect(200);

      // Assert
      expect(comprovanteService.gerarComprovantePdf).toHaveBeenCalledWith(
        pagamentoId,
        {
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        },
      );
    });

    it('deve retornar headers corretos para resposta JSON', async () => {
      // Arrange
      comprovanteService.gerarComprovantePdf.mockResolvedValue(mockComprovanteGerado);

      // Act
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .query({
          tipo: TipoComprovante.CESTA_BASICA,
          formato: 'pdf',
        })
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});