import { Test, TestingModule } from '@nestjs/testing';
import { MinioService } from '../minio.service';
import { CriptografiaService } from '../criptografia.service';
import { ConfigService } from '@nestjs/config';

// Teste mínimo para verificar se o ambiente de teste está funcionando
describe('MinioService - Teste Simples', () => {
  let service: MinioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                MINIO_BUCKET: 'test-bucket',
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: 9000,
                MINIO_USE_SSL: false,
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: CriptografiaService,
          useValue: {
            criptografarBuffer: jest.fn(),
            descriptografarBuffer: jest.fn(),
            gerarHash: jest.fn(),
            verificarHash: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MinioService>(MinioService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });
});
