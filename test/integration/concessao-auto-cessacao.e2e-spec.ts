import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PagamentoModule } from '../../src/modules/pagamento/pagamento.module';
import { ConcessaoModule } from '../../src/modules/concessao/concessao.module';
import { NotificacaoModule } from '../../src/modules/notificacao/notificacao.module';
import { Pagamento } from '../../src/entities/pagamento.entity';
import { Concessao } from '../../src/entities/concessao.entity';
import { StatusPagamentoEnum } from '../../src/enums/status-pagamento.enum';
import { StatusConcessao } from '../../src/enums/status-concessao.enum';
import { PagamentoService } from '../../src/modules/pagamento/services/pagamento.service';
import { ConcessaoAutoUpdateService } from '../../src/modules/pagamento/services/concessao-auto-update.service';
import { PagamentoEventosService } from '../../src/modules/pagamento/services/pagamento-eventos.service';

describe('Concessão Auto Cessação (e2e)', () => {
  let app: INestApplication;
  let pagamentoRepository: Repository<Pagamento>;
  let concessaoRepository: Repository<Concessao>;
  let pagamentoService: PagamentoService;
  let concessaoAutoUpdateService: ConcessaoAutoUpdateService;
  let pagamentoEventosService: PagamentoEventosService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Pagamento, Concessao],
          synchronize: true,
        }),
        EventEmitterModule.forRoot(),
        PagamentoModule,
        ConcessaoModule,
        NotificacaoModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    pagamentoRepository = moduleFixture.get<Repository<Pagamento>>(getRepositoryToken(Pagamento));
    concessaoRepository = moduleFixture.get<Repository<Concessao>>(getRepositoryToken(Concessao));
    pagamentoService = moduleFixture.get<PagamentoService>(PagamentoService);
    concessaoAutoUpdateService = moduleFixture.get<ConcessaoAutoUpdateService>(ConcessaoAutoUpdateService);
    pagamentoEventosService = moduleFixture.get<PagamentoEventosService>(PagamentoEventosService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await pagamentoRepository.clear();
    await concessaoRepository.clear();
  });

  describe('Fluxo completo de cessação automática', () => {
    it('deve cessar concessão automaticamente quando todas as parcelas são confirmadas', async () => {
      // Arrange - Criar concessão
      const concessao = await concessaoRepository.save({
        id: 'conc-test-1',
        status: StatusConcessao.ATIVO,
        data_criacao: new Date(),
        valor_total: 3000,
        numero_parcelas: 3,
      });

      // Criar 3 parcelas para a concessão
      const parcelas = await Promise.all([
        pagamentoRepository.save({
          id: 'pag-1',
          concessao_id: concessao.id,
          numero_parcela: 1,
          valor: 1000,
          status: StatusPagamentoEnum.PENDENTE,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-2',
          concessao_id: concessao.id,
          numero_parcela: 2,
          valor: 1000,
          status: StatusPagamentoEnum.PENDENTE,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-3',
          concessao_id: concessao.id,
          numero_parcela: 3,
          valor: 1000,
          status: StatusPagamentoEnum.PENDENTE,
          data_vencimento: new Date(),
        }),
      ]);

      // Act - Confirmar primeira parcela
      await concessaoAutoUpdateService.verificarEAtualizarConcessao({
        ...parcelas[0],
        status: StatusPagamentoEnum.CONFIRMADO,
      });

      // Verificar que concessão ainda não foi cessada
      let concessaoAtualizada = await concessaoRepository.findOne({ where: { id: concessao.id } });
      expect(concessaoAtualizada.status).not.toBe(StatusConcessao.CESSADO);

      // Confirmar segunda parcela
      await concessaoAutoUpdateService.verificarEAtualizarConcessao({
        ...parcelas[1],
        status: StatusPagamentoEnum.CONFIRMADO,
      });

      // Verificar que concessão ainda não foi cessada
      concessaoAtualizada = await concessaoRepository.findOne({ where: { id: concessao.id } });
      expect(concessaoAtualizada.status).not.toBe(StatusConcessao.CESSADO);

      // Atualizar status das parcelas no banco para simular confirmação
      await pagamentoRepository.update({ id: 'pag-1' }, { status: StatusPagamentoEnum.CONFIRMADO });
      await pagamentoRepository.update({ id: 'pag-2' }, { status: StatusPagamentoEnum.CONFIRMADO });

      // Confirmar terceira (última) parcela
      await concessaoAutoUpdateService.verificarEAtualizarConcessao({
        ...parcelas[2],
        status: StatusPagamentoEnum.CONFIRMADO,
      });

      // Assert - Verificar que concessão foi cessada
      concessaoAtualizada = await concessaoRepository.findOne({ where: { id: concessao.id } });
      expect(concessaoAtualizada.status).toBe(StatusConcessao.CESSADO);
      expect(concessaoAtualizada.data_encerramento).toBeDefined();
      expect(concessaoAtualizada.motivo_encerramento).toContain('confirmação do recebimento de todas as parcelas');
    });

    it('deve verificar estatísticas das parcelas corretamente', async () => {
      // Arrange - Criar concessão com parcelas
      const concessao = await concessaoRepository.save({
        id: 'conc-test-2',
        status: StatusConcessao.ATIVO,
        data_criacao: new Date(),
        valor_total: 4000,
        numero_parcelas: 4,
      });

      await Promise.all([
        pagamentoRepository.save({
          id: 'pag-1',
          concessao_id: concessao.id,
          numero_parcela: 1,
          valor: 1000,
          status: StatusPagamentoEnum.CONFIRMADO,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-2',
          concessao_id: concessao.id,
          numero_parcela: 2,
          valor: 1000,
          status: StatusPagamentoEnum.CONFIRMADO,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-3',
          concessao_id: concessao.id,
          numero_parcela: 3,
          valor: 1000,
          status: StatusPagamentoEnum.PENDENTE,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-4',
          concessao_id: concessao.id,
          numero_parcela: 4,
          valor: 1000,
          status: StatusPagamentoEnum.PENDENTE,
          data_vencimento: new Date(),
        }),
      ]);

      // Act
      const estatisticas = await concessaoAutoUpdateService.obterEstatisticasParcelas(concessao.id);

      // Assert
      expect(estatisticas).toEqual({
        total: 4,
        confirmadas: 2,
        pendentes: 2,
        percentualConcluido: 50,
      });
    });

    it('deve verificar se concessão pode ser cessada', async () => {
      // Arrange - Criar concessão com todas as parcelas confirmadas
      const concessao = await concessaoRepository.save({
        id: 'conc-test-3',
        status: StatusConcessao.ATIVO,
        data_criacao: new Date(),
        valor_total: 2000,
        numero_parcelas: 2,
      });

      await Promise.all([
        pagamentoRepository.save({
          id: 'pag-1',
          concessao_id: concessao.id,
          numero_parcela: 1,
          valor: 1000,
          status: StatusPagamentoEnum.CONFIRMADO,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-2',
          concessao_id: concessao.id,
          numero_parcela: 2,
          valor: 1000,
          status: StatusPagamentoEnum.CONFIRMADO,
          data_vencimento: new Date(),
        }),
      ]);

      // Act
      const podeSerCessada = await concessaoAutoUpdateService.podeSerCessada(concessao.id);

      // Assert
      expect(podeSerCessada).toBe(true);
    });

    it('não deve cessar concessão se nem todas as parcelas estão confirmadas', async () => {
      // Arrange - Criar concessão com parcelas pendentes
      const concessao = await concessaoRepository.save({
        id: 'conc-test-4',
        status: StatusConcessao.ATIVO,
        data_criacao: new Date(),
        valor_total: 2000,
        numero_parcelas: 2,
      });

      await Promise.all([
        pagamentoRepository.save({
          id: 'pag-1',
          concessao_id: concessao.id,
          numero_parcela: 1,
          valor: 1000,
          status: StatusPagamentoEnum.CONFIRMADO,
          data_vencimento: new Date(),
        }),
        pagamentoRepository.save({
          id: 'pag-2',
          concessao_id: concessao.id,
          numero_parcela: 2,
          valor: 1000,
          status: StatusPagamentoEnum.PENDENTE,
          data_vencimento: new Date(),
        }),
      ]);

      // Act
      const podeSerCessada = await concessaoAutoUpdateService.podeSerCessada(concessao.id);

      // Assert
      expect(podeSerCessada).toBe(false);
    });
  });

  describe('Integração com eventos', () => {
    it('deve processar evento de status atualizado e cessar concessão', async () => {
      // Arrange - Criar concessão e parcelas
      const concessao = await concessaoRepository.save({
        id: 'conc-event-1',
        status: StatusConcessao.ATIVO,
        data_criacao: new Date(),
        valor_total: 1000,
        numero_parcelas: 1,
      });

      const pagamento = await pagamentoRepository.save({
        id: 'pag-event-1',
        concessao_id: concessao.id,
        numero_parcela: 1,
        valor: 1000,
        status: StatusPagamentoEnum.PENDENTE,
        data_vencimento: new Date(),
      });

      // Act - Simular evento de status atualizado
      await concessaoAutoUpdateService.verificarEAtualizarConcessao({
        ...pagamento,
        status: StatusPagamentoEnum.CONFIRMADO,
      });

      // Assert - Verificar que concessão foi cessada
      const concessaoAtualizada = await concessaoRepository.findOne({ where: { id: concessao.id } });
      expect(concessaoAtualizada.status).toBe(StatusConcessao.CESSADO);
      expect(concessaoAtualizada.data_encerramento).toBeDefined();
    });
  });
});