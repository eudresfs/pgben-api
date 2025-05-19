import { Test, TestingModule } from '@nestjs/testing';
import { ComprovanteController } from '../../../controllers/comprovante.controller';
import { ComprovanteService } from '../../../services/comprovante.service';
import { PagamentoService } from '../../../services/pagamento.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

/**
 * Testes unitários para ComprovanteController
 * 
 * Valida o comportamento dos endpoints de comprovante de pagamento, garantindo 
 * o correto funcionamento do upload, download e manipulação de comprovantes.
 * 
 * @author Equipe PGBen
 */
describe('ComprovanteController', () => {
  let controller: ComprovanteController;
  let comprovanteService: ComprovanteService;
  let pagamentoService: PagamentoService;

  // Mock de um comprovante para os testes
  const comprovanteMock = {
    id: 'comprovante-id-1',
    pagamentoId: 'pagamento-id-1',
    nomeArquivo: 'comprovante.pdf',
    tipoArquivo: 'application/pdf',
    tamanhoArquivo: 1024,
    caminhoArquivo: 'pagamentos/comprovantes/comprovante-id-1.pdf',
    adicionadoPor: 'usuario-id-1',
    dataCriacao: new Date(),
    observacoes: 'Comprovante de pagamento via PIX'
  };

  // Mock de um pagamento para os testes
  const pagamentoMock = {
    id: 'pagamento-id-1',
    solicitacaoId: 'solicitacao-id-1',
    status: 'LIBERADO',
    valor: 500
  };

  // Lista de comprovantes para teste
  const comprovantesMock = [
    comprovanteMock,
    {
      ...comprovanteMock,
      id: 'comprovante-id-2',
      nomeArquivo: 'comprovante2.pdf'
    }
  ];

  // Mock do arquivo para teste de upload
  const fileMock = {
    originalname: 'comprovante.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('mock file content')
  };

  // Mock do request com usuário autenticado
  const mockRequest = {
    user: {
      id: 'usuario-id-1',
      nome: 'Usuário Teste',
      perfil: 'operador'
    }
  };

  // Mock da resposta para download
  const mockResponse = {
    contentType: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComprovanteController],
      providers: [
        {
          provide: ComprovanteService,
          useValue: {
            uploadComprovante: jest.fn().mockResolvedValue(comprovanteMock),
            getComprovante: jest.fn().mockResolvedValue(comprovanteMock),
            getComprovanteConteudo: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
            listarComprovantes: jest.fn().mockResolvedValue(comprovantesMock),
            removerComprovante: jest.fn().mockResolvedValue(true)
          }
        },
        {
          provide: PagamentoService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(pagamentoMock)
          }
        }
      ],
    }).compile();

    controller = module.get<ComprovanteController>(ComprovanteController);
    comprovanteService = module.get<ComprovanteService>(ComprovanteService);
    pagamentoService = module.get<PagamentoService>(PagamentoService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadComprovante', () => {
    it('deve fazer upload de comprovante com sucesso', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const observacoes = 'Comprovante de pagamento';

      // Act
      const resultado = await controller.uploadComprovante(
        pagamentoId,
        fileMock as any,
        observacoes,
        mockRequest as any
      );

      // Assert
      expect(resultado).toEqual(comprovanteMock);
      expect(comprovanteService.uploadComprovante).toHaveBeenCalledWith(
        pagamentoId,
        fileMock,
        observacoes,
        mockRequest.user.id
      );
    });

    it('deve validar se o pagamento existe antes do upload', async () => {
      // Arrange
      const pagamentoId = 'pagamento-inexistente';
      const observacoes = 'Comprovante de pagamento';
      
      jest.spyOn(pagamentoService, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.uploadComprovante(pagamentoId, fileMock as any, observacoes, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
      expect(pagamentoService.findOne).toHaveBeenCalledWith(pagamentoId);
    });

    it('deve rejeitar upload de arquivo não permitido', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const observacoes = 'Comprovante de pagamento';
      const arquivoInvalido = {
        ...fileMock,
        mimetype: 'application/exe'
      };
      
      jest.spyOn(comprovanteService, 'uploadComprovante').mockRejectedValue(
        new BadRequestException('Tipo de arquivo não permitido')
      );

      // Act & Assert
      await expect(
        controller.uploadComprovante(pagamentoId, arquivoInvalido as any, observacoes, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar upload de arquivo muito grande', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      const observacoes = 'Comprovante de pagamento';
      const arquivoGrande = {
        ...fileMock,
        size: 10 * 1024 * 1024 // 10MB
      };
      
      jest.spyOn(comprovanteService, 'uploadComprovante').mockRejectedValue(
        new BadRequestException('Arquivo excede o tamanho máximo permitido')
      );

      // Act & Assert
      await expect(
        controller.uploadComprovante(pagamentoId, arquivoGrande as any, observacoes, mockRequest as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getComprovante', () => {
    it('deve retornar os metadados do comprovante', async () => {
      // Arrange
      const comprovanteId = 'comprovante-id-1';

      // Act
      const resultado = await controller.getComprovante(comprovanteId);

      // Assert
      expect(resultado).toEqual(comprovanteMock);
      expect(comprovanteService.getComprovante).toHaveBeenCalledWith(comprovanteId);
    });

    it('deve lançar erro quando o comprovante não existe', async () => {
      // Arrange
      const comprovanteId = 'comprovante-inexistente';
      
      jest.spyOn(comprovanteService, 'getComprovante').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getComprovante(comprovanteId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadComprovante', () => {
    it('deve retornar o conteúdo do comprovante', async () => {
      // Arrange
      const comprovanteId = 'comprovante-id-1';
      const arquivoConteudo = Buffer.from('mock file content');
      
      // Act
      await controller.downloadComprovante(comprovanteId, mockResponse as unknown as Response);

      // Assert
      expect(comprovanteService.getComprovante).toHaveBeenCalledWith(comprovanteId);
      expect(comprovanteService.getComprovanteConteudo).toHaveBeenCalledWith(comprovanteId);
      expect(mockResponse.contentType).toHaveBeenCalledWith(comprovanteMock.tipoArquivo);
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${comprovanteMock.nomeArquivo}"`
      );
      expect(mockResponse.send).toHaveBeenCalledWith(arquivoConteudo);
    });

    it('deve lançar erro quando o comprovante não existe', async () => {
      // Arrange
      const comprovanteId = 'comprovante-inexistente';
      
      jest.spyOn(comprovanteService, 'getComprovante').mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.downloadComprovante(comprovanteId, mockResponse as unknown as Response)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarComprovantes', () => {
    it('deve listar comprovantes de um pagamento', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';

      // Act
      const resultado = await controller.listarComprovantes(pagamentoId);

      // Assert
      expect(resultado).toEqual(comprovantesMock);
      expect(comprovanteService.listarComprovantes).toHaveBeenCalledWith(pagamentoId);
    });

    it('deve retornar lista vazia quando não há comprovantes', async () => {
      // Arrange
      const pagamentoId = 'pagamento-id-1';
      
      jest.spyOn(comprovanteService, 'listarComprovantes').mockResolvedValue([]);

      // Act
      const resultado = await controller.listarComprovantes(pagamentoId);

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  describe('removerComprovante', () => {
    it('deve remover um comprovante com sucesso', async () => {
      // Arrange
      const comprovanteId = 'comprovante-id-1';

      // Act
      const resultado = await controller.removerComprovante(
        comprovanteId,
        mockRequest as any
      );

      // Assert
      expect(resultado).toEqual({ success: true, message: 'Comprovante removido com sucesso' });
      expect(comprovanteService.removerComprovante).toHaveBeenCalledWith(
        comprovanteId,
        mockRequest.user.id
      );
    });

    it('deve lançar erro quando o comprovante não existe', async () => {
      // Arrange
      const comprovanteId = 'comprovante-inexistente';
      
      jest.spyOn(comprovanteService, 'removerComprovante').mockRejectedValue(
        new NotFoundException('Comprovante não encontrado')
      );

      // Act & Assert
      await expect(
        controller.removerComprovante(comprovanteId, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
