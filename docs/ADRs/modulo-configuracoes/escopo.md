Agradeço pela análise detalhada do módulo de Pagamento. Suas observações são muito pertinentes e melhoram significativamente a proposta inicial. Vou incorporar essas sugestões na especificação do próximo módulo.

# Módulo de Configuração - Especificação Detalhada

## 1. Visão Geral

O Módulo de Configuração centraliza a gestão de parâmetros operacionais, templates, workflows e integrações do Sistema de Gestão de Benefícios Eventuais. Este módulo permite que administradores e gestores personalizem o comportamento do sistema sem necessidade de alterações no código-fonte, aumentando a flexibilidade e adaptabilidade da aplicação às mudanças de requisitos.

## 2. Entidades e Modelos de Dados

### 2.1 Parametro
Armazena parâmetros de configuração do sistema.

```typescript
// Estrutura conceitual - não implementação
interface Parametro {
  id: string;
  chave: string; // Identificador único do parâmetro
  valor: string; // Valor do parâmetro (armazenado como string e convertido conforme necessário)
  tipo: 'string' | 'number' | 'boolean' | 'json' | 'date'; // Tipo do valor
  descricao: string; // Descrição do parâmetro
  categoria: string; // Categoria para agrupamento (ex: 'limites', 'prazos', 'seguranca')
  created_at: Date;
  updated_at: Date;
  updated_by: string; // ID do usuário que atualizou pela última vez
}
```

### 2.2 Template
Armazena templates para emails, notificações e documentos.

```typescript
// Estrutura conceitual - não implementação
interface Template {
  id: string;
  codigo: string; // Código identificador do template
  nome: string; // Nome descritivo
  tipo: 'email' | 'notificacao' | 'documento'; // Tipo do template
  assunto?: string; // Assunto (para emails)
  conteudo: string; // Conteúdo em formato HTML ou texto com placeholders
  variaveis: string[]; // Lista de variáveis disponíveis para substituição
  ativo: boolean; // Status ativo/inativo
  created_at: Date;
  updated_at: Date;
  updated_by: string; // ID do usuário que atualizou pela última vez
}
```

### 2.3 WorkflowBeneficio
Define o fluxo de trabalho para um tipo de benefício.

```typescript
// Estrutura conceitual - não implementação
interface WorkflowBeneficio {
  id: string;
  tipo_beneficio_id: string; // Referência ao tipo de benefício
  nome: string;
  descricao: string;
  etapas: WorkflowEtapa[];
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: string;
}

// Sub-entidade para etapas do workflow
interface WorkflowEtapa {
  ordem: number;
  descricao: string;
  setor_id: string; // Setor responsável
  acao: 'criacao' | 'analise' | 'aprovacao' | 'liberacao' | 'confirmacao';
  prazo_sla: number; // Prazo em horas para SLA
  template_notificacao_id?: string; // Template de notificação associado
}
```

### 2.4 ConfiguracaoIntegracao
Armazena configurações para integrações externas.

```typescript
// Estrutura conceitual - não implementação
interface ConfiguracaoIntegracao {
  id: string;
  tipo: 'email' | 'storage' | 'sms' | 'api_externa';
  nome: string;
  ativo: boolean;
  parametros: Record<string, string>; // Parâmetros específicos da integração
  created_at: Date;
  updated_at: Date;
  updated_by: string;
}
```

## 3. Controllers e Endpoints

### 3.1 ParametroController
Gerencia configurações de parâmetros do sistema.

#### Endpoints:

##### `GET /api/configuracoes/parametros`
- **Descrição**: Lista parâmetros de configuração
- **Parâmetros Query**:
  - `categoria`: string (opcional) - Filtrar por categoria
  - `search`: string (opcional) - Busca por chave ou descrição
  - `page`: number
  - `limit`: number
- **Respostas**:
  - `200 OK`: Lista paginada de parâmetros
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `GET /api/configuracoes/parametros/{chave}`
- **Descrição**: Obtém valor de um parâmetro específico
- **Parâmetros Path**:
  - `chave`: string - Chave do parâmetro
- **Respostas**:
  - `200 OK`: Detalhes do parâmetro
  - `404 Not Found`: Parâmetro não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `PUT /api/configuracoes/parametros/{chave}`
- **Descrição**: Atualiza valor de um parâmetro
- **Parâmetros Path**:
  - `chave`: string - Chave do parâmetro
