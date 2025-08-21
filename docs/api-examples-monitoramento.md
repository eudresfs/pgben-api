# Exemplos de API - Módulo de Monitoramento

Este documento fornece exemplos abrangentes para todos os endpoints do módulo de monitoramento, incluindo estruturas de request, parâmetros, headers e formatos de resposta.

## Índice

1. [AgendamentoController](#agendamentocontroller)
2. [VisitaController](#visitacontroller)
3. [RelatorioMonitoramentoController](#relatoriomonitoramentocontroller)
4. [Headers Comuns](#headers-comuns)
5. [Códigos de Resposta](#códigos-de-resposta)

---

## Headers Comuns

Todos os endpoints requerem autenticação JWT:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

---

## AgendamentoController

### 1. Criar Agendamento

**Endpoint:** `POST /monitoramento/agendamentos`

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "beneficiario_id": "123e4567-e89b-12d3-a456-426614174000",
  "tecnico_responsavel_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
  "unidade_id": "456e7890-e89b-12d3-a456-426614174111",
  "data_agendamento": "2024-02-15T10:00:00.000Z",
  "tipo_visita": "INICIAL",
  "prioridade": "ALTA",
  "observacoes": "Beneficiário solicitou visita pela manhã devido ao trabalho"
}
```

**Response (201 Created):**
```json
{
  "message": "Agendamento criado com sucesso",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174222",
    "beneficiario_id": "123e4567-e89b-12d3-a456-426614174000",
    "beneficiario_nome": "João Silva Santos",
    "tecnico_responsavel_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
    "tecnico_nome": "Maria Oliveira",
    "unidade_id": "456e7890-e89b-12d3-a456-426614174111",
    "unidade_nome": "CRAS Centro",
    "data_agendamento": "2024-02-15T10:00:00.000Z",
    "tipo_visita": "INICIAL",
    "status": "AGENDADO",
    "prioridade": "ALTA",
    "observacoes": "Beneficiário solicitou visita pela manhã devido ao trabalho",
    "created_at": "2024-01-20T14:30:00.000Z",
    "updated_at": "2024-01-20T14:30:00.000Z"
  }
}
```

### 2. Listar Agendamentos

**Endpoint:** `GET /monitoramento/agendamentos`

**Query Parameters:**
```
page=1
limit=20
beneficiario_id=123e4567-e89b-12d3-a456-426614174000
tecnico_id=987fcdeb-51a2-43d7-8f9e-123456789abc
unidade_id=456e7890-e89b-12d3-a456-426614174111
tipo_visita=INICIAL
prioridade=ALTA
data_inicio=2024-01-01
data_fim=2024-12-31
apenas_em_atraso=false
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174222",
      "beneficiario_id": "123e4567-e89b-12d3-a456-426614174000",
      "beneficiario_nome": "João Silva Santos",
      "tecnico_responsavel_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
      "tecnico_nome": "Maria Oliveira",
      "unidade_id": "456e7890-e89b-12d3-a456-426614174111",
      "unidade_nome": "CRAS Centro",
      "data_agendamento": "2024-02-15T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "status": "AGENDADO",
      "prioridade": "ALTA",
      "observacoes": "Beneficiário solicitou visita pela manhã",
      "created_at": "2024-01-20T14:30:00.000Z",
      "updated_at": "2024-01-20T14:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 3. Obter Agendamento por ID

**Endpoint:** `GET /monitoramento/agendamentos/{id}`

**Path Parameters:**
- `id`: UUID do agendamento (ex: `789e0123-e89b-12d3-a456-426614174222`)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "id": "789e0123-e89b-12d3-a456-426614174222",
  "beneficiario_id": "123e4567-e89b-12d3-a456-426614174000",
  "beneficiario_nome": "João Silva Santos",
  "tecnico_responsavel_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
  "tecnico_nome": "Maria Oliveira",
  "unidade_id": "456e7890-e89b-12d3-a456-426614174111",
  "unidade_nome": "CRAS Centro",
  "data_agendamento": "2024-02-15T10:00:00.000Z",
  "tipo_visita": "INICIAL",
  "status": "AGENDADO",
  "prioridade": "ALTA",
  "observacoes": "Beneficiário solicitou visita pela manhã devido ao trabalho",
  "created_at": "2024-01-20T14:30:00.000Z",
  "updated_at": "2024-01-20T14:30:00.000Z"
}
```

### 4. Listar Agendamentos em Atraso

**Endpoint:** `GET /monitoramento/agendamentos/em-atraso`

**Query Parameters:**
```
page=1
limit=20
unidade_id=456e7890-e89b-12d3-a456-426614174111
tecnico_id=987fcdeb-51a2-43d7-8f9e-123456789abc
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174222",
      "beneficiario_nome": "João Silva Santos",
      "tecnico_nome": "Maria Oliveira",
      "unidade_nome": "CRAS Centro",
      "data_agendamento": "2024-01-10T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "prioridade": "ALTA",
      "dias_atraso": 15,
      "status": "AGENDADO"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5. Listar Agendamentos por Técnico

**Endpoint:** `GET /monitoramento/agendamentos/tecnico/{tecnicoId}`

**Path Parameters:**
- `tecnicoId`: UUID do técnico (ex: `987fcdeb-51a2-43d7-8f9e-123456789abc`)

**Query Parameters:**
```
page=1
limit=20
data_inicio=2024-01-01
data_fim=2024-12-31
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174222",
      "beneficiario_nome": "João Silva Santos",
      "data_agendamento": "2024-02-15T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "status": "AGENDADO",
      "prioridade": "ALTA"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 6. Listar Agendamentos por Beneficiário

**Endpoint:** `GET /monitoramento/agendamentos/beneficiario/{beneficiarioId}`

**Path Parameters:**
- `beneficiarioId`: UUID do beneficiário (ex: `123e4567-e89b-12d3-a456-426614174000`)

**Query Parameters:**
```
page=1
limit=20
data_inicio=2024-01-01
data_fim=2024-12-31
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174222",
      "tecnico_nome": "Maria Oliveira",
      "unidade_nome": "CRAS Centro",
      "data_agendamento": "2024-02-15T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "status": "AGENDADO",
      "prioridade": "ALTA"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 7. Confirmar Agendamento

**Endpoint:** `PUT /monitoramento/agendamentos/{id}/confirmar`

**Path Parameters:**
- `id`: UUID do agendamento (ex: `789e0123-e89b-12d3-a456-426614174222`)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "observacoes": "Confirmado pelo beneficiário via telefone"
}
```

**Response (200 OK):**
```json
{
  "message": "Agendamento confirmado com sucesso",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174222",
    "status": "CONFIRMADO",
    "observacoes": "Confirmado pelo beneficiário via telefone",
    "updated_at": "2024-01-20T15:45:00.000Z"
  }
}
```

### 8. Reagendar Visita

**Endpoint:** `PUT /monitoramento/agendamentos/{id}/reagendar`

**Path Parameters:**
- `id`: UUID do agendamento (ex: `789e0123-e89b-12d3-a456-426614174222`)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "nova_data": "2024-02-20T14:00:00.000Z",
  "motivo": "Beneficiário solicitou mudança de horário",
  "observacoes": "Reagendado para período da tarde conforme solicitação"
}
```

