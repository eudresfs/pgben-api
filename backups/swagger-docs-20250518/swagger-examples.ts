/**
 * Exemplos de payloads e respostas para documentação da API
 * 
 * Este arquivo contém exemplos estruturados para os principais endpoints da API,
 * melhorando a documentação e facilitando o entendimento do formato esperado.
 */

/**
 * Exemplos de payloads para requisições
 */
export const exemplosPayload = {
  // Exemplo de login
  login: {
    summary: 'Credenciais de autenticação',
    value: {
      email: 'usuario@exemplo.com',
      senha: 'senha123'
    }
  },
  
  // Exemplo de cadastro de cidadão
  cadastroCidadao: {
    summary: 'Dados para cadastro de cidadão',
    value: {
      nome: 'João da Silva',
      cpf: '123.456.789-00',
      dataNascimento: '1990-01-01',
      email: 'joao@exemplo.com',
      telefone: '(84) 99999-9999',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '123',
        complemento: 'Apto 101',
        bairro: 'Centro',
        cidade: 'Natal',
        uf: 'RN',
        cep: '59000-000'
      }
    }
  },
  
  // Exemplo de solicitação de benefício
  solicitacaoBeneficio: {
    summary: 'Dados para solicitação de benefício',
    value: {
      idTipoBeneficio: '5f8d3b4e3b4f3b2d3c2e1d2f',
      idCidadao: '5f8d3b4e3b4f3b2d3c2e1d30',
      documentos: [
        {
          tipo: 'CPF',
          numero: '123.456.789-00',
          orgaoEmissor: 'SSP/RN',
          dataEmissao: '2010-01-01'
        }
      ],
      rendaFamiliar: 1500.00,
      membrosFamilia: 3,
      observacoes: 'Situação de vulnerabilidade social'
    }
  }
};

/**
 * Exemplos de respostas da API
 */
export const exemplosResponse = {
  // Resposta de login
  loginSucesso: {
    summary: 'Autenticação bem-sucedida',
    value: {
      accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 3600,
      tokenType: 'Bearer',
      usuario: {
        id: '5f8d3b4e3b4f3b2d3c2e1d30',
        nome: 'João da Silva',
        email: 'joao@exemplo.com',
        perfis: ['CIDADAO']
      }
    }
  },
  
  // Resposta de erro de validação
  erroValidacao: {
    summary: 'Erro de validação',
    value: {
      statusCode: 400,
      message: 'Erro de validação',
      errors: [
        {
          property: 'email',
          constraints: {
            isEmail: 'email deve ser um endereço de email válido',
            isNotEmpty: 'email não pode estar vazio'
          }
        },
        {
          property: 'senha',
          constraints: {
            minLength: 'senha deve ter pelo menos 6 caracteres',
            isNotEmpty: 'senha não pode estar vazia'
          }
        }
      ]
    }
  },
  
  // Resposta de erro não autorizado
  naoAutorizado: {
    summary: 'Não autorizado',
    value: {
      statusCode: 401,
      message: 'Não autorizado',
      error: 'Unauthorized'
    }
  },
  
  // Resposta de recurso não encontrado
  naoEncontrado: {
    summary: 'Recurso não encontrado',
    value: {
      statusCode: 404,
      message: 'Recurso não encontrado',
      error: 'Not Found'
    }
  }
};

/**
 * Esquemas reutilizáveis
 */
export const schemas = {
  // Esquema de endereço
  Endereco: {
    type: 'object',
    properties: {
      logradouro: { type: 'string', example: 'Rua Exemplo' },
      numero: { type: 'string', example: '123' },
      complemento: { type: 'string', example: 'Apto 101', nullable: true },
      bairro: { type: 'string', example: 'Centro' },
      cidade: { type: 'string', example: 'Natal' },
      uf: { type: 'string', example: 'RN' },
      cep: { type: 'string', example: '59000-000' }
    }
  },
  
  // Esquema de documento
  Documento: {
    type: 'object',
    properties: {
      tipo: { type: 'string', example: 'CPF' },
      numero: { type: 'string', example: '123.456.789-00' },
      orgaoEmissor: { type: 'string', example: 'SSP/RN' },
      dataEmissao: { type: 'string', format: 'date', example: '2010-01-01' }
    }
  }
};