- **Corpo da Requisição**: ParametroUpdateDto
- **Respostas**:
  - `200 OK`: Parâmetro atualizado
  - `400 Bad Request`: Dados inválidos
  - `404 Not Found`: Parâmetro não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador

##### `POST /api/configuracoes/parametros`
- **Descrição**: Cria novo parâmetro
- **Corpo da Requisição**: ParametroCreateDto
- **Respostas**:
  - `201 Created`: Parâmetro criado
  - `400 Bad Request`: Dados inválidos ou chave duplicada
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador

### 3.2 TemplateController
Gerencia templates do sistema.

#### Endpoints:

##### `GET /api/configuracoes/templates`
- **Descrição**: Lista templates disponíveis
- **Parâmetros Query**:
  - `tipo`: string (opcional) - Filtrar por tipo (email, notificacao, documento)
  - `ativo`: boolean (opcional) - Filtrar por status
  - `search`: string (opcional) - Busca por nome ou conteúdo
  - `page`: number
  - `limit`: number
- **Respostas**:
  - `200 OK`: Lista paginada de templates
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `GET /api/configuracoes/templates/{codigo}`
- **Descrição**: Obtém template específico
- **Parâmetros Path**:
  - `codigo`: string - Código do template
- **Respostas**:
  - `200 OK`: Detalhes do template
  - `404 Not Found`: Template não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `PUT /api/configuracoes/templates/{codigo}`
- **Descrição**: Atualiza template existente
- **Parâmetros Path**:
  - `codigo`: string - Código do template
- **Corpo da Requisição**: TemplateUpdateDto
- **Respostas**:
  - `200 OK`: Template atualizado
  - `400 Bad Request`: Dados inválidos
  - `404 Not Found`: Template não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `POST /api/configuracoes/templates/testar`
- **Descrição**: Testa renderização de template com dados de exemplo
- **Corpo da Requisição**: TemplateTestDto
- **Respostas**:
  - `200 OK`: Conteúdo renderizado
  - `400 Bad Request`: Erro de renderização ou dados inválidos
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `GET /api/configuracoes/templates/variaveis`
- **Descrição**: Lista variáveis disponíveis para templates
- **Parâmetros Query**:
  - `tipo`: string - Tipo de template (email, notificacao, documento)
- **Respostas**:
  - `200 OK`: Lista de variáveis com descrições
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

### 3.3 WorkflowController
Gerencia workflows de benefícios.

#### Endpoints:

##### `GET /api/configuracoes/workflows`
- **Descrição**: Lista workflows configurados
- **Parâmetros Query**:
  - `tipo_beneficio_id`: string (opcional) - Filtrar por tipo de benefício
  - `ativo`: boolean (opcional) - Filtrar por status
  - `page`: number
  - `limit`: number
- **Respostas**:
  - `200 OK`: Lista paginada de workflows
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `GET /api/configuracoes/workflows/{tipoBeneficioId}`
- **Descrição**: Obtém workflow para um tipo de benefício específico
- **Parâmetros Path**:
  - `tipoBeneficioId`: string - ID do tipo de benefício
- **Respostas**:
  - `200 OK`: Detalhes do workflow
  - `404 Not Found`: Workflow não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

##### `PUT /api/configuracoes/workflows/{tipoBeneficioId}`
- **Descrição**: Atualiza workflow para um tipo de benefício
- **Parâmetros Path**:
  - `tipoBeneficioId`: string - ID do tipo de benefício
- **Corpo da Requisição**: WorkflowUpdateDto
- **Respostas**:
  - `200 OK`: Workflow atualizado
  - `400 Bad Request`: Dados inválidos
  - `404 Not Found`: Tipo de benefício não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

### 3.4 IntegracaoController
Gerencia configurações de integrações.

#### Endpoints:

##### `GET /api/configuracoes/integracao/{tipo}`
- **Descrição**: Obtém configuração para um tipo de integração
- **Parâmetros Path**:
  - `tipo`: string - Tipo de integração (email, storage, etc.)
- **Respostas**:
  - `200 OK`: Configuração da integração
  - `404 Not Found`: Configuração não encontrada
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador

##### `PUT /api/configuracoes/integracao/{tipo}`
- **Descrição**: Atualiza configuração de integração
- **Parâmetros Path**:
  - `tipo`: string - Tipo de integração