**Response (200 OK):**
```json
{
  "message": "Agendamento reagendado com sucesso",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174222",
    "data_agendamento": "2024-02-20T14:00:00.000Z",
    "status": "REAGENDADO",
    "observacoes": "Reagendado para período da tarde conforme solicitação",
    "updated_at": "2024-01-20T16:00:00.000Z"
  }
}
```

### 9. Cancelar Agendamento

**Endpoint:** `PUT /monitoramento/agendamentos/{id}/cancelar`

**Path Parameters:**
- `id`: UUID do agendamento (ex: `789e0123-e89b-12d3-a456-426614174222`)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "motivo": "Beneficiário mudou de endereço",
  "observacoes": "Cancelado devido à mudança de endereço do beneficiário"
}
```

**Response (200 OK):**
```json
{
  "message": "Agendamento cancelado com sucesso",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174222",
    "status": "CANCELADO",
    "observacoes": "Cancelado devido à mudança de endereço do beneficiário",
    "updated_at": "2024-01-20T16:30:00.000Z"
  }
}
```

---

## VisitaController

### 1. Registrar Visita

**Endpoint:** `POST /monitoramento/visitas`

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "agendamento_id": "789e0123-e89b-12d3-a456-426614174222",
  "data_inicio": "2024-02-15T10:00:00.000Z",
  "data_fim": "2024-02-15T11:30:00.000Z",
  "resultado": "REALIZADA_COM_SUCESSO",
  "observacoes": "Beneficiário estava presente e receptivo. Condições habitacionais adequadas.",
  "recomenda_renovacao": true,
  "necessita_nova_visita": false,
  "criterios_elegibilidade_mantidos": true
}
```

