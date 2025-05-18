# Módulo de Dashboard - Especificação Detalhada

## 1. Visão Geral

O Módulo de Dashboard fornece uma API para obtenção de dados agregados, métricas e indicadores para alimentar interfaces visuais de gerenciamento. Seu objetivo é permitir o monitoramento de indicadores-chave do Sistema de Gestão de Benefícios Eventuais da SEMTAS, facilitando análises de desempenho e tomada de decisões baseadas em dados.

## 2. Entidades e Modelos de Dados

Embora o módulo de Dashboard seja principalmente um consumidor de dados de outros módulos, pode ter entidades específicas:

### 2.1 Preferências de Dashboard
Armazena configurações personalizadas de visualização por usuário.

```typescript
// Estrutura conceitual - não implementação
interface PreferenciaDashboard {
  id: string;
  usuario_id: string;
  layout: string; // JSON armazenando configuração de layout
  widgets_ativos: string[]; // Lista de widgets ativos
  filtros_padrao: object; // Filtros salvos como padrão
  created_at: Date;
  updated_at: Date;
}
```

### 2.2 Cache de Métricas
Armazena dados pré-calculados para performance.

```typescript
// Estrutura conceitual - não implementação  
interface CacheMetrica {
  id: string;
  chave: string; // Identificador único da métrica
  valor: any; // Valor armazenado (poderia ser number, object, array)
  periodo: string; // Período a que se refere (dia, semana, mês)
  data_referencia: Date; // Data específica de referência
  created_at: Date;
  expires_at: Date; // Expiração do cache
}
```

## 3. Controllers e Endpoints

### 3.1 KPIs Controller
Fornece métricas e indicadores-chave de desempenho.

#### Endpoints:

##### `GET /api/dashboard/kpis`
- **Descrição**: Retorna conjunto de KPIs gerais do sistema
- **Parâmetros Query**:
  - `periodo`: string (hoje, semana, mes, ano) - Período de análise
  - `unidade_id`: string (opcional) - Filtrar por unidade específica
  - `refresh`: boolean (opcional) - Forçar recálculo ignorando cache
- **Respostas**:
  - `200 OK`: Objeto contendo os KPIs solicitados
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador

##### `GET /api/dashboard/kpis/solicitacoes`
- **Descrição**: Métricas específicas de solicitações
- **Parâmetros Query**:
  - `periodo`: string (hoje, semana, mes, ano)
  - `tipo_beneficio_id`: string (opcional) - Filtrar por tipo de benefício
  - `status`: string (opcional) - Filtrar por status de solicitação
- **Respostas**:
  - `200 OK`: Objeto contendo métricas de solicitações
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador, Técnico SEMTAS

##### `GET /api/dashboard/kpis/beneficios`
- **Descrição**: Métricas relacionadas a tipos de benefícios
- **Parâmetros Query**: (similares aos anteriores)
- **Respostas**: (similares aos anteriores)
- **Permissão**: (similares aos anteriores)

### 3.2 Series Controller
Fornece dados de séries temporais para gráficos.

#### Endpoints:

##### `GET /api/dashboard/series/solicitacoes`
- **Descrição**: Retorna evolução temporal de solicitações
- **Parâmetros Query**:
  - `periodo`: string (semana, mes, trimestre, ano)
  - `agrupamento`: string (dia, semana, mes) - Granularidade dos dados
  - `tipo_beneficio_id`: string (opcional)
  - `status`: string (opcional)
- **Respostas**:
  - `200 OK`: Array de dados da série temporal
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador, Técnico SEMTAS

##### `GET /api/dashboard/series/aprovacoes`
- **Descrição**: Tendências de taxa de aprovação ao longo do tempo
- **Parâmetros Query**: (similares aos anteriores)
- **Respostas**: (similares aos anteriores)
- **Permissão**: (similares aos anteriores)

### 3.3 Aggregate Controller
Fornece dados agregados por diferentes dimensões.

#### Endpoints:

##### `GET /api/dashboard/aggregate/por-unidade`
- **Descrição**: Dados agrupados por unidade solicitante
- **Parâmetros Query**:
  - `periodo`: string
  - `metricas`: string[] - Lista de métricas desejadas
- **Respostas**:
  - `200 OK`: Objeto com dados agregados por unidade
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador

##### `GET /api/dashboard/aggregate/por-tecnico`
- **Descrição**: Performance agregada por técnico
- **Parâmetros Query**: (similares aos anteriores)
- **Respostas**: (similares aos anteriores)
- **Permissão**: (similares aos anteriores)

##### `GET /api/dashboard/aggregate/por-bairro`
- **Descrição**: Distribuição geográfica por bairro
- **Parâmetros Query**: (similares aos anteriores)
- **Respostas**: (similares aos anteriores)
- **Permissão**: (similares aos anteriores)

