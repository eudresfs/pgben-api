/**
 * Exemplos de payloads para documentação Swagger
 *
 * Este arquivo contém exemplos de payloads para as requisições da API,
 * utilizados na documentação do Swagger.
 */

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
  nome: 'Maria da Silva',
  cpf: '123.456.789-00',
  rg: '1234567',
  data_nascimento: '1985-05-10',
  sexo: 'feminino',
  nome_social: null,
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 101',
    bairro: 'Centro',
    cidade: 'Natal',
    estado: 'RN',
    cep: '59000-000',
  },
  telefone: '(84) 98765-4321',
  email: 'maria.silva@email.com',
  nis: '12345678901',
  escolaridade: 'Medio_Completo',
  renda: 1200.5,
};

// Exemplo de response para criação de cidadão
export const criarCidadaoResponse = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Maria da Silva',
  cpf: '123.456.789-00',
  rg: '1234567',
  data_nascimento: '1985-05-10',
  sexo: 'feminino',
  nome_social: null,
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 101',
    bairro: 'Centro',
    cidade: 'Natal',
    estado: 'RN',
    cep: '59000-000',
  },
  telefone: '(84) 98765-4321',
  email: 'maria.silva@email.com',
  nis: '12345678901',
  escolaridade: 'Medio_Completo',
  renda: 1200.5,
  unidade: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'CRAS Centro',
  },
  data_cadastro: '2023-01-15T14:30:00Z',
  ultima_atualizacao: '2023-01-15T14:30:00Z',
};

// Exemplo de payload para criação de solicitação
export const criarSolicitacaoPayload = {
  beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
  solicitante_id: '550e8400-e29b-41d4-a716-446655440000',
  tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440000',
  dados_beneficio: {
    valor_solicitado: 1500.0,
    justificativa:
      'Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias.',
    observacoes: 'Família em situação de vulnerabilidade social.',
  },
};

// Exemplo de response para criação de solicitação
export const criarSolicitacaoResponse = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  numero_protocolo: 'SOL-2023-00001',
  status: 'aberta',
  data_solicitacao: '2023-01-20T09:15:00Z',
  data_atualizacao: '2023-01-20T09:15:00Z',
  beneficiario: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
  },
  solicitante: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
  },
  tipo_beneficio: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Auxílio Funeral',
  },
  unidade: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'CRAS Centro',
  },
  tecnico_responsavel: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'João Oliveira',
  },
  dados_beneficio: {
    valor_solicitado: 1500.0,
    valor_aprovado: null,
    justificativa:
      'Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias.',
    observacoes: 'Família em situação de vulnerabilidade social.',
  },
  etapa_atual: {
    ordem: 1,
    nome: 'Análise Técnica',
    responsavel: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'João Oliveira',
    },
    data_inicio: '2023-01-20T09:15:00Z',
    prazo: '2023-01-22T09:15:00Z',
  },
};

// Exemplo de payload para avaliação de solicitação
export const avaliarSolicitacaoPayload = {
  parecer: 'Aprovado',
  observacoes:
    'Documentação completa e situação de vulnerabilidade confirmada.',
  valor_aprovado: 1500.0,
};

// Exemplo de response para avaliação de solicitação
export const avaliarSolicitacaoResponse = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  numero_protocolo: 'SOL-2023-00001',
  status: 'aprovada',
  data_solicitacao: '2023-01-20T09:15:00Z',
  data_atualizacao: '2023-01-21T14:30:00Z',
  beneficiario: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
  },
  tipo_beneficio: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Auxílio Funeral',
  },
  dados_beneficio: {
    valor_solicitado: 1500.0,
    valor_aprovado: 1500.0,
    justificativa:
      'Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias.',
    observacoes: 'Família em situação de vulnerabilidade social.',
  },
  etapa_atual: {
    ordem: 2,
    nome: 'Aprovação da Coordenação',
    responsavel: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Ana Souza',
    },
    data_inicio: '2023-01-21T14:30:00Z',
    prazo: '2023-01-22T14:30:00Z',
  },
  parecer: 'Aprovado',
  observacoes_avaliacao:
    'Documentação completa e situação de vulnerabilidade confirmada.',
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