**Response (201 Created):**
```json
{
  "message": "Visita registrada com sucesso",
  "data": {
    "id": "abc12345-e89b-12d3-a456-426614174333",
    "agendamento_id": "789e0123-e89b-12d3-a456-426614174222",
    "data_inicio": "2024-02-15T10:00:00.000Z",
    "data_fim": "2024-02-15T11:30:00.000Z",
    "resultado": "REALIZADA_COM_SUCESSO",
    "observacoes": "Beneficiário estava presente e receptivo. Condições habitacionais adequadas.",
    "recomenda_renovacao": true,
    "necessita_nova_visita": false,
    "criterios_elegibilidade_mantidos": true,
    "created_at": "2024-02-15T11:35:00.000Z",
    "updated_at": "2024-02-15T11:35:00.000Z"
  }
}
```

### 2. Listar Visitas

**Endpoint:** `GET /monitoramento/visitas`

**Query Parameters:**
```
page=1
limit=20
beneficiario_id=123e4567-e89b-12d3-a456-426614174000
tecnico_id=987fcdeb-51a2-43d7-8f9e-123456789abc
unidade_id=456e7890-e89b-12d3-a456-426614174111
tipo_visita=INICIAL
resultado=REALIZADA_COM_SUCESSO
data_inicio=2024-01-01
data_fim=2024-12-31
recomenda_renovacao=true
necessita_nova_visita=false
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "abc12345-e89b-12d3-a456-426614174333",
      "agendamento_id": "789e0123-e89b-12d3-a456-426614174222",
      "beneficiario_nome": "João Silva Santos",
      "tecnico_nome": "Maria Oliveira",
      "unidade_nome": "CRAS Centro",
      "data_inicio": "2024-02-15T10:00:00.000Z",
      "data_fim": "2024-02-15T11:30:00.000Z",
      "tipo_visita": "INICIAL",
      "resultado": "REALIZADA_COM_SUCESSO",
      "recomenda_renovacao": true,
      "necessita_nova_visita": false,
      "criterios_elegibilidade_mantidos": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 3. Obter Visita por ID

**Endpoint:** `GET /monitoramento/visitas/{id}`

**Path Parameters:**
- `id`: UUID da visita (ex: `abc12345-e89b-12d3-a456-426614174333`)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "id": "abc12345-e89b-12d3-a456-426614174333",
  "agendamento_id": "789e0123-e89b-12d3-a456-426614174222",
  "beneficiario": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "nome": "João Silva Santos",
    "cpf": "123.456.789-00"
  },
  "tecnico": {
    "id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
    "nome": "Maria Oliveira",
    "matricula": "T001"
  },
  "unidade": {
    "id": "456e7890-e89b-12d3-a456-426614174111",
    "nome": "CRAS Centro"
  },
  "data_inicio": "2024-02-15T10:00:00.000Z",
  "data_fim": "2024-02-15T11:30:00.000Z",
  "tipo_visita": "INICIAL",
  "resultado": "REALIZADA_COM_SUCESSO",
  "observacoes": "Beneficiário estava presente e receptivo. Condições habitacionais adequadas.",
  "recomenda_renovacao": true,
  "necessita_nova_visita": false,
  "criterios_elegibilidade_mantidos": true,
  "created_at": "2024-02-15T11:35:00.000Z",
  "updated_at": "2024-02-15T11:35:00.000Z"
}
```

