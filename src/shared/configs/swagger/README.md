# Configuração do Swagger - Sistema SEMTAS

Este diretório contém toda a configuração da documentação Swagger/OpenAPI para o Sistema de Gestão de Benefícios Eventuais da SEMTAS.

## 📁 Estrutura de Arquivos

```
swagger/
├── decorators/                    # Decoradores reutilizáveis
│   ├── api_crud_operations.decorator.ts    # Operações CRUD padronizadas
│   ├── api_error_responses.decorator.ts    # Respostas de erro
│   ├── api_upload_operations.decorator.ts  # Operações de upload
│   ├── api_report_operations.decorator.ts  # Operações de relatórios
│   └── index.ts                           # Exportações
├── responses/                     # Respostas padronizadas
│   ├── common.responses.ts               # Respostas comuns
│   └── index.ts                         # Exportações
├── schemas/                       # Schemas de DTOs
│   ├── auth.ts                          # DTOs de autenticação
│   ├── beneficio.ts                     # DTOs de benefícios
│   ├── cidadao.ts                       # DTOs de cidadãos
│   ├── common.ts                        # DTOs comuns
│   ├── documento.ts                     # DTOs de documentos
│   ├── relatorio.ts                     # DTOs de relatórios
│   ├── solicitacao.ts                   # DTOs de solicitações
│   └── index.ts                         # Exportações
├── swagger.config.ts              # Configuração principal
├── tags.config.ts                 # Configuração de tags
├── index.ts                       # Exportações principais
└── README.md                      # Este arquivo
```

## 🚀 Como Usar

### 1. Configuração Básica

No arquivo principal da aplicação (`main.ts`):

```typescript
import { setupSwagger } from './shared/configs/swagger';

async function bootstrap() {
  const app = await NestJS.create(AppModule);
  
  // Configurar Swagger
  setupSwagger(app);
  
  await app.listen(3000);
}
```

### 2. Usando Decoradores em Controllers

#### Operações CRUD Básicas

```typescript
import { Controller } from '@nestjs/common';
import { ApiCreateOperation, ApiGetAllOperation } from '@/shared/configs/swagger';
import { CreateCidadaoDto, CidadaoResponseDto } from '@/shared/configs/swagger';

@Controller('cidadaos')
@SwaggerTag('CIDADAOS') // Tag configurada
export class CidadaoController {
  
  @Post()
  @ApiCreateOperation({
    summary: 'Criar novo cidadão',
    description: 'Cadastra um novo cidadão no sistema',
    bodyType: CreateCidadaoDto,
    responseType: CidadaoResponseDto
  })
  async create(@Body() dto: CreateCidadaoDto) {
    // Implementação
  }
  
  @Get()
  @ApiGetAllOperation({
    summary: 'Listar cidadãos',
    description: 'Lista todos os cidadãos com paginação',
    responseType: CidadaoResponseDto,
    includeFilters: true
  })
  async findAll(@Query() filters: any) {
    // Implementação
  }
}
```

#### Operações de Upload

```typescript
import { ApiUploadDocumento } from '@/shared/configs/swagger';

@Controller('documentos')
@SwaggerTag('DOCUMENTOS')
export class DocumentoController {
  
  @Post('upload')
  @ApiUploadDocumento({
    summary: 'Upload de documento',
    description: 'Faz upload de documento para uma solicitação',
    maxFileSize: '10MB',
    allowedTypes: ['PDF', 'JPG', 'PNG']
  })
  async upload(@UploadedFile() file: Express.Multer.File) {
    // Implementação
  }
}
```

#### Operações de Relatórios

```typescript
import { ApiGerarRelatorioSolicitacoes } from '@/shared/configs/swagger';

@Controller('relatorios')
@SwaggerTag('RELATORIOS')
export class RelatorioController {
  
  @Post('solicitacoes')
  @ApiGerarRelatorioSolicitacoes({
    summary: 'Gerar relatório de solicitações',
    description: 'Gera relatório com filtros personalizados'
  })
  async gerarRelatorio(@Body() filtros: RelatorioSolicitacoesDto) {
    // Implementação
  }
}
```

### 3. Definindo Novos DTOs

Crie DTOs seguindo o padrão estabelecido:

```typescript
// Em schemas/meu-modulo.ts
export const MeuDtoSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
      description: 'Identificador único',
      example: 1
    },
    nome: {
      type: 'string',
      description: 'Nome do item',
      minLength: 2,
      maxLength: 100,
      example: 'Exemplo'
    },
    ativo: {
      type: 'boolean',
      description: 'Status ativo/inativo',
      example: true
    }
  },
  required: ['nome']
};
```

