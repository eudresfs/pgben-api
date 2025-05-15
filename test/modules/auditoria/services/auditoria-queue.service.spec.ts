import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaQueueService } from '../../../../src/modules/auditoria/services/auditoria-queue.service';
import { LogAuditoria } from '../../../../src/modules/auditoria/entities/log-auditoria.entity';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../../../src/modules/auditoria/dto/create-log-auditoria.dto';
import { InjectQueue } from '@nestjs/bull';

describe('AuditoriaQueueService', () => {
  let service: AuditoriaQueueService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaQueueService,
        {
          provide: 'BullQueue_auditoria',
          useValue: mockQueue,
        },
        {
          provide: getRepositoryToken(LogAuditoria),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AuditoriaQueueService>(AuditoriaQueueService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('enfileirarLogAuditoria', () => {
    it('deve enfileirar um log de auditoria com sucesso', async () => {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Usuario';
      logDto.entidade_id = '123e4567-e89b-12d3-a456-426614174000';
      logDto.descricao = 'Criação de novo usuário';
      logDto.ip_origem = '192.168.1.1';
      logDto.usuario_id = 'mock-user-id';

      await service.enfileirarLogAuditoria(logDto);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'registrar-log',
        logDto,
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 1000,
          }),
        }),
      );
    });

    it('deve lidar com erros ao enfileirar', async () => {
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.CREATE;
      logDto.entidade_afetada = 'Usuario';

      mockQueue.add.mockRejectedValueOnce(new Error('Erro ao enfileirar'));

      await expect(service.enfileirarLogAuditoria(logDto)).rejects.toThrow('Erro ao enfileirar');
    });
  });

  describe('enfileirarAcessoDadosSensiveis', () => {
    it('deve enfileirar um registro de acesso a dados sensíveis', async () => {
      const usuarioId = 'mock-user-id';
      const entidade = 'Usuario';
      const entidadeId = '123e4567-e89b-12d3-a456-426614174000';
      const dadosSensiveis = ['cpf', 'renda_familiar'];
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const endpoint = '/api/v1/usuarios';
      const metodo = 'GET';

      await service.enfileirarAcessoDadosSensiveis(
        usuarioId,
        entidade,
        entidadeId,
        dadosSensiveis,
        ip,
        userAgent,
        endpoint,
        metodo,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'registrar-acesso-dados-sensiveis',
        expect.objectContaining({
          usuario_id: usuarioId,
          entidade_afetada: entidade,
          entidade_id: entidadeId,
          dados_sensiveis_acessados: dadosSensiveis,
          ip_origem: ip,
          user_agent: userAgent,
          endpoint: endpoint,
          metodo_http: metodo,
          tipo_operacao: TipoOperacao.READ,
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 1000,
          }),
        }),
      );
    });
  });
});
