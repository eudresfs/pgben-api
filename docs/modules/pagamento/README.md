# Módulo de Pagamento - Sistema SEMTAS

## Visão Geral

O módulo de pagamento é responsável por gerenciar todo o ciclo de vida dos pagamentos de benefícios eventuais no Sistema SEMTAS. Este módulo implementa a lógica de negócio para criação, processamento, renovação e controle de parcelas de benefícios assistenciais.

## Arquitetura

### Estrutura de Diretórios

```
src/modules/pagamento/
├── controllers/
│   └── pagamento.controller.ts
├── services/
│   ├── pagamento.service.ts
│   └── pagamento.service.spec.ts
├── entities/
│   └── pagamento.entity.ts
├── dto/
│   ├── create-pagamento.dto.ts
│   ├── update-pagamento.dto.ts
│   └── pagamento-response.dto.ts
├── enums/
│   └── status-pagamento.enum.ts
└── pagamento.module.ts
```

### Componentes Principais

#### 1. PagamentoService
- **Responsabilidade**: Lógica de negócio central do módulo
- **Funcionalidades**:
  - Criação e gestão de pagamentos
  - Cálculo de datas de parcelas
  - Processamento de renovações automáticas
  - Validações de negócio
  - Integração com outros módulos

#### 2. PagamentoController
- **Responsabilidade**: Interface REST para operações de pagamento
- **Endpoints**: CRUD completo e operações especializadas

#### 3. Pagamento Entity
- **Responsabilidade**: Modelo de dados e mapeamento ORM
- **Relacionamentos**: Concessão, Solicitação, Usuários

## Funcionalidades Principais

### 1. Gestão de Parcelas

#### Cálculo de Datas
O sistema calcula automaticamente as datas de liberação das parcelas baseado em:
- **Data de início da concessão**
- **Periodicidade do benefício** (mensal, bimestral, trimestral, semestral, anual, único)
- **Número da parcela**

```typescript
// Exemplo de uso
const dataProximaParcela = await pagamentoService.calcularDataProximaParcela(
  new Date('2024-01-15'),
  PeriodicidadeEnum.MENSAL,
  2
);
// Resultado: 2024-03-15
```

#### Tratamento de Fins de Mês
O sistema possui lógica especial para lidar com datas de fim de mês:
- **31/01 → 28/02** (ano comum) ou **29/02** (ano bissexto)
- **31/03 → 30/04**
- Mantém consistência nas datas de pagamento

### 2. Estados de Pagamento

```typescript
enum StatusPagamentoEnum {
  PENDENTE = 'pendente',
  PROCESSANDO = 'processando',
  LIBERADO = 'liberado',
  PAGO = 'pago',
  CANCELADO = 'cancelado',
  SUSPENSO = 'suspenso',
  ERRO = 'erro'
}
```

#### Fluxo de Estados
```
PENDENTE → PROCESSANDO → LIBERADO → PAGO
    ↓           ↓           ↓
CANCELADO   CANCELADO   CANCELADO
    ↓           ↓           ↓
SUSPENSO    SUSPENSO    SUSPENSO
    ↓           ↓           ↓
  ERRO        ERRO        ERRO
```

### 3. Renovação Automática

O sistema implementa renovação automática para benefícios contínuos:
- **Verificação periódica** de benefícios próximos ao vencimento
- **Validação de elegibilidade** antes da renovação
- **Criação automática** de novas concessões
- **Notificação** aos responsáveis

## Validações de Negócio

### 1. Validações de Entrada
- **Data de início**: Deve ser uma data válida
- **Número da parcela**: Deve ser não negativo
- **Periodicidade**: Deve ser um valor válido do enum
- **Valor**: Deve ser positivo

### 2. Validações de Contexto
- **Concessão ativa**: Verificação de status da concessão
- **Limites de parcelas**: Respeito aos limites definidos
- **Duplicidade**: Prevenção de pagamentos duplicados
- **Carência**: Verificação de períodos de carência

### 3. Validações de Integridade
- **Relacionamentos**: Verificação de existência de entidades relacionadas
- **Consistência temporal**: Validação de sequência de datas
- **Limites orçamentários**: Verificação de disponibilidade de recursos

## Integração com Outros Módulos

### Módulo de Benefício
- **Consulta de concessões**: Obtenção de dados da concessão
- **Atualização de status**: Sincronização de estados
- **Validação de elegibilidade**: Verificação de critérios