### 4. Adicionando Novas Tags

Em `tags.config.ts`:

```typescript
export const SWAGGER_TAGS = {
  // ... tags existentes
  
  NOVA_TAG: {
    name: 'Nova Funcionalidade',
    description: 'Descrição da nova funcionalidade do sistema.'
  }
} as const;

// Adicionar à ordem
export const SWAGGER_TAG_ORDER = [
  // ... ordem existente
  SWAGGER_TAGS.NOVA_TAG.name
];
```

## 🎨 Personalização

### Temas e Estilos

O CSS customizado está em `swagger.config.ts`. Para modificar:

```typescript
customCss: `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info .title { color: #1976d2; }
  /* Seus estilos personalizados */
`
```

### Configurações de Ambiente

As configurações variam por ambiente:

- **Desenvolvimento**: Swagger habilitado com todos os recursos
- **Homologação**: Swagger habilitado com recursos limitados
- **Produção**: Swagger opcional (configurável via variável de ambiente)

```typescript
// Controlar via variável de ambiente
SWAGGER_ENABLED=true
```

## 📋 Padrões e Convenções

### 1. Nomenclatura de DTOs

- **Request**: `CreateXxxDto`, `UpdateXxxDto`
- **Response**: `XxxResponseDto`
- **Filtros**: `FiltroXxxDto`
- **Análise**: `AnaliseXxxDto`

### 2. Estrutura de Schemas

```typescript
export const XxxSchema = {
  type: 'object',
  properties: {
    // Propriedades ordenadas logicamente
    // IDs primeiro, depois dados principais, depois metadados
  },
  required: ['campo1', 'campo2'], // Campos obrigatórios
  example: {
    // Exemplo realista e completo
  }
};
```

### 3. Decoradores de Operação

- Use decoradores específicos para cada tipo de operação
- Inclua sempre `summary` e `description`
- Especifique tipos de request e response
- Documente possíveis erros

### 4. Tags e Organização

- Use tags para agrupar endpoints relacionados
- Siga a ordem definida em `SWAGGER_TAG_ORDER`
- Mantenha descrições concisas mas informativas

## 🔧 Manutenção

### Adicionando Novos Endpoints

1. Defina os DTOs necessários em `schemas/`
2. Crie decoradores específicos se necessário em `decorators/`
3. Use os decoradores no controller
4. Teste a documentação gerada

### Atualizando Documentação

1. Mantenha exemplos atualizados
2. Revise descrições regularmente
3. Valide schemas com dados reais
4. Teste integrações com ferramentas externas

### Validação

Para validar a configuração:

```typescript
import { SwaggerConfig } from './swagger.config';

// Validar configuração
SwaggerConfig.validateConfig();
```

## 🌐 URLs de Acesso

- **Documentação**: `http://localhost:3000/api-docs`
- **JSON Schema**: `http://localhost:3000/openapi.json`
- **Swagger 2.0**: `http://localhost:3000/v2/swagger.json`

## 🔒 Segurança

### Endpoints Filtrados

Endpoints internos são automaticamente removidos da documentação pública:

- Endpoints administrativos (`/admin/*`)
- Endpoints de debug (`/debug/*`, `/dev/*`)
- Endpoints de configuração (`/config/*`)
- Endpoints de logs (`/logs/*`)
- Endpoints de métricas internas

### Autenticação na Documentação

A documentação suporta:

- **JWT Bearer Token**: Para usuários autenticados
- **API Key**: Para integrações externas
- **OAuth2**: Para futuras integrações (preparado)

## 📚 Recursos Adicionais

- [Documentação do NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)

## 🐛 Troubleshooting

### Problemas Comuns

1. **Tags não aparecem ordenadas**
   - Verifique se a tag está em `SWAGGER_TAG_ORDER`
   - Confirme que o nome da tag está correto

2. **DTOs não aparecem na documentação**
   - Verifique se o DTO está exportado em `schemas/index.ts`
   - Confirme que o decorator está sendo usado corretamente

3. **Exemplos não aparecem**
   - Verifique se a propriedade `example` está definida no schema
   - Confirme que o formato do exemplo está correto

4. **Swagger não carrega**
   - Verifique se `SWAGGER_ENABLED=true` em desenvolvimento
   - Confirme que não há erros de sintaxe nos schemas
   - Verifique logs do servidor para erros específicos

### Debug

Para debug detalhado:

```typescript
// Habilitar logs detalhados
process.env.SWAGGER_DEBUG = 'true';
```

---

**Mantido por**: Equipe de Desenvolvimento SEMTAS  
**Última atualização**: Janeiro 2024  
**Versão da documentação**: 1.0.0