/**
 * Guias de uso da API
 * 
 * Este arquivo contém guias detalhados para os principais
 * fluxos de uso da API, incluindo exemplos de requisições
 * e respostas para cada etapa.
 */

export const guiaSolicitacaoBeneficio = `
<h2>Guia: Fluxo de Solicitação de Benefício</h2>

<h3>1. Autenticação</h3>
<p>Primeiro, obtenha um token de acesso:</p>
<pre>
POST /auth/login
Content-Type: application/json

{
  "cpf": "12345678900",
  "senha": "Senha@123"
}
</pre>

<p>Resposta:</p>
<pre>
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
</pre>

<h3>2. Verificar se o cidadão existe</h3>
<p>Verifique se o cidadão já está cadastrado:</p>
<pre>
GET /cidadaos/cpf/12345678900
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>3. Se não existir, cadastre o cidadão</h3>
<pre>
POST /cidadaos
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "nome": "João da Silva",
  "cpf": "12345678900",
  "dataNascimento": "1980-01-01",
  "telefone": "(84) 98765-4321",
  "email": "joao.silva@exemplo.com",
  "endereco": {
    "logradouro": "Avenida Senador Salgado Filho",
    "numero": "1000",
    "complemento": "Bloco A, Apto 101",
    "bairro": "Lagoa Nova",
    "cidade": "Natal",
    "estado": "RN",
    "cep": "59000-000"
  }
}
</pre>

<h3>4. Listar tipos de benefícios disponíveis</h3>
<pre>
GET /beneficios/tipos
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>5. Criar solicitação de benefício</h3>
<pre>
POST /solicitacoes
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "cidadaoId": "8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf",
  "tipoBeneficioId": "7b22e8f5-9d31-4e2c-b8a4-5d9c7f3a8e2d",
  "observacoes": "Solicito o benefício em caráter emergencial"
}
</pre>

<h3>6. Anexar documentos necessários</h3>
<pre>
POST /documentos
Content-Type: multipart/form-data
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

solicitacaoId: 8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf
tipo: IDENTIDADE
arquivo: [arquivo binário]
</pre>

<h3>7. Acompanhar status da solicitação</h3>
<pre>
GET /solicitacoes/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>
`;

export const guiaAnaliseSolicitacao = `
<h2>Guia: Fluxo de Análise de Solicitação</h2>

<h3>1. Listar solicitações pendentes</h3>
<pre>
GET /solicitacoes?status=EM_ANALISE
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>2. Obter detalhes da solicitação</h3>
<pre>
GET /solicitacoes/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>3. Visualizar documentos anexados</h3>
<pre>
GET /documentos?solicitacaoId=8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>4. Aprovar ou reprovar solicitação</h3>
<pre>
PATCH /solicitacoes/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf/status
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "APROVADA",
  "observacoes": "Solicitação aprovada conforme análise técnica"
}
</pre>
`;

export const guiaGestaoDocumentos = `
<h2>Guia: Gestão de Documentos</h2>

<h3>1. Upload de documento</h3>
<pre>
POST /documentos
Content-Type: multipart/form-data
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

solicitacaoId: 8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf
tipo: IDENTIDADE
arquivo: [arquivo binário]
</pre>

<h3>2. Listar documentos de uma solicitação</h3>
<pre>
GET /documentos?solicitacaoId=8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>3. Download de documento</h3>
<pre>
GET /documentos/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf/download
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
</pre>

<h3>4. Validar documento</h3>
<pre>
PATCH /documentos/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf/validar
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "APROVADO"
}
</pre>

<h3>5. Rejeitar documento</h3>
<pre>
PATCH /documentos/8a11f7e6-8c36-4f13-96e5-6c92b2c5f5bf/validar
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "REJEITADO",
  "motivoRejeicao": "Documento ilegível"
}
</pre>
`;