- **Corpo da Requisição**: IntegracaoUpdateDto
- **Respostas**:
  - `200 OK`: Configuração atualizada
  - `400 Bad Request`: Dados inválidos
  - `404 Not Found`: Tipo de integração não encontrado
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador

##### `POST /api/configuracoes/integracao/{tipo}/testar`
- **Descrição**: Testa configuração de integração
- **Parâmetros Path**:
  - `tipo`: string - Tipo de integração
- **Corpo da Requisição**: IntegracaoTestDto
- **Respostas**:
  - `200 OK`: Teste bem-sucedido
  - `400 Bad Request`: Teste falhou
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador

### 3.5 LimitesController
Gerencia limites operacionais do sistema.

#### Endpoints:

##### `GET /api/configuracoes/limites/upload`
- **Descrição**: Obtém limites para upload de arquivos
- **Respostas**:
  - `200 OK`: Limites de upload
  - `403 Forbidden`: Acesso negado
- **Permissão**: Qualquer usuário autenticado

##### `PUT /api/configuracoes/limites/upload`
- **Descrição**: Configura limites de upload
- **Corpo da Requisição**: LimitesUploadDto
- **Respostas**:
  - `200 OK`: Limites atualizados
  - `400 Bad Request`: Dados inválidos
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador

##### `GET /api/configuracoes/prazos`
- **Descrição**: Obtém configurações de prazos do sistema
- **Respostas**:
  - `200 OK`: Configurações de prazos
  - `403 Forbidden`: Acesso negado
- **Permissão**: Qualquer usuário autenticado

##### `PUT /api/configuracoes/prazos/{tipo}`
- **Descrição**: Configura prazo específico
- **Parâmetros Path**:
  - `tipo`: string - Tipo de prazo (solicitacao, pendencia, etc)
- **Corpo da Requisição**: PrazoUpdateDto
- **Respostas**:
  - `200 OK`: Prazo atualizado
  - `400 Bad Request`: Dados inválidos
  - `403 Forbidden`: Acesso negado
- **Permissão**: Administrador, Gestor SEMTAS

## 4. Services

### 4.1 ParametroService
Gerencia parâmetros do sistema.

**Métodos principais**:
- `findAll(filtros, paginacao)`: Busca parâmetros com filtros
- `findByChave(chave)`: Busca parâmetro por chave
- `update(chave, parametroDto, userId)`: Atualiza valor de parâmetro
- `create(parametroDto, userId)`: Cria novo parâmetro
- `getValue(chave, defaultValue)`: Obtém valor convertido para o tipo correto
- `getValueTyped<T>(chave, defaultValue)`: Obtém valor com tipo genérico

### 4.2 TemplateService
Gerencia templates do sistema.

**Métodos principais**:
- `findAll(filtros, paginacao)`: Busca templates com filtros
- `findByCodigo(codigo)`: Busca template por código
- `update(codigo, templateDto, userId)`: Atualiza template
- `create(templateDto, userId)`: Cria novo template
- `renderTemplate(codigo, dados)`: Renderiza template com dados específicos
- `testarTemplate(template, dados)`: Testa renderização sem salvar
- `getVariaveis(tipo)`: Obtém variáveis disponíveis por tipo

### 4.3 WorkflowService
Gerencia workflows de benefícios.

**Métodos principais**:
- `findAll(filtros, paginacao)`: Busca workflows com filtros
- `findByTipoBeneficio(tipoBeneficioId)`: Busca workflow por tipo de benefício
- `update(tipoBeneficioId, workflowDto, userId)`: Atualiza workflow
- `validateWorkflow(workflow)`: Valida consistência do workflow
- `getProximaEtapa(solicitacaoId, etapaAtual)`: Determina próxima etapa do workflow

### 4.4 IntegracaoService
Gerencia configurações de integrações.

**Métodos principais**:
- `findByTipo(tipo)`: Busca configuração por tipo
- `update(tipo, integracaoDto, userId)`: Atualiza configuração
- `testarIntegracao(tipo, dadosTeste)`: Testa integração
- `getConfiguracao(tipo)`: Obtém configuração para uso interno

### 4.5 LimitesService
Gerencia limites operacionais.

