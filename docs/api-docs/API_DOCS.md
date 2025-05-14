# Documentação da API PGBEN

## Visão Geral

A API PGBEN (Programa de Gestão de Benefícios Eventuais) fornece endpoints para gerenciar o processo completo de solicitação, análise e concessão de benefícios eventuais da SEMTAS.

## Acessando a Documentação Swagger

A documentação completa da API está disponível através do Swagger UI. Para acessá-la:

1. Inicie o servidor da aplicação:
   ```bash
   npm run start:dev
   ```

2. Acesse o Swagger UI no navegador:
   ```
   http://localhost:3000/api-docs
   ```

## Estrutura da API

A API está organizada nos seguintes módulos:

- **Autenticação**: Login, refresh token e gerenciamento de senhas
- **Usuários**: Gerenciamento de usuários do sistema
- **Cidadãos**: Cadastro e gerenciamento de cidadãos/beneficiários
- **Unidades**: Gerenciamento de unidades e setores
- **Benefícios**: Configuração de tipos de benefícios e requisitos
- **Solicitações**: Gerenciamento do fluxo de solicitações de benefícios
- **Documentos**: Upload e gerenciamento de documentos
- **Ocorrências**: Registro de ocorrências relacionadas às solicitações
- **Notificações**: Sistema de notificações para usuários

## Autenticação

A API utiliza autenticação JWT (JSON Web Token). Para acessar endpoints protegidos, é necessário obter um token através do endpoint de login e incluí-lo no cabeçalho das requisições.

### Exemplo de Login

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@semtas.gov.br",
  "senha": "senha123"
}
```

### Utilizando o Token

Após obter o token, inclua-o no cabeçalho das requisições:

```
GET /api/v1/cidadao
Authorization: Bearer seu_token_jwt
```

## Exemplos de Uso

### Cadastro de Cidadão

```
POST /api/v1/cidadao
Content-Type: application/json
Authorization: Bearer seu_token_jwt

{
  "nome": "Maria da Silva",
  "cpf": "123.456.789-00",
  "data_nascimento": "1985-05-10",
  "sexo": "feminino",
  "endereco": {
    "logradouro": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "Natal",
    "estado": "RN",
    "cep": "59000-000"
  },
  "telefone": "(84) 98765-4321"
}
```

### Criação de Solicitação de Benefício

```
POST /api/v1/solicitacao
Content-Type: application/json
Authorization: Bearer seu_token_jwt

{
  "beneficiario_id": "550e8400-e29b-41d4-a716-446655440000",
  "tipo_beneficio_id": "550e8400-e29b-41d4-a716-446655440000",
  "dados_beneficio": {
    "valor_solicitado": 1500.00,
    "justificativa": "Falecimento de familiar próximo, sem condições financeiras para arcar com as despesas funerárias."
  }
}
```

## Códigos de Status HTTP

A API utiliza os seguintes códigos de status HTTP:

- **200 OK**: Requisição bem-sucedida
- **201 Created**: Recurso criado com sucesso
- **400 Bad Request**: Erro de validação ou dados inválidos
- **401 Unauthorized**: Autenticação necessária ou inválida
- **403 Forbidden**: Sem permissão para acessar o recurso
- **404 Not Found**: Recurso não encontrado
- **409 Conflict**: Conflito com o estado atual do recurso
- **500 Internal Server Error**: Erro interno do servidor

## Suporte

Para suporte ou dúvidas sobre a API, entre em contato com a equipe de desenvolvimento da SEMTAS.
