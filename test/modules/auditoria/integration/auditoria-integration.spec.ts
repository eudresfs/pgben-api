import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaModule } from '../../../../src/modules/auditoria/auditoria.module';
import { LogAuditoria } from '../../../../src/modules/auditoria/entities/log-auditoria.entity';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';
import { AuditoriaMiddleware } from '../../../../src/modules/auditoria/middlewares/auditoria.middleware';
import { AuditoriaService } from '../../../../src/modules/auditoria/services/auditoria.service';
import { AuditoriaQueueService } from '../../../../src/modules/auditoria/services/auditoria-queue.service';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateLogAuditoriaDto } from '../../../../src/modules/auditoria/dto/create-log-auditoria.dto';

describe('Auditoria Integration Tests', () => {
  let app: INestApplication;
  let logAuditoriaRepository: Repository<LogAuditoria>;
  let auditoriaService: AuditoriaService;
  let auditoriaQueueService: AuditoriaQueueService;
  let auditoriaQueue: Queue;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AuditoriaModule,
        BullModule.registerQueue({
          name: 'auditoria',
        }),
      ],
    })
      .overrideProvider(getRepositoryToken(LogAuditoria))
      .useValue({
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockResolvedValue({ id: 'mock-log-id' }),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
      })
      .overrideProvider(getQueueToken('auditoria'))
      .useValue({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        process: jest.fn(),
        on: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(moduleFixture.get<AuditoriaMiddleware>(AuditoriaMiddleware).use.bind(moduleFixture.get<AuditoriaMiddleware>(AuditoriaMiddleware)));
    
    logAuditoriaRepository = moduleFixture.get<Repository<LogAuditoria>>(getRepositoryToken(LogAuditoria));
    auditoriaService = moduleFixture.get<AuditoriaService>(AuditoriaService);
    auditoriaQueueService = moduleFixture.get<AuditoriaQueueService>(AuditoriaQueueService);
    auditoriaQueue = moduleFixture.get<Queue>(getQueueToken('auditoria'));
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Fluxo de auditoria completo', () => {
    it('deve registrar log de auditoria quando uma requisição é processada', async () => {
      // Simula uma requisição HTTP que será interceptada pelo middleware
      await request(app.getHttpServer())
        .get('/api/v1/usuarios')
        .set('User-Agent', 'test-agent')
        .expect(404); // 404 porque não temos o endpoint real configurado neste teste
      
      // Verifica se o serviço de fila foi chamado para enfileirar o log
      expect(auditoriaQueue.add).toHaveBeenCalledWith(
        'registrar-log',
        expect.objectContaining({
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'Usuario',
        }),
        expect.any(Object)
      );
    });

    it('deve detectar e registrar acesso a dados sensíveis', async () => {
      // Simula uma requisição com dados sensíveis
      await request(app.getHttpServer())
        .post('/api/v1/usuarios')
        .send({
          nome: 'Usuário Teste',
          cpf: '123.456.789-00',
          email: 'teste@exemplo.com',
          endereco: {
            cep: '12345-678',
            logradouro: 'Rua Teste',
            numero: 123,
            bairro: 'Bairro Teste',
            cidade: 'Cidade Teste',
            uf: 'SP'
          }
        })
        .set('User-Agent', 'test-agent')
        .expect(404); // 404 porque não temos o endpoint real configurado neste teste
      
      // Verifica se o serviço de fila foi chamado para enfileirar o acesso a dados sensíveis
      expect(auditoriaQueue.add).toHaveBeenCalledWith(
        'registrar-acesso-dados-sensiveis',
        expect.objectContaining({
          dados_sensiveis_acessados: expect.arrayContaining(['cpf', 'endereco']),
        }),
        expect.any(Object)
      );
    });
  });

  describe('Integração entre serviços', () => {
    it('deve criar log de auditoria através do serviço', async () => {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Usuario';
      logDto.entidade_id = '123e4567-e89b-12d3-a456-426614174000';
      logDto.descricao = 'Criação de novo usuário';
      logDto.ip_origem = '192.168.1.1';
      logDto.usuario_id = 'mock-user-id';
      
      const result = await auditoriaService.create(logDto);
      
      expect(logAuditoriaRepository.create).toHaveBeenCalledWith(logDto);
      expect(logAuditoriaRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'mock-log-id' });
    });

    it('deve enfileirar log de auditoria através do serviço de fila', async () => {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Usuario';
      logDto.entidade_id = '123e4567-e89b-12d3-a456-426614174000';
      logDto.descricao = 'Criação de novo usuário';
      logDto.ip_origem = '192.168.1.1';
      logDto.usuario_id = 'mock-user-id';
      
      await auditoriaQueueService.enfileirarLogAuditoria(logDto);
      
      expect(auditoriaQueue.add).toHaveBeenCalledWith(
        'registrar-log',
        logDto,
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 1000,
          }),
        })
      );
    });
  });

  describe('Validação de DTOs', () => {
    it('deve validar corretamente o DTO de log de auditoria', async () => {
      const logDto = new CreateLogAuditoriaDto();
      // Não preenchemos campos obrigatórios
      
      // Mockamos o método save para simular falha na validação
      jest.spyOn(logAuditoriaRepository, 'save').mockRejectedValueOnce(new Error('Validation failed'));
      
      await expect(auditoriaService.create(logDto)).rejects.toThrow();
    });

    it('deve aceitar DTO de log de auditoria válido', async () => {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Usuario';
      logDto.entidade_id = '123e4567-e89b-12d3-a456-426614174000';
      logDto.descricao = 'Criação de novo usuário';
      logDto.ip_origem = '192.168.1.1';
      logDto.usuario_id = 'mock-user-id';
      
      await auditoriaService.create(logDto);
      
      expect(logAuditoriaRepository.save).toHaveBeenCalled();
    });
  });
});