### 3.4 Performance Controller
Fornece métricas de desempenho operacional.

#### Endpoints:

##### `GET /api/dashboard/performance/tempo-medio`
- **Descrição**: Tempo médio de processamento por etapa
- **Parâmetros Query**:
  - `periodo`: string
  - `tipo_beneficio_id`: string (opcional)
  - `etapa`: string (opcional) - Etapa específica do workflow
- **Respostas**:
  - `200 OK`: Objeto com dados de tempo médio
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador

## 4. Services

### 4.1 DashboardKpiService
Responsável por calcular e fornecer KPIs gerais.

**Métodos principais**:
- `getKpisGerais(periodo, filtros)`: Obtém métricas gerais do sistema
- `getKpisSolicitacoes(periodo, filtros)`: Obtém métricas de solicitações
- `getKpisBeneficios(periodo, filtros)`: Obtém métricas por tipo de benefício

### 4.2 DashboardSeriesService
Responsável por gerar séries temporais para gráficos.

**Métodos principais**:
- `getSeriesSolicitacoes(periodo, agrupamento, filtros)`: Obtém série temporal de solicitações
- `getSeriesAprovacoes(periodo, agrupamento, filtros)`: Obtém série temporal de aprovações
- `getSeriesBeneficiarios(periodo, agrupamento, filtros)`: Obtém série temporal de beneficiários

### 4.3 DashboardAggregateService
Responsável por agregar dados em diferentes dimensões.

**Métodos principais**:
- `getAggregateByUnidade(periodo, metricas, filtros)`: Agrega dados por unidade
- `getAggregateByTecnico(periodo, metricas, filtros)`: Agrega dados por técnico
- `getAggregateByBairro(periodo, metricas, filtros)`: Agrega dados por bairro

### 4.4 DashboardPerformanceService
Responsável por métricas de performance operacional.

**Métodos principais**:
- `getTempoMedio(periodo, tipo, etapa)`: Calcula tempo médio de processamento
- `getTaxaAprovacao(periodo, filtros)`: Calcula taxa de aprovação
- `getDuracaoPendencias(periodo, filtros)`: Calcula duração média de pendências

### 4.5 DashboardCacheService
Gerencia o cache de métricas e consultas pesadas.

**Métodos principais**:
- `getFromCache(key)`: Obtém dados do cache
- `setToCache(key, data, ttl)`: Armazena dados no cache
- `invalidateCache(pattern)`: Invalida entradas específicas do cache

## 5. DTOs (Data Transfer Objects)

### 5.1 Request DTOs

#### KpiRequestDto
```typescript
// Estrutura conceitual
interface KpiRequestDto {
  periodo: 'hoje' | 'semana' | 'mes' | 'ano';
  unidade_id?: string;
  tipo_beneficio_id?: string;
  refresh?: boolean;
}
```

#### SeriesRequestDto
```typescript
// Estrutura conceitual
interface SeriesRequestDto {
  periodo: 'semana' | 'mes' | 'trimestre' | 'ano';
  agrupamento: 'dia' | 'semana' | 'mes';
  tipo_beneficio_id?: string;
  status?: string;
}
```

### 5.2 Response DTOs

#### KpisGeralResponseDto
```typescript
// Estrutura conceitual
interface KpisGeralResponseDto {
  total_solicitacoes: number;
  total_aprovadas: number;
  total_pendentes: number;
  total_rejeitadas: number;
  taxa_aprovacao: number;
  tempo_medio_processo: number;
  periodo: string;
  ultima_atualizacao: Date;
}
```

#### SeriesTemporalResponseDto
```typescript
// Estrutura conceitual
interface SeriesTemporalResponseDto {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
  periodo: string;
  agrupamento: string;
}
```

## 6. Principais KPIs no Escopo

### 6.1 KPIs de Volume e Fluxo
- **Total de Solicitações**: Número total de solicitações no período
- **Novas Solicitações**: Quantidade de novas solicitações no período
- **Solicitações por Status**: Contagem por status (aberta, em análise, pendente, aprovada, rejeitada, liberada)
- **Taxa de Conversão**: Percentual de solicitações que avançam entre etapas do workflow
- **Backlog**: Quantidade de solicitações aguardando análise ou resolução de pendências

### 6.2 KPIs de Performance Operacional
- **Tempo Médio de Processamento Total**: Dias desde a abertura até a liberação
- **Tempo Médio por Etapa**: Duração média em cada etapa do workflow
- **Tempo de Primeira Análise**: Dias entre abertura e primeira análise
- **Tempo de Resolução de Pendências**: Tempo médio para resolução de pendências
- **Eficiência de Processamento**: Percentual de solicitações processadas dentro do SLA

