# Guia de Implementação - Módulo de Integradores PGBen

## Visão Geral

Este documento fornece instruções detalhadas sobre como implementar e utilizar o Módulo de Integradores na aplicação PGBen. O módulo permite que sistemas externos se conectem de forma segura à API do PGBen usando tokens de longa duração com permissões granulares.

## Requisitos Técnicos

* Node.js >= 14.x
* NestJS >= 8.x
* PostgreSQL >= 13
* TypeORM

## 1. Instalação e Configuração

### 1.1 Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```
# Chaves JWT para integradores (codificadas em base64)
JWT_PRIVATE_KEY_BASE64=<sua-chave-privada-em-base64>
JWT_PUBLIC_KEY_BASE64=<sua-chave-publica-em-base64>

# Configurações de validade e limites
JWT_INTEGRADOR_DEFAULT_EXPIRY=365d
INTEGRADOR_RATE_LIMIT_WINDOW=60000
INTEGRADOR_RATE_LIMIT_MAX=100
```

### 1.2 Geração de Chaves RSA

Para gerar um par de chaves RSA para uso com o módulo:

```bash
# Gerar chave privada
openssl genrsa -out private.pem 2048

# Gerar chave pública a partir da privada
openssl rsa -in private.pem -pubout -out public.pem

# Converter para base64 (Linux/Mac)
base64 -w 0 private.pem > private.base64
base64 -w 0 public.pem > public.base64

# Converter para base64 (Windows PowerShell)
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("private.pem")) | Out-File -NoNewline private.base64
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("public.pem")) | Out-File -NoNewline public.base64
```

### 1.3 Registro do Módulo

Importe o `IntegradorModule` no `AppModule`:

```typescript
import { IntegradorModule } from './modules/integrador/integrador.module';

@Module({
  imports: [
    // outros imports
    IntegradorModule,
  ],
})
export class AppModule {}
```

### 1.4 Execução da Migração

Execute a migração para criar as tabelas necessárias:

```bash
npm run migration:run
```

## 2. Uso Básico

### 2.1 Criação de um Integrador

Endpoint: `POST /integradores`

Exemplo de requisição:

```json
{
  "nome": "Sistema Externo",
  "descricao": "Sistema de gerenciamento externo",
  "permissoesEscopo": ["read:dados_basicos", "read:cidadaos"],
  "ipPermitidos": ["192.168.1.100", "10.0.0.0/24"],
  "ativo": true
}
```

### 2.2 Criação de um Token

Endpoint: `POST /integradores/{id}/tokens`

Exemplo de requisição:

```json
{
  "nome": "Token API Produção",
  "descricao": "Token para ambiente de produção",
  "escopos": ["read:dados_basicos"],
  "diasValidade": 365
}
```

### 2.3 Utilização do Token em Requisições

Adicione o token ao cabeçalho de autorização nas requisições:

```
Authorization: Bearer {token}
```

## 3. Proteção de Endpoints

### 3.1 Utilizando o Guard

Para proteger um controller ou rota específica:

```typescript
import { IntegradorAuthGuard } from '../modules/integrador/guards/integrador-auth.guard';
import { RequireScopes } from '../modules/integrador/decorators/require-scopes.decorator';

@Controller('api/recursos')
@UseGuards(IntegradorAuthGuard)
export class RecursoController {
  @Get()
  @RequireScopes('read:recursos')
  findAll(@Req() req) {
    // O objeto do integrador está disponível em req.integrador
    console.log(`Acesso do integrador: ${req.integrador.nome}`);
    return this.recursoService.findAll();
  }
  
  @Post()
  @RequireScopes('write:recursos')
  create(@Body() dto: CreateRecursoDto, @Req() req) {
    // O payload do token está disponível em req.integradorTokenPayload
    console.log(`Escopos: ${req.integradorTokenPayload.scopes.join(', ')}`);
    return this.recursoService.create(dto);
  }
}
```

### 3.2 Definindo Escopos Necessários

Use o decorador `@RequireScopes` para definir os escopos necessários para acessar um endpoint. Este decorador pode ser aplicado tanto a controllers quanto a métodos individuais.

```typescript
@Controller('api/dados')
@UseGuards(IntegradorAuthGuard)
@RequireScopes('read:dados')  // Escopo válido para todo o controller
export class DadosController {
  
  @Get('publicos')
  // Não precisa de escopo adicional além do definido no controller
  getDadosPublicos() {
    return this.dadosService.getPublicos();
  }
  
