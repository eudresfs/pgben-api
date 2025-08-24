import { Test, TestingModule } from '@nestjs/testing';
import { EasyUploadController } from './easy-upload.controller';
import { UploadTokenService } from '../services/upload-token.service';
import { QrCodeService } from '../services/qr-code.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  UploadToken,
  UploadTokenStatus,
} from '../entities/upload-token.entity';
import { CreateTokenDto } from '../dto/simplified/create-token.dto';
import { UploadDto } from '../dto/simplified/upload.dto';

// Mock do serviço de token de upload
const mockUploadTokenService = {
  createUploadToken: jest.fn(),
  findByToken: jest.fn(),
  validateToken: jest.fn(),
  getUploadCount: jest.fn(),
  processFileUpload: jest.fn(),
  findById: jest.fn(),
  cancelToken: jest.fn(),
  getTokenDetails: jest.fn(),
};

// Mock do serviço de QR Code
const mockQrCodeService = {
  generateQrCodeBase64: jest.fn(),
};

// Mock de token para testes
const mockToken: Partial<UploadToken> = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  token: 'abcdef123456',
  usuario_id: '123e4567-e89b-12d3-a456-426614174001',
  cidadao_id: '123e4567-e89b-12d3-a456-426614174002',
  solicitacao_id: '123e4567-e89b-12d3-a456-426614174003',
  status: UploadTokenStatus.ATIVO,
  expires_at: new Date(Date.now() + 3600000), // 1 hora no futuro
  required_documents: ['rg', 'cpf'],
  metadata: {
    qrCode: 'data:image/png;base64,abc123',
    upload_count: 0,
  },
  created_at: new Date(),
  updated_at: new Date(),
  isExpired: () => false,
  isCancelled: () => false,
  isUsed: () => false,
};