### 4. Listar Visitas por Beneficiário

**Endpoint:** `GET /monitoramento/visitas/beneficiario/{beneficiarioId}`

**Path Parameters:**
- `beneficiarioId`: UUID do beneficiário (ex: `123e4567-e89b-12d3-a456-426614174000`)

**Query Parameters:**
```
page=1
limit=20
data_inicio=2024-01-01
data_fim=2024-12-31
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "abc12345-e89b-12d3-a456-426614174333",
      "tecnico_nome": "Maria Oliveira",
      "data_inicio": "2024-02-15T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "resultado": "REALIZADA_COM_SUCESSO",
      "recomenda_renovacao": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5. Listar Visitas por Técnico

**Endpoint:** `GET /monitoramento/visitas/tecnico/{tecnicoId}`

**Path Parameters:**
- `tecnicoId`: UUID do técnico (ex: `987fcdeb-51a2-43d7-8f9e-123456789abc`)

**Query Parameters:**
```
page=1
limit=20
data_inicio=2024-01-01
data_fim=2024-12-31
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "abc12345-e89b-12d3-a456-426614174333",
      "beneficiario_nome": "João Silva Santos",
      "data_inicio": "2024-02-15T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "resultado": "REALIZADA_COM_SUCESSO",
      "recomenda_renovacao": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 6. Listar Visitas que Recomendam Renovação

**Endpoint:** `GET /monitoramento/visitas/renovacao/recomendadas`

**Query Parameters:**
```
page=1
limit=20
unidade_id=456e7890-e89b-12d3-a456-426614174111
data_inicio=2024-01-01
data_fim=2024-12-31
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "abc12345-e89b-12d3-a456-426614174333",
      "beneficiario_nome": "João Silva Santos",
      "tecnico_nome": "Maria Oliveira",
      "data_visita": "2024-02-15T10:00:00.000Z",
      "tipo_visita": "INICIAL",
      "motivo_renovacao": "Condições socioeconômicas mantidas"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 7. Listar Visitas que Necessitam Nova Visita

**Endpoint:** `GET /monitoramento/visitas/nova-visita/necessarias`

**Query Parameters:**
```
page=1
limit=20
unidade_id=456e7890-e89b-12d3-a456-426614174111
prazo_vencido=true
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "def67890-e89b-12d3-a456-426614174444",
      "beneficiario_nome": "Maria Santos",
      "tecnico_nome": "João Oliveira",
      "data_ultima_visita": "2024-01-15T10:00:00.000Z",
      "tipo_visita": "ACOMPANHAMENTO",
      "motivo_nova_visita": "Necessário acompanhamento das condições habitacionais",
      "prazo_vencido": true,
      "dias_vencimento": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 8. Listar Visitas com Problemas de Elegibilidade

**Endpoint:** `GET /monitoramento/visitas/elegibilidade/problemas`

**Query Parameters:**
```
page=1
limit=20
unidade_id=456e7890-e89b-12d3-a456-426614174111
data_inicio=2024-01-01
data_fim=2024-12-31
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "ghi90123-e89b-12d3-a456-426614174555",
      "beneficiario_nome": "Carlos Silva",
      "tecnico_nome": "Ana Costa",
      "data_visita": "2024-02-10T14:00:00.000Z",
      "tipo_visita": "VERIFICACAO",
      "problemas_identificados": [
        "Renda familiar acima do limite",
        "Mudança de composição familiar não informada"
      ],
      "requer_acao_imediata": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 9. Atualizar Visita

**Endpoint:** `PUT /monitoramento/visitas/{id}`

**Path Parameters:**
- `id`: UUID da visita (ex: `abc12345-e89b-12d3-a456-426614174333`)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "observacoes": "Observações atualizadas após revisão do caso",
  "recomenda_renovacao": false,
  "necessita_nova_visita": true
}
```

