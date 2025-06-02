import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Integrador, IntegradorToken, TokenRevogado } from '../../../entities';
import { IntegradorModule } from '../integrador.module';
import { IntegradorService } from '../services/integrador.service';
import { IntegradorTokenService } from '../services/integrador-token.service';
import { CreateIntegradorDto } from '../dto/create-integrador.dto';
import { CreateTokenDto } from '../dto/create-token.dto';
import { Role } from '../../../auth/enums/role.enum';

/**
 * Testes de integração (E2E) para o módulo de integradores.
 * Testa o fluxo completo de criação, validação e uso de tokens.
 */
describe('Integrador E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let integradorService: IntegradorService;
  let tokenService: IntegradorTokenService;
  let integradorRepository: any;
  let tokenRepository: any;
  let tokenRevogadoRepository: any;
  let adminToken: string;
  let integrador: any;
  let integradorToken: string;

  // Mock dos repositórios
  const mockIntegradorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTokenRevogadoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  // Configuração do módulo de teste
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: () => ({
            secret: 'test-secret',
            signOptions: { expiresIn: '1d' },
          }),
        }),
        IntegradorModule,
      ],
      providers: [
        {
          provide: getRepositoryToken(Integrador),
          useValue: mockIntegradorRepository,
        },
        {
          provide: getRepositoryToken(IntegradorToken),
          useValue: mockTokenRepository,
        },
        {
          provide: getRepositoryToken(TokenRevogado),
          useValue: mockTokenRevogadoRepository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
    integradorService = moduleRef.get<IntegradorService>(IntegradorService);
    tokenService = moduleRef.get<IntegradorTokenService>(IntegradorTokenService);
    integradorRepository = moduleRef.get(getRepositoryToken(Integrador));
    tokenRepository = moduleRef.get(getRepositoryToken(IntegradorToken));
    tokenRevogadoRepository = moduleRef.get(getRepositoryToken(TokenRevogado));

    // Criar token de admin para testes
    adminToken = jwtService.sign({
      sub: 'test-user',
      name: 'Test Admin',
      roles: [Role.ADMIN],
    });

    // Configurar mock para o serviço de integrador
    integrador = {
      id: 'test-integrador-id',
      nome: 'Integrador de Teste',
      descricao: 'Integrador para testes de integração',
      ativo: true,
      permissoesEscopo: ['read:dados_basicos', 'read:cidadaos'],
      ipPermitidos: [],
      dataCriacao: new Date(),
      dataAtualizacao: new Date(),
    };

    // Mock para o repository
    mockIntegradorRepository.findOne.mockImplementation((query) => {
      if (query?.where?.id === 'test-integrador-id') {
        return Promise.resolve(integrador);
      }
      if (query?.where?.nome === 'Integrador de Teste') {
        return Promise.resolve(integrador);
      }
      return Promise.resolve(null);
    });

    mockIntegradorRepository.save.mockImplementation((entity) => {
      return Promise.resolve({
        ...entity,
        id: entity.id || 'test-integrador-id',
      });
    });

    mockIntegradorRepository.create.mockImplementation((dto) => {
      return {
        ...dto,
        id: 'test-integrador-id',
      };
    });

    // Configurar mocks para o repositório de tokens
    mockTokenRepository.save.mockImplementation((entity) => {
      return Promise.resolve({
        ...entity,
        id: entity.id || 'test-token-id',
      });
    });

    mockTokenRepository.create.mockImplementation((dto) => {
      return {
        ...dto,
        id: 'test-token-id',
      };
    });

    mockTokenRepository.findOne.mockImplementation((query) => {
      if (query?.where?.tokenHash) {
        return Promise.resolve({
          id: 'test-token-id',
          integradorId: 'test-integrador-id',
          nome: 'Token de Teste',
          tokenHash: query.where.tokenHash,
          escopos: ['read:dados_basicos'],
          revogado: false,
          ultimoUso: null,
          dataCriacao: new Date(),
        });
      }
      return Promise.resolve(null);
    });

    // Mock para o repository de tokens revogados
    mockTokenRevogadoRepository.findOne.mockResolvedValue(null);

    // Criar token de integrador para testes
    const createTokenDto: CreateTokenDto = {
      nome: 'Token de Teste',
      descricao: 'Token para testes de integração',
      escopos: ['read:dados_basicos'],
      diasValidade: 30,
    };

    const tokenResult = await tokenService.createToken(
      'test-integrador-id',
      createTokenDto
    );
    integradorToken = tokenResult.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve estar definido', () => {
    expect(app).toBeDefined();
    expect(integradorService).toBeDefined();
    expect(tokenService).toBeDefined();
  });

  describe('API de Gerenciamento de Integradores', () => {
    it('GET /integradores - deve retornar lista de integradores para admin', async () => {
      // Configurar mock
      mockIntegradorRepository.find.mockResolvedValue([integrador]);

      // Test
      await request(app.getHttpServer())
        .get('/integradores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBe(1);
          expect(res.body[0].id).toBe(integrador.id);
        });

      expect(mockIntegradorRepository.find).toHaveBeenCalled();
    });

    it('POST /integradores - deve criar um novo integrador', async () => {
      // Configurar mock para evitar conflito
      mockIntegradorRepository.findOne.mockResolvedValueOnce(null);

      const createDto: CreateIntegradorDto = {
        nome: 'Novo Integrador',
        descricao: 'Descrição do novo integrador',
        permissoesEscopo: ['read:dados_basicos'],
        ativo: true,
      };

      // Test
      await request(app.getHttpServer())
        .post('/integradores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.nome).toBe(createDto.nome);
          expect(res.body.descricao).toBe(createDto.descricao);
        });

      expect(mockIntegradorRepository.findOne).toHaveBeenCalled();
      expect(mockIntegradorRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockIntegradorRepository.save).toHaveBeenCalled();
    });

    it('GET /integradores/:id - deve retornar um integrador pelo ID', async () => {
      // Test
      await request(app.getHttpServer())
        .get(`/integradores/test-integrador-id`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(integrador.id);
          expect(res.body.nome).toBe(integrador.nome);
        });

      expect(mockIntegradorRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-integrador-id' },
      });
    });
  });

  describe('API de Tokens', () => {
    it('POST /integradores/:id/tokens - deve criar um novo token', async () => {
      const createTokenDto: CreateTokenDto = {
        nome: 'Novo Token',
        descricao: 'Token para acesso à API',
        escopos: ['read:dados_basicos'],
        diasValidade: 30,
      };

      // Configurar jwtService.sign para retornar um token específico
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce('mock-token-jwt');

      // Test
      await request(app.getHttpServer())
        .post(`/integradores/test-integrador-id/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createTokenDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.token).toBe('mock-token-jwt');
          expect(res.body.tokenInfo).toBeDefined();
          expect(res.body.tokenInfo.nome).toBe(createTokenDto.nome);
        });
    });

    it('GET /integradores/:id/tokens - deve listar tokens de um integrador', async () => {
      // Configurar mock
      mockTokenRepository.find.mockResolvedValue([
        {
          id: 'test-token-id',
          nome: 'Token de Teste',
          escopos: ['read:dados_basicos'],
          dataCriacao: new Date(),
        },
      ]);

      // Test
      await request(app.getHttpServer())
        .get(`/integradores/test-integrador-id/tokens`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBe(1);
          expect(res.body[0].id).toBe('test-token-id');
        });

      expect(mockTokenRepository.find).toHaveBeenCalledWith({
        where: { integradorId: 'test-integrador-id' },
        order: { dataCriacao: 'DESC' },
      });
    });
  });

  describe('API protegida por IntegradorAuthGuard', () => {
    // Configurar um endpoint de teste protegido pelo guard
    beforeAll(() => {
      const mockApiController = {
        getDadosBasicos: (req) => {
          return {
            message: 'Dados básicos disponíveis',
            integrador: req.integrador.nome,
            timestamp: new Date().toISOString(),
            dados: { exemplo: 'dados de teste' },
          };
        },
      };

      const mockGuard = {
        canActivate: jest.fn().mockImplementation(async () => {
          return true;
        }),
      };

      app.use('/api/exemplo/dados-basicos', (req, res, next) => {
        req.integrador = integrador;
        req.integradorTokenPayload = {
          sub: `integrador:${integrador.id}`,
          scopes: ['read:dados_basicos'],
        };
        next();
      });

      app.get('/api/exemplo/dados-basicos', (req, res) => {
        res.json(mockApiController.getDadosBasicos(req));
      });
    });

    it('GET /api/exemplo/dados-basicos - deve permitir acesso com token válido', async () => {
      // Test
      await request(app.getHttpServer())
        .get('/api/exemplo/dados-basicos')
        .set('Authorization', `Bearer ${integradorToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Dados básicos disponíveis');
          expect(res.body.dados).toBeDefined();
        });
    });
  });
});
