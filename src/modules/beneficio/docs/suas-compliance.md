# Conformidade SUAS - Endpoint de Resultado de Benefício Cessado

## Visão Geral

Este endpoint implementa as diretrizes do Sistema Único de Assistência Social (SUAS) para registro de resultados de benefícios eventuais cessados, conforme estabelecido na Lei nº 8.742/1993 (LOAS) e regulamentações do Conselho Nacional de Assistência Social (CNAS).

## Base Legal

### Legislação Principal
- **Lei nº 8.742/1993 (LOAS)** - Lei Orgânica da Assistência Social
- **Resolução CNAS nº 212/2006** - Benefícios Eventuais
- **Resolução CNAS nº 33/2012** - Tipificação Nacional de Serviços Socioassistenciais
- **NOB-SUAS/2012** - Norma Operacional Básica do SUAS

### Regulamentações Específicas
- **Resolução CNAS nº 109/2009** - Tipificação Nacional de Serviços Socioassistenciais
- **Resolução CNAS nº 130/2005** - Política Nacional de Assistência Social
- **Instrução Operacional SENARC/MDS nº 01/2013** - Benefícios Eventuais

## Implementação Técnica

### 1. Validações Conforme SUAS

#### 1.1 Motivos de Encerramento
Os motivos implementados seguem a classificação oficial do SUAS:

- **SUPERACAO_VULNERABILIDADE**: Família superou situação de vulnerabilidade
- **MUDANCA_TERRITORIO**: Mudança para território fora da abrangência
- **OBITO_BENEFICIARIO**: Óbito do beneficiário principal
- **DESCUMPRIMENTO_CONDICIONALIDADES**: Não cumprimento das contrapartidas
- **AGRAVAMENTO_SITUACAO**: Agravamento que requer outro tipo de intervenção
- **ALTERACAO_RENDA_FAMILIAR**: Alteração na composição/renda familiar
- **OUTROS**: Outros motivos devidamente justificados

#### 1.2 Status de Vulnerabilidade
Classificação conforme avaliação técnica do SUAS:

- **SUPERADA**: Vulnerabilidade completamente superada
- **EM_SUPERACAO**: Em processo de superação, com melhorias evidentes
- **MANTIDA**: Vulnerabilidade mantida no mesmo nível
- **AGRAVADA**: Vulnerabilidade agravada, necessita intervenção
- **TRANSFERIDA**: Responsabilidade transferida para outro território/serviço
- **TEMPORARIAMENTE_RESOLVIDA**: Situação resolvida temporariamente
- **NECESSITA_REAVALIACAO**: Requer nova avaliação técnica especializada
- **NAO_APLICAVEL**: Não se aplica (ex: casos de óbito)

### 2. Documentação Obrigatória

#### 2.1 Por Motivo de Encerramento

**SUPERACAO_VULNERABILIDADE:**
- Comprovante de renda (obrigatório)
- Fotografia (obrigatório)

**MUDANCA_TERRITORIO:**
- Comprovante de residência (obrigatório)
- Fotografia (obrigatório)

**OBITO_BENEFICIARIO:**
- Certidão de óbito OU Atestado médico (obrigatório)

**DESCUMPRIMENTO_CONDICIONALIDADES:**
- Relatório técnico (obrigatório)
- Fotografia (obrigatório)

**ALTERACAO_RENDA_FAMILIAR:**
- Comprovante de renda OU Declaração de renda (obrigatório)

### 3. Validações de Negócio

#### 3.1 Combinações Válidas (Motivo x Status)

| Motivo | Status Válidos |
|--------|----------------|
| SUPERACAO_VULNERABILIDADE | SUPERADA, EM_SUPERACAO, TEMPORARIAMENTE_RESOLVIDA |
| MUDANCA_TERRITORIO | TRANSFERIDA |
| OBITO_BENEFICIARIO | NAO_APLICAVEL |
| DESCUMPRIMENTO_CONDICIONALIDADES | MANTIDA, AGRAVADA |
| AGRAVAMENTO_SITUACAO | AGRAVADA, NECESSITA_REAVALIACAO |
| ALTERACAO_RENDA_FAMILIAR | SUPERADA, EM_SUPERACAO, MANTIDA |
| OUTROS | Todos os status (com justificativa) |

