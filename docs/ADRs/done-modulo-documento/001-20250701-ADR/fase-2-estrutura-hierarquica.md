# 📁 Fase 2: Estrutura Hierárquica de Pastas - Documentação Técnica

**Status**: ✅ **CONCLUÍDA**  
**Data de Conclusão**: Janeiro 2025  
**Versão**: 1.0

---

## 🎯 Visão Geral

A Fase 2 implementou uma estrutura hierárquica de pastas para organização de documentos no sistema PGBen, proporcionando melhor organização, navegação e gestão de arquivos.

### 🏗️ Estrutura Implementada

```
cidadao_id/
├── documentos-gerais/          # Documentos pessoais do cidadão
│   ├── rg/
│   ├── cpf/
│   ├── comprovante_residencia/
│   └── [outros_tipos]/
└── solicitacoes/               # Documentos relacionados a solicitações
    └── solicitacao_id/
        ├── documentos_pessoais/
        ├── comprovantes/
        └── [outros_tipos]/
```

---

## 🔧 Componentes Implementados

### 1. DocumentoPathService

**Localização**: `src/modules/documento/services/documento-path.service.ts`

**Responsabilidades**:
- Geração de caminhos hierárquicos
- Parsing e validação de caminhos existentes
- Sanitização de nomes de arquivos
- Validação de estrutura hierárquica

**Métodos Principais**:

```typescript
// Gerar caminho para novo documento
generateDocumentPath(params: {
  cidadaoId: string;
  tipoDocumento: TipoDocumento;
  nomeArquivo: string;
  solicitacaoId?: string;
}): string

// Analisar caminho existente
parseDocumentPath(caminho: string): {
  cidadaoId: string;
  categoria: 'documentos-gerais' | 'solicitacoes';
  tipo: string;
  nomeArquivo: string;
  solicitacaoId?: string;
}

// Validar se caminho é hierárquico
isValidHierarchicalPath(caminho: string): boolean
```

### 2. Sistema de Migração

**Localização**: `src/modules/documento/scripts/migrate-to-hierarchical-structure.ts`

**Características**:
- ✅ Processamento em lotes
- ✅ Retry automático com backoff exponencial
- ✅ Dry-run para simulação
- ✅ Validação de integridade
- ✅ Rollback automático em caso de erro

**Comando CLI**:

```bash
# Gerar relatório de migração
npm run cli migrate-documents --report

# Executar em modo dry-run (simulação)
npm run cli migrate-documents --dry-run

# Executar migração real
npm run cli migrate-documents

# Validar documentos migrados
npm run cli migrate-documents --validate

# Opções avançadas
npm run cli migrate-documents --batch-size 50 --max-retries 5
```

### 3. Controller Organizacional

**Localização**: `src/modules/documento/controllers/documento-organizacional.controller.ts`

**Endpoints Implementados**:

#### 📋 Listar Documentos Hierárquicos
```http
GET /documentos/organizacional/cidadao/{cidadaoId}
```

**Parâmetros de Query**:
- `pagina`: Número da página (padrão: 1)
- `limite`: Itens por página (padrão: 20, máx: 100)
- `tipo`: Filtrar por tipo de documento
- `categoria`: Filtrar por categoria (`documentos-gerais` ou `solicitacoes`)
- `solicitacaoId`: Filtrar por ID da solicitação

**Resposta**:
```json
{
  "documentos": [
    {
      "id": "uuid",
      "nome_arquivo": "documento.pdf",
      "tipo": "rg",
      "tamanho": 1024,
      "mimetype": "application/pdf",
      "data_upload": "2025-01-01T00:00:00Z",
      "caminho_hierarquico": "cidadao-123/documentos-gerais/rg/documento.pdf",
      "estrutura_caminho": {
        "cidadaoId": "cidadao-123",
        "categoria": "documentos-gerais",
        "tipo": "rg",
        "solicitacaoId": null
      }
    }
  ],
  "estrutura": {
    "cidadaoId": "cidadao-123",
    "pastas": {
      "documentosGerais": {
        "tipos": ["rg", "cpf"],
        "totalDocumentos": 5
      },
      "solicitacoes": [
        {
          "solicitacaoId": "sol-456",
          "tipos": ["comprovantes"],
          "totalDocumentos": 3
        }
      ]
    },
    "totalDocumentos": 8
  },
  "paginacao": {
    "pagina": 1,
    "limite": 20,
    "total": 8,
    "totalPaginas": 1
  }
}
```

#### 🏗️ Obter Estrutura de Pastas
```http
GET /documentos/organizacional/estrutura/{cidadaoId}
```

#### 📁 Listar Documentos de Pasta Específica
```http
GET /documentos/organizacional/pasta/{cidadaoId}/{categoria}
```

---

## 🔄 Integração com Sistema Existente

### Upload Automático

O `DocumentoService` foi atualizado para usar automaticamente a estrutura hierárquica:

```typescript
// Antes (estrutura plana)
const nomeUnico = `${Date.now()}-${Math.random()}-${arquivo.originalname}`;

// Depois (estrutura hierárquica)
const caminhoHierarquico = this.pathService.generateDocumentPath({
  cidadaoId: uploadDto.cidadao_id,
  tipoDocumento: uploadDto.tipo,
  nomeArquivo: arquivo.originalname,
  solicitacaoId: uploadDto.solicitacao_id,
});
```

### Compatibilidade

