/**
 * Exemplos de respostas de erro
 * 
 * Este arquivo contém exemplos detalhados de respostas de erro
 * para diferentes cenários, incluindo erros de validação,
 * autenticação, autorização e outros.
 */

import { FORMATO_DATA } from '../../examples/utils';

export const errosValidacao = {
  // Erro de validação de CPF
  cpfInvalido: {
    statusCode: 400,
    message: 'CPF inválido',
    error: 'Bad Request',
    timestamp: FORMATO_DATA,
    path: '/api/cidadaos',
    errors: [
      {
        field: 'cpf',
        message: 'CPF deve conter 11 dígitos numéricos',
        validation: 'pattern'
      }
    ]
  },
  
  // Erro de validação de senha
  senhaInvalida: {
    statusCode: 400,
    message: 'Senha inválida',
    error: 'Bad Request',
    timestamp: FORMATO_DATA,
    path: '/api/auth/login',
    errors: [
      {
        field: 'senha',
        message: 'Senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais',
        validation: 'pattern'
      }
    ]
  },
  
  // Erro de validação de dados incompletos
  dadosIncompletos: {
    statusCode: 400,
    message: 'Dados incompletos',
    error: 'Bad Request',
    timestamp: FORMATO_DATA,
    path: '/api/cidadaos',
    errors: [
      {
        field: 'nome',
        message: 'Nome é obrigatório',
        validation: 'required'
      },
      {
        field: 'cpf',
        message: 'CPF é obrigatório',
        validation: 'required'
      }
    ]
  }
};

export const errosAutenticacao = {
  // Erro de credenciais inválidas
  credenciaisInvalidas: {
    statusCode: 401,
    message: 'Credenciais inválidas',
    error: 'Unauthorized',
    timestamp: FORMATO_DATA,
    path: '/api/auth/login'
  },
  
  // Erro de token expirado
  tokenExpirado: {
    statusCode: 401,
    message: 'Token expirado',
    error: 'Unauthorized',
    timestamp: FORMATO_DATA,
    path: '/api/beneficios'
  },
  
  // Erro de token inválido
  tokenInvalido: {
    statusCode: 401,
    message: 'Token inválido',
    error: 'Unauthorized',
    timestamp: FORMATO_DATA,
    path: '/api/beneficios'
  }
};

export const errosAutorizacao = {
  // Erro de permissão negada
  permissaoNegada: {
    statusCode: 403,
    message: 'Permissão negada para acessar este recurso',
    error: 'Forbidden',
    timestamp: FORMATO_DATA,
    path: '/api/usuarios'
  },
  
  // Erro de perfil insuficiente
  perfilInsuficiente: {
    statusCode: 403,
    message: 'Seu perfil não tem permissão para realizar esta operação',
    error: 'Forbidden',
    timestamp: FORMATO_DATA,
    path: '/api/solicitacoes/aprovar'
  }
};

export const errosRecurso = {
  // Erro de recurso não encontrado
  naoEncontrado: {
    statusCode: 404,
    message: 'Recurso não encontrado',
    error: 'Not Found',
    timestamp: FORMATO_DATA,
    path: '/api/cidadaos/123'
  },
  
  // Erro de conflito
  conflito: {
    statusCode: 409,
    message: 'Conflito ao processar a requisição',
    error: 'Conflict',
    timestamp: FORMATO_DATA,
    path: '/api/cidadaos'
  }
};

export const errosServidor = {
  // Erro interno do servidor
  erroInterno: {
    statusCode: 500,
    message: 'Erro interno do servidor',
    error: 'Internal Server Error',
    timestamp: FORMATO_DATA,
    path: '/api/beneficios'
  },
  
  // Serviço indisponível
  servicoIndisponivel: {
    statusCode: 503,
    message: 'Serviço temporariamente indisponível',
    error: 'Service Unavailable',
    timestamp: FORMATO_DATA,
    path: '/api/beneficios'
  }
};
