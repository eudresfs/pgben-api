/**
 * Schemas das entidades para documentação Swagger
 * Este arquivo contém a definição dos schemas para todas as entidades do sistema
 */

import { respostasExemplo } from './swagger-respostas';

// Papel do Cidadão
export const papelCidadaoSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: 'b1e6e8cc-0e4f-4c30-9c5d-123456789abc',
      description: 'ID único do papel do cidadão',
    },
    tipo_papel: {
      type: 'string',
      enum: ['BENEFICIARIO', 'REQUERENTE', 'REPRESENTANTE_LEGAL'],
      example: 'BENEFICIARIO',
      description: 'Tipo do papel do cidadão',
    },
    metadados: {
      type: 'object',
      example: { documento: '123456789', validade: '2025-12-31' },
      description: 'Metadados específicos do papel, estrutura dinâmica (JSON)',
    },
    cidadaoId: {
      type: 'string',
      format: 'uuid',
      example: '550e8400-e29b-41d4-a716-446655440000',
      description: 'ID do cidadão vinculado',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: '2024-05-01T10:00:00Z',
      description: 'Data de criação do papel',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: '2024-05-10T15:00:00Z',
      description: 'Data da última atualização do papel',
    },
  },
};

// Cidadão
export const cidadaoSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.cidadaoEncontrado.id,
      description: 'ID único do cidadão',
    },
    nome: {
      type: 'string',
      example: respostasExemplo.cidadaoEncontrado.nome,
      description: 'Nome completo do cidadão',
    },
    cpf: {
      type: 'string',
      example: respostasExemplo.cidadaoEncontrado.cpf,
      description: 'CPF do cidadão (formatado)',
    },
    dataNascimento: {
      type: 'string',
      format: 'date',
      example: respostasExemplo.cidadaoEncontrado.dataNascimento,
      description: 'Data de nascimento do cidadão',
    },
    telefone: {
      type: 'string',
      example: respostasExemplo.cidadaoEncontrado.telefone,
      description: 'Telefone de contato do cidadão',
    },
    email: {
      type: 'string',
      format: 'email',
      example: respostasExemplo.cidadaoEncontrado.email,
      description: 'Email do cidadão',
    },
    endereco: {
      type: 'object',
      properties: {
        logradouro: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.logradouro,
          description: 'Nome da rua, avenida, etc.',
        },
        numero: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.numero,
          description: 'Número do endereço',
        },
        complemento: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.complemento,
          description: 'Complemento do endereço (apto, bloco, etc.)',
        },
        bairro: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.bairro,
          description: 'Bairro',
        },
        cidade: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.cidade,
          description: 'Cidade',
        },
        estado: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.estado,
          description: 'Estado (UF)',
        },
        cep: {
          type: 'string',
          example: respostasExemplo.cidadaoEncontrado.endereco.cep,
          description: 'CEP (formatado)',
        },
      },
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.cidadaoEncontrado.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.cidadaoEncontrado.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
    papeis: {
      type: 'array',
      items: papelCidadaoSchema,
      description: 'Lista de papéis associados ao cidadão',
    },
  },
};

