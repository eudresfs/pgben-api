import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import {
  Pagamento,
  ComprovantePagamento,
  ConfirmacaoRecebimento,
} from '../../entities';

/**
 * Cria um módulo de teste para os testes do módulo de pagamento
 *
 * @param imports Módulos adicionais a serem importados
 * @param controllers Controllers a serem incluídos no módulo de teste
 * @param providers Providers a serem incluídos no módulo de teste
 * @returns Módulo de teste configurado
 */
export async function createTestingModule({
  imports = [],
  controllers = [],
  providers = [],
}) {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: [Pagamento, ComprovantePagamento, ConfirmacaoRecebimento],
        synchronize: true,
      }),
      TypeOrmModule.forFeature([
        Pagamento,
        ComprovantePagamento,
        ConfirmacaoRecebimento,
      ]),
      ...imports,
    ],
    controllers,
    providers: [
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
      },
      ...providers,
    ],
  }).compile();

  return moduleRef;
}

/**
 * Cria fixtures para os testes
 *
 * @param entityManager EntityManager do TypeORM
 */
export async function createFixtures(entityManager) {
  // Criar entidades necessárias para os testes
  // Exemplo: pagamentos, comprovantes, etc.
}

/**
 * Limpa o banco de dados de teste
 *
 * @param entityManager EntityManager do TypeORM
 */
export async function cleanDatabase(entityManager) {
  await entityManager.query('DELETE FROM confirmacao_recebimento');
  await entityManager.query('DELETE FROM comprovante_pagamento');
  await entityManager.query('DELETE FROM pagamento');
}

/**
 * Retorna mocks comuns usados nos testes
 */
export function getCommonMocks() {
  return {
    pagamentoRepositoryMock: {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      })),
    },
    statusValidatorMock: {
      canTransition: jest.fn(),
    },
    integracaoSolicitacaoServiceMock: {
      verificarSolicitacaoAprovada: jest.fn(),
      atualizarStatusParaPagamentoCriado: jest.fn(),
      atualizarStatusParaPagamentoLiberado: jest.fn(),
      atualizarStatusParaPagamentoConfirmado: jest.fn(),
      atualizarStatusParaPagamentoCancelado: jest.fn(),
      obterLimitesBeneficio: jest.fn(),
      verificarPagamentoExistente: jest.fn(),
    },
    integracaoCidadaoServiceMock: {
      obterDadosPessoais: jest.fn(),
      obterInformacoesBancarias: jest.fn(),
      obterInfoBancariaPorId: jest.fn(),
      verificarPropriedadeInfoBancaria: jest.fn(),
      verificarBeneficiarioSolicitacao: jest.fn(),
    },
    integracaoDocumentoServiceMock: {
      uploadArquivo: jest.fn(),
      getArquivo: jest.fn(),
      listarArquivos: jest.fn(),
      removerArquivo: jest.fn(),
    },
    auditoriaPagamentoServiceMock: {
      registrarCriacaoPagamento: jest.fn(),
      registrarAtualizacaoStatus: jest.fn(),
      registrarCancelamento: jest.fn(),
      registrarUploadComprovante: jest.fn(),
      registrarRemocaoComprovante: jest.fn(),
      registrarConfirmacaoRecebimento: jest.fn(),
    },
  };
}
