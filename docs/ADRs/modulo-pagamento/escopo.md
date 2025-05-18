Entendi! Vou ajustar a especificação considerando que já existe a entidade `info_bancaria` para armazenar os dados de PIX e informações bancárias. Isso realmente faz mais sentido, pois centraliza essas informações no perfil do cidadão em vez de duplicá-las. Vamos refinar o documento.

# Módulo de Pagamento/Liberação - Especificação Detalhada (Revisada)

## 1. Visão Geral

O Módulo de Pagamento/Liberação gerencia a etapa final do processo de concessão de benefícios eventuais, controlando a liberação efetiva dos recursos aprovados para os beneficiários. Este módulo é responsável por registrar informações de pagamento, validar requisitos para liberação, gerar comprovantes e manter o histórico completo de pagamentos realizados.

## 2. Entidades e Modelos de Dados

### 2.1 Pagamento
Representa um pagamento de benefício liberado.

```typescript
// Estrutura conceitual - não implementação
interface Pagamento {
  id: string;
  solicitacao_id: string; // Referência à solicitação aprovada
  info_bancaria_id: string; // Referência às informações bancárias/PIX utilizadas
  valor: number; // Valor liberado
  data_liberacao: Date; // Data efetiva da liberação
  status: 'agendado' | 'liberado' | 'confirmado' | 'cancelado'; // Estado do pagamento
  metodo_pagamento: 'pix' | 'deposito' | 'presencial' | 'doc'; // Método utilizado
  liberado_por: string; // ID do técnico que liberou o pagamento
  observacoes: string;
  created_at: Date;
  updated_at: Date;
  removed_at: Date | null;
}
```

### 2.2 ComprovantePagamento
Registra comprovantes anexados para pagamentos realizados.

```typescript
// Estrutura conceitual - não implementação
interface ComprovantePagamento {
  id: string;
  pagamento_id: string;
  tipo_documento: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho: number;
  mime_type: string;
  data_upload: Date;
  uploaded_por: string; // ID do usuário que fez upload
  created_at: Date;
  updated_at: Date;
}
```

### 2.3 ConfirmacaoRecebimento
Registra a confirmação de recebimento pelo beneficiário.

```typescript
// Estrutura conceitual - não implementação
interface ConfirmacaoRecebimento {
  id: string;
  pagamento_id: string;
  data_confirmacao: Date;
  metodo_confirmacao: 'assinatura' | 'digital' | 'terceirizado'; // Como foi confirmado
  confirmado_por: string; // ID do técnico ou beneficiário
  destinatario_id: string; // ID do cidadão que recebeu, se diferente do beneficiário
  observacoes: string;
  created_at: Date;
  updated_at: Date;
}
```

## 3. Controllers e Endpoints

### 3.1 PagamentoController
Gerencia operações principais de pagamentos.

#### Endpoints:

##### `GET /api/pagamentos`
- **Descrição**: Lista pagamentos com filtros
- **Parâmetros Query**:
  - `status`: string (agendado, liberado, confirmado, cancelado)
  - `unidade_id`: string
  - `data_inicio`: string (formato ISO)
  - `data_fim`: string (formato ISO)
  - `metodo_pagamento`: string
  - `page`: number
  - `limit`: number
- **Respostas**:
  - `200 OK`: Lista paginada de pagamentos
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador, Técnico (filtrado por unidade)

##### `GET /api/pagamentos/{id}`
- **Descrição**: Retorna detalhes de um pagamento específico
- **Parâmetros Path**:
  - `id`: string - ID do pagamento
- **Respostas**:
  - `200 OK`: Detalhes do pagamento
  - `404 Not Found`: Pagamento não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Gestor SEMTAS, Administrador, Técnico (se for da mesma unidade)

##### `POST /api/pagamentos/liberar/{solicitacaoId}`
- **Descrição**: Registra a liberação de um pagamento para uma solicitação aprovada
- **Parâmetros Path**:
  - `solicitacaoId`: string - ID da solicitação
- **Corpo da Requisição**: PagamentoCreateDto
- **Respostas**:
  - `201 Created`: Pagamento registrado com sucesso
  - `400 Bad Request`: Dados inválidos ou solicitação não aprovada
  - `404 Not Found`: Solicitação não encontrada
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade, Gestor SEMTAS, Administrador