**Response (200 OK):**
```json
{
  "message": "Visita atualizada com sucesso",
  "data": {
    "id": "abc12345-e89b-12d3-a456-426614174333",
    "observacoes": "Observações atualizadas após revisão do caso",
    "recomenda_renovacao": false,
    "necessita_nova_visita": true,
    "updated_at": "2024-02-16T09:30:00.000Z"
  }
}
```

---

## RelatorioMonitoramentoController

### 1. Métricas Gerais

**Endpoint:** `GET /monitoramento/relatorios/metricas-gerais`

**Query Parameters:**
```
data_inicio=2024-01-01
data_fim=2024-12-31
tecnico_id=987fcdeb-51a2-43d7-8f9e-123456789abc
unidade_id=456e7890-e89b-12d3-a456-426614174111
tipo_visita=INICIAL
status_agendamento=AGENDADO
resultado_visita=REALIZADA_COM_SUCESSO
prioridade=ALTA
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "periodo": {
    "data_inicio": "2024-01-01T00:00:00.000Z",
    "data_fim": "2024-12-31T23:59:59.999Z"
  },
  "agendamentos": {
    "total": 150,
    "agendados": 45,
    "confirmados": 80,
    "realizados": 20,
    "cancelados": 5,
    "em_atraso": 12
  },
  "visitas": {
    "total_realizadas": 120,
    "realizadas_com_sucesso": 110,
    "nao_realizadas": 8,
    "reagendadas": 2,
    "tempo_medio_duracao": "01:30:00"
  },
  "renovacoes": {
    "recomendadas": 85,
    "nao_recomendadas": 35,
    "percentual_recomendacao": 70.8
  },
  "problemas_elegibilidade": {
    "identificados": 15,
    "resolvidos": 10,
    "pendentes": 5
  },
  "performance_tecnicos": {
    "total_tecnicos": 8,
    "media_visitas_por_tecnico": 15,
    "tecnico_mais_produtivo": {
      "nome": "Maria Oliveira",
      "visitas_realizadas": 25
    }
  }
}
```

### 2. Métricas por Período

**Endpoint:** `GET /monitoramento/relatorios/metricas-periodo`

**Query Parameters:**
```
data_inicio=2024-01-01
data_fim=2024-01-31
granularidade=dia
tecnico_id=987fcdeb-51a2-43d7-8f9e-123456789abc
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "periodo": {
    "data_inicio": "2024-01-01T00:00:00.000Z",
    "data_fim": "2024-01-31T23:59:59.999Z",
    "granularidade": "dia"
  },
  "metricas_por_periodo": [
    {
      "data": "2024-01-01",
      "agendamentos_criados": 5,
      "visitas_realizadas": 3,
      "renovacoes_recomendadas": 2,
      "problemas_identificados": 0
    },
    {
      "data": "2024-01-02",
      "agendamentos_criados": 8,
      "visitas_realizadas": 6,
      "renovacoes_recomendadas": 4,
      "problemas_identificados": 1
    }
  ],
  "totais": {
    "agendamentos_criados": 150,
    "visitas_realizadas": 120,
    "renovacoes_recomendadas": 85,
    "problemas_identificados": 15
  }
}
```

### 3. Ranking de Técnicos

**Endpoint:** `GET /monitoramento/relatorios/ranking-tecnicos`

