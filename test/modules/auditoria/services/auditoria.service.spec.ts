import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from '../../../../src/modules/auditoria/services/auditoria.service';
import { LogAuditoriaRepository } from '../../../../src/modules/auditoria/repositories/log-auditoria.repository';

describe('AuditoriaService', () => {
  let service: AuditoriaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: LogAuditoriaRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
