/**
 * Configurações de respostas padrão para todas as rotas do Swagger
 * Este arquivo contém as configurações de respostas que serão aplicadas a todas as rotas
 */

import { respostasExemplo } from './swagger-respostas';

// Configuração de respostas padrão para todas as rotas
export const respostasPadrao = {
  // Resposta de sucesso genérica (200)
  sucesso: {
    status: 200,
    description: 'Operação realizada com sucesso',
    schema: {
      type: 'object',
      example: respostasExemplo.sucesso,
    },
  },

  // Resposta de criação (201)
  criado: {
    status: 201,
    description: 'Recurso criado com sucesso',
    schema: {
      type: 'object',
      example: respostasExemplo.sucesso,
    },
  },

  // Resposta sem conteúdo (204)
  semConteudo: {
    status: 204,
    description: 'Operação realizada com sucesso (sem conteúdo para retornar)',
  },

  // Resposta de erro de requisição (400)
  requisicaoInvalida: {
    status: 400,
    description: 'Dados da requisição inválidos',
    schema: {
      type: 'object',
      example: respostasExemplo.erro,
    },
  },

  // Resposta de não autorizado (401)
  naoAutorizado: {
    status: 401,
    description: 'Não autorizado - autenticação necessária',
    schema: {
      type: 'object',
      example: respostasExemplo.naoAutorizado,
    },
  },

  // Resposta de acesso proibido (403)
  acessoProibido: {
    status: 403,
    description: 'Acesso proibido - sem permissão para acessar este recurso',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        mensagem: 'Acesso proibido',
        erro: 'Forbidden',
      },
    },
  },

  // Resposta de recurso não encontrado (404)
  naoEncontrado: {
    status: 404,
    description: 'Recurso não encontrado',
    schema: {
      type: 'object',
      example: respostasExemplo.naoEncontrado,
    },
  },

  // Resposta de erro interno do servidor (500)
  erroInterno: {
    status: 500,
    description: 'Erro interno do servidor',
    schema: {
      type: 'object',
      example: {
        statusCode: 500,
        mensagem: 'Erro interno do servidor',
        erro: 'Internal Server Error',
      },
    },
  },
};

// Configuração de respostas para rotas específicas
export const respostasEspecificas = {
  // Cidadão
  cidadao: {
    obter: {
      status: 200,
      description: 'Cidadão encontrado',
      schema: {
        type: 'object',
        example: respostasExemplo.cidadaoEncontrado,
      },
    },
    criar: {
      status: 201,
      description: 'Cidadão criado com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.cidadaoCriado,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de cidadãos',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.cidadaosListados,
      },
    },
  },

  // Benefício
  beneficio: {
    obter: {
      status: 200,
      description: 'Benefício encontrado',
      schema: {
        type: 'object',
        example: respostasExemplo.beneficioEncontrado,
      },
    },
    criar: {
      status: 201,
      description: 'Benefício criado com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.beneficioCriado,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de benefícios',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.beneficiosListados,
      },
    },
  },

  // Solicitação
  solicitacao: {
    obter: {
      status: 200,
      description: 'Solicitação encontrada',
      schema: {
        type: 'object',
        example: respostasExemplo.solicitacaoEncontrada,
      },
    },
    criar: {
      status: 201,
      description: 'Solicitação criada com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.solicitacaoCriada,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de solicitações',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.solicitacoesListadas,
      },
    },
    avaliar: {
      status: 200,
      description: 'Solicitação avaliada com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.solicitacaoAvaliada,
      },
    },
  },

  // Documento
  documento: {
    obter: {
      status: 200,
      description: 'Documento encontrado',
      schema: {
        type: 'object',
        example: respostasExemplo.documentoEncontrado,
      },
    },
    criar: {
      status: 201,
      description: 'Documento criado com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.documentoCriado,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de documentos',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.documentosListados,
      },
    },
  },

  // Usuário
  usuario: {
    obter: {
      status: 200,
      description: 'Usuário encontrado',
      schema: {
        type: 'object',
        example: respostasExemplo.usuarioEncontrado,
      },
    },
    criar: {
      status: 201,
      description: 'Usuário criado com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.usuarioCriado,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de usuários',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.usuariosListados,
      },
    },
  },

  // Unidade
  unidade: {
    obter: {
      status: 200,
      description: 'Unidade encontrada',
      schema: {
        type: 'object',
        example: respostasExemplo.unidadeEncontrada,
      },
    },
    criar: {
      status: 201,
      description: 'Unidade criada com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.unidadeCriada,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de unidades',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.unidadesListadas,
      },
    },
  },

  // Notificação
  notificacao: {
    obter: {
      status: 200,
      description: 'Notificação encontrada',
      schema: {
        type: 'object',
        example: respostasExemplo.notificacaoEncontrada,
      },
    },
    criar: {
      status: 201,
      description: 'Notificação criada com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.notificacaoCriada,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de notificações',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.notificacoesListadas,
      },
    },
  },

  // Ocorrência
  ocorrencia: {
    obter: {
      status: 200,
      description: 'Ocorrência encontrada',
      schema: {
        type: 'object',
        example: respostasExemplo.ocorrenciaEncontrada,
      },
    },
    criar: {
      status: 201,
      description: 'Ocorrência criada com sucesso',
      schema: {
        type: 'object',
        example: respostasExemplo.ocorrenciaCriada,
      },
    },
    listar: {
      status: 200,
      description: 'Lista de ocorrências',
      schema: {
        type: 'array',
        items: {
          type: 'object',
        },
        example: respostasExemplo.ocorrenciasListadas,
      },
    },
  },

  // Health Check
  healthCheck: {
    obter: {
      status: 200,
      description: 'Informações de saúde do sistema',
      schema: {
        type: 'object',
        example: respostasExemplo.healthCheck,
      },
    },
  },

  // Métricas
  metricas: {
    obter: {
      status: 200,
      description: 'Métricas do sistema',
      schema: {
        type: 'object',
        example: respostasExemplo.metricas,
      },
    },
  },
};