**Métodos principais**:
- `getLimitesUpload()`: Obtém limites de upload
- `updateLimitesUpload(limitesDto, userId)`: Atualiza limites de upload
- `getPrazos()`: Obtém todos os prazos configurados
- `updatePrazo(tipo, prazoDto, userId)`: Atualiza prazo específico
- `validatePrazo(prazo)`: Valida prazo dentro de limites aceitáveis

## 5. DTOs (Data Transfer Objects)

### 5.1 Request DTOs

#### ParametroCreateDto
```typescript
// Estrutura conceitual
interface ParametroCreateDto {
  chave: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json' | 'date';
  descricao: string;
  categoria: string;
}
```

#### ParametroUpdateDto
```typescript
// Estrutura conceitual
interface ParametroUpdateDto {
  valor: string;
  descricao?: string;
  categoria?: string;
}
```

#### TemplateUpdateDto
```typescript
// Estrutura conceitual
interface TemplateUpdateDto {
  nome?: string;
  assunto?: string;
  conteudo: string;
  ativo?: boolean;
}
```

#### TemplateTestDto
```typescript
// Estrutura conceitual
interface TemplateTestDto {
  codigo: string;
  dados: Record<string, any>; // Dados de exemplo para substituir variáveis
}
```

#### WorkflowUpdateDto
```typescript
// Estrutura conceitual
interface WorkflowUpdateDto {
  nome?: string;
  descricao?: string;
  etapas: {
    ordem: number;
    descricao: string;
    setor_id: string;
    acao: 'criacao' | 'analise' | 'aprovacao' | 'liberacao' | 'confirmacao';
    prazo_sla: number;
    template_notificacao_id?: string;
  }[];
  ativo?: boolean;
}
```

#### IntegracaoUpdateDto
```typescript
// Estrutura conceitual
interface IntegracaoUpdateDto {
  nome?: string;
  parametros: Record<string, string>;
  ativo?: boolean;
}
```

#### LimitesUploadDto
```typescript
// Estrutura conceitual
interface LimitesUploadDto {
  tamanho_maximo: number; // Tamanho em bytes
  formatos_permitidos: string[]; // Lista de extensões ou MIME types
  quantidade_maxima_arquivos: number;
}
```

#### PrazoUpdateDto
```typescript
// Estrutura conceitual
interface PrazoUpdateDto {
  dias: number;
  horas?: number;
  descricao?: string;
}
```

### 5.2 Response DTOs

#### ParametroResponseDto
```typescript
// Estrutura conceitual
interface ParametroResponseDto {
  chave: string;
  valor: string;
  tipo: string;
  descricao: string;
  categoria: string;
  valor_formatado: any; // Valor convertido para o tipo correto
  created_at: Date;
  updated_at: Date;
  updated_by: {
    id: string;
    nome: string;
  };
}
```

#### TemplateResponseDto
```typescript
// Estrutura conceitual
interface TemplateResponseDto {
  codigo: string;
  nome: string;
  tipo: string;
  assunto?: string;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: {
    id: string;
    nome: string;
  };
}
```

#### WorkflowResponseDto
```typescript
// Estrutura conceitual
interface WorkflowResponseDto {
  id: string;
  tipo_beneficio: {
    id: string;
    nome: string;
  };
  nome: string;
  descricao: string;
  etapas: {
    ordem: number;
    descricao: string;
    setor: {
      id: string;
      nome: string;
    };
    acao: string;
    prazo_sla: number;
    template_notificacao_id?: string;
  }[];
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: {
    id: string;
    nome: string;
  };
}
```

#### IntegracaoResponseDto
```typescript
// Estrutura conceitual
interface IntegracaoResponseDto {
  id: string;
  tipo: string;
  nome: string;
  parametros: Record<string, string>; // Versão sanitizada (sem senhas)
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  updated_by: {
    id: string;
    nome: string;
  };
}
```

#### LimitesUploadResponseDto
```typescript
// Estrutura conceitual
interface LimitesUploadResponseDto {
  tamanho_maximo: number;
  tamanho_maximo_formatado: string; // Versão formatada (ex: "5 MB")
  formatos_permitidos: string[];
  quantidade_maxima_arquivos: number;
}
```

## 6. Parâmetros do Sistema

### 6.1 Parâmetros Gerais
- `sistema.nome`: Nome do sistema (exibido na interface)
- `sistema.versao`: Versão atual do sistema
- `sistema.contato_suporte`: Email de contato para suporte
- `sistema.timezone`: Fuso horário padrão