describe('EasyUploadController', () => {
  let controller: EasyUploadController;
  let uploadTokenService: UploadTokenService;
  let qrCodeService: QrCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EasyUploadController],
      providers: [
        { provide: UploadTokenService, useValue: mockUploadTokenService },
        { provide: QrCodeService, useValue: mockQrCodeService },
      ],
    }).compile();

    controller = module.get<EasyUploadController>(EasyUploadController);
    uploadTokenService = module.get<UploadTokenService>(UploadTokenService);
    qrCodeService = module.get<QrCodeService>(QrCodeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createToken', () => {
    it('deve criar um token de upload com sucesso', async () => {
      // Arrange
      const createTokenDto: CreateTokenDto = {
        cidadao_id: '123e4567-e89b-12d3-a456-426614174002',
        solicitacao_id: '123e4567-e89b-12d3-a456-426614174003',
        required_documents: ['rg', 'cpf'],
        descricao: 'Upload de documentos pessoais',
        metadata: { origem: 'teste' },
      };

      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const expectedToken = {
        ...mockToken,
        metadata: { ...mockToken.metadata },
      };

      mockUploadTokenService.createUploadToken.mockResolvedValue(expectedToken);

      // Act
      const result = await controller.createToken(createTokenDto, {
        user: { id: userId },
      });

      // Assert
      expect(result).toEqual(expectedToken);
      expect(mockUploadTokenService.createUploadToken).toHaveBeenCalledWith(
        expect.objectContaining({
          cidadao_id: createTokenDto.cidadao_id,
          solicitacao_id: createTokenDto.solicitacao_id,
          required_documents: createTokenDto.required_documents,
          descricao: createTokenDto.descricao,
          metadata: createTokenDto.metadata,
        }),
        userId,
      );
    });
  });

  describe('validateToken', () => {
    it('deve validar um token existente e ativo', async () => {
      // Arrange
      const token = 'abcdef123456';
      mockUploadTokenService.validateToken.mockResolvedValue(mockToken);

      // Act
      const result = await controller.validateToken(token);

      // Assert
      expect(result).toEqual({
        valid: true,
        expires_at: mockToken.expires_at,
        required_documents: mockToken.required_documents,
      });
      expect(mockUploadTokenService.validateToken).toHaveBeenCalledWith(token);
    });

    it('deve retornar valid: false quando o token não for encontrado', async () => {
      // Arrange
      const token = 'invalid-token';
      mockUploadTokenService.validateToken.mockRejectedValue(
        new NotFoundException(),
      );

      // Act
      const result = await controller.validateToken(token);

      // Assert
      expect(result).toEqual({
        valid: false,
        message: 'Token inválido ou expirado',
      });
    });

    it('deve retornar valid: false quando o token estiver expirado', async () => {
      // Arrange
      const token = 'expired-token';
      mockUploadTokenService.validateToken.mockRejectedValue(
        new BadRequestException(),
      );

      // Act
      const result = await controller.validateToken(token);

      // Assert
      expect(result).toEqual({
        valid: false,
        message: 'Token inválido ou expirado',
      });
    });
  });

  describe('uploadFile', () => {
    it('deve processar o upload de arquivo com sucesso', async () => {
      // Arrange
      const token = 'abcdef123456';
      const file = {
        originalname: 'documento.pdf',
        mimetype: 'application/pdf',
        size: 12345,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const uploadDto: UploadDto = {
        tipo: 'rg',
        descricao: 'Documento de identidade',
        metadata: { origem: 'teste' },
      };

      const mockDocumento = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        nome_arquivo: 'documento.pdf',
        tipo_documento: 'rg',
      };

      mockUploadTokenService.findByToken.mockResolvedValue(mockToken);
      mockUploadTokenService.processFileUpload.mockResolvedValue(mockDocumento);

      // Act
      const result = await controller.uploadFile(token, file, uploadDto);

      // Assert
      expect(result).toEqual({
        success: true,
        documento_id: mockDocumento.id,
        message: 'Arquivo enviado com sucesso',
      });
      expect(mockUploadTokenService.findByToken).toHaveBeenCalledWith(token);
      expect(mockUploadTokenService.processFileUpload).toHaveBeenCalledWith(
        mockToken,
        file,
        expect.objectContaining({
          tipo: uploadDto.tipo,
          descricao: uploadDto.descricao,
          metadata: uploadDto.metadata,
        }),
      );
    });

    it('deve retornar erro quando o token não for encontrado', async () => {
      // Arrange
      const token = 'invalid-token';
      const file = {} as Express.Multer.File;
      const uploadDto: UploadDto = {
        tipo: 'rg',
        descricao: 'Documento de identidade',
      };

      mockUploadTokenService.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.uploadFile(token, file, uploadDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockUploadTokenService.findByToken).toHaveBeenCalledWith(token);
      expect(mockUploadTokenService.processFileUpload).not.toHaveBeenCalled();
    });
  });

  describe('getTokenStatus', () => {
    it('deve retornar o status do token com sucesso', async () => {
      // Arrange
      const token = 'abcdef123456';
      const uploadCount = 2;

      mockUploadTokenService.findByToken.mockResolvedValue(mockToken);
      mockUploadTokenService.getUploadCount.mockResolvedValue(uploadCount);

      // Act
      const result = await controller.getTokenStatus(token);

      // Assert
      expect(result).toEqual({
        status: mockToken.status,
        expires_at: mockToken.expires_at,
        upload_count: uploadCount,
        required_documents: mockToken.required_documents,
      });
      expect(mockUploadTokenService.findByToken).toHaveBeenCalledWith(token);
      expect(mockUploadTokenService.getUploadCount).toHaveBeenCalledWith(token);
    });

    it('deve retornar erro quando o token não for encontrado', async () => {
      // Arrange
      const token = 'invalid-token';
      mockUploadTokenService.findByToken.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getTokenStatus(token)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUploadTokenService.findByToken).toHaveBeenCalledWith(token);
      expect(mockUploadTokenService.getUploadCount).not.toHaveBeenCalled();
    });
  });

  describe('getTokenDetails', () => {
    it('deve retornar os detalhes do token com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';

      mockUploadTokenService.getTokenDetails.mockResolvedValue(mockToken);

      // Act
      const result = await controller.getTokenDetails(id, {
        user: { id: userId },
      });

      // Assert
      expect(result).toEqual(mockToken);
      expect(mockUploadTokenService.getTokenDetails).toHaveBeenCalledWith(
        id,
        userId,
      );
    });
  });

  describe('cancelToken', () => {
    it('deve cancelar o token com sucesso', async () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const userId = '123e4567-e89b-12d3-a456-426614174001';

      mockUploadTokenService.cancelToken.mockResolvedValue(undefined);

      // Act
      const result = await controller.cancelToken(id, { user: { id: userId } });

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Token cancelado com sucesso',
      });
      expect(mockUploadTokenService.cancelToken).toHaveBeenCalledWith(
        id,
        userId,
        undefined,
      );
    });
  });
});
