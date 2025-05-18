/**
 * Exemplos para documentação Swagger
 *
 * Este arquivo contém exemplos de objetos que podem ser usados na documentação
 * do Swagger para ilustrar o formato das requisições e respostas da API.
 */

// Exemplo de papel do cidadão
export const papelCidadaoExemplo = {
  id: 'b1e6e8cc-0e4f-4c30-9c5d-123456789abc',
  tipo_papel: 'BENEFICIARIO',
  metadados: {
    documento: '123456789',
    validade: '2025-12-31',
  },
  cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
  criadoEm: '2024-05-01T10:00:00Z',
  atualizadoEm: '2024-05-10T15:00:00Z',
};

// Exemplo de cidadão
export const cidadaoExemplo = {
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
  papeis: [
    {
      id: 'b1e6e8cc-0e4f-4c30-9c5d-123456789abc',
      tipo_papel: 'BENEFICIARIO',
      metadados: {
        documento: '123456789',
        validade: '2025-12-31',
      },
      cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
      criadoEm: '2024-05-01T10:00:00Z',
      atualizadoEm: '2024-05-10T15:00:00Z',
    },
    {
      id: 'a2e6e8cc-0e4f-4c30-9c5d-987654321abc',
      tipo_papel: 'REQUERENTE',
      metadados: {
        processo: 'REQ-2024-0001',
      },
      cidadaoId: '550e8400-e29b-41d4-a716-446655440000',
      criadoEm: '2024-05-02T10:00:00Z',
      atualizadoEm: '2024-05-10T15:00:00Z',
    },
  ],
};

// Exemplo de tipo de benefício
export const tipoBeneficioExemplo = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'Auxílio Funeral',
  descricao: 'Benefício eventual para auxílio com despesas funerárias',
  valor_referencia: 1500.0,
  limite_concessoes_ano: 1,
  intervalo_concessoes_dias: null,
  documentos_obrigatorios: true,
  ativo: true,
  requisitos: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Certidão de Óbito',
      descricao: 'Documento oficial que comprova o falecimento',
      obrigatorio: true,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Comprovante de Residência',
      descricao: 'Documento que comprova residência no município',
      obrigatorio: true,
    },
  ],
  fluxo: {
    descricao: 'Fluxo padrão para aprovação de benefícios eventuais',
    etapas: [
      {
        ordem: 1,
        nome: 'Análise Técnica',
        descricao:
          'Análise técnica da documentação e critérios de elegibilidade',
        tipo_aprovador: 'tecnico',
        prazo_dias: 2,
      },
      {
        ordem: 2,
        nome: 'Aprovação da Coordenação',
        descricao: 'Aprovação pela coordenação da unidade',
        tipo_aprovador: 'coordenador_cras',
        prazo_dias: 1,
      },
    ],
  },
  data_criacao: '2023-01-10T10:00:00Z',
  ultima_atualizacao: '2023-01-10T10:00:00Z',
};

// Exemplo de solicitação de benefício
export const solicitacaoExemplo = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  numero_protocolo: 'SOL-2023-00001',
  status: 'em_analise',
  data_solicitacao: '2023-01-20T09:15:00Z',
  data_atualizacao: '2023-01-21T14:30:00Z',
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
  documentos: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Certidão de Óbito',
      arquivo: 'certidao_obito.pdf',
      data_upload: '2023-01-20T09:20:00Z',
      status: 'aprovado',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Comprovante de Residência',
      arquivo: 'comprovante_residencia.pdf',
      data_upload: '2023-01-20T09:25:00Z',
      status: 'em_analise',
    },
  ],
  pendencias: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: 'documento',
      descricao: 'Apresentar documento de identidade legível',
      status: 'aberta',
      data_criacao: '2023-01-21T14:30:00Z',
      data_limite: '2023-01-28T14:30:00Z',
    },
  ],
  historico: [
    {
      data: '2023-01-20T09:15:00Z',
      status: 'aberta',
      etapa: 'Recebimento',
      responsavel: 'João Oliveira',
      observacao: 'Solicitação recebida e registrada no sistema.',
    },
    {
      data: '2023-01-21T14:30:00Z',
      status: 'em_analise',
      etapa: 'Análise Técnica',
      responsavel: 'João Oliveira',
      observacao: 'Iniciada análise técnica da documentação.',
    },
  ],
};

// Exemplo de usuário
export const usuarioExemplo = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  nome: 'João Oliveira',
  email: 'joao.oliveira@semtas.gov.br',
  matricula: '12345',
  role: 'tecnico_semtas',
  ativo: true,
  unidade: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'CRAS Centro',
  },
  data_criacao: '2022-12-01T08:00:00Z',
  ultimo_acesso: '2023-01-21T08:30:00Z',
};