// Benefício
export const beneficioSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.beneficioEncontrado.id,
      description: 'ID único do benefício',
    },
    nome: {
      type: 'string',
      example: respostasExemplo.beneficioEncontrado.nome,
      description: 'Nome do benefício',
    },
    descricao: {
      type: 'string',
      example: respostasExemplo.beneficioEncontrado.descricao,
      description: 'Descrição detalhada do benefício',
    },
    valorBase: {
      type: 'number',
      format: 'float',
      example: respostasExemplo.beneficioEncontrado.valorBase,
      description: 'Valor base do benefício em reais',
    },
    duracaoMeses: {
      type: 'integer',
      example: respostasExemplo.beneficioEncontrado.duracaoMeses,
      description: 'Duração padrão do benefício em meses',
    },
    requisitos: {
      type: 'array',
      items: {
        type: 'string',
      },
      example: respostasExemplo.beneficioEncontrado.requisitos,
      description: 'Lista de requisitos para elegibilidade ao benefício',
    },
    documentosNecessarios: {
      type: 'array',
      items: {
        type: 'string',
      },
      example: respostasExemplo.beneficioEncontrado.documentosNecessarios,
      description: 'Lista de documentos necessários para solicitar o benefício',
    },
    ativo: {
      type: 'boolean',
      example: respostasExemplo.beneficioEncontrado.ativo,
      description:
        'Indica se o benefício está ativo e disponível para solicitação',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.beneficioEncontrado.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.beneficioEncontrado.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Solicitação
export const solicitacaoSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.solicitacaoEncontrada.id,
      description: 'ID único da solicitação',
    },
    cidadaoId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.solicitacaoEncontrada.cidadaoId,
      description: 'ID do cidadão solicitante',
    },
    beneficioId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.solicitacaoEncontrada.beneficioId,
      description: 'ID do benefício solicitado',
    },
    dataInicio: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.solicitacaoEncontrada.dataInicio,
      description: 'Data de início do benefício (se aprovado)',
    },
    dataFim: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.solicitacaoEncontrada.dataFim,
      description: 'Data de término do benefício (se aprovado)',
    },
    status: {
      type: 'string',
      enum: [
        'PENDENTE',
        'APROVADA',
        'REJEITADA',
        'CANCELADA',
        'SUSPENSA',
        'ENCERRADA',
      ],
      example: respostasExemplo.solicitacaoEncontrada.status,
      description: 'Status atual da solicitação',
    },
    valorConcedido: {
      type: 'number',
      format: 'float',
      example: respostasExemplo.solicitacaoEncontrada.valorConcedido,
      description:
        'Valor concedido do benefício (pode ser diferente do valor base)',
    },
    observacoes: {
      type: 'string',
      example: respostasExemplo.solicitacaoEncontrada.observacoes,
      description: 'Observações sobre a solicitação',
    },
    documentosApresentados: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'ID do documento',
          },
          nome: {
            type: 'string',
            description: 'Nome do documento',
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL para acesso ao documento',
          },
        },
      },
      example: respostasExemplo.solicitacaoEncontrada.documentosApresentados,
      description: 'Lista de documentos apresentados para a solicitação',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.solicitacaoEncontrada.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.solicitacaoEncontrada.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Documento
export const documentoSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.documentoEncontrado.id,
      description: 'ID único do documento',
    },
    solicitacaoId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.documentoEncontrado.solicitacaoId,
      description: 'ID da solicitação relacionada',
    },
    nome: {
      type: 'string',
      example: respostasExemplo.documentoEncontrado.nome,
      description: 'Nome do documento',
    },
    tipo: {
      type: 'string',
      example: respostasExemplo.documentoEncontrado.tipo,
      description: 'Tipo do documento',
    },
    url: {
      type: 'string',
      format: 'uri',
      example: respostasExemplo.documentoEncontrado.url,
      description: 'URL para acesso ao documento',
    },
    dataUpload: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.documentoEncontrado.dataUpload,
      description: 'Data e hora do upload do documento',
    },
    tamanhoBytes: {
      type: 'integer',
      example: respostasExemplo.documentoEncontrado.tamanhoBytes,
      description: 'Tamanho do documento em bytes',
    },
    status: {
      type: 'string',
      enum: ['PENDENTE', 'VALIDO', 'INVALIDO'],
      example: respostasExemplo.documentoEncontrado.status,
      description: 'Status de validação do documento',
    },
    observacoes: {
      type: 'string',
      example: respostasExemplo.documentoEncontrado.observacoes,
      description: 'Observações sobre o documento',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.documentoEncontrado.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.documentoEncontrado.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Usuário
export const usuarioSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.usuarioEncontrado.id,
      description: 'ID único do usuário',
    },
    nome: {
      type: 'string',
      example: respostasExemplo.usuarioEncontrado.nome,
      description: 'Nome completo do usuário',
    },
    email: {
      type: 'string',
      format: 'email',
      example: respostasExemplo.usuarioEncontrado.email,
      description: 'Email do usuário (usado para login)',
    },
    cargo: {
      type: 'string',
      example: respostasExemplo.usuarioEncontrado.cargo,
      description: 'Cargo do usuário na organização',
    },
    unidadeId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.usuarioEncontrado.unidadeId,
      description: 'ID da unidade à qual o usuário está vinculado',
    },
    ativo: {
      type: 'boolean',
      example: respostasExemplo.usuarioEncontrado.ativo,
      description: 'Indica se o usuário está ativo no sistema',
    },
    ultimoAcesso: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.usuarioEncontrado.ultimoAcesso,
      description: 'Data e hora do último acesso do usuário',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.usuarioEncontrado.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.usuarioEncontrado.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Unidade
