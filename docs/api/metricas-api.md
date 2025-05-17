# Documentação da API de Métricas - PGBen

## Visão Geral

A API de Métricas do PGBen fornece endpoints para definição, configuração, coleta, análise e exportação de métricas de desempenho do sistema. Esta API permite o monitoramento e análise de indicadores importantes para a gestão e tomada de decisão.

## Autenticação

Todos os endpoints requerem autenticação JWT. Inclua o token JWT no cabeçalho de autorização:

```
Authorization: Bearer {seu_token_jwt}
```

## Endpoints

### Definição de Métricas

#### Listar todas as definições de métricas

```
GET /api/metricas/definicoes
```

**Parâmetros de consulta:**
- `categoria` (opcional): Filtrar por categoria
- `tipo` (opcional): Filtrar por tipo de métrica
- `page` (opcional): Número da página para paginação
- `limit` (opcional): Limite de itens por página

**Resposta:**
```json
{
  "total": 10,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "id": "uuid-1",
      "codigo": "tempo_medio_atendimento",
      "nome": "Tempo Médio de Atendimento",
      "descricao": "Média de tempo para atendimento de solicitações",
      "tipo": "calculada",
      "categoria": "atendimento",
      "unidade": "minutos",
      "sql_query": "SELECT AVG(tempo_atendimento) FROM atendimentos WHERE...",
      "formula": "soma_tempos / total_atendimentos",
      "created_at": "2025-05-10T14:30:00Z",
      "updated_at": "2025-05-10T14:30:00Z"
    },
    // ...
  ]
}
```

#### Obter definição específica

```
GET /api/metricas/definicoes/:id
```

**Resposta:**
```json
{
  "id": "uuid-1",
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "descricao": "Média de tempo para atendimento de solicitações",
  "tipo": "calculada",
  "categoria": "atendimento",
  "unidade": "minutos",
  "sql_query": "SELECT AVG(tempo_atendimento) FROM atendimentos WHERE...",
  "formula": "soma_tempos / total_atendimentos",
  "created_at": "2025-05-10T14:30:00Z",
  "updated_at": "2025-05-10T14:30:00Z"
}
```

#### Criar nova definição de métrica

```
POST /api/metricas/definicoes
```

**Corpo da requisição:**
```json
{
  "codigo": "taxa_conversao",
  "nome": "Taxa de Conversão",
  "descricao": "Percentual de solicitações convertidas em atendimentos",
  "tipo": "calculada",
  "categoria": "atendimento",
  "unidade": "%",
  "sql_query": "SELECT COUNT(*) FROM atendimentos WHERE...",
  "formula": "(atendimentos_realizados / solicitacoes_recebidas) * 100"
}
```

**Resposta:**
```json
{
  "id": "uuid-2",
  "codigo": "taxa_conversao",
  "nome": "Taxa de Conversão",
  "descricao": "Percentual de solicitações convertidas em atendimentos",
  "tipo": "calculada",
  "categoria": "atendimento",
  "unidade": "%",
  "sql_query": "SELECT COUNT(*) FROM atendimentos WHERE...",
  "formula": "(atendimentos_realizados / solicitacoes_recebidas) * 100",
  "created_at": "2025-05-17T14:30:00Z",
  "updated_at": "2025-05-17T14:30:00Z"
}
```

#### Atualizar definição existente

```
PUT /api/metricas/definicoes/:id
```

**Corpo da requisição:**
```json
{
  "nome": "Taxa de Conversão Atualizada",
  "descricao": "Percentual de solicitações convertidas em atendimentos efetivos",
  "formula": "(atendimentos_efetivos / solicitacoes_recebidas) * 100"
}
```

**Resposta:**
```json
{
  "id": "uuid-2",
  "codigo": "taxa_conversao",
  "nome": "Taxa de Conversão Atualizada",
  "descricao": "Percentual de solicitações convertidas em atendimentos efetivos",
  "tipo": "calculada",
  "categoria": "atendimento",
  "unidade": "%",
  "sql_query": "SELECT COUNT(*) FROM atendimentos WHERE...",
  "formula": "(atendimentos_efetivos / solicitacoes_recebidas) * 100",
  "created_at": "2025-05-17T14:30:00Z",
  "updated_at": "2025-05-17T15:45:00Z"
}
```

#### Remover definição

```
DELETE /api/metricas/definicoes/:id
```

**Resposta:**
```
Status: 204 No Content
```

### Configuração de Métricas

#### Listar todas as configurações

```
GET /api/metricas/configuracoes
```

**Parâmetros de consulta:**
- `metrica_id` (opcional): Filtrar por ID da métrica
- `page` (opcional): Número da página para paginação
- `limit` (opcional): Limite de itens por página