##### `PATCH /api/pagamentos/{id}`
- **Descrição**: Atualiza dados de um pagamento existente
- **Parâmetros Path**:
  - `id`: string - ID do pagamento
- **Corpo da Requisição**: PagamentoUpdateDto
- **Respostas**:
  - `200 OK`: Pagamento atualizado com sucesso
  - `400 Bad Request`: Dados inválidos
  - `404 Not Found`: Pagamento não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade (se ainda não confirmado), Gestor SEMTAS, Administrador

##### `GET /api/pagamentos/pendentes`
- **Descrição**: Lista pagamentos pendentes de liberação (solicitações aprovadas)
- **Parâmetros Query**:
  - `unidade_id`: string
  - `tipo_beneficio_id`: string
  - `page`: number
  - `limit`: number
- **Respostas**:
  - `200 OK`: Lista de pagamentos pendentes
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade (filtrado por unidade), Gestor SEMTAS, Administrador

##### `GET /api/pagamentos/info-bancarias/{beneficiarioId}`
- **Descrição**: Obtém informações bancárias/PIX cadastradas para o beneficiário
- **Parâmetros Path**:
  - `beneficiarioId`: string - ID do beneficiário
- **Respostas**:
  - `200 OK`: Lista de informações bancárias cadastradas
  - `404 Not Found`: Beneficiário não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade, Gestor SEMTAS, Administrador

### 3.2 ComprovanteController
Gerencia comprovantes de pagamento.

#### Endpoints:

##### `POST /api/pagamentos/{pagamentoId}/comprovantes`
- **Descrição**: Upload de comprovante para um pagamento
- **Parâmetros Path**:
  - `pagamentoId`: string - ID do pagamento
- **Corpo da Requisição**: Form-data com arquivo
- **Respostas**:
  - `201 Created`: Comprovante enviado com sucesso
  - `400 Bad Request`: Arquivo inválido
  - `404 Not Found`: Pagamento não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade, Gestor SEMTAS, Administrador

##### `GET /api/pagamentos/{pagamentoId}/comprovantes`
- **Descrição**: Lista comprovantes de um pagamento
- **Parâmetros Path**:
  - `pagamentoId`: string - ID do pagamento
- **Respostas**:
  - `200 OK`: Lista de comprovantes
  - `404 Not Found`: Pagamento não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade (se mesma unidade), Gestor SEMTAS, Administrador

### 3.3 ConfirmacaoController
Gerencia confirmações de recebimento.

#### Endpoints:

##### `PATCH /api/pagamentos/{pagamentoId}/confirmar-recebimento`
- **Descrição**: Registra confirmação de recebimento do benefício
- **Parâmetros Path**:
  - `pagamentoId`: string - ID do pagamento
- **Corpo da Requisição**: ConfirmacaoRecebimentoDto
- **Respostas**:
  - `200 OK`: Confirmação registrada
  - `400 Bad Request`: Dados inválidos
  - `404 Not Found`: Pagamento não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Técnico Unidade, Gestor SEMTAS, Administrador

## 4. Services

### 4.1 PagamentoService
Implementa a lógica de negócios para pagamentos.

**Métodos principais**:
- `findAll(filters, pagination)`: Busca pagamentos com filtros
- `findById(id)`: Busca pagamento específico
- `criarPagamento(solicitacaoId, pagamentoDto, userId)`: Registra novo pagamento
- `atualizarPagamento(id, pagamentoDto, userId)`: Atualiza pagamento existente
- `findPendentesByUnidade(unidadeId, filters)`: Encontra pagamentos pendentes
- `cancelarPagamento(id, motivo, userId)`: Cancela um pagamento
- `verificarLimitesBeneficio(tipoBeneficioId, valor)`: Valida valor contra limites
- `getInfoBancariasBeneficiario(beneficiarioId)`: Obtém informações bancárias do beneficiário

### 4.2 ComprovanteService
Gerencia operações de comprovantes.

**Métodos principais**:
- `uploadComprovante(pagamentoId, arquivo, userId)`: Processa upload de comprovante
- `getComprovantes(pagamentoId)`: Lista comprovantes de um pagamento
- `validateComprovante(arquivo)`: Valida tamanho e formato de arquivo
- `deleteComprovante(comprovanteId, userId)`: Remove comprovante

### 4.3 ConfirmacaoService
Gerencia confirmações de recebimento.