### Módulo de Solicitação
- **Dados do beneficiário**: Informações pessoais e documentais
- **Histórico de solicitações**: Consulta de solicitações anteriores
- **Validação de duplicidade**: Prevenção de benefícios duplicados

### Módulo de Usuário
- **Auditoria**: Registro de operações por usuário
- **Autorização**: Verificação de permissões
- **Notificações**: Envio de alertas e comunicados

## Configurações

### Variáveis de Ambiente
```env
# Configurações de renovação automática
PAGAMENTO_RENOVACAO_DIAS_ANTECEDENCIA=30
PAGAMENTO_RENOVACAO_LIMITE_TENTATIVAS=3
PAGAMENTO_RENOVACAO_INTERVALO_HORAS=24

# Configurações de processamento
PAGAMENTO_BATCH_SIZE=100
PAGAMENTO_TIMEOUT_SEGUNDOS=300

# Configurações de notificação
PAGAMENTO_NOTIFICACAO_EMAIL_ATIVO=true
PAGAMENTO_NOTIFICACAO_SMS_ATIVO=false
```

### Parâmetros de Sistema
- **Periodicidade padrão**: Mensal
- **Valor mínimo**: R$ 1,00
- **Valor máximo**: Configurável por tipo de benefício
- **Limite de parcelas**: Definido por regulamentação

## Monitoramento e Logs

### Eventos Logados
- **Criação de pagamentos**: INFO
- **Cálculo de parcelas**: DEBUG
- **Renovações automáticas**: INFO
- **Erros de validação**: WARN
- **Falhas de processamento**: ERROR

### Métricas Importantes
- **Taxa de sucesso** de processamento
- **Tempo médio** de processamento
- **Volume de pagamentos** por período
- **Erros por tipo** e frequência

## Testes

### Cobertura de Testes
- **Testes unitários**: Lógica de negócio e validações
- **Testes de integração**: Interação entre módulos
- **Testes de performance**: Processamento em lote
- **Testes de regressão**: Cenários críticos

### Cenários de Teste Críticos
1. **Cálculo de parcelas** com diferentes periodicidades
2. **Tratamento de fins de mês** e anos bissextos
3. **Renovação automática** de benefícios
4. **Validação de duplicidade** de pagamentos
5. **Processamento em lote** de grandes volumes

## Troubleshooting

### Problemas Comuns

#### 1. Erro no Cálculo de Parcelas
**Sintoma**: Datas incorretas nas parcelas
**Causa**: Problemas com timezone ou fim de mês
**Solução**: Verificar configuração de timezone e lógica de ajuste de datas

#### 2. Falha na Renovação Automática
**Sintoma**: Benefícios não renovados automaticamente
**Causa**: Problemas de conectividade ou validação
**Solução**: Verificar logs do scheduler e status das concessões

#### 3. Performance Lenta
**Sintoma**: Processamento demorado
**Causa**: Consultas não otimizadas ou volume alto
**Solução**: Revisar índices do banco e implementar paginação

### Comandos de Diagnóstico

```bash
# Verificar status dos pagamentos
npm run cli pagamento:status

# Executar renovação manual
npm run cli pagamento:renovar --concessao-id=123

# Reprocessar pagamentos com erro
npm run cli pagamento:reprocessar --status=erro

# Gerar relatório de performance
npm run cli pagamento:relatorio --periodo=30d
```

## Roadmap

### Próximas Funcionalidades
- [ ] **Pagamento em lote** via arquivo bancário
- [ ] **Integração PIX** para pagamentos instantâneos
- [ ] **Dashboard** de monitoramento em tempo real
- [ ] **API de webhook** para notificações externas
- [ ] **Conciliação automática** bancária

### Melhorias Planejadas
- [ ] **Cache distribuído** para consultas frequentes
- [ ] **Processamento assíncrono** com filas
- [ ] **Retry automático** com backoff exponencial
- [ ] **Métricas avançadas** com Prometheus
- [ ] **Alertas proativos** baseados em ML

## Contribuição

### Padrões de Código
- Seguir **Clean Architecture** principles
- Implementar **testes** para toda nova funcionalidade
- Documentar **APIs** com OpenAPI/Swagger
- Usar **TypeScript** strict mode
- Seguir **convenções** de nomenclatura

### Processo de Review
1. **Testes** devem passar 100%
2. **Cobertura** mínima de 80%
3. **Linting** sem erros
4. **Documentação** atualizada
5. **Review** por pelo menos 2 desenvolvedores

---

**Última atualização**: Janeiro 2024  
**Versão**: 1.0.0  
**Responsável**: Equipe Backend SEMTAS