export const unidadeSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.unidadeEncontrada.id,
      description: 'ID único da unidade',
    },
    nome: {
      type: 'string',
      example: respostasExemplo.unidadeEncontrada.nome,
      description: 'Nome da unidade',
    },
    codigo: {
      type: 'string',
      example: respostasExemplo.unidadeEncontrada.codigo,
      description: 'Código de identificação da unidade',
    },
    endereco: {
      type: 'object',
      properties: {
        logradouro: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.logradouro,
          description: 'Nome da rua, avenida, etc.',
        },
        numero: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.numero,
          description: 'Número do endereço',
        },
        complemento: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.complemento,
          description: 'Complemento do endereço (bloco, andar, etc.)',
        },
        bairro: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.bairro,
          description: 'Bairro',
        },
        cidade: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.cidade,
          description: 'Cidade',
        },
        estado: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.estado,
          description: 'Estado (UF)',
        },
        cep: {
          type: 'string',
          example: respostasExemplo.unidadeEncontrada.endereco.cep,
          description: 'CEP (formatado)',
        },
      },
    },
    telefone: {
      type: 'string',
      example: respostasExemplo.unidadeEncontrada.telefone,
      description: 'Telefone de contato da unidade',
    },
    email: {
      type: 'string',
      format: 'email',
      example: respostasExemplo.unidadeEncontrada.email,
      description: 'Email de contato da unidade',
    },
    responsavelId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.unidadeEncontrada.responsavelId,
      description: 'ID do usuário responsável pela unidade',
    },
    ativa: {
      type: 'boolean',
      example: respostasExemplo.unidadeEncontrada.ativa,
      description: 'Indica se a unidade está ativa',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.unidadeEncontrada.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.unidadeEncontrada.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Notificação
export const notificacaoSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.notificacaoEncontrada.id,
      description: 'ID único da notificação',
    },
    tipo: {
      type: 'string',
      enum: ['EMAIL', 'SMS', 'PUSH', 'SISTEMA'],
      example: respostasExemplo.notificacaoEncontrada.tipo,
      description: 'Tipo da notificação',
    },
    destinatario: {
      type: 'string',
      example: respostasExemplo.notificacaoEncontrada.destinatario,
      description: 'Destinatário da notificação (email, telefone, etc.)',
    },
    assunto: {
      type: 'string',
      example: respostasExemplo.notificacaoEncontrada.assunto,
      description: 'Assunto da notificação',
    },
    conteudo: {
      type: 'string',
      example: respostasExemplo.notificacaoEncontrada.conteudo,
      description: 'Conteúdo da notificação',
    },
    status: {
      type: 'string',
      enum: ['PENDENTE', 'ENVIADA', 'FALHA', 'ENTREGUE', 'LIDA'],
      example: respostasExemplo.notificacaoEncontrada.status,
      description: 'Status da notificação',
    },
    dataEnvio: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.notificacaoEncontrada.dataEnvio,
      description: 'Data e hora do envio da notificação',
    },
    tentativas: {
      type: 'integer',
      example: respostasExemplo.notificacaoEncontrada.tentativas,
      description: 'Número de tentativas de envio',
    },
    metadados: {
      type: 'object',
      example: respostasExemplo.notificacaoEncontrada.metadados,
      description: 'Metadados adicionais da notificação',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.notificacaoEncontrada.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.notificacaoEncontrada.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Ocorrência
export const ocorrenciaSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.ocorrenciaEncontrada.id,
      description: 'ID único da ocorrência',
    },
    solicitacaoId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.ocorrenciaEncontrada.solicitacaoId,
      description: 'ID da solicitação relacionada',
    },
    usuarioId: {
      type: 'string',
      format: 'uuid',
      example: respostasExemplo.ocorrenciaEncontrada.usuarioId,
      description: 'ID do usuário que registrou a ocorrência',
    },
    tipo: {
      type: 'string',
      enum: [
        'ALTERACAO_STATUS',
        'OBSERVACAO',
        'DOCUMENTO_ADICIONADO',
        'DOCUMENTO_VALIDADO',
        'NOTIFICACAO_ENVIADA',
      ],
      example: respostasExemplo.ocorrenciaEncontrada.tipo,
      description: 'Tipo da ocorrência',
    },
    descricao: {
      type: 'string',
      example: respostasExemplo.ocorrenciaEncontrada.descricao,
      description: 'Descrição da ocorrência',
    },
    detalhes: {
      type: 'object',
      example: respostasExemplo.ocorrenciaEncontrada.detalhes,
      description: 'Detalhes adicionais da ocorrência',
    },
    criadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.ocorrenciaEncontrada.criadoEm,
      description: 'Data e hora de criação do registro',
    },
    atualizadoEm: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.ocorrenciaEncontrada.atualizadoEm,
      description: 'Data e hora da última atualização do registro',
    },
  },
};

