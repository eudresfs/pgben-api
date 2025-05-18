import { EnderecoDto } from '../schemas/cidadao';

/**
 * Exemplos de requisições e respostas para o módulo de cidadãos
 */

// Exemplo de endereço
const enderecoExemplo: EnderecoDto = {
  cep: '59012345',
  logradouro: 'Rua Exemplo',
  numero: '123',
  complemento: 'Apto 101',
  bairro: 'Centro',
  cidade: 'Natal',
  uf: 'RN'
};

// Exemplo de criação de cidadão
export const createCidadaoRequest = {
  nome: 'João da Silva',
  nomeSocial: 'Joana',
  cpf: '12345678900',
  rg: '1234567',
  orgaoEmissor: 'SSP/RN',
  ufOrgaoEmissor: 'RN',
  dataNascimento: '1990-01-01',
  sexo: 'M',
  nomeMae: 'Maria da Silva',
  nomePai: 'José da Silva',
  estadoCivil: 'SOLTEIRO',
  grauInstrucao: 'ENSINO_MEDIO_COMPLETO',
  rendaFamiliar: 2000.5,
  numeroDependentes: 2,
  telefone1: '84999998888',
  telefone2: '84999997777',
  email: 'joao@exemplo.com',
  endereco: enderecoExemplo
};

// Exemplo de resposta de cidadão
export const cidadaoResponse = {
  id: '5f8d3b4e3b4f3b2d3c2e1d2f',
  ...createCidadaoRequest,
  createdAt: '2025-05-17T21:50:07.000Z',
  updatedAt: '2025-05-17T21:50:07.000Z'
};

// Exemplo de lista paginada de cidadãos
export const cidadaosPaginadosResponse = {
  data: [
    cidadaoResponse,
    {
      ...cidadaoResponse,
      id: '6f9e2c5d8b7a1f4e3c2a1b9d',
      nome: 'Maria Oliveira',
      cpf: '98765432100',
      email: 'maria@exemplo.com'
    }
  ],
  meta: {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1
  }
};

// Exemplo de busca de cidadão por CPF
export const buscaPorCpfResponse = cidadaoResponse;

// Exemplo de atualização de cidadão
export const updateCidadaoRequest = {
  id: '5f8d3b4e3b4f3b2d3c2e1d2f',
  ...createCidadaoRequest,
  nome: 'João da Silva Santos',
  rendaFamiliar: 2500.0
};

// Exemplo de resposta de sucesso
export const successResponse = {
  success: true,
  message: 'Operação realizada com sucesso',
  data: {
    id: '5f8d3b4e3b4f3b2d3c2e1d2f'
  }
};

// Exemplo de erro de validação
export const validationError = {
  statusCode: 400,
  message: 'Erro de validação',
  error: 'Bad Request',
  timestamp: '2025-05-17T21:50:07.000Z',
  path: '/api/cidadaos',
  errors: [
    {
      field: 'cpf',
      message: 'CPF inválido',
      validation: 'isCpf'
    },
    {
      field: 'email',
      message: 'Deve ser um email válido',
      validation: 'isEmail'
    }
  ]
};