**Métodos principais**:
- `confirmarRecebimento(pagamentoId, confirmacaoDto, userId)`: Registra confirmação
- `getConfirmacao(pagamentoId)`: Obtém detalhes da confirmação
- `validateConfirmacao(pagamentoId, confirmacaoDto)`: Valida dados da confirmação

## 5. DTOs (Data Transfer Objects)

### 5.1 Request DTOs

#### PagamentoCreateDto
```typescript
// Estrutura conceitual
interface PagamentoCreateDto {
  valor: number;
  metodo_pagamento: 'pix' | 'deposito' | 'presencial';
  info_bancaria_id?: string; // ID da informação bancária selecionada
  observacoes?: string;
}
```

#### PagamentoUpdateDto
```typescript
// Estrutura conceitual
interface PagamentoUpdateDto {
  valor?: number;
  metodo_pagamento?: 'pix' | 'deposito' | 'presencial';
  info_bancaria_id?: string;
  observacoes?: string;
  status?: 'agendado' | 'liberado' | 'confirmado' | 'cancelado';
}
```

#### ConfirmacaoRecebimentoDto
```typescript
// Estrutura conceitual
interface ConfirmacaoRecebimentoDto {
  metodo_confirmacao: 'assinatura' | 'digital' | 'terceirizado';
  observacoes?: string;
  destinatario_id?: string; // ID do cidadão que recebeu, se diferente do beneficiário
}
```

### 5.2 Response DTOs

