/**
 * Exemplos de payloads para documentação Swagger
 *
 * Este arquivo contém exemplos de payloads para as requisições da API,
 * utilizados na documentação do Swagger.
 */

// Enumeração para status de solicitação (temporária para resolver o erro de importação)
enum SolicitacaoStatus {
  EM_ANALISE = 'EM_ANALISE',
  APROVADA = 'APROVADA',
  REPROVADA = 'REPROVADA',
  CANCELADA = 'CANCELADA',
  CONCLUIDA = 'CONCLUIDA'
}

// Payload para criação de solicitação
export const criarSolicitacaoPayload = {
  cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
  tipoBeneficioId: '660e8400-e29b-41d4-a716-446655440001',
  documentos: [
    {
      tipo: 'CPF',
      url: 'https://storage.pgben.com.br/documentos/550e8400/CPF.pdf',
    },
    {
      tipo: 'COMPROVANTE_ENDERECO',
      url: 'https://storage.pgben.com.br/documentos/550e8400/ENDERECO.pdf',
    },
  ],
  observacoes: 'Necessidade urgente devido a situação de vulnerabilidade',
};

// Resposta para criação de solicitação
export const criarSolicitacaoResponse = {
  id: '770e8400-e29b-41d4-a716-446655440000',
  numeroProtocolo: 'SOL-2023-00042',
  status: SolicitacaoStatus.EM_ANALISE,
  dataSolicitacao: new Date().toISOString(),
  cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
  tipoBeneficioId: '660e8400-e29b-41d4-a716-446655440001',
  documentos: [
    {
      id: '880e8400-e29b-41d4-a716-446655440001',
      tipo: 'CPF',
      status: 'PENDENTE',
      url: 'https://storage.pgben.com.br/documentos/550e8400/CPF.pdf',
    },
    {
      id: '880e8400-e29b-41d4-a716-446655440002',
      tipo: 'COMPROVANTE_ENDERECO',
      status: 'PENDENTE',
      url: 'https://storage.pgben.com.br/documentos/550e8400/ENDERECO.pdf',
    },
  ],
  observacoes: 'Necessidade urgente devido a situação de vulnerabilidade',
};

// Payload para avaliação de solicitação
export const avaliarSolicitacaoPayload = {
  status: SolicitacaoStatus.APROVADA,
  valorAprovado: 1200.0,
  observacoes: 'Solicitação aprovada conforme análise dos documentos',
  documentosAprovados: ['880e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002'],
};

// Resposta para avaliação de solicitação
export const avaliarSolicitacaoResponse = {
  id: '770e8400-e29b-41d4-a716-446655440000',
  numeroProtocolo: 'SOL-2023-00042',
  status: SolicitacaoStatus.APROVADA,
  dataSolicitacao: '2023-05-18T10:30:00.000Z',
  dataAtualizacao: new Date().toISOString(),
  dataAprovacao: new Date().toISOString(),
  cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
  tipoBeneficioId: '660e8400-e29b-41d4-a716-446655440001',
  valorSolicitado: 1500.0,
  valorAprovado: 1200.0,
  observacoes: 'Solicitação aprovada conforme análise dos documentos',
  documentos: [
    {
      id: '880e8400-e29b-41d4-a716-446655440001',
      tipo: 'CPF',
      status: 'APROVADO',
      url: 'https://storage.pgben.com.br/documentos/550e8400/CPF.pdf',
    },
    {
      id: '880e8400-e29b-41d4-a716-446655440002',
      tipo: 'COMPROVANTE_ENDERECO',
      status: 'APROVADO',
      url: 'https://storage.pgben.com.br/documentos/550e8400/ENDERECO.pdf',
    },
  ],
};

// Exemplo de payload para login
export const loginPayload = {
  email: 'usuario@semtas.gov.br',
  senha: 'senha123',
};

// Exemplo de response para login
export const loginResponse = {
  accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiresIn: 3600,
  usuario: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João Silva',
    email: 'joao.silva@semtas.gov.br',
    cargo: 'tecnico_semtas',
    unidade: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'CRAS Centro',
    },
  },
};

// Exemplo de payload para criação de cidadão
export const criarCidadaoPayload = {
  nome: 'João da Silva',
  cpf: '123.456.789-09',
  data_nascimento: '1985-05-15',
  email: 'joao.silva@example.com',
  telefone: '(11) 98765-4321',
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 101',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01001-000',
  },
};

// Exemplo de response para criação de cidadão
export const criarCidadaoResponse = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'João da Silva',
  cpf: '123.456.789-09',
  data_nascimento: '1985-05-15',
  email: 'joao.silva@example.com',
  telefone: '(11) 98765-4321',
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 101',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01001-000',
  },
  data_cadastro: '2023-01-15T14:30:00Z',
  ultima_atualizacao: '2023-01-15T14:30:00Z',
};

// Exemplo de payload para criação de pendência
export const criarPendenciaPayload = {
  tipo: 'documento',
  descricao: 'Apresentar documento de identidade legível',
  data_limite: '2023-01-28T14:30:00Z',
};

// Exemplo de response para criação de pendência
export const criarPendenciaResponse = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
  tipo: 'documento',
  descricao: 'Apresentar documento de identidade legível',
  status: 'aberta',
  data_criacao: '2023-01-21T14:30:00Z',
  data_limite: '2023-01-28T14:30:00Z',
  data_resolucao: null,
  usuario_criacao: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João Oliveira',
  },
  usuario_resolucao: null,
};