**Resposta:**
```json
{
  "total": 5,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "id": "uuid-1",
      "metrica_id": "uuid-1",
      "metrica_codigo": "tempo_medio_atendimento",
      "intervalo_coleta": "1h",
      "retencao_dados": "365d",
      "cache_ttl": 3600,
      "alerta_habilitado": true,
      "alerta_threshold": 30,
      "created_at": "2025-05-10T14:30:00Z",
      "updated_at": "2025-05-10T14:30:00Z"
    },
    // ...
  ]
}
```

#### Obter configuração específica

```
GET /api/metricas/configuracoes/:id
```

**Resposta:**
```json
{
  "id": "uuid-1",
  "metrica_id": "uuid-1",
  "metrica_codigo": "tempo_medio_atendimento",
  "intervalo_coleta": "1h",
  "retencao_dados": "365d",
  "cache_ttl": 3600,
  "alerta_habilitado": true,
  "alerta_threshold": 30,
  "created_at": "2025-05-10T14:30:00Z",
  "updated_at": "2025-05-10T14:30:00Z"
}
```

#### Criar nova configuração

```
POST /api/metricas/configuracoes
```

**Corpo da requisição:**
```json
{
  "metrica_id": "uuid-2",
  "intervalo_coleta": "30m",
  "retencao_dados": "180d",
  "cache_ttl": 1800,
  "alerta_habilitado": true,
  "alerta_threshold": 50
}
```

**Resposta:**
```json
{
  "id": "uuid-3",
  "metrica_id": "uuid-2",
  "metrica_codigo": "taxa_conversao",
  "intervalo_coleta": "30m",
  "retencao_dados": "180d",
  "cache_ttl": 1800,
  "alerta_habilitado": true,
  "alerta_threshold": 50,
  "created_at": "2025-05-17T14:30:00Z",
  "updated_at": "2025-05-17T14:30:00Z"
}
```

#### Atualizar configuração existente

```
PUT /api/metricas/configuracoes/:id
```

**Corpo da requisição:**
```json
{
  "intervalo_coleta": "15m",
  "alerta_threshold": 45
}
```

**Resposta:**
```json
{
  "id": "uuid-3",
  "metrica_id": "uuid-2",
  "metrica_codigo": "taxa_conversao",
  "intervalo_coleta": "15m",
  "retencao_dados": "180d",
  "cache_ttl": 1800,
  "alerta_habilitado": true,
  "alerta_threshold": 45,
  "created_at": "2025-05-17T14:30:00Z",
  "updated_at": "2025-05-17T15:45:00Z"
}
```

#### Remover configuração

```
DELETE /api/metricas/configuracoes/:id
```

**Resposta:**
```
Status: 204 No Content
```

### Consulta de Valores

#### Obter valor atual de uma métrica

```
GET /api/metricas/valores/:codigo
```

**Parâmetros de consulta:**
- `dimensao` (opcional): Filtrar por dimensão específica

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "valor": 23.5,
  "data_coleta": "2025-05-17T14:30:00Z",
  "unidade": "minutos",
  "dimensoes": {
    "regiao": "nordeste",
    "unidade": "central"
  },
  "metadados": {
    "total_amostras": 150,
    "desvio_padrao": 5.2
  }
}
```

#### Obter série histórica de valores

```
GET /api/metricas/valores/:codigo/historico
```

**Parâmetros de consulta:**
- `dataInicio` (opcional): Data de início (formato ISO)
- `dataFim` (opcional): Data de fim (formato ISO)
- `granularidade` (opcional): Granularidade dos dados (minuto, hora, dia, semana, mes)
- `dimensao` (opcional): Filtrar por dimensão específica

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "unidade": "minutos",
  "granularidade": "dia",
  "serie": [
    {
      "data": "2025-05-10",
      "valor": 22.3,
      "min": 18.1,
      "max": 27.8,
      "count": 24
    },
    {
      "data": "2025-05-11",
      "valor": 21.7,
      "min": 17.5,
      "max": 26.2,
      "count": 24
    },
    // ...
  ]
}
```

#### Comparar valores entre períodos

```
GET /api/metricas/valores/:codigo/comparativo
```

