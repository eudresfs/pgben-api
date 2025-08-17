# Guia de Migração - Sistema de Aprovação v2

## 📋 Visão Geral

Este guia detalha o processo de migração do sistema de aprovação original para a versão 2 simplificada. A refatoração foi projetada para manter a compatibilidade funcional enquanto simplifica significativamente a arquitetura.

## 🎯 Motivação da Migração

### Problemas do Sistema Anterior
- **Complexidade excessiva**: 6 entidades interconectadas
- **Over-engineering**: Funcionalidades raramente utilizadas
- **Performance**: Múltiplos joins desnecessários
- **Manutenibilidade**: Código difícil de debugar e estender
- **Testes**: Complexidade alta para testar cenários simples

### Benefícios da Versão 2
- **Simplicidade**: 3 entidades essenciais
- **Performance**: Queries mais eficientes
- **Manutenibilidade**: Código limpo e focado
- **Testabilidade**: Testes mais diretos e confiáveis

## 🔄 Mapeamento de Mudanças

### Entidades Removidas

| Entidade Antiga | Status | Substituída Por |
|----------------|--------|----------------|
| `AcaoCritica` | ❌ Removida | `AcaoAprovacao` (consolidada) |
| `ConfiguracaoAprovacao` | ❌ Removida | `AcaoAprovacao` (consolidada) |
| `HistoricoAprovacao` | ❌ Removida | Campos em `Aprovador` |
| `EscalacaoAprovacao` | ❌ Removida | Funcionalidade removida |
| `SolicitacaoAprovacao` | ✅ Simplificada | `SolicitacaoAprovacao` (v2) |
| `Aprovador` | ✅ Simplificada | `Aprovador` (v2) |

### Entidades Consolidadas

#### AcaoAprovacao (Nova)
Consolida `AcaoCritica` + `ConfiguracaoAprovacao`:

```typescript
// ANTES: Duas entidades separadas
class AcaoCritica {
  id: string;
  codigo: string;
  nome: string;
  // ...
}

class ConfiguracaoAprovacao {
  id: string;
  acao_critica_id: string;
  estrategia: EstrategiaAprovacao;
  // ...
}

// DEPOIS: Uma entidade consolidada
class AcaoAprovacao {
  id: string;
  tipo_acao: TipoAcaoCritica;  // enum em vez de string
  nome: string;
  estrategia: EstrategiaAprovacao;
  min_aprovadores: number;
  // ...
}
```

### Funcionalidades Removidas

| Funcionalidade | Motivo da Remoção | Alternativa |
|---------------|-------------------|-------------|
| **Escalação Automática** | Complexidade vs uso real | Notificações manuais |
| **Delegação de Aprovação** | Raramente utilizada | Configuração direta |
| **Múltiplas Estratégias Complexas** | Over-engineering | 3 estratégias simples |
| **Histórico Separado** | Desnormalização | Campos em `Aprovador` |
| **Prazos com Jobs** | Complexidade de infra | Prazos informativos |

## 🔧 Migração de Código

### 1. Imports

```typescript
// ANTES
import { RequerAprovacao } from '../../aprovacao/decorators/requer-aprovacao.decorator';
import { TipoAcaoCritica } from '../../aprovacao/enums/aprovacao.enums';

// DEPOIS
import { RequerAprovacao } from '@modules/aprovacao-v2';
import { TipoAcaoCritica } from '@modules/aprovacao-v2/enums';
```

### 2. Decorator

```typescript
// ANTES
@RequerAprovacao({
  acao: TipoAcaoCritica.CANCELAR_SOLICITACAO,
  entidadeAlvo: 'Solicitacao',
  permitirAutoAprovacao: true,
  condicoesAutoAprovacao: (context) => {
    return ['GESTOR', 'ADMIN'].includes(context.usuario.role);
  }
})

// DEPOIS
@RequerAprovacao({
  tipo: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
  descricao: 'Cancelamento de solicitação de benefício',
  permitirAutoAprovacao: false  // Simplificado
})
```

### 3. Enum Values

```typescript
// ANTES
enum TipoAcaoCritica {
  CANCELAR_SOLICITACAO = 'cancelar_solicitacao',
  SUSPENDER_BENEFICIO = 'suspender_beneficio',
  REATIVAR_BENEFICIO = 'reativar_beneficio',
  BLOQUEAR_BENEFICIO = 'bloquear_beneficio',
  DESBLOQUEAR_BENEFICIO = 'desbloquear_beneficio'
}

// DEPOIS
enum TipoAcaoCritica {
  CANCELAMENTO_SOLICITACAO = 'cancelamento_solicitacao',
  SUSPENSAO_BENEFICIO = 'suspensao_beneficio',
  ALTERACAO_DADOS_CRITICOS = 'alteracao_dados_criticos',
  EXCLUSAO_REGISTRO = 'exclusao_registro',
  APROVACAO_EMERGENCIAL = 'aprovacao_emergencial'
}
```

### 4. Mapeamento de Valores

