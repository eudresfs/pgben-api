# Domínios de Erro - Sistema SEMTAS

Este diretório contém a organização dos códigos de erro por domínios específicos do sistema SEMTAS. Cada domínio representa um módulo ou área funcional do sistema e possui seus próprios códigos de erro padronizados.

## 📁 Estrutura dos Domínios

### 🔐 USUARIO (`usuario.errors.ts`)
**Responsabilidade**: Gestão de usuários, autenticação e autorização
- **Códigos de Erro**: ~25 códigos
- **Categorias**: Autenticação, CRUD, Validação, Permissões, Integração
- **Principais Erros**: Login inválido, usuário não encontrado, permissões insuficientes

### 📋 SOLICITACAO (`solicitacao.errors.ts`)
**Responsabilidade**: Gestão do ciclo de vida das solicitações de benefícios
- **Códigos de Erro**: ~35 códigos
- **Categorias**: CRUD, Workflow, Documentação, Validação, Determinações Judiciais
- **Principais Erros**: Solicitação não encontrada, transição inválida, documentos pendentes

### 👤 CIDADAO (`cidadao.errors.ts`)
**Responsabilidade**: Gestão de dados dos cidadãos beneficiários
- **Códigos de Erro**: ~40 códigos
- **Categorias**: CRUD, Validação de Documentos, Dados Pessoais, Relacionamentos Familiares
- **Principais Erros**: CPF inválido, cidadão não encontrado, dados inconsistentes

### 🎁 BENEFICIO (`beneficio.errors.ts`)
**Responsabilidade**: Gestão dos tipos de benefícios e suas regras
- **Códigos de Erro**: ~30 códigos
- **Categorias**: CRUD, Elegibilidade, Auxílio Natalidade, Aluguel Social, Pagamentos
- **Principais Erros**: Benefício não elegível, valor inválido, período expirado

### 📄 DOCUMENTO (`documento.errors.ts`)
**Responsabilidade**: Gestão de documentos e uploads
- **Códigos de Erro**: ~35 códigos
- **Categorias**: CRUD, Upload, Validação, Azure Blob Storage, Segurança
- **Principais Erros**: Upload falhou, documento inválido, acesso negado

### 📊 AUDITORIA (`auditoria.errors.ts`)
**Responsabilidade**: Logs de auditoria e conformidade LGPD
- **Códigos de Erro**: ~25 códigos
- **Categorias**: Logging, Acesso, Integridade, LGPD, Relatórios
- **Principais Erros**: Log não encontrado, acesso negado, violação LGPD

### 🔔 NOTIFICACAO (`notificacao.errors.ts`)
**Responsabilidade**: Sistema de notificações (email, SMS, push)
- **Códigos de Erro**: ~40 códigos
- **Categorias**: CRUD, Envio, Templates, Preferências, Integrações
- **Principais Erros**: Envio falhou, template inválido, destinatário inválido

### 📈 RELATORIO (`relatorio.errors.ts`)
**Responsabilidade**: Geração e exportação de relatórios
- **Códigos de Erro**: ~35 códigos
- **Categorias**: Geração, Exportação, Parâmetros, Permissões, Performance
- **Principais Erros**: Geração falhou, parâmetros inválidos, timeout

### 🔗 INTEGRADOR (`integrador.errors.ts`)
**Responsabilidade**: Integrações com sistemas externos
- **Códigos de Erro**: ~45 códigos
- **Categorias**: Conexão, Autenticação, Respostas, Retry, Sistemas Específicos
- **Principais Erros**: Conexão falhou, credenciais inválidas, timeout

## 🏗️ Estrutura de um Domínio

Cada arquivo de domínio segue a seguinte estrutura:

```typescript
// 1. Imports e tipos
import { HttpStatus } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from '../catalog';
import { AppError, ErrorContext } from '../AppError';

// 2. Interface de contexto específica
export interface DominioErrorContext extends ErrorContext {
  data?: {
    // Campos específicos do domínio
  };
}

// 3. Catálogo de erros do domínio
export const DOMINIO_ERRORS: Record<string, ErrorDefinition> = {
  // Definições de erro organizadas por categoria
};

// 4. Funções helper para lançar erros
export function throwErroEspecifico(
  parametros: any,
  context: DominioErrorContext = {},
  language: string = 'pt-BR'
): never {
  throw new AppError('CODIGO_ERRO', { ...context }, language);
}
```

## 📊 Estatísticas dos Domínios

| Domínio | Códigos de Erro | Funções Helper | Categorias Principais |
|---------|----------------|----------------|----------------------|
| USUARIO | ~25 | 10 | Auth, CRUD, Permissions |
| SOLICITACAO | ~35 | 12 | CRUD, Workflow, Docs |
| CIDADAO | ~40 | 15 | CRUD, Validation, Family |
| BENEFICIO | ~30 | 10 | CRUD, Eligibility, Payment |
| DOCUMENTO | ~35 | 12 | CRUD, Upload, Security |
| AUDITORIA | ~25 | 8 | Logging, LGPD, Access |
| NOTIFICACAO | ~40 | 15 | CRUD, Send, Templates |
| RELATORIO | ~35 | 12 | Generation, Export, Params |
| INTEGRADOR | ~45 | 15 | Connection, Auth, Retry |
| **TOTAL** | **~310** | **109** | **9 Domínios** |

## 🎯 Convenções de Nomenclatura

### Códigos de Erro
- Formato: `DOMINIO_ACAO_CONTEXTO`
- Exemplos:
  - `USUARIO_NOT_FOUND`
  - `SOLICITACAO_INVALID_TRANSITION`
  - `CIDADAO_INVALID_CPF`
  - `BENEFICIO_NOT_ELIGIBLE`

### Funções Helper
- Formato: `throw{DescricaoDoErro}`
- Exemplos:
  - `throwUsuarioNotFound()`
  - `throwInvalidTransition()`
  - `throwInvalidCpf()`
  - `throwBenefitNotEligible()`

## 🔧 Como Usar

### Importação Específica
```typescript
import { 
  throwUsuarioNotFound,
  throwInvalidCpf,
  USUARIO_ERRORS 
} from '@shared/exceptions/error-catalog/domains';
```

### Importação Geral
```typescript
import { 
  DOMAIN_ERRORS,
  isDomainError 
} from '@shared/exceptions/error-catalog/domains';
```

### Uso em Serviços
```typescript
@Injectable()
export class UsuarioService {
  async findById(id: string) {
    const usuario = await this.repository.findById(id);
    
    if (!usuario) {
      throwUsuarioNotFound(id, {
        operation: 'findById',
        data: { searchedId: id }
      });
    }
    
    return usuario;
  }
}
```

## 📝 Manutenção

### Adicionando Novos Erros
1. Identifique o domínio correto
2. Adicione o código no arquivo `{dominio}.errors.ts`
3. Crie função helper se necessário
4. Atualize a documentação
5. Execute os testes

### Modificando Erros Existentes
1. Verifique impacto em outros módulos
2. Atualize mensagens localizadas
3. Mantenha compatibilidade com versões anteriores
4. Documente as mudanças

## 🧪 Testes

Cada domínio deve ter testes cobrindo:
- ✅ Códigos de erro válidos
- ✅ Mensagens localizadas
- ✅ Funções helper
- ✅ Contextos específicos
- ✅ Integração com AppError

## 📚 Referências

- [ADR: Catálogo de Erros](../../../docs/ADRs/catalogo-erros.md)
- [Documentação da API](../../../docs/api-docs/)
- [Guia de Tratamento de Erros](../../../docs/guias/)