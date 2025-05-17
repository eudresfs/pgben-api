import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuditoriaService } from '../services/auditoria.service';
import { LogAuditoriaRepository } from '../repositories/log-auditoria.repository';
import { TipoOperacao } from '../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { faker } from '@faker-js/faker';
import { performance } from 'perf_hooks';

/**
 * Teste de carga para o módulo de auditoria
 *
 * Este script realiza testes de carga no módulo de auditoria para validar
 * seu desempenho com grandes volumes de dados.
 */
async function runLoadTest() {
  // Configurações do teste
  const NUM_LOGS = 10000; // Número de logs a serem criados
  const BATCH_SIZE = 100; // Tamanho do lote para inserções em batch
  const QUERY_ITERATIONS = 100; // Número de consultas a serem realizadas

  console.log(`Iniciando teste de carga do módulo de auditoria...`);
  console.log(
    `Configuração: ${NUM_LOGS} logs, lotes de ${BATCH_SIZE}, ${QUERY_ITERATIONS} consultas`,
  );

  // Criar módulo de teste
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuditoriaService,
      {
        provide: LogAuditoriaRepository,
        useValue: {
          create: jest.fn().mockImplementation(async (dto) => ({
            id: faker.string.uuid(),
            ...dto,
          })),
          findAll: jest
            .fn()
            .mockImplementation(async () => ({ items: [], total: 0 })),
          findOne: jest.fn().mockImplementation(async () => null),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const auditoriaService = app.get<AuditoriaService>(AuditoriaService);
  const logAuditoriaRepository = app.get<LogAuditoriaRepository>(
    LogAuditoriaRepository,
  );

  // Substituir os mocks por implementações que medem o tempo
  const originalCreate = logAuditoriaRepository.create;
  logAuditoriaRepository.create = jest.fn().mockImplementation(async (dto) => {
    const start = performance.now();
    const result = await originalCreate(dto);
    const end = performance.now();
    console.log(`Criação de log: ${end - start}ms`);
    return result;
  });

  const originalFindAll = logAuditoriaRepository.findAll;
  logAuditoriaRepository.findAll = jest
    .fn()
    .mockImplementation(async (query) => {
      const start = performance.now();
      const result = await originalFindAll(query);
      const end = performance.now();
      console.log(`Consulta de logs: ${end - start}ms`);
      return result;
    });

  // Teste 1: Criação de logs individuais
  console.log(`\n=== Teste 1: Criação de logs individuais ===`);
  const singleInsertStart = performance.now();

  for (let i = 0; i < Math.min(NUM_LOGS / 10, 1000); i++) {
    const dto = createRandomLogDto();
    await auditoriaService.criarLog(dto);

    if (i % 100 === 0) {
      console.log(`Progresso: ${i} logs criados`);
    }
  }

  const singleInsertEnd = performance.now();
  console.log(
    `Tempo total para inserção individual: ${singleInsertEnd - singleInsertStart}ms`,
  );
  console.log(
    `Média por log: ${(singleInsertEnd - singleInsertStart) / Math.min(NUM_LOGS / 10, 1000)}ms`,
  );

  // Teste 2: Criação de logs em batch
  console.log(`\n=== Teste 2: Criação de logs em batch ===`);
  const batchInsertStart = performance.now();

  for (let i = 0; i < NUM_LOGS; i += BATCH_SIZE) {
    const dtos = Array.from({ length: BATCH_SIZE }, () => createRandomLogDto());
    await auditoriaService.criarLogsBatch(dtos);

    if (i % 1000 === 0) {
      console.log(`Progresso: ${i} logs criados em batch`);
    }
  }

  const batchInsertEnd = performance.now();
  console.log(
    `Tempo total para inserção em batch: ${batchInsertEnd - batchInsertStart}ms`,
  );
  console.log(
    `Média por batch: ${(batchInsertEnd - batchInsertStart) / (NUM_LOGS / BATCH_SIZE)}ms`,
  );
  console.log(
    `Média por log: ${(batchInsertEnd - batchInsertStart) / NUM_LOGS}ms`,
  );

  // Teste 3: Consultas com diferentes filtros
  console.log(`\n=== Teste 3: Consultas com diferentes filtros ===`);
  const queryStart = performance.now();

  for (let i = 0; i < QUERY_ITERATIONS; i++) {
    const queryType = i % 5;

    switch (queryType) {
      case 0:
        // Consulta por tipo de operação
        await auditoriaService.buscarLogs({
          tipo_operacao: TipoOperacao.CREATE,
          page: 1,
          limit: 10,
        });
        break;
      case 1:
        // Consulta por entidade
        await auditoriaService.buscarLogs({
          entidade_afetada: 'Usuario',
          page: 1,
          limit: 10,
        });
        break;
      case 2:
        // Consulta por período
        const dataFim = new Date();
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 7);

        await auditoriaService.buscarLogs({
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          page: 1,
          limit: 10,
        });
        break;
      case 3:
        // Consulta por usuário
        await auditoriaService.buscarLogs({
          usuario_id: faker.string.uuid(),
          page: 1,
          limit: 10,
        });
        break;
      case 4:
        // Consulta complexa
        await auditoriaService.buscarLogs({
          tipo_operacao: TipoOperacao.UPDATE,
          entidade_afetada: 'Beneficio',
          contem_dados_sensiveis: true,
          page: 1,
          limit: 20,
        });
        break;
    }

    if (i % 10 === 0) {
      console.log(`Progresso: ${i} consultas realizadas`);
    }
  }

  const queryEnd = performance.now();
  console.log(`Tempo total para consultas: ${queryEnd - queryStart}ms`);
  console.log(
    `Média por consulta: ${(queryEnd - queryStart) / QUERY_ITERATIONS}ms`,
  );

  // Teste 4: Verificação de integridade
  console.log(`\n=== Teste 4: Verificação de integridade ===`);
  const integrityStart = performance.now();

  for (let i = 0; i < Math.min(NUM_LOGS / 10, 1000); i++) {
    const logId = faker.string.uuid();
    await auditoriaService.verificarIntegridade(logId);

    if (i % 100 === 0) {
      console.log(`Progresso: ${i} verificações realizadas`);
    }
  }

  const integrityEnd = performance.now();
  console.log(
    `Tempo total para verificações de integridade: ${integrityEnd - integrityStart}ms`,
  );
  console.log(
    `Média por verificação: ${(integrityEnd - integrityStart) / Math.min(NUM_LOGS / 10, 1000)}ms`,
  );

  // Relatório final
  console.log(`\n=== Relatório Final ===`);
  console.log(`Total de logs criados: ${NUM_LOGS}`);
  console.log(`Total de consultas realizadas: ${QUERY_ITERATIONS}`);
  console.log(
    `Tempo total do teste: ${performance.now() - singleInsertStart}ms`,
  );

  await app.close();
}

/**
 * Cria um DTO de log de auditoria com dados aleatórios
 *
 * @returns DTO de log de auditoria
 */
function createRandomLogDto(): CreateLogAuditoriaDto {
  const dto = new CreateLogAuditoriaDto();

  dto.tipo_operacao = faker.helpers.arrayElement(Object.values(TipoOperacao));
  dto.entidade_afetada = faker.helpers.arrayElement([
    'Usuario',
    'Beneficio',
    'Atendimento',
    'Documento',
  ]);
  dto.entidade_id = faker.string.uuid();
  dto.usuario_id = faker.string.uuid();
  dto.ip_origem = faker.internet.ip();
  dto.user_agent = faker.internet.userAgent();
  dto.endpoint = `/api/${dto.entidade_afetada.toLowerCase()}/${faker.helpers.arrayElement(['', dto.entidade_id])}`;
  dto.metodo_http = faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']);
  dto.descricao = `${dto.metodo_http} ${dto.endpoint}`;
  dto.data_hora = new Date();

  // Adicionar dados sensíveis em 20% dos casos
  if (faker.number.int({ min: 1, max: 5 }) === 1) {
    dto.dados_sensiveis_acessados = ['cpf', 'data_nascimento', 'endereco'];
  }

  // Adicionar dados novos em operações de criação e atualização
  if (
    dto.tipo_operacao === TipoOperacao.CREATE ||
    dto.tipo_operacao === TipoOperacao.UPDATE
  ) {
    dto.dados_novos = {
      nome: faker.person.fullName(),
      email: faker.internet.email(),
      status: faker.helpers.arrayElement(['ativo', 'inativo', 'pendente']),
    };
  }

  return dto;
}

// Executar o teste
runLoadTest()
  .then(() => console.log('Teste de carga concluído com sucesso!'))
  .catch((error) => console.error('Erro ao executar teste de carga:', error))
  .finally(() => process.exit());
