/**
 * Exemplos de respostas para a documentação Swagger
 * Este arquivo contém exemplos padronizados de respostas para todas as rotas da API
 */

export const respostasExemplo = {
  // Respostas genéricas
  sucesso: {
    status: 'ok',
    mensagem: 'Operação realizada com sucesso',
  },

  erro: {
    statusCode: 400,
    mensagem: 'Erro ao processar a solicitação',
    erro: 'Bad Request',
  },

  naoEncontrado: {
    statusCode: 404,
    mensagem: 'Recurso não encontrado',
    erro: 'Not Found',
  },

  naoAutorizado: {
    statusCode: 401,
    mensagem: 'Não autorizado',
    erro: 'Unauthorized',
  },

  // Respostas específicas - Cidadão
  cidadaoEncontrado: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
    dataNascimento: '1985-07-15',
    telefone: '(11) 98765-4321',
    email: 'maria.silva@exemplo.com',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
    },
    criadoEm: '2023-05-10T14:30:45.123Z',
    atualizadoEm: '2023-05-10T14:30:45.123Z',
  },

  cidadaoCriado: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
    dataNascimento: '1985-07-15',
    telefone: '(11) 98765-4321',
    email: 'maria.silva@exemplo.com',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
    },
    criadoEm: '2023-05-10T14:30:45.123Z',
    atualizadoEm: '2023-05-10T14:30:45.123Z',
  },

  cidadaosListados: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Maria da Silva',
      cpf: '123.456.789-00',
      dataNascimento: '1985-07-15',
      telefone: '(11) 98765-4321',
      email: 'maria.silva@exemplo.com',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      nome: 'João Santos',
      cpf: '987.654.321-00',
      dataNascimento: '1990-03-22',
      telefone: '(11) 91234-5678',
      email: 'joao.santos@exemplo.com',
    },
  ],

  // Respostas específicas - Benefício
  beneficioEncontrado: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    nome: 'Auxílio Moradia',
    descricao: 'Benefício para auxílio com despesas de habitação',
    valorBase: 500.0,
    duracaoMeses: 12,
    requisitos: [
      'Renda familiar abaixo de 3 salários mínimos',
      'Não possuir imóvel próprio',
    ],
    documentosNecessarios: [
      'Comprovante de residência',
      'Comprovante de renda',
    ],
    ativo: true,
    criadoEm: '2023-04-05T10:15:30.123Z',
    atualizadoEm: '2023-04-05T10:15:30.123Z',
  },

  beneficioCriado: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    nome: 'Auxílio Moradia',
    descricao: 'Benefício para auxílio com despesas de habitação',
    valorBase: 500.0,
    duracaoMeses: 12,
    requisitos: [
      'Renda familiar abaixo de 3 salários mínimos',
      'Não possuir imóvel próprio',
    ],
    documentosNecessarios: [
      'Comprovante de residência',
      'Comprovante de renda',
    ],
    ativo: true,
    criadoEm: '2023-04-05T10:15:30.123Z',
    atualizadoEm: '2023-04-05T10:15:30.123Z',
  },

  beneficiosListados: [
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      nome: 'Auxílio Moradia',
      descricao: 'Benefício para auxílio com despesas de habitação',
      valorBase: 500.0,
      ativo: true,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      nome: 'Auxílio Alimentação',
      descricao: 'Benefício para auxílio com despesas de alimentação',
      valorBase: 300.0,
      ativo: true,
    },
  ],

  // Respostas específicas - Solicitação
  solicitacaoEncontrada: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
    beneficioId: '550e8400-e29b-41d4-a716-446655440010',
    dataInicio: '2023-06-01T00:00:00.000Z',
    dataFim: '2024-05-31T23:59:59.999Z',
    status: 'APROVADA',
    valorConcedido: 500.0,
    observacoes: 'Solicitação aprovada após análise de documentação',
    documentosApresentados: [
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        nome: 'Comprovante de Residência',
        url: 'https://storage.exemplo.com/documentos/comprovante_residencia.pdf',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440031',
        nome: 'Comprovante de Renda',
        url: 'https://storage.exemplo.com/documentos/comprovante_renda.pdf',
      },
    ],
    criadoEm: '2023-05-15T09:45:20.123Z',
    atualizadoEm: '2023-05-20T14:30:10.456Z',
  },

  solicitacaoCriada: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
    beneficioId: '550e8400-e29b-41d4-a716-446655440010',
    status: 'PENDENTE',
    observacoes: 'Solicitação criada, aguardando análise',
    criadoEm: '2023-05-15T09:45:20.123Z',
    atualizadoEm: '2023-05-15T09:45:20.123Z',
  },

  solicitacoesListadas: [
    {
      id: '550e8400-e29b-41d4-a716-446655440020',
      cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
      beneficioId: '550e8400-e29b-41d4-a716-446655440010',
      status: 'APROVADA',
      dataInicio: '2023-06-01T00:00:00.000Z',
      dataFim: '2024-05-31T23:59:59.999Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      cidadaoId: '550e8400-e29b-41d4-a716-446655440001',
      beneficioId: '550e8400-e29b-41d4-a716-446655440011',
      status: 'PENDENTE',
      dataInicio: null,
      dataFim: null,
    },
  ],

  solicitacaoAvaliada: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
    beneficioId: '550e8400-e29b-41d4-a716-446655440010',
    status: 'APROVADA',
    dataInicio: '2023-06-01T00:00:00.000Z',
    dataFim: '2024-05-31T23:59:59.999Z',
    valorConcedido: 500.0,
    observacoes: 'Solicitação aprovada após análise de documentação',
    atualizadoEm: '2023-05-20T14:30:10.456Z',
  },

  // Respostas específicas - Documento
  documentoEncontrado: {
    id: '550e8400-e29b-41d4-a716-446655440030',
    solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
    nome: 'Comprovante de Residência',
    tipo: 'COMPROVANTE_RESIDENCIA',
    url: 'https://storage.exemplo.com/documentos/comprovante_residencia.pdf',
    dataUpload: '2023-05-15T09:45:20.123Z',
    tamanhoBytes: 1024567,
    status: 'VALIDO',
    observacoes: 'Documento válido e dentro do prazo',
    criadoEm: '2023-05-15T09:45:20.123Z',
    atualizadoEm: '2023-05-15T09:45:20.123Z',
  },

  documentoCriado: {
    id: '550e8400-e29b-41d4-a716-446655440030',
    solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
    nome: 'Comprovante de Residência',
    tipo: 'COMPROVANTE_RESIDENCIA',
    url: 'https://storage.exemplo.com/documentos/comprovante_residencia.pdf',
    dataUpload: '2023-05-15T09:45:20.123Z',
    tamanhoBytes: 1024567,
    status: 'PENDENTE',
    criadoEm: '2023-05-15T09:45:20.123Z',
    atualizadoEm: '2023-05-15T09:45:20.123Z',
  },

  documentosListados: [
    {
      id: '550e8400-e29b-41d4-a716-446655440030',
      solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
      nome: 'Comprovante de Residência',
      tipo: 'COMPROVANTE_RESIDENCIA',
      url: 'https://storage.exemplo.com/documentos/comprovante_residencia.pdf',
      status: 'VALIDO',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440031',
      solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
      nome: 'Comprovante de Renda',
      tipo: 'COMPROVANTE_RENDA',
      url: 'https://storage.exemplo.com/documentos/comprovante_renda.pdf',
      status: 'PENDENTE',
    },
  ],

  // Respostas específicas - Usuário
  usuarioEncontrado: {
    id: '550e8400-e29b-41d4-a716-446655440040',
    nome: 'Ana Oliveira',
    email: 'ana.oliveira@exemplo.com',
    cargo: 'Analista de Benefícios',
    unidadeId: '550e8400-e29b-41d4-a716-446655440050',
    ativo: true,
    ultimoAcesso: '2023-05-20T10:15:30.123Z',
    criadoEm: '2023-01-10T08:30:15.456Z',
    atualizadoEm: '2023-05-20T10:15:30.123Z',
  },

  usuarioCriado: {
    id: '550e8400-e29b-41d4-a716-446655440040',
    nome: 'Ana Oliveira',
    email: 'ana.oliveira@exemplo.com',
    cargo: 'Analista de Benefícios',
    unidadeId: '550e8400-e29b-41d4-a716-446655440050',
    ativo: true,
    criadoEm: '2023-01-10T08:30:15.456Z',
    atualizadoEm: '2023-01-10T08:30:15.456Z',
  },

  usuariosListados: [
    {
      id: '550e8400-e29b-41d4-a716-446655440040',
      nome: 'Ana Oliveira',
      email: 'ana.oliveira@exemplo.com',
      cargo: 'Analista de Benefícios',
      unidadeId: '550e8400-e29b-41d4-a716-446655440050',
      ativo: true,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440041',
      nome: 'Carlos Pereira',
      email: 'carlos.pereira@exemplo.com',
      cargo: 'Coordenador',
      unidadeId: '550e8400-e29b-41d4-a716-446655440050',
      ativo: true,
    },
  ],

  // Respostas específicas - Unidade
  unidadeEncontrada: {
    id: '550e8400-e29b-41d4-a716-446655440050',
    nome: 'Centro de Atendimento Municipal',
    codigo: 'CAM-001',
    endereco: {
      logradouro: 'Avenida Principal',
      numero: '500',
      complemento: 'Bloco B',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
    },
    telefone: '(11) 3456-7890',
    email: 'cam@prefeitura.sp.gov.br',
    responsavelId: '550e8400-e29b-41d4-a716-446655440041',
    ativa: true,
    criadoEm: '2022-12-01T09:00:00.000Z',
    atualizadoEm: '2022-12-01T09:00:00.000Z',
  },

  unidadeCriada: {
    id: '550e8400-e29b-41d4-a716-446655440050',
    nome: 'Centro de Atendimento Municipal',
    codigo: 'CAM-001',
    endereco: {
      logradouro: 'Avenida Principal',
      numero: '500',
      complemento: 'Bloco B',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
    },
    telefone: '(11) 3456-7890',
    email: 'cam@prefeitura.sp.gov.br',
    responsavelId: '550e8400-e29b-41d4-a716-446655440041',
    ativa: true,
    criadoEm: '2022-12-01T09:00:00.000Z',
    atualizadoEm: '2022-12-01T09:00:00.000Z',
  },

  unidadesListadas: [
    {
      id: '550e8400-e29b-41d4-a716-446655440050',
      nome: 'Centro de Atendimento Municipal',
      codigo: 'CAM-001',
      cidade: 'São Paulo',
      estado: 'SP',
      ativa: true,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440051',
      nome: 'Posto de Atendimento Regional',
      codigo: 'PAR-002',
      cidade: 'São Paulo',
      estado: 'SP',
      ativa: true,
    },
  ],

  // Respostas específicas - Notificação
  notificacaoEncontrada: {
    id: '550e8400-e29b-41d4-a716-446655440060',
    tipo: 'EMAIL',
    destinatario: 'maria.silva@exemplo.com',
    assunto: 'Aprovação de Benefício',
    conteudo:
      'Prezada Maria da Silva, informamos que sua solicitação de Auxílio Moradia foi aprovada.',
    status: 'ENVIADA',
    dataEnvio: '2023-05-20T15:30:45.123Z',
    tentativas: 1,
    metadados: {
      solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
      cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
    },
    criadoEm: '2023-05-20T15:30:40.000Z',
    atualizadoEm: '2023-05-20T15:30:45.123Z',
  },

  notificacaoCriada: {
    id: '550e8400-e29b-41d4-a716-446655440060',
    tipo: 'EMAIL',
    destinatario: 'maria.silva@exemplo.com',
    assunto: 'Aprovação de Benefício',
    conteudo:
      'Prezada Maria da Silva, informamos que sua solicitação de Auxílio Moradia foi aprovada.',
    status: 'PENDENTE',
    metadados: {
      solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
      cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
    },
    criadoEm: '2023-05-20T15:30:40.000Z',
    atualizadoEm: '2023-05-20T15:30:40.000Z',
  },

  notificacoesListadas: [
    {
      id: '550e8400-e29b-41d4-a716-446655440060',
      tipo: 'EMAIL',
      destinatario: 'maria.silva@exemplo.com',
      assunto: 'Aprovação de Benefício',
      status: 'ENVIADA',
      dataEnvio: '2023-05-20T15:30:45.123Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440061',
      tipo: 'SMS',
      destinatario: '11987654321',
      assunto: 'Lembrete de Documentação',
      status: 'PENDENTE',
      dataEnvio: null,
    },
  ],

  // Respostas específicas - Ocorrência
  ocorrenciaEncontrada: {
    id: '550e8400-e29b-41d4-a716-446655440070',
    solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
    usuarioId: '550e8400-e29b-41d4-a716-446655440040',
    tipo: 'ALTERACAO_STATUS',
    descricao: 'Alteração de status da solicitação de PENDENTE para APROVADA',
    detalhes: {
      statusAnterior: 'PENDENTE',
      statusNovo: 'APROVADA',
      motivo: 'Documentação completa e aprovada',
    },
    criadoEm: '2023-05-20T14:30:10.456Z',
    atualizadoEm: '2023-05-20T14:30:10.456Z',
  },

  ocorrenciaCriada: {
    id: '550e8400-e29b-41d4-a716-446655440070',
    solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
    usuarioId: '550e8400-e29b-41d4-a716-446655440040',
    tipo: 'ALTERACAO_STATUS',
    descricao: 'Alteração de status da solicitação de PENDENTE para APROVADA',
    detalhes: {
      statusAnterior: 'PENDENTE',
      statusNovo: 'APROVADA',
      motivo: 'Documentação completa e aprovada',
    },
    criadoEm: '2023-05-20T14:30:10.456Z',
    atualizadoEm: '2023-05-20T14:30:10.456Z',
  },

  ocorrenciasListadas: [
    {
      id: '550e8400-e29b-41d4-a716-446655440070',
      solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
      usuarioId: '550e8400-e29b-41d4-a716-446655440040',
      tipo: 'ALTERACAO_STATUS',
      descricao: 'Alteração de status da solicitação de PENDENTE para APROVADA',
      criadoEm: '2023-05-20T14:30:10.456Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440071',
      solicitacaoId: '550e8400-e29b-41d4-a716-446655440020',
      usuarioId: '550e8400-e29b-41d4-a716-446655440040',
      tipo: 'OBSERVACAO',
      descricao: 'Adicionada observação à solicitação',
      criadoEm: '2023-05-18T11:20:30.789Z',
    },
  ],

  // Respostas específicas - Health Check
  healthCheck: {
    status: 'ok',
    versao: '1.0.0',
    ambiente: 'produção',
    banco: {
      status: 'conectado',
      latencia: '5ms',
    },
    servicos: {
      email: {
        status: 'operacional',
        ultimoTeste: '2023-05-21T08:00:00.000Z',
      },
      sms: {
        status: 'operacional',
        ultimoTeste: '2023-05-21T08:00:00.000Z',
      },
      armazenamento: {
        status: 'operacional',
        ultimoTeste: '2023-05-21T08:00:00.000Z',
      },
    },
    uptime: '5d 12h 30m 15s',
    timestamp: '2023-05-21T08:15:30.123Z',
  },

  // Respostas específicas - Métricas
  metricas: {
    solicitacoes: {
      total: 1250,
      pendentes: 320,
      aprovadas: 850,
      rejeitadas: 80,
    },
    beneficios: {
      total: 15,
      ativos: 12,
      inativos: 3,
    },
    cidadaos: {
      total: 980,
      comBeneficioAtivo: 720,
      semBeneficio: 260,
    },
    documentos: {
      total: 3750,
      pendentes: 420,
      validos: 3250,
      invalidos: 80,
    },
    tempoMedioAprovacao: '5.2 dias',
    taxaAprovacao: '85%',
    periodoReferencia: {
      inicio: '2023-01-01T00:00:00.000Z',
      fim: '2023-05-21T23:59:59.999Z',
    },
    timestamp: '2023-05-21T08:30:00.000Z',
  },
};
