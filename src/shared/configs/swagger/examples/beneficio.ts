// Interfaces para os exemplos
export interface DocumentoExemplo {
  id: string;
  tipo: string;
  status: string;
  url: string;
  motivoReprovacao?: string;
}

export interface CriteriosElegibilidadeExemplo {
  idade_minima: number;
  idade_maxima: number;
  renda_maxima: number;
  tempo_minimo_residencia: number;
  outros_criterios: string[];
}

export interface BeneficioExemplo {
  id: string;
  nome: string;
  descricao: string;
  periodicidade: string;
  base_juridica: string;
  valor: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  criterios_elegibilidade: CriteriosElegibilidadeExemplo;
}

export interface SolicitacaoBeneficioExemplo {
  id: string;
  cidadaoId: string;
  tipoBeneficio: BeneficioExemplo;
  tipoBeneficioId: string;
  status: string;
  valorSolicitado: number;
  dataSolicitacao: string;
  dataAtualizacao: string;
  dataAprovacao?: string;
  dataReprovacao?: string;
  observacoes: string;
  documentos: DocumentoExemplo[];
  valorAprovado?: number;
  motivoReprovacao?: string;
}

interface MetaPaginacaoExemplo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface ListaPaginadaExemplo<T> {
  data: T[];
  meta: MetaPaginacaoExemplo;
}

interface HistoricoSolicitacaoExemplo {
  id: string;
  solicitacao_id: string;
  status_anterior: string;
  status_novo: string;
  justificativa: string;
  usuario_id: string;
  created_at: string;
}

export interface ErrorResponseExemplo {
  statusCode: number;
  message: string | string[];
  error: string;
  errors?: Array<{
    field: string;
    message: string;
    validation: string;
  }>;
}

// Dados de exemplo para cidadão
const dadosCidadao = {
  id: '5f8d3b4e3b4f3b2d3c2e1d2f',
  nome: 'João da Silva',
  cpf: '123.456.789-09',
  dataNascimento: '1985-05-15',
  email: 'joao.silva@example.com',
  telefone: '(11) 98765-4321',
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 101',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01001-000'
  }
};

// Exemplo de tipo de benefício
export const tipoBeneficioExemplo: BeneficioExemplo = {
  id: '5f8d3b4e3b4f3b2d3c2e1d2f',
  nome: 'Auxílio Emergencial',
  descricao: 'Auxílio financeiro temporário para famílias em situação de vulnerabilidade',
  periodicidade: 'MENSAL',
  base_juridica: 'Lei nº 13.982/2020',
  valor: 600.00,
  ativo: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  criterios_elegibilidade: {
    idade_minima: 18,
    idade_maxima: 65,
    renda_maxima: 3000.00,
    tempo_minimo_residencia: 12,
    outros_criterios: [
      'Não possuir imóvel próprio',
      'Não ser beneficiário de outro programa social'
    ]
  }
};

// Lista de tipos de benefícios
export const tiposBeneficioLista = [
  tipoBeneficioExemplo,
  {
    ...tipoBeneficioExemplo,
    id: '6f5e4d3c2b1a0f9e8d7c6b5a4',
    nome: 'Bolsa Família',
    descricao: 'Programa de transferência de renda para famílias em situação de pobreza'
  },
  {
    ...tipoBeneficioExemplo,
    id: '7e6d5c4b3a2910f8e7d6c5b4',
    nome: 'BPC - Benefício de Prestação Continuada',
    descricao: 'Garantia de um salário-mínimo mensal a idosos e pessoas com deficiência'
  }
];

// Request para criar um tipo de benefício
export const createTipoBeneficioRequest = {
  nome: 'Auxílio Moradia',
  descricao: 'Auxílio financeiro para famílias que perderam suas casas',
  periodicidade: 'MENSAL',
  base_juridica: 'Lei Municipal nº 4.567/2023',
  valor: 800.00,
  ativo: true,
  criterios_elegibilidade: {
    idade_minima: 18,
    idade_maxima: 999,
    renda_maxima: 2500.00,
    tempo_minimo_residencia: 24,
    outros_criterios: ['Ter perdido a moradia em desastre natural']
  }
};

// Request para atualizar um tipo de benefício
export const updateTipoBeneficioRequest = {
  id: tipoBeneficioExemplo.id,
  nome: 'Auxílio Emergencial - Atualizado',
  descricao: 'Auxílio financeiro temporário para famílias em situação de vulnerabilidade - Revisado',
  valor: 700.00,
  ativo: true
};