// Health Check
export const healthCheckSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      example: respostasExemplo.healthCheck.status,
      description: 'Status geral do sistema',
    },
    versao: {
      type: 'string',
      example: respostasExemplo.healthCheck.versao,
      description: 'Versão atual da API',
    },
    ambiente: {
      type: 'string',
      example: respostasExemplo.healthCheck.ambiente,
      description:
        'Ambiente de execução (desenvolvimento, homologação, produção)',
    },
    banco: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: respostasExemplo.healthCheck.banco.status,
          description: 'Status da conexão com o banco de dados',
        },
        latencia: {
          type: 'string',
          example: respostasExemplo.healthCheck.banco.latencia,
          description: 'Latência da conexão com o banco de dados',
        },
      },
    },
    servicos: {
      type: 'object',
      example: respostasExemplo.healthCheck.servicos,
      description: 'Status dos serviços externos',
    },
    uptime: {
      type: 'string',
      example: respostasExemplo.healthCheck.uptime,
      description: 'Tempo de atividade do sistema',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.healthCheck.timestamp,
      description: 'Data e hora da verificação',
    },
  },
};

// Métricas
export const metricasSchema = {
  type: 'object',
  properties: {
    solicitacoes: {
      type: 'object',
      properties: {
        total: {
          type: 'integer',
          example: respostasExemplo.metricas.solicitacoes.total,
          description: 'Total de solicitações',
        },
        pendentes: {
          type: 'integer',
          example: respostasExemplo.metricas.solicitacoes.pendentes,
          description: 'Total de solicitações pendentes',
        },
        aprovadas: {
          type: 'integer',
          example: respostasExemplo.metricas.solicitacoes.aprovadas,
          description: 'Total de solicitações aprovadas',
        },
        rejeitadas: {
          type: 'integer',
          example: respostasExemplo.metricas.solicitacoes.rejeitadas,
          description: 'Total de solicitações rejeitadas',
        },
      },
    },
    beneficios: {
      type: 'object',
      properties: {
        total: {
          type: 'integer',
          example: respostasExemplo.metricas.beneficios.total,
          description: 'Total de benefícios',
        },
        ativos: {
          type: 'integer',
          example: respostasExemplo.metricas.beneficios.ativos,
          description: 'Total de benefícios ativos',
        },
        inativos: {
          type: 'integer',
          example: respostasExemplo.metricas.beneficios.inativos,
          description: 'Total de benefícios inativos',
        },
      },
    },
    cidadaos: {
      type: 'object',
      example: respostasExemplo.metricas.cidadaos,
      description: 'Métricas relacionadas aos cidadãos',
    },
    documentos: {
      type: 'object',
      example: respostasExemplo.metricas.documentos,
      description: 'Métricas relacionadas aos documentos',
    },
    tempoMedioAprovacao: {
      type: 'string',
      example: respostasExemplo.metricas.tempoMedioAprovacao,
      description: 'Tempo médio para aprovação de solicitações',
    },
    taxaAprovacao: {
      type: 'string',
      example: respostasExemplo.metricas.taxaAprovacao,
      description: 'Taxa de aprovação de solicitações',
    },
    periodoReferencia: {
      type: 'object',
      properties: {
        inicio: {
          type: 'string',
          format: 'date-time',
          example: respostasExemplo.metricas.periodoReferencia.inicio,
          description: 'Data de início do período de referência',
        },
        fim: {
          type: 'string',
          format: 'date-time',
          example: respostasExemplo.metricas.periodoReferencia.fim,
          description: 'Data de fim do período de referência',
        },
      },
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      example: respostasExemplo.metricas.timestamp,
      description: 'Data e hora da geração das métricas',
    },
  },
};