**Parâmetros de consulta:**
- `periodo1Inicio`: Data de início do primeiro período (formato ISO)
- `periodo1Fim`: Data de fim do primeiro período (formato ISO)
- `periodo2Inicio`: Data de início do segundo período (formato ISO)
- `periodo2Fim`: Data de fim do segundo período (formato ISO)
- `granularidade` (opcional): Granularidade dos dados (dia, semana, mes)

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "unidade": "minutos",
  "periodo1": {
    "inicio": "2025-04-01T00:00:00Z",
    "fim": "2025-04-30T23:59:59Z",
    "media": 24.8,
    "serie": [
      // ...
    ]
  },
  "periodo2": {
    "inicio": "2025-05-01T00:00:00Z",
    "fim": "2025-05-30T23:59:59Z",
    "media": 22.5,
    "serie": [
      // ...
    ]
  },
  "comparacao": {
    "variacao_percentual": -9.27,
    "diferenca_absoluta": -2.3
  }
}
```

#### Executar coleta manual de métrica

```
POST /api/metricas/valores/coleta-manual
```

**Corpo da requisição:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "parametros": {
    "regiao": "nordeste",
    "data_referencia": "2025-05-17"
  }
}
```

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "valor": 23.5,
  "data_coleta": "2025-05-17T14:30:00Z",
  "parametros": {
    "regiao": "nordeste",
    "data_referencia": "2025-05-17"
  },
  "status": "sucesso"
}
```

### Análise

#### Analisar tendência de uma métrica

```
GET /api/metricas/analise/:codigo/tendencia
```

**Parâmetros de consulta:**
- `dataInicio` (opcional): Data de início (formato ISO)
- `dataFim` (opcional): Data de fim (formato ISO)
- `granularidade` (opcional): Granularidade dos dados (dia, semana, mes)

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "periodo": {
    "inicio": "2025-04-01T00:00:00Z",
    "fim": "2025-05-17T23:59:59Z"
  },
  "tendencia": {
    "direcao": "decrescente",
    "inclinacao": -0.12,
    "confianca": 0.92,
    "previsao_proximos_dias": [
      {
        "data": "2025-05-18",
        "valor_previsto": 23.3
      },
      {
        "data": "2025-05-19",
        "valor_previsto": 23.1
      },
      // ...
    ]
  },
  "sazonalidade": {
    "detectada": true,
    "periodo": "semanal",
    "picos": ["segunda-feira"],
    "vales": ["sexta-feira"]
  }
}
```

#### Detectar anomalias em série histórica

```
GET /api/metricas/analise/:codigo/anomalias
```