  @Get('confidenciais')
  @RequireScopes('read:dados_confidenciais')  // Escopo adicional para este endpoint
  getDadosConfidenciais() {
    return this.dadosService.getConfidenciais();
  }
}
```

### 3.3 Acesso ao Contexto do Integrador

Dentro dos métodos do controller, você tem acesso a:

- `req.integrador`: Objeto do integrador que está fazendo a requisição
- `req.integradorTokenPayload`: Payload do token JWT decodificado
- `req.tokenInfo`: Informações sobre o token utilizado na requisição

## 4. Gerenciamento de Tokens

### 4.1 Revogação de Tokens

Endpoint: `POST /integradores/{id}/tokens/revoke`

```json
{
  "tokenId": "uuid-do-token"
}
```

### 4.2 Listagem de Tokens Ativos

Endpoint: `GET /integradores/{id}/tokens`

### 4.3 Renovação de Tokens

Para renovar um token, crie um novo e revogue o antigo.

## 5. Monitoramento e Auditoria

### 5.1 Logs de Acesso

Os acessos são registrados automaticamente no sistema de logs com os seguintes detalhes:

- ID do integrador
- Nome do integrador
- ID do token utilizado
- Endpoint acessado
- Método HTTP
- IP de origem
- Timestamp
- Status da requisição (sucesso/falha)
- Motivo de falha (se aplicável)

### 5.2 Métricas de Utilização

As seguintes métricas estão disponíveis para monitoramento:

- Número de requisições por integrador
- Número de requisições por token
- Taxa de erros
- Latência média
- Distribuição de acessos por endpoint

## 6. Boas Práticas

### 6.1 Gerenciamento de Tokens

- Crie tokens com escopo mínimo necessário (princípio do privilégio mínimo)
- Defina períodos de validade apropriados para o tipo de integração
- Configure restrições de IP sempre que possível
- Revogue tokens imediatamente quando não forem mais necessários

### 6.2 Modelagem de Escopos

Os escopos devem seguir o formato `ação:recurso`, como nos exemplos:

- `read:dados_basicos` - Permite leitura de dados básicos
- `write:processos` - Permite criar e atualizar processos
- `delete:documentos` - Permite excluir documentos

### 6.3 Segurança

- Nunca compartilhe tokens via meios não seguros
- Armazene tokens de forma segura nos sistemas clientes
- Utilize HTTPS para todas as comunicações
- Implemente rotação regular de tokens para integrações críticas

## 7. Solução de Problemas

### 7.1 Erros Comuns

| Código | Descrição | Solução |
|--------|-----------|---------|
| 401 Unauthorized | Token ausente ou inválido | Verifique se o token está sendo enviado corretamente no header Authorization |
| 403 Forbidden | Escopo insuficiente | Verifique se o token possui os escopos necessários para o endpoint |
| 403 Forbidden | Restrição de IP | Verifique se o IP de origem está na lista de IPs permitidos |
| 403 Forbidden | Token revogado | Gere um novo token |
| 403 Forbidden | Integrador inativo | Ative o integrador no painel administrativo |

### 7.2 Logs de Depuração

Para ativar logs detalhados, defina a variável de ambiente:

```
LOG_LEVEL=debug
```

Os logs relacionados ao módulo de integradores terão o prefixo `[IntegradorModule]`.

## 8. Exemplos

### 8.1 Exemplo de Cliente Node.js

```javascript
const axios = require('axios');

// Configuração do cliente
const apiClient = axios.create({
  baseURL: 'https://api.pgben.gov.br',
  timeout: 5000,
  headers: {
    'Authorization': `Bearer ${process.env.PGBEN_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Exemplo de requisição
async function getDadosCidadao(id) {
  try {
    const response = await apiClient.get(`/api/cidadaos/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Erro ${error.response.status}: ${error.response.data.message}`);
    } else {
      console.error('Erro na requisição:', error.message);
    }
    throw error;
  }
}
```

### 8.2 Exemplo de Cliente Python

```python
import requests
import os

# Configuração do cliente
base_url = 'https://api.pgben.gov.br'
token = os.environ.get('PGBEN_API_TOKEN')
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Exemplo de requisição
def get_dados_cidadao(cidadao_id):
    try:
        response = requests.get(
            f'{base_url}/api/cidadaos/{cidadao_id}', 
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as err:
        print(f'Erro HTTP: {err}')
        print(f'Detalhes: {response.json().get("message", "Sem detalhes")}')
        raise
    except Exception as err:
        print(f'Erro na requisição: {err}')
        raise
```

## 9. Referências

- [Documentação da API completa](https://docs.pgben.gov.br/api)
- [Padrões de segurança JWT (RFC 7519)](https://tools.ietf.org/html/rfc7519)
- [Guia de melhores práticas para APIs](https://docs.pgben.gov.br/api/best-practices)

## 10. Suporte

Para suporte técnico relacionado ao módulo de integradores:

- Email: suporte-integradores@pgben.gov.br
- Sistema de tickets: https://suporte.pgben.gov.br/integradores