### 6.3 KPIs de Qualidade
- **Taxa de Aprovação**: Percentual de solicitações aprovadas
- **Taxa de Pendências**: Percentual de solicitações que entram em pendência
- **Taxa de Rejeição**: Percentual de solicitações rejeitadas
- **Motivos de Pendência**: Distribuição dos principais motivos de pendência
- **Motivos de Rejeição**: Distribuição dos principais motivos de rejeição

### 6.4 KPIs de Produtividade
- **Solicitações por Técnico**: Número médio de solicitações processadas por técnico
- **Produtividade Diária**: Média de solicitações processadas por dia útil
- **Eficiência por Técnico**: Taxa de aprovação/rejeição por técnico
- **Tempo Médio de Análise por Técnico**: Tempo que cada técnico leva para análise

### 6.5 KPIs Financeiros
- **Valor Total Liberado**: Soma dos valores liberados no período
- **Valor Médio por Benefício**: Média de valor por tipo de benefício
- **Valor por Unidade/Bairro**: Distribuição geográfica dos valores
- **Valor por Grupo Populacional**: Distribuição por características dos beneficiários
- **Eficiência de Utilização Orçamentária**: Percentual do orçamento utilizado

### 6.6 KPIs de Distribuição
- **Benefícios por Tipo**: Distribuição entre os diferentes tipos de benefício
- **Benefícios por Unidade**: Distribuição por unidade solicitante
- **Benefícios por Bairro**: Distribuição geográfica
- **Perfil de Beneficiários**: Distribuição por faixa etária, sexo, composição familiar
- **Concentração de Demanda**: Identificação de hotspots e áreas prioritárias

### 6.7 KPIs de Tendência
- **Crescimento da Demanda**: Variação percentual da demanda entre períodos
- **Sazonalidade**: Padrões de variação temporal na demanda
- **Previsão de Demanda**: Projeção para períodos futuros
- **Tendência de Aprovação**: Evolução da taxa de aprovação ao longo do tempo
- **Tendência de Tempo de Processamento**: Evolução da eficiência operacional

## 7. Estratégias de Otimização

### 7.1 Caching
O módulo deve implementar estratégias de cache para consultas pesadas:

- Cache em memória para consultas frequentes (Redis)
- Cache com TTL (Time-To-Live) apropriado para cada tipo de métrica
- Invalidação seletiva quando dados relevantes são modificados
- Opção de refresh forçado para usuários autorizados

### 7.2 Consultas Otimizadas
As consultas de agregação devem ser otimizadas:

- Uso de querys pré-computadas quando possível
- Índices específicos para consultas frequentes
- Limits e paginação para conjuntos grandes
- Agregações no nível do banco quando possível

### 7.3 Jobs Programados
Para métricas pesadas, considerar processamento assíncrono:

- Jobs agendados para pré-calcular métricas complexas
- Atualização periódica de cache para métricas frequentemente acessadas
- Background workers para cálculos intensivos

## 8. Segurança e Permissões

### 8.1 Controle de Acesso
- Apenas usuários autenticados podem acessar os endpoints
- Restrições por perfil de usuário (RBAC)
- Logs de auditoria para acessos às métricas sensíveis

### 8.2 Filtragem de Dados
- Técnicos de unidade só veem dados de sua unidade
- Técnicos SEMTAS veem dados agregados mas com limitações
- Gestores e Administradores têm acesso completo

## 9. Considerações de Implementação

### 9.1 Dependências
O módulo de Dashboard depende de:
- Módulo de Solicitação (dados principais)
- Módulo de Benefício (tipos e configurações)
- Módulo de Usuário (permissões e preferências)
- Módulo de Unidade (filtros e agrupamentos)

### 9.2 Desafios Técnicos
- Performance de consultas complexas
- Atualização em tempo real vs. caching
- Uniformidade em dados históricos para comparações
- Escalabilidade com crescimento do volume de dados

## 10. Testes

### 10.1 Testes Unitários
- Testes de cálculos de KPIs
- Testes de formatação de dados para gráficos
- Testes de validação de parâmetros

### 10.2 Testes de Integração
- Testes da integração com repositórios
- Testes de cache e invalidação
- Testes de formação de respostas completas

### 10.3 Testes de Performance
- Benchmarks para consultas pesadas
- Testes de carga para simulação de múltiplos acessos
- Verificação de consumo de recursos (CPU/memória)

## 11. Documentação

### 11.1 Swagger/OpenAPI
Todos os endpoints devem ser documentados via Swagger:
- Descrições claras
- Exemplos de requisição/resposta
- Códigos de erro possíveis

### 11.2 Documentação Interna
- JSDoc para classes e métodos
- Explicação de algoritmos complexos
- Referências a fórmulas de cálculo