**Parâmetros de consulta:**
- `dataInicio` (opcional): Data de início (formato ISO)
- `dataFim` (opcional): Data de fim (formato ISO)
- `sensibilidade` (opcional): Nível de sensibilidade (1-5)

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "periodo": {
    "inicio": "2025-04-01T00:00:00Z",
    "fim": "2025-05-17T23:59:59Z"
  },
  "estatisticas": {
    "media": 23.5,
    "desvio_padrao": 2.8,
    "mediana": 23.2,
    "min": 17.1,
    "max": 32.4
  },
  "anomalias": [
    {
      "data": "2025-04-15T10:00:00Z",
      "valor": 32.4,
      "desvio_padrao": 3.18,
      "severidade": "alta"
    },
    {
      "data": "2025-05-02T14:00:00Z",
      "valor": 17.1,
      "desvio_padrao": -2.29,
      "severidade": "media"
    },
    // ...
  ],
  "total_anomalias": 5
}
```

#### Gerar previsão baseada em dados históricos

```
GET /api/metricas/analise/:codigo/previsao
```

**Parâmetros de consulta:**
- `horizonte`: Número de períodos a prever
- `intervaloConfianca` (opcional): Intervalo de confiança (0-1)
- `modelo` (opcional): Modelo de previsão (arima, prophet, etc)

**Resposta:**
```json
{
  "codigo": "tempo_medio_atendimento",
  "nome": "Tempo Médio de Atendimento",
  "modelo": "arima",
  "intervalo_confianca": 0.95,
  "horizonte": 7,
  "previsao": [
    {
      "data": "2025-05-18",
      "valor": 23.1,
      "limite_inferior": 21.5,
      "limite_superior": 24.7
    },
    {
      "data": "2025-05-19",
      "valor": 22.9,
      "limite_inferior": 21.2,
      "limite_superior": 24.6
    },
    // ...
  ],
  "metricas_modelo": {
    "mae": 1.2,
    "mape": 5.1,
    "rmse": 1.5
  }
}
```

### Dashboard

#### Obter resumo de métricas principais

```
GET /api/metricas/dashboard/resumo
```

**Parâmetros de consulta:**
- `categorias` (opcional): Lista de categorias a incluir
- `limite` (opcional): Limite de métricas por categoria

**Resposta:**
```json
{
  "total": 5,
  "metricas": [
    {
      "codigo": "tempo_medio_atendimento",
      "nome": "Tempo Médio de Atendimento",
      "valor": 23.5,
      "data_coleta": "2025-05-17T14:30:00Z",
      "unidade": "minutos",
      "tendencia": "decrescente",
      "variacao_dia_anterior": -1.2
    },
    {
      "codigo": "taxa_conversao",
      "nome": "Taxa de Conversão",
      "valor": 68.3,
      "data_coleta": "2025-05-17T14:30:00Z",
      "unidade": "%",
      "tendencia": "estavel",
      "variacao_dia_anterior": 0.3
    },
    // ...
  ]
}
```

#### Listar alertas ativos de anomalias

```
GET /api/metricas/dashboard/alertas
```

**Parâmetros de consulta:**
- `prioridade` (opcional): Filtrar por prioridade (alta, media, baixa)
- `limite` (opcional): Limite de alertas a retornar

**Resposta:**
```json
{
  "total": 3,
  "alertas": [
    {
      "id": "uuid-1",
      "metrica_codigo": "tempo_medio_atendimento",
      "metrica_nome": "Tempo Médio de Atendimento",
      "valor": 32.4,
      "valor_esperado": 23.5,
      "desvio": 37.9,
      "data_deteccao": "2025-05-17T10:30:00Z",
      "severidade": "alta",
      "status": "aberto"
    },
    // ...
  ]
}
```

#### Obter KPIs configurados para dashboard

```
GET /api/metricas/dashboard/kpis
```

**Parâmetros de consulta:**
- `grupo` (opcional): Filtrar por grupo de KPIs
- `visibilidade` (opcional): Filtrar por nível de visibilidade

**Resposta:**
```json
{
  "total": 4,
  "grupo": "atendimento",
  "kpis": [
    {
      "codigo": "tempo_medio_atendimento",
      "nome": "Tempo Médio de Atendimento",
      "valor": 23.5,
      "data_coleta": "2025-05-17T14:30:00Z",
      "unidade": "minutos",
      "meta": 20,
      "status": "acima_meta",
      "tendencia": "decrescente"
    },
    {
      "codigo": "taxa_conversao",
      "nome": "Taxa de Conversão",
      "valor": 68.3,
      "data_coleta": "2025-05-17T14:30:00Z",
      "unidade": "%",
      "meta": 70,
      "status": "abaixo_meta",
      "tendencia": "estavel"
    },
    // ...
  ]
}
```

### Exportação

#### Exportar dados de uma métrica

```
GET /api/metricas/exportacao/:codigo
```

**Parâmetros de consulta:**
- `dataInicio` (opcional): Data de início (formato ISO)
- `dataFim` (opcional): Data de fim (formato ISO)
- `formato` (opcional): Formato de exportação (csv, json)
- `incluirMetadados` (opcional): Incluir metadados na exportação (true, false)

**Resposta:**
Download de arquivo no formato especificado.

#### Gerar relatório completo de métricas

```
GET /api/metricas/exportacao/relatorio
```

**Parâmetros de consulta:**
- `categorias` (opcional): Lista de categorias a incluir
- `periodo` (opcional): Período do relatório (dia, semana, mes, trimestre, ano)
- `formato` (opcional): Formato de exportação (csv, json, pdf)

**Resposta:**
Download de arquivo no formato especificado.

## Códigos de Status

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `204 No Content`: Requisição bem-sucedida sem conteúdo de resposta
- `400 Bad Request`: Requisição inválida ou mal formatada
- `401 Unauthorized`: Autenticação necessária
- `403 Forbidden`: Acesso negado
- `404 Not Found`: Recurso não encontrado
- `422 Unprocessable Entity`: Dados de entrada inválidos
- `500 Internal Server Error`: Erro interno do servidor

## Tipos de Dados

### Métrica

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único da métrica |
| codigo | string | Código único da métrica |
| nome | string | Nome descritivo da métrica |
| descricao | string | Descrição detalhada da métrica |
| tipo | string | Tipo da métrica (coletada, calculada) |
| categoria | string | Categoria da métrica |
| unidade | string | Unidade de medida |
| sql_query | string | Consulta SQL para coleta de dados |
| formula | string | Fórmula de cálculo para métricas calculadas |
| is_kpi | boolean | Indica se a métrica é um KPI |
| prioridade | number | Prioridade da métrica (maior = mais importante) |
| created_at | datetime | Data de criação |
| updated_at | datetime | Data da última atualização |

### Configuração

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único da configuração |
| metrica_id | string | ID da métrica associada |
| metrica_codigo | string | Código da métrica associada |
| intervalo_coleta | string | Intervalo de coleta automática |
| retencao_dados | string | Período de retenção dos dados |
| cache_ttl | number | Tempo de vida do cache em segundos |
| alerta_habilitado | boolean | Indica se alertas estão habilitados |
| alerta_threshold | number | Limiar para geração de alertas |
| created_at | datetime | Data de criação |
| updated_at | datetime | Data da última atualização |

### Snapshot

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único do snapshot |
| definicao_id | string | ID da definição de métrica |
| valor | number | Valor coletado ou calculado |
| data_coleta | datetime | Data e hora da coleta |
| dimensoes | object | Dimensões associadas ao valor |
| metadados | object | Metadados adicionais |
| created_at | datetime | Data de criação |