// Exemplo de solicitação de benefício
export const solicitacaoBeneficioExemplo: SolicitacaoBeneficioExemplo = {
  id: '9a8b7c6d5e4f3a2b1c0d9e8f',
  cidadaoId: dadosCidadao.id,
  tipoBeneficio: tipoBeneficioExemplo,
  tipoBeneficioId: tipoBeneficioExemplo.id,
  status: 'EM_ANALISE',
  valorSolicitado: tipoBeneficioExemplo.valor,
  dataSolicitacao: '2025-05-17T10:30:00.000Z',
  dataAtualizacao: '2025-05-17T10:30:00.000Z',
  observacoes: 'Solicito o benefício em caráter emergencial',
  documentos: [
    {
      id: 'doc1',
      tipo: 'CPF',
      status: 'APROVADO',
      url: 'https://storage.example.com/documents/cpf_12345678909.pdf'
    },
    {
      id: 'doc2',
      tipo: 'COMPROVANTE_ENDERECO',
      status: 'EM_ANALISE',
      url: 'https://storage.example.com/documents/endereco_123.pdf'
    }
  ]
};

// Exemplo de requisição para criar uma solicitação
export const createSolicitacaoBeneficioRequest = {
  cidadaoId: dadosCidadao.id,
  tipoBeneficioId: tipoBeneficioExemplo.id,
  documentos: [
    {
      tipo: 'CPF',
      url: 'https://storage.example.com/documents/cpf_12345678909.pdf'
    },
    {
      tipo: 'COMPROVANTE_ENDERECO',
      url: 'https://storage.example.com/documents/endereco_123.pdf'
    }
  ],
  observacoes: 'Solicito o benefício em caráter emergencial'
};

// Exemplo de requisição para atualizar status da solicitação
export const updateStatusSolicitacaoRequest = {
  status: 'APROVADA',
  valorAprovado: 600.00,
  observacoes: 'Todos os documentos verificados e aprovados',
  documentosAprovados: ['doc1', 'doc2']
};

// Exemplo de lista paginada de solicitações
export const listaSolicitacoesResponse: ListaPaginadaExemplo<SolicitacaoBeneficioExemplo> = {
  data: [
    {
      ...solicitacaoBeneficioExemplo,
      id: '3c4d5e6f7g8h9i0j1k2l3m',
      status: 'APROVADA',
      valorAprovado: tipoBeneficioExemplo.valor,
      dataAprovacao: '2025-05-18T14:30:00.000Z',
      observacoes: 'Benefício aprovado e em processo de pagamento',
      dataAtualizacao: '2025-05-18T14:30:00.000Z'
    },
    solicitacaoBeneficioExemplo
  ],
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

// Exemplo de histórico de solicitação
export const historicoSolicitacaoResponse: HistoricoSolicitacaoExemplo[] = [
  {
    id: '1a2b3c4d5e6f7g8h9i0j1k',
    solicitacao_id: solicitacaoBeneficioExemplo.id,
    status_anterior: 'EM_ANALISE',
    status_novo: 'APROVADA',
    justificativa: 'Documentação aprovada e critérios atendidos',
    usuario_id: 'usuario_123',
    created_at: '2025-05-18T14:30:00.000Z'
  },
  {
    id: '2b3c4d5e6f7g8h9i0j1k2l',
    solicitacao_id: solicitacaoBeneficioExemplo.id,
    status_anterior: 'CRIADA',
    status_novo: 'EM_ANALISE',
    justificativa: 'Documentação recebida e em análise',
    usuario_id: 'sistema',
    created_at: '2025-05-17T10:30:00.000Z'
  }
];

// Exemplo de lista paginada de benefícios
export const listaPaginadaBeneficiosResponse: ListaPaginadaExemplo<BeneficioExemplo> = {
  data: [
    tipoBeneficioExemplo,
    {
      ...tipoBeneficioExemplo,
      id: '6f5e4d3c2b1a0f9e8d7c6b5a4',
      nome: 'Bolsa Família',
      descricao: 'Programa de transferência de renda para famílias em situação de pobreza',
      valor: 600.00,
      periodicidade: 'MENSAL',
      base_juridica: 'Lei nº 10.836/2004'
    },
    {
      ...tipoBeneficioExemplo,
      id: '7e6d5c4b3a2910f8e7d6c5b4',
      nome: 'BPC - Benefício de Prestação Continuada',
      descricao: 'Garantia de um salário-mínimo mensal a idosos e pessoas com deficiência',
      valor: 1412.00,
      periodicidade: 'MENSAL',
      base_juridica: 'Lei Orgânica da Assistência Social (LOAS)'
    }
  ],
  meta: {
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

// Exemplos de respostas de erro

// Erro de validação
export const erroValidacaoResponse: ErrorResponseExemplo = {
  statusCode: 400,
  message: [
    'nome deve ser uma string',
    'descricao não pode estar vazia',
    'valor deve ser um número positivo'
  ],
  error: 'Bad Request'
};

// Erro de recurso não encontrado
export const naoEncontradoResponse: ErrorResponseExemplo = {
  statusCode: 404,
  message: 'Recurso não encontrado',
  error: 'Not Found'
};

// Erro de conflito
export const conflitoResponse: ErrorResponseExemplo = {
  statusCode: 409,
  message: 'Já existe um registro com estes dados',
  error: 'Conflict'
};

// Erro interno do servidor
export const erroInternoResponse: ErrorResponseExemplo = {
  statusCode: 500,
  message: 'Erro interno do servidor',
  error: 'Internal Server Error'
};
