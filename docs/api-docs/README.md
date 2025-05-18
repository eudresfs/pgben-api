# Documentação da API PGBen

Bem-vindo à documentação da API do PGBen. Este guia fornece todas as informações necessárias para integrar com nossa plataforma de forma eficiente e segura.

## 📚 Visão Geral

A API PGBen permite a integração com o sistema de gestão de benefícios, fornecendo endpoints para:

- Gerenciamento de cidadãos e beneficiários
- Solicitação e acompanhamento de benefícios
- Upload e validação de documentos
- Geração de relatórios e métricas
- Automação de processos administrativos

## 🔐 Autenticação

A API utiliza autenticação baseada em JWT (JSON Web Tokens).

### Obtendo um Token

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "seu.email@exemplo.com",
  "senha": "suaSenha123"
}
```

### Utilizando o Token

Inclua o token no header `Authorization` de todas as requisições:

```
Authorization: Bearer seu-token-jwt-aqui
```

📖 [Documentação detalhada de autenticação e erros](./autenticacao-erros.md)

## 🔄 Versionamento

A API segue versionamento semântico através da URL:

```
/v1/recurso
```

- **v1**: Versão principal da API
- **recurso**: Recurso específico sendo acessado

📖 [Saiba mais sobre nossa estratégia de versionamento](./estrategia-versionamento.md)

## 🛠️ Endpoints Principais

### Cidadãos
- `GET /v1/cidadao` - Lista cidadãos
- `POST /v1/cidadao` - Cria um novo cidadão
- `GET /v1/cidadao/{id}` - Obtém detalhes de um cidadão

### Benefícios
- `GET /v1/beneficio` - Lista benefícios disponíveis
- `POST /v1/solicitacao` - Cria nova solicitação
- `GET /v1/solicitacao/{id}` - Acompanha uma solicitação

### Documentos
- `POST /v1/documento/upload` - Faz upload de documento
- `GET /v1/documento/{id}` - Baixa um documento

### Relatórios
- `POST /v1/relatorios/beneficios-concedidos` - Gera relatório
- `GET /v1/relatorios/download/{id}` - Baixa relatório

## 📊 Exemplos de Uso

### 1. Cadastrar um novo cidadão

```http
POST /v1/cidadao
Authorization: Bearer seu-token
Content-Type: application/json

{
  "nome": "Maria Silva",
  "cpf": "123.456.789-00",
  "dataNascimento": "1985-07-15",
  "email": "maria@exemplo.com",
  "telefone": "11999998888"
}
```

### 2. Criar uma solicitação de benefício

```http
POST /v1/solicitacao
Authorization: Bearer seu-token
Content-Type: application/json

{
  "cidadaoId": "550e8400-e29b-41d4-a716-446655440000",
  "beneficioId": "660e8400-e29b-41d4-a716-446655441111",
  "unidadeId": "770e8400-e29b-41d4-a716-446655442222",
  "observacoes": "Solicitação de auxílio emergencial"
}
```

## 🚦 Códigos de Status HTTP

A API utiliza os seguintes códigos de status:

- `200 OK` - Requisição bem-sucedida
- `201 Created` - Recurso criado com sucesso
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Autenticação necessária
- `403 Forbidden` - Permissão negada
- `404 Not Found` - Recurso não encontrado
- `429 Too Many Requests` - Limite de requisições excedido
- `500 Internal Server Error` - Erro no servidor

## ⚠️ Tratamento de Erros

Todas as respostas de erro seguem o formato:

```json
{
  "statusCode": 400,
  "timestamp": "2025-05-17T21:45:23.000Z",
  "path": "/v1/recurso",
  "message": "Mensagem de erro descritiva",
  "errorCode": "CODIGO_ERRO"
}
```

📖 [Documentação detalhada de erros](./autenticacao-erros.md#padrão-de-respostas-de-erro)

## 📈 Limites e Cotas

- **Limite de taxa**: 100 requisições por minuto por IP
- Tamanho máximo de upload: 10MB por arquivo
- Tempo máximo de requisição: 30 segundos

## 🔗 Links Úteis

- [Estratégia de Versionamento](./estrategia-versionamento.md)
- [Autenticação e Erros](./autenticacao-erros.md)
- [Fluxos de Trabalho Comuns](./fluxos-trabalho.md)
- [Changelog](./CHANGELOG.md)

## 🤝 Suporte

Em caso de dúvidas ou problemas, entre em contato:

- **E-mail**: suporte@pgben.com.br
- **Horário de atendimento**: Segunda a Sexta, 9h às 18h

---

**Última atualização**: 17/05/2025  
**Versão da API**: 1.0.0