**Query Parameters:**
```
data_inicio=2024-01-01
data_fim=2024-12-31
criterio_ordenacao=visitas_concluidas
limite=10
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "periodo": {
    "data_inicio": "2024-01-01T00:00:00.000Z",
    "data_fim": "2024-12-31T23:59:59.999Z"
  },
  "criterio_ordenacao": "visitas_concluidas",
  "ranking": [
    {
      "posicao": 1,
      "tecnico": {
        "id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
        "nome": "Maria Oliveira",
        "matricula": "T001"
      },
      "metricas": {
        "visitas_concluidas": 45,
        "avaliacoes_realizadas": 42,
        "nota_media": 8.5,
        "tempo_medio_visita": "01:25:00",
        "problemas_identificados": 8,
        "renovacoes_recomendadas": 35
      }
    },
    {
      "posicao": 2,
      "tecnico": {
        "id": "abc12345-51a2-43d7-8f9e-987654321def",
        "nome": "João Santos",
        "matricula": "T002"
      },
      "metricas": {
        "visitas_concluidas": 38,
        "avaliacoes_realizadas": 36,
        "nota_media": 8.2,
        "tempo_medio_visita": "01:35:00",
        "problemas_identificados": 5,
        "renovacoes_recomendadas": 28
      }
    }
  ]
}
```

### 4. Análise de Problemas

**Endpoint:** `GET /monitoramento/relatorios/analise-problemas`

**Query Parameters:**
```
data_inicio=2024-01-01
data_fim=2024-12-31
tipos_problema=["INADEQUADO","CRITICO"]
categorias=["CONDICOES_HABITACAO","SAUDE_FAMILIAR"]
apenas_acao_imediata=true
agrupar_por=tipo_avaliacao
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "periodo": {
    "data_inicio": "2024-01-01T00:00:00.000Z",
    "data_fim": "2024-12-31T23:59:59.999Z"
  },
  "filtros_aplicados": {
    "tipos_problema": ["INADEQUADO", "CRITICO"],
    "categorias": ["CONDICOES_HABITACAO", "SAUDE_FAMILIAR"],
    "apenas_acao_imediata": true
  },
  "problemas_por_categoria": [
    {
      "categoria": "CONDICOES_HABITACAO",
      "total_problemas": 25,
      "problemas_criticos": 8,
      "problemas_inadequados": 17,
      "acao_imediata_requerida": 8,
      "percentual_criticos": 32.0
    },
    {
      "categoria": "SAUDE_FAMILIAR",
      "total_problemas": 15,
      "problemas_criticos": 3,
      "problemas_inadequados": 12,
      "acao_imediata_requerida": 3,
      "percentual_criticos": 20.0
    }
  ],
  "recomendacoes": [
    {
      "categoria": "CONDICOES_HABITACAO",
      "recomendacao": "Intensificar visitas de acompanhamento para casos críticos",
      "prioridade": "ALTA"
    },
    {
      "categoria": "SAUDE_FAMILIAR",
      "recomendacao": "Articular com rede de saúde para casos identificados",
      "prioridade": "MEDIA"
    }
  ],
  "tendencias": {
    "problemas_crescentes": ["CONDICOES_HABITACAO"],
    "problemas_decrescentes": [],
    "problemas_estaveis": ["SAUDE_FAMILIAR"]
  }
}
```

### 5. Histórico de Auditoria

**Endpoint:** `GET /monitoramento/relatorios/historico-auditoria`

**Query Parameters:**
```
data_inicio=2024-01-01
data_fim=2024-12-31
usuario_id=987fcdeb-51a2-43d7-8f9e-123456789abc
cidadao_id=123e4567-e89b-12d3-a456-426614174000
categoria=VISITA
apenas_sucesso=true
pagina=1
limite=50
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "hist001-e89b-12d3-a456-426614174666",
      "data_acao": "2024-02-15T11:35:00.000Z",
      "usuario": {
        "id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
        "nome": "Maria Oliveira",
        "matricula": "T001"
      },
      "cidadao": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "nome": "João Silva Santos",
        "cpf": "123.456.789-00"
      },
      "categoria": "VISITA",
      "acao": "REGISTRAR_VISITA",
      "descricao": "Visita domiciliar registrada com sucesso",
      "detalhes": {
        "agendamento_id": "789e0123-e89b-12d3-a456-426614174222",
        "resultado": "REALIZADA_COM_SUCESSO",
        "duracao": "01:30:00"
      },
      "sucesso": true,
      "ip_origem": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  ],
  "meta": {
    "pagina": 1,
    "limite": 50,
    "total": 1,
    "total_paginas": 1
  },
  "resumo": {
    "total_acoes": 1,
    "acoes_sucesso": 1,
    "acoes_erro": 0,
    "taxa_sucesso": 100.0
  }
}
```