### 6.2 Segurança
- `seguranca.token_expiracao`: Tempo de expiração de tokens (em minutos)
- `seguranca.senha_min_length`: Tamanho mínimo de senha
- `seguranca.senha_max_tentativas`: Máximo de tentativas de login
- `seguranca.senha_validade_dias`: Validade da senha em dias

### 6.3 Notificações
- `notificacao.email_ativo`: Ativa/desativa envio de emails
- `notificacao.email_remetente`: Email do remetente
- `notificacao.email_nome_remetente`: Nome exibido do remetente

### 6.4 Limites e Prazos
- `limites.tamanho_maximo_upload`: Tamanho máximo para upload (bytes)
- `limites.arquivos_por_solicitacao`: Número máximo de arquivos por solicitação
- `prazos.analise_dias`: Prazo para análise (dias)
- `prazos.pendencia_dias`: Prazo para solução de pendências (dias)
- `prazos.liberacao_dias`: Prazo para liberação após aprovação (dias)

### 6.5 Benefícios
- `beneficio.aluguel_social.valor_maximo`: Valor máximo para Aluguel Social
- `beneficio.aluguel_social.meses_max`: Máximo de meses para Aluguel Social
- `beneficio.auxilio_natalidade.prazo_solicitacao`: Prazo máximo para solicitar (dias após nascimento)

## 7. Templates do Sistema

### 7.1 Templates de Email
- `email_nova_solicitacao`: Notificação de nova solicitação
- `email_solicitacao_aprovada`: Notificação de aprovação
- `email_solicitacao_pendente`: Notificação de pendência
- `email_liberacao_beneficio`: Notificação de liberação
- `email_reset_senha`: Instruções para redefinição de senha

### 7.2 Templates de Notificação Interna
- `notificacao_pendencia`: Notificação de nova pendência
- `notificacao_aprovacao`: Notificação de aprovação
- `notificacao_liberacao`: Notificação de liberação para pagamento
- `notificacao_alerta_prazo`: Alerta de prazo expirando

### 7.3 Templates de Documento
- `termo_recebimento`: Termo de recebimento do benefício
- `comprovante_liberacao`: Comprovante de liberação
- `relatorio_beneficios`: Template de relatório de benefícios concedidos

## 8. Segurança e Permissões

### 8.1 Controle de Acesso
- Administrador: Acesso total ao módulo de configuração
- Gestor SEMTAS: Acesso limitado a templates e alguns parâmetros
- Outros perfis: Acesso apenas aos endpoints de consulta pública

### 8.2 Validação de Dados Sensíveis
- Mascaramento de senhas e tokens em logs e respostas
- Validação rigorosa para alterações críticas
- Hash seguro para armazenamento de credenciais

### 8.3 Auditoria de Alterações
- Registro detalhado de todas as alterações em configurações
- Registro de quem alterou cada parâmetro ou template
- Histórico de versões para templates críticos

## 9. Integração com Outros Módulos

### 9.1 Módulo de Notificação
- Fornece templates para envio de emails e notificações
- Disponibiliza configurações de servidor SMTP

### 9.2 Módulo de Solicitação
- Utiliza workflows configurados para cada tipo de benefício
- Consulta prazos e limites para validações

### 9.3 Módulo de Documento
- Utiliza configurações de armazenamento e limites de upload
- Acessa templates para geração de documentos

### 9.4 Módulo de Usuário
- Aplica configurações de segurança (políticas de senha, expiração de tokens)
- Verifica permissões para acesso às configurações

## 10. Testes

### 10.1 Testes Unitários
- Conversão de tipos de parâmetros
- Renderização de templates
- Validação de workflows
- Sanitização de dados sensíveis

### 10.2 Testes de Integração
- Carregamento e aplicação de configurações
- Funcionalidade end-to-end de templates
- Testes de conexão com serviços externos

### 10.3 Testes de Segurança
- Verificação de controle de acesso
- Proteção contra adulteração de configurações
- Auditoria de alterações

## 11. Documentação

### 11.1 Swagger/OpenAPI
- Documentação completa de todos os endpoints
- Exemplos de requisição e resposta
- Descrição de parâmetros e códigos de erro

### 11.2 Documentação Interna
- Descrição detalhada de cada parâmetro do sistema
- Referência de variáveis disponíveis para templates
- Explicação da estrutura de workflows