#### 3.2 Observações Técnicas

**Requisitos mínimos por motivo:**

- **Superação**: Mínimo 50 caracteres com detalhamento da superação
- **Descumprimento**: Deve mencionar tentativas de acompanhamento
- **Reavaliação**: Deve justificar necessidade de nova análise
- **Agravamento**: Deve descrever o agravamento observado
- **Geral**: Mínimo 10 caracteres para garantir informação substantiva

### 4. Controle de Acesso

#### 4.1 Perfis Autorizados
- **Técnico Social**: Registro e visualização
- **Coordenador**: Registro, visualização e supervisão
- **Gestor**: Acesso completo e relatórios

#### 4.2 Territorialidade
- Usuário deve ter competência territorial para a concessão
- Validação baseada na hierarquia SUAS (CRAS/CREAS)
- Respeito aos limites geográficos de atuação

### 5. Auditoria e Rastreabilidade

#### 5.1 Registros Obrigatórios
- Data e hora do registro
- Técnico responsável
- Documentos comprobatórios
- Observações técnicas detalhadas

#### 5.2 Histórico
- Manutenção de histórico completo
- Impossibilidade de alteração após registro
- Logs de acesso e visualização

## Endpoints Implementados

### POST /concessoes/:concessaoId/resultado
Registra resultado de benefício cessado com validações completas conforme SUAS.

### GET /concessoes/:concessaoId/resultado/:id
Busca resultado específico por ID.

### GET /concessoes/resultados
Lista resultados com filtros e paginação.

### GET /concessoes/:concessaoId/resultado
Busca resultado por concessão específica.

## Exemplos de Uso

### Superação de Vulnerabilidade
```json
{
  "motivoEncerramento": "SUPERACAO_VULNERABILIDADE",
  "statusVulnerabilidade": "SUPERADA",
  "observacoesTecnicas": "Família conseguiu emprego formal...",
  "documentosComprobatorios": [
    {
      "tipo": "COMPROVANTE_RENDA",
      "descricao": "Carteira de trabalho assinada...",
      "arquivo": "carteira_trabalho.pdf"
    }
  ]
}
```

### Mudança de Território
```json
{
  "motivoEncerramento": "MUDANCA_TERRITORIO",
  "statusVulnerabilidade": "TRANSFERIDA",
  "observacoesTecnicas": "Família mudou-se para outro município...",
  "documentosComprobatorios": [
    {
      "tipo": "COMPROVANTE_RESIDENCIA",
      "descricao": "Contrato de locação no novo endereço...",
      "arquivo": "contrato_locacao.pdf"
    }
  ]
}
```

## Validações Implementadas

### 1. Validação de Combinação
Verifica se a combinação motivo/status é válida conforme SUAS.

### 2. Validação de Documentos
Verifica se os documentos obrigatórios estão presentes conforme o motivo.

### 3. Validação de Observações
Verifica se as observações atendem aos requisitos mínimos por tipo.

### 4. Validação de Acesso
Verifica permissões e territorialidade do usuário.

## Conformidade Técnica

### 1. Segurança
- Autenticação JWT obrigatória
- Autorização baseada em permissões
- Validação de entrada rigorosa
- Sanitização de dados

### 2. Performance
- Paginação em listagens
- Índices otimizados
- Cache de consultas frequentes
- Compressão de resposta

### 3. Monitoramento
- Logs estruturados
- Métricas de uso
- Alertas de erro
- Health checks

## Manutenção e Evolução

### 1. Atualizações Regulamentares
O sistema deve ser atualizado sempre que houver mudanças na legislação SUAS.

### 2. Feedback dos Usuários
Melhorias baseadas no feedback dos técnicos sociais em campo.

### 3. Auditoria Contínua
Revisão periódica da conformidade com as diretrizes SUAS.

---

**Última atualização**: Janeiro 2024  
**Versão da API**: 1.0  
**Conformidade SUAS**: Validada conforme legislação vigente