### 6. Exportar Relatório CSV

**Endpoint:** `GET /monitoramento/relatorios/exportar-csv`

**Query Parameters:**
```
tipo_relatorio=metricas_gerais
formato=csv
data_inicio=2024-01-01
data_fim=2024-12-31
incluir_graficos=false
nome_arquivo=relatorio_monitoramento_janeiro_2024
```

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: text/csv
```

**Response (200 OK):**
```http
Content-Type: text/csv
Content-Disposition: attachment; filename="relatorio_monitoramento_janeiro_2024.csv"

Data,Agendamentos_Criados,Visitas_Realizadas,Renovacoes_Recomendadas,Problemas_Identificados
2024-01-01,5,3,2,0
2024-01-02,8,6,4,1
2024-01-03,6,5,3,0
...
```

---

## Códigos de Resposta

### Códigos de Sucesso

- **200 OK**: Requisição processada com sucesso
- **201 Created**: Recurso criado com sucesso
- **204 No Content**: Requisição processada com sucesso, sem conteúdo de resposta

### Códigos de Erro do Cliente

- **400 Bad Request**: Dados da requisição inválidos
```json
{
  "statusCode": 400,
  "message": "Dados de entrada inválidos",
  "error": "Bad Request",
  "details": [
    {
      "field": "beneficiario_id",
      "message": "ID do beneficiário deve ser um UUID válido"
    }
  ]
}
```

- **401 Unauthorized**: Token de autenticação inválido ou ausente
```json
{
  "statusCode": 401,
  "message": "Token de acesso inválido",
  "error": "Unauthorized"
}
```

- **403 Forbidden**: Usuário não possui permissão para acessar o recurso
```json
{
  "statusCode": 403,
  "message": "Acesso negado. Permissões insuficientes",
  "error": "Forbidden"
}
```

- **404 Not Found**: Recurso não encontrado
```json
{
  "statusCode": 404,
  "message": "Agendamento não encontrado",
  "error": "Not Found"
}
```

- **409 Conflict**: Conflito de dados (ex: agendamento duplicado)
```json
{
  "statusCode": 409,
  "message": "Já existe um agendamento para este horário",
  "error": "Conflict"
}
```

- **422 Unprocessable Entity**: Dados válidos mas que violam regras de negócio
```json
{
  "statusCode": 422,
  "message": "Não é possível agendar visita para data passada",
  "error": "Unprocessable Entity"
}
```

### Códigos de Erro do Servidor

- **500 Internal Server Error**: Erro interno do servidor
```json
{
  "statusCode": 500,
  "message": "Erro interno do servidor",
  "error": "Internal Server Error"
}
```

- **503 Service Unavailable**: Serviço temporariamente indisponível
```json
{
  "statusCode": 503,
  "message": "Serviço temporariamente indisponível",
  "error": "Service Unavailable"
}
```

---

## Observações Importantes

1. **Autenticação**: Todos os endpoints requerem autenticação JWT válida
2. **Paginação**: Endpoints de listagem suportam paginação via parâmetros `page` e `limit`
3. **Filtros**: Parâmetros de filtro são opcionais e podem ser combinados
4. **Datas**: Todas as datas devem estar no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
5. **UUIDs**: Todos os IDs são UUIDs v4
6. **Validação**: Dados de entrada são validados conforme os DTOs definidos
7. **Rate Limiting**: Aplicado conforme configuração do sistema
8. **CORS**: Configurado para permitir requisições de origens autorizadas

---

*Documentação gerada automaticamente - Versão 1.0*
*Última atualização: 2024-01-20*