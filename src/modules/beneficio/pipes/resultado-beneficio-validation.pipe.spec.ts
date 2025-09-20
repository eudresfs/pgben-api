import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { ResultadoBeneficioValidationPipe } from './resultado-beneficio-validation.pipe';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';

// Mock do class-validator
jest.mock('class-validator', () => {
  const actual = jest.requireActual('class-validator');
  return {
    ...actual,
    validate: jest.fn(),
  };
});

/**
 * Helper function para criar documentos comprobatórios válidos
 */
const createValidDocument = (tipo: TipoDocumentoComprobatorio, nomeArquivo: string, descricao: string) => {
  const isImage = nomeArquivo.endsWith('.jpg') || nomeArquivo.endsWith('.jpeg') || nomeArquivo.endsWith('.png');
  return {
    tipo,
    nomeArquivo,
    caminhoArquivo: `/uploads/documentos/${nomeArquivo}`,
    tipoMime: isImage ? 'image/jpeg' : 'application/pdf',
    tamanhoArquivo: isImage ? 512000 : 1048576,
    descricao,
  };
};

describe('ResultadoBeneficioValidationPipe', () => {
  let pipe: ResultadoBeneficioValidationPipe;
  const mockValidate = validate as jest.MockedFunction<typeof validate>;

  const validDto: CreateResultadoBeneficioCessadoDto = {
    concessaoId: '123e4567-e89b-12d3-a456-426614174000',
    motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    descricaoMotivo: 'Família conseguiu emprego formal e superou situação de vulnerabilidade',
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    avaliacaoVulnerabilidade: 'Família demonstrou autonomia financeira e social',
    acompanhamentoPosterior: true,
    observacoes: 'Família conseguiu emprego formal e superou situação de vulnerabilidade',
    detalhesAcompanhamento: 'Acompanhamento trimestral no CRAS',
    recomendacoes: 'Manter participação em grupos comunitários',
    documentosComprobatorios: [
      createValidDocument(
        TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
        'carteira_trabalho.pdf',
        'Carteira de trabalho assinada'
      ),
      createValidDocument(
        TipoDocumentoComprobatorio.FOTOGRAFIA,
        'foto_familia.jpg',
        'Foto da família'
      ),
    ],
  };

  beforeEach(() => {
    pipe = new ResultadoBeneficioValidationPipe();
    mockValidate.mockClear();
  });

  describe('transform', () => {
    it('deve transformar dados válidos com sucesso', async () => {
      // Arrange
      mockValidate.mockResolvedValue([]);

      // Act & Assert
      await expect(
        pipe.transform(validDto, {
          type: 'body',
          metatype: CreateResultadoBeneficioCessadoDto,
        }),
      ).resolves.toBeDefined();
    });
  });
});