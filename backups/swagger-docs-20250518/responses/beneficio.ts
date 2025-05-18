import { HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';

type Constructor = new (...args: any[]) => any;
import { 
  TipoBeneficioDto, 
  SolicitacaoBeneficioDto,
  ErrorResponse
} from '@/shared/configs/swagger/schemas';
import {
  tipoBeneficioExemplo,
  solicitacaoBeneficioExemplo,
  listaPaginadaBeneficiosResponse,
  listaSolicitacoesResponse,
  erroValidacaoResponse,
  naoEncontradoResponse,
  conflitoResponse,
  erroInternoResponse
} from '../examples/beneficio';

/**
 * Respostas para o módulo de benefícios
 */

// Respostas para Tipos de Benefício
export const TipoBeneficioCriadoResponse = {
  status: HttpStatus.CREATED,
  description: 'Tipo de benefício criado com sucesso',
  type: TipoBeneficioDto,
  schema: {
    example: tipoBeneficioExemplo,
  },
};

export const TipoBeneficioAtualizadoResponse = {
  status: HttpStatus.OK,
  description: 'Tipo de benefício atualizado com sucesso',
  type: TipoBeneficioDto,
  schema: {
    example: {
      ...tipoBeneficioExemplo,
      nome: 'Auxílio Emergencial Atualizado',
      valor: 650.0,
      updatedAt: new Date().toISOString(),
    },
  },
};

export const TipoBeneficioNaoEncontradoResponse = {
  status: HttpStatus.NOT_FOUND,
  description: 'Tipo de benefício não encontrado',
  type: ErrorResponse,
  schema: {
    example: {
      ...naoEncontradoResponse,
      message: 'Tipo de benefício não encontrado',
      errorCode: 'BENEFICIO_001',
    },
  },
};

export const ListaTiposBeneficioResponse = {
  status: HttpStatus.OK,
  description: 'Lista de tipos de benefício retornada com sucesso',
  schema: {
    example: listaPaginadaBeneficiosResponse,
  },
};

// Respostas para Solicitações de Benefício
export const SolicitacaoCriadaResponse = {
  status: HttpStatus.CREATED,
  description: 'Solicitação de benefício criada com sucesso',
  type: SolicitacaoBeneficioDto,
  schema: {
    example: solicitacaoBeneficioExemplo,
  },
};

export const SolicitacaoAtualizadaResponse = {
  status: HttpStatus.OK,
  description: 'Solicitação de benefício atualizada com sucesso',
  type: SolicitacaoBeneficioDto,
  schema: {
    example: {
      ...solicitacaoBeneficioExemplo,
      status: 'EM_ANALISE',
      observacoes: 'Documentação complementar enviada',
      dataAtualizacao: new Date().toISOString(),
    },
  },
};

export const SolicitacaoNaoEncontradaResponse = {
  status: HttpStatus.NOT_FOUND,
  description: 'Solicitação de benefício não encontrada',
  type: ErrorResponse,
  schema: {
    example: {
      ...naoEncontradoResponse,
      message: 'Solicitação de benefício não encontrada',
      errorCode: 'SOLICITACAO_001',
    },
  },
};

export const SolicitacaoStatusAtualizadoResponse = {
  status: HttpStatus.OK,
  description: 'Status da solicitação de benefício atualizado com sucesso',
  type: SolicitacaoBeneficioDto,
  schema: {
    example: {
      ...solicitacaoBeneficioExemplo,
      status: 'APROVADA',
      valorAprovado: 600.0,
      dataAprovacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    },
  },
};

export const ListaSolicitacoesResponse = {
  status: HttpStatus.OK,
  description: 'Lista de solicitações de benefício retornada com sucesso',
  schema: {
    example: listaSolicitacoesResponse,
  },
};

// Respostas para erros comuns
export const BeneficioNaoAtivoResponse = {
  status: HttpStatus.BAD_REQUEST,
  description: 'O tipo de benefício não está ativo',
  type: ErrorResponse,
  schema: {
    example: {
      ...erroValidacaoResponse,
      message:
        'O tipo de benefício selecionado não está disponível para solicitação',
      errorCode: 'BENEFICIO_002',
    },
  },
};

export const CidadaoNaoEncontradoResponse = {
  status: HttpStatus.NOT_FOUND,
  description: 'Cidadão não encontrado',
  type: ErrorResponse,
  schema: {
    example: {
      ...naoEncontradoResponse,
      message: 'Cidadão não encontrado',
      errorCode: 'CIDADAO_001',
    },
  },
};

export const DocumentacaoIncompletaResponse = {
  status: HttpStatus.BAD_REQUEST,
  description: 'Documentação obrigatória não enviada ou incompleta',
  type: ErrorResponse,
  schema: {
    example: {
      ...erroValidacaoResponse,
      message: [
        'Documento de identificação é obrigatório',
        'Comprovante de renda é obrigatório para este benefício',
      ],
      errorCode: 'DOCUMENTACAO_001',
    },
  },
};

// Decorator para respostas comuns de benefícios

export const ApiBeneficioResponses = () => {
  return function (
    target: Constructor | object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) {
    const responses: ApiResponseOptions[] = [
      TipoBeneficioNaoEncontradoResponse,
      SolicitacaoNaoEncontradaResponse,
      BeneficioNaoAtivoResponse,
      CidadaoNaoEncontradoResponse,
      DocumentacaoIncompletaResponse,
    ];

    responses.forEach((response) => {
      if (descriptor && propertyKey) {
        // Se for um método
        const methodDecorator = ApiResponse(response);
        methodDecorator(target, propertyKey as string, descriptor);
      } else if (typeof target === 'function') {
        // Se for uma classe
        const classDecorator = ApiResponse(response);
        classDecorator(target);
      } else if (typeof target === 'object' && target !== null) {
        // Se for um objeto (caso de uso menos comum)
        const instanceDecorator = ApiResponse(response);
        instanceDecorator(target.constructor);
      }
    });
  };
};