- ✅ **Documentos existentes**: Continuam funcionando normalmente
- ✅ **APIs existentes**: Mantêm compatibilidade total
- ✅ **Novos uploads**: Usam automaticamente a estrutura hierárquica
- ✅ **Migração gradual**: Pode ser executada sem interrupção do serviço

---

## 📊 Métricas e Monitoramento

### Relatório de Migração

```bash
npm run cli migrate-documents --report
```

**Saída Exemplo**:
```
=== Relatório de Migração ===
📁 Total de documentos: 1,250
✅ Documentos já migrados: 850
📦 Documentos para migrar: 400
⏱️  Tempo estimado: 40 segundos
📈 Progresso da migração: 68%
```

### Validação de Integridade

```bash
npm run cli migrate-documents --validate
```

**Verificações Realizadas**:
- ✅ Estrutura hierárquica válida
- ✅ Arquivo existe no storage
- ✅ Consistência entre caminho e metadados
- ✅ Parsing correto do caminho

---

## 🛠️ Guia de Uso para Desenvolvedores

### 1. Verificar se Documento está na Estrutura Hierárquica

```typescript
import { DocumentoPathService } from './services/documento-path.service';

const isHierarchical = this.pathService.isValidHierarchicalPath(documento.caminho);
```

### 2. Gerar Caminho para Novo Documento

```typescript
const caminho = this.pathService.generateDocumentPath({
  cidadaoId: 'cidadao-123',
  tipoDocumento: TipoDocumento.RG,
  nomeArquivo: 'documento.pdf',
  solicitacaoId: 'sol-456', // Opcional
});
// Resultado: "cidadao-123/documentos-gerais/rg/documento.pdf"
```

### 3. Analisar Caminho Existente

```typescript
const pathInfo = this.pathService.parseDocumentPath(
  'cidadao-123/solicitacoes/sol-456/comprovantes/comprovante.pdf'
);

console.log(pathInfo);
// {
//   cidadaoId: 'cidadao-123',
//   categoria: 'solicitacoes',
//   tipo: 'comprovantes',
//   nomeArquivo: 'comprovante.pdf',
//   solicitacaoId: 'sol-456'
// }
```

### 4. Buscar Documentos por Estrutura

```typescript
// Via controller organizacional
const resultado = await this.documentoOrganizacionalController
  .listarDocumentosHierarquicos(
    'cidadao-123',
    1, // página
    20, // limite
    TipoDocumento.RG, // tipo (opcional)
    'documentos-gerais', // categoria (opcional)
    undefined, // solicitacaoId (opcional)
    usuario
  );
```

---

## 🔒 Segurança e Permissões

### Controle de Acesso

- ✅ **Verificação de permissões**: Mantida do sistema original
- ✅ **Isolamento por cidadão**: Estrutura garante separação
- ✅ **Validação de caminhos**: Previne path traversal
- ✅ **Sanitização**: Remove caracteres perigosos

### Roles Suportadas

- `ADMIN`: Acesso total
- `GESTOR`: Acesso total
- `ATENDENTE`: Acesso aos cidadãos atribuídos
- `VERIFICADOR`: Acesso de leitura

---

## 🧪 Testes

### Testes Unitários

**Localização**: `src/modules/documento/services/documento-path.service.spec.ts`

**Cobertura**:
- ✅ Geração de caminhos
- ✅ Parsing de caminhos
- ✅ Validação de estrutura
- ✅ Sanitização de caracteres
- ✅ Casos de erro

### Executar Testes

```bash
# Testes específicos do DocumentoPathService
npm test -- documento-path.service.spec.ts

# Todos os testes do módulo documento
npm test -- src/modules/documento
```

---

## 🚀 Próximos Passos

### Fase 3: URLs Seguras

- Implementar sistema de URLs temporárias
- Controle de acesso granular
- Tokens de acesso com expiração

### Melhorias Futuras

- **Interface de navegação**: Frontend para explorar estrutura
- **Busca hierárquica**: Filtros avançados por estrutura
- **Estatísticas**: Métricas de uso por categoria
- **Backup incremental**: Baseado na estrutura hierárquica

---

## 📞 Suporte

### Logs e Debugging

```typescript
// Ativar logs detalhados
const logger = new Logger('DocumentoPathService');
logger.setLogLevels(['debug', 'log', 'warn', 'error']);
```

### Problemas Comuns

1. **Documento não encontrado após migração**
   - Verificar se migração foi concluída
   - Executar validação: `npm run cli migrate-documents --validate`

2. **Erro de parsing de caminho**
   - Verificar se caminho está na estrutura hierárquica
   - Usar `isValidHierarchicalPath()` antes do parsing

3. **Performance lenta na migração**
   - Reduzir batch size: `--batch-size 50`
   - Executar fora do horário comercial

---

## 📋 Checklist de Implementação

- [x] **DocumentoPathService** implementado e testado
- [x] **Integração com DocumentoService** concluída
- [x] **Sistema de migração** robusto e seguro
- [x] **Comando CLI** com todas as opções
- [x] **Controller organizacional** com endpoints completos
- [x] **Testes unitários** com cobertura adequada
- [x] **Documentação técnica** atualizada
- [x] **Compatibilidade** com sistema existente
- [x] **Validação de segurança** implementada
- [x] **Monitoramento e métricas** disponíveis

**🎉 Fase 2 concluída com sucesso!**