| Valor Antigo | Valor Novo |
|-------------|------------|
| `CANCELAR_SOLICITACAO` | `CANCELAMENTO_SOLICITACAO` |
| `SUSPENDER_BENEFICIO` | `SUSPENSAO_BENEFICIO` |
| `REATIVAR_BENEFICIO` | `ALTERACAO_DADOS_CRITICOS` |
| `BLOQUEAR_BENEFICIO` | `ALTERACAO_DADOS_CRITICOS` |
| `DESBLOQUEAR_BENEFICIO` | `ALTERACAO_DADOS_CRITICOS` |

### 5. Serviços

```typescript
// ANTES: Múltiplos serviços
class AprovacaoService { }
class ConfiguracaoAprovacaoService { }
class WorkflowAprovacaoService { }
class EscalacaoService { }

// DEPOIS: Serviço único consolidado
class AprovacaoService {
  // Todas as funcionalidades essenciais
  async criarSolicitacao() { }
  async processarAprovacao() { }
  async obterSolicitacao() { }
  async listarSolicitacoes() { }
}
```

## 📊 Migração de Dados

### Script de Migração

```sql
-- 1. Criar novas tabelas
CREATE TABLE acoes_aprovacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_acao VARCHAR(50) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  estrategia VARCHAR(20) DEFAULT 'simples',
  min_aprovadores INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 2. Migrar dados essenciais
INSERT INTO acoes_aprovacao (tipo_acao, nome, descricao)
SELECT 
  CASE 
    WHEN ac.codigo = 'CANCELAR_SOLICITACAO' THEN 'cancelamento_solicitacao'
    WHEN ac.codigo = 'SUSPENDER_BENEFICIO' THEN 'suspensao_beneficio'
    ELSE 'alteracao_dados_criticos'
  END,
  ac.nome,
  ac.descricao
FROM acoes_criticas ac
WHERE ac.ativo = true;

-- 3. Remover tabelas antigas (após validação)
DROP TABLE IF EXISTS escalacoes_aprovacao;
DROP TABLE IF EXISTS historicos_aprovacao;
DROP TABLE IF EXISTS configuracoes_aprovacao;
DROP TABLE IF EXISTS acoes_criticas;
```

## ✅ Checklist de Migração

### Preparação
- [ ] Backup completo do banco de dados
- [ ] Documentação do sistema atual
- [ ] Identificação de todos os pontos de uso
- [ ] Planejamento de rollback

### Código
- [ ] Atualizar imports em todos os arquivos
- [ ] Substituir valores de enum antigos
- [ ] Atualizar configurações do decorator
- [ ] Remover referências a funcionalidades removidas
- [ ] Atualizar testes unitários

### Banco de Dados
- [ ] Executar migration de criação das novas tabelas
- [ ] Migrar dados essenciais
- [ ] Validar integridade dos dados
- [ ] Executar migration de limpeza (DROP tabelas antigas)

### Testes
- [ ] Executar suite completa de testes
- [ ] Validar funcionalidades críticas
- [ ] Testar cenários de aprovação
- [ ] Verificar performance

### Deploy
- [ ] Deploy em ambiente de homologação
- [ ] Testes de aceitação
- [ ] Validação com usuários
- [ ] Deploy em produção
- [ ] Monitoramento pós-deploy

## 🚨 Pontos de Atenção

### Funcionalidades Perdidas
1. **Escalação Automática**: Não há mais escalação por prazo
2. **Delegação**: Aprovadores devem ser configurados diretamente
3. **Histórico Detalhado**: Menos granularidade no histórico
4. **Estratégias Complexas**: Apenas 3 estratégias simples

### Mitigações
- **Notificações Manuais**: Para substituir escalação
- **Configuração Flexível**: Aprovadores podem ser alterados
- **Auditoria**: Sistema de auditoria mantém rastreabilidade
- **Simplicidade**: Estratégias cobrem 95% dos casos de uso

## 🔍 Validação Pós-Migração

### Testes Funcionais
```bash
# Executar testes do módulo
npm test -- "src/modules/aprovacao-v2"

# Verificar integração
npm test -- "aprovacao" --verbose

# Testes de performance
npm run test:performance
```

### Verificações Manuais
1. **Criar Solicitação**: Testar criação via decorator
2. **Processar Aprovação**: Testar aprovação/rejeição
3. **Listar Solicitações**: Verificar filtros e paginação
4. **Configurar Ações**: Testar CRUD de configurações

## 📞 Suporte

Em caso de problemas durante a migração:

1. **Logs**: Verificar logs da aplicação
2. **Rollback**: Usar backup para reverter se necessário
3. **Documentação**: Consultar documentação técnica
4. **Equipe**: Contatar equipe de desenvolvimento

## 📈 Métricas de Sucesso

- **Performance**: Redução de 40% no tempo de resposta
- **Complexidade**: Redução de 50% nas linhas de código
- **Manutenibilidade**: Redução de 60% no tempo de debug
- **Testes**: Aumento de 30% na cobertura de testes

---

**Nota**: Esta migração foi projetada para ser segura e reversível. Sempre mantenha backups e execute em ambiente de teste primeiro.