#### PagamentoResponseDto
```typescript
// Estrutura conceitual
interface PagamentoResponseDto {
  id: string;
  solicitacao: {
    id: string;
    protocolo: string;
    tipo_beneficio: {
      id: string;
      nome: string;
    };
  };
  beneficiario: {
    id: string;
    nome: string;
    cpf: string;
  };
  valor: number;
  data_liberacao: Date;
  status: string;
  metodo_pagamento: string;
  liberado_por: {
    id: string;
    nome: string;
  };
  unidade: {
    id: string;
    nome: string;
  };
  info_bancaria: {
    id: string;
    banco?: string;
    agencia?: string;
    conta?: string;
    tipo_conta?: string;
    pix_tipo?: string;
    pix_chave?: string;
  };
  tem_comprovante: boolean;
  confirmacao_recebimento?: {
    data_confirmacao: Date;
    metodo_confirmacao: string;
    confirmado_por: string;
    destinatario?: {
      id: string;
      nome: string;
    };
  };
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### InfoBancariaResponseDto
```typescript
// Estrutura conceitual
interface InfoBancariaResponseDto {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo_conta: string;
  pix_tipo?: string;
  pix_chave?: string;
  created_at: Date;
}
```

#### ComprovanteResponseDto
```typescript
// Estrutura conceitual
interface ComprovanteResponseDto {
  id: string;
  pagamento_id: string;
  tipo_documento: string;
  nome_arquivo: string;
  tamanho: number;
  mime_type: string;
  data_upload: Date;
  uploaded_por: {
    id: string;
    nome: string;
  };
  download_url: string;
  created_at: Date;
}
```

## 6. Regras de Negócio

### 6.1 Validação de Liberação de Pagamento
- Somente solicitações com status "aprovada" podem ter pagamentos liberados
- O valor do pagamento deve respeitar os limites mínimos e máximos definidos para o tipo de benefício
- O técnico que libera o pagamento deve ter permissão adequada
- A unidade que libera deve ser a mesma que registrou a solicitação

### 6.2 Validação de Informações Bancárias
- Se método de pagamento for PIX ou depósito, uma informação bancária válida deve ser selecionada
- O beneficiário deve ter pelo menos uma informação bancária cadastrada para pagamentos eletrônicos
- Validação de consistência entre método de pagamento e tipo de informação bancária
  - Se PIX, deve haver chave PIX preenchida
  - Se depósito, deve haver dados bancários completos

### 6.3 Validação de Comprovantes
- Tamanho máximo: 5MB
- Formatos permitidos: PDF, JPEG, PNG
- Pelo menos um comprovante obrigatório para confirmação final
- Upload realizado apenas por usuário autorizado

### 6.4 Alteração de Status
- Fluxo de status só pode seguir a sequência:
  - agendado → liberado → confirmado
  - Ou pode ser cancelado a partir de qualquer status anterior a "confirmado"
- Após status "confirmado", não são permitidas alterações

### 6.5 Confirmação de Recebimento
- Obrigatória para finalizar o processo de pagamento
- Deve conter método de confirmação válido
- Deve ser registrada por técnico autorizado
- Se confirmação for por terceiro, exige identificação do destinatário

## 7. Considerações de Segurança

### 7.1 Controle de Acesso
- Técnicos de unidade só podem liberar pagamentos para solicitações da própria unidade
- Apenas usuários autenticados com permissões específicas podem registrar pagamentos
- Logs detalhados de todas as operações sensíveis
- Validação de entidade/usuário em todas as operações

### 7.2 Proteção de Dados Sensíveis
- Dados bancários devem ser armazenados com segurança
- Mascaramento parcial de dados bancários e chaves PIX em logs e respostas de API
- Acesso restrito a comprovantes de pagamento
- Validação rigorosa de formatos para evitar injeções

### 7.3 Validação de Uploads
- Verificação de tipo MIME real (não apenas extensão)
- Sanitização de nomes de arquivo
- Limite de tamanho e formato de arquivos
- Storage seguro para comprovantes

## 8. Integração com Outros Módulos

### 8.1 Módulo de Solicitação
- Obtenção de dados da solicitação aprovada
- Atualização de status da solicitação após liberação
- Validação de regras de negócio específicas do tipo de benefício

### 8.2 Módulo de Beneficiário/Cidadão
- Acesso às informações bancárias do beneficiário
- Validação do beneficiário e possíveis destinatários
- Verificação de consistência entre beneficiário e informações bancárias

### 8.3 Módulo de Auditoria
- Registro de todas as operações sensíveis
- Trilha de auditoria completa para pagamentos
- Logs de acesso a dados financeiros

### 8.4 Módulo de Documento
- Armazenamento e recuperação de comprovantes
- Validação e processamento de uploads
- Gestão de acesso a documentos sensíveis

## 9. Testes

### 9.1 Testes Unitários
- Validação de regras de negócio
- Validação de informações bancárias
- Validação de fluxo de status
- Cálculos e verificações de valores

### 9.2 Testes de Integração
- Integração com módulo de solicitação
- Funcionamento do upload de comprovantes
- Fluxo completo de liberação e confirmação

### 9.3 Testes de Segurança
- Validação de permissões por perfil
- Proteção contra acesso não autorizado
- Validação de uploads maliciosos

## 10. Documentação

### 10.1 Swagger/OpenAPI
- Documentação completa de todos os endpoints
- Exemplos de requisição/resposta
- Descrição de parâmetros e possíveis erros

### 10.2 Documentação Interna
- Comentários detalhados em classes e métodos críticos
- Explicação das regras de negócio complexas
- Documentação de workflows e fluxos de status

## 11. Recomendações de Melhoria

### 11.1 Validação de Dados
- Implementar validação rigorosa de chaves PIX (CPF/CNPJ, telefone, e-mail, chave aleatória)
- Validar dados bancários (agência, conta, dígito verificador) segundo regras do Bacen
- Adicionar verificação de dígito verificador para contas bancárias

### 11.2 Segurança
- Implementar auditoria detalhada de acesso a dados sensíveis
- Adicionar confirmação em duas etapas para liberações acima de R$ 5.000,00
- Criptografar dados sensíveis em repouso (chaves PIX, dados bancários)
- Implementar limites de valor por tipo de transação
- Registrar IP e dispositivo nas operações sensíveis

### 11.3 Conformidade e Rastreabilidade
- Adicionar campos para registro de documentos oficiais (ex: portaria de pagamento)
- Implementar suporte a assinatura digital para confirmação de recebimento
- Manter histórico imutável de alterações em dados sensíveis
- Implementar política de retenção de dados em conformidade com LGPD

### 11.4 Melhorias na API
- Adicionar endpoints para estatísticas e métricas de pagamentos
- Implementar webhooks para notificação de atualizações de status
- Adicionar suporte a paginação em todas as listagens
- Incluir filtros avançados para relatórios

### 11.5 Experiência do Usuário
- Implementar notificações em tempo real para atualizações de status
- Adicionar confirmação visual para operações críticas
- Melhorar mensagens de erro para orientar o usuário
- Implementar pré-visualização de comprovantes

### 11.6 Monitoramento e Alertas
- Configurar alertas para transações acima de limites pré-definidos
- Monitorar tentativas de transações suspeitas
- Implementar dashboard para acompanhamento em tempo real
- Gerar relatórios periódicos de auditoria