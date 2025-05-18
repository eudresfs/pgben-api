# Checklist de Implementação: Módulo de Pagamento/Liberação

Este documento contém um checklist detalhado das tarefas para implementação completa do Módulo de Pagamento/Liberação do PGBen, dividido em componentes e funcionalidades específicas.

## Configuração Inicial

- [x] Criar estrutura de diretórios do módulo de acordo com padrões
  - [x] Preparar diretórios controllers, services, entities, dtos, interfaces, etc.
  - [x] Configurar módulo principal (pagamento.module.ts)
- [x] Configurar dependências e importações necessárias
  - [x] Importar módulos necessários (TypeOrmModule, ConfigModule, etc.)
  - [x] Configurar providers de serviços
  - [x] Definir exportações do módulo

## Entidades e Migrações

### Entidade Pagamento
- [x] Implementar entidade Pagamento com todos os campos necessários
  - [x] Definir campos básicos (id, valor, status, método, etc.)
  - [x] Implementar relacionamentos (solicitação, info bancária, etc.)
  - [x] Configurar índices para otimização
  - [x] Configurar soft delete
- [x] Implementar migration para tabela de pagamento
  - [x] Criar tabela com todos os campos necessários
  - [x] Definir índices e chaves estrangeiras
  - [x] Implementar triggers necessários
  - [x] Configurar políticas RLS (Row-Level Security)

### Entidade ComprovantePagamento
- [x] Implementar entidade ComprovantePagamento
  - [x] Definir campos para metadados do documento (nome, caminho, tamanho, etc.)
  - [x] Configurar relacionamentos com Pagamento
  - [x] Configurar timestamps e usuário responsável
- [x] Implementar migration para tabela de comprovantes
  - [x] Criar tabela com campos para metadados e relacionamento
  - [x] Definir índices para busca eficiente
  - [x] Configurar políticas de segurança RLS

### Entidade ConfirmacaoRecebimento
- [x] Implementar entidade ConfirmacaoRecebimento
  - [x] Definir campos para registro de confirmação
  - [x] Configurar relacionamentos com Pagamento
  - [x] Configurar campos para auditoria
- [x] Implementar migration para tabela de confirmação
  - [x] Criar tabela com todos os campos necessários
  - [x] Definir índices e chaves estrangeiras
  - [x] Configurar políticas RLS

## DTOs e Validadores

### DTOs de Request
- [x] Implementar PagamentoCreateDto
  - [x] Definir todos os campos necessários para criação de pagamento
  - [x] Adicionar validações com class-validator
  - [x] Configurar documentação Swagger com @ApiProperty
- [x] Implementar ComprovanteUploadDto
  - [x] Definir campos para upload de comprovantes
  - [x] Implementar validações específicas para arquivos
  - [x] Configurar documentação Swagger
- [x] Implementar ConfirmacaoRecebimentoDto
  - [x] Definir campos para registro de confirmação
  - [x] Adicionar validações com class-validator
  - [x] Configurar documentação Swagger

### DTOs de Response
- [x] Implementar PagamentoResponseDto
  - [x] Definir estrutura completa da resposta
  - [x] Implementar transformação de dados
  - [x] Mascarar dados sensíveis (bancários/PIX)
- [x] Implementar ComprovanteResponseDto
  - [x] Definir estrutura para retornar dados de comprovantes
  - [x] Configurar URLs seguras para acesso
- [x] Implementar ConfirmacaoResponseDto
  - [x] Definir estrutura para retornar dados de confirmação

### Validadores Especializados (implementar ou reutilizar os validadodres do módulo shared)
- [x] Implementar validador de PIX 
  - [x] Validar CPF (com dígitos verificadores)
  - [x] Validar E-mail (formato completo)
  - [x] Validar Telefone (formato brasileiro)
  - [x] Validar chave aleatória (formato UUID)
- [x] Implementar validador de dados bancários
  - [x] Validar formato de agência
  - [x] Validar formato de conta
  - [x] Validar dígitos verificadores
- [x] Implementar validador de fluxo de status
  - [x] Validar transições permitidas entre status

## Services

### PagamentoService
- [x] Implementar métodos principais
  - [x] createPagamento - Criar novo registro de pagamento
  - [x] findAll - Listar pagamentos com filtros
  - [x] findOne - Obter pagamento específico
  - [x] update - Atualizar informações de pagamento
- [x] Implementar métodos específicos
  - [x] liberarPagamento - Atualizar status para LIBERADO
  - [x] cancelarPagamento - Cancelar um pagamento
  - [x] findPendentes - Listar pagamentos pendentes
- [x] Implementar validações específicas
  - [x] Validar informações bancárias
  - [x] Validar chaves PIX
  - [x] Validar valores e limites

### ComprovanteService
- [x] Implementar métodos principais
  - [x] uploadComprovante - Processar upload de arquivo
  - [x] findAllByPagamento - Listar comprovantes por pagamento
  - [x] getComprovanteContent - Obter conteúdo do arquivo
  - [x] removeComprovante - Excluir comprovante

### ConfirmacaoService
- [x] Implementar métodos principais
  - [x] registrarConfirmacao - Registrar nova confirmação
  - [x] getConfirmacao - Obter dados de confirmação
  - [x] findAllByPagamento - Listar confirmações por pagamento
- [x] Implementar validações específicas
  - [x] Verificar se pagamento está no status adequado
  - [x] Validar dados do destinatário (se diferente do beneficiário)

### Integrações com Outros Serviços
- [x] Integrar com ServicoSolicitacao
  - [x] Verificar status da solicitação antes do pagamento
  - [x] Atualizar status da solicitação após pagamento
- [x] Integrar com ServicoCidadao
  - [x] Obter dados pessoais do beneficiário
  - [x] Verificar informações bancárias cadastradas
- [x] Integrar com ServicoDocumento
  - [x] Armazenar comprovantes de pagamento
  - [x] Gerenciar metadados dos documentos
- [x] Integrar com ServicoAuditoria
  - [x] Registrar operações sensíveis
  - [x] Rastrear mudanças de status
  - [x] Registrar uploads e downloads de comprovantes

## Controllers

### PagamentoController
- [x] Implementar endpoint GET /api/pagamentos
  - [x] Configurar filtros e paginação
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint GET /api/pagamentos/{id}
  - [x] Validar parâmetros
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint POST /api/pagamentos/liberar/{solicitacaoId}
  - [x] Validar parâmetros e corpo
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint PATCH /api/pagamentos/{id}/cancelar
  - [x] Validar parâmetros e corpo
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint GET /api/pagamentos/pendentes
  - [x] Configurar filtros e paginação
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint GET /api/pagamentos/info-bancarias/{beneficiarioId}
  - [x] Validar parâmetros
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger

### ComprovanteController
- [x] Implementar endpoint POST /api/pagamentos/{pagamentoId}/comprovantes
  - [x] Configurar upload de arquivo
  - [x] Validar arquivo e metadados
  - [x] Documentar com Swagger
- [x] Implementar endpoint GET /api/pagamentos/{pagamentoId}/comprovantes
  - [x] Validar parâmetros
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint GET /api/pagamentos/{pagamentoId}/comprovantes/{comprovanteId}
  - [x] Validar parâmetros
  - [x] Implementar controle de acesso com verificação de segurança
  - [x] Documentar com Swagger
- [x] Implementar endpoint DELETE /api/pagamentos/{pagamentoId}/comprovantes/{comprovanteId}
  - [x] Validar parâmetros
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger

### ConfirmacaoController
- [x] Implementar endpoint POST /api/pagamentos/{pagamentoId}/confirmacao
  - [x] Validar parâmetros e corpo
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger
- [x] Implementar endpoint GET /api/pagamentos/{pagamentoId}/confirmacao
  - [x] Validar parâmetros
  - [x] Implementar controle de acesso
  - [x] Documentar com Swagger

## Segurança e Auditoria

- [x] Implementar mascaramento de dados sensíveis
  - [x] Mascarar CPF em logs e respostas (ex: ***.***.***-**)
  - [x] Mascarar chaves PIX (exibir apenas parte inicial)
  - [x] Mascarar dados bancários (ocultar números intermediários)
- [x] Configurar logs detalhados para operações
  - [x] Registrar quem realizou cada operação
  - [x] Registrar timestamps precisos
  - [x] Registrar IP e dispositivo quando possível
- [x] Implementar rastreabilidade completa
  - [x] Histórico de mudanças de status
  - [x] Registro de todas alterações em pagamentos
  - [x] Trilha de auditoria para uploads e downloads

## Testes

### Testes Unitários
- [x] Implementar testes para validadores
  - [x] Testes para validação de PIX
  - [x] Testes para validação de dados bancários
  - [x] Testes para validação de fluxo de status
- [x] Implementar testes para serviços
  - [x] Testes para PagamentoService
  - [x] Testes para IntegracaoCidadaoService
  - [x] Testes para IntegracaoDocumentoService
  - [x] Testes para IntegracaoSolicitacaoService
  - [x] Testes para AuditoriaPagamentoService

### Testes de Integração
- [x] Implementar testes para fluxos principais
  - [x] Teste de fluxo completo liberar → confirmar
  - [x] Teste de upload e validação de comprovantes
  - [x] Teste de integração com serviço de solicitação
- [x] Implementar testes de segurança
  - [x] Testes de controle de acesso por perfil
  - [x] Testes de validação de uploads maliciosos
  - [x] Testes de proteção contra acessos não autorizados
- [x] Implementar testes de gerenciamento de comprovantes
  - [x] Testes de upload de diferentes tipos de arquivo
  - [x] Testes de listagem e visualização de comprovantes
  - [x] Testes de remoção de comprovantes

## Documentação

- [x] Documentar todos os endpoints com Swagger/OpenAPI
  - [x] Descrever parâmetros e corpos de requisição
  - [x] Documentar respostas possíveis
  - [x] Adicionar exemplos de uso
- [x] Criar guia de uso do módulo
  - [x] Descrever propósito e funcionalidades
  - [x] Explicar estrutura e fluxos
  - [x] Documentar dependências e integrações
  - [x] Incluir diagramas de sequência para fluxos principais
- [x] Adicionar comentários JSDoc para métodos complexos
  - [x] Documentar regras de negócio
  - [x] Documentar validações específicas
  - [x] Documentar fluxos condicionais
- [x] Implementar decoradores personalizados para Swagger
  - [x] Criar decoradores para endpoints comuns
  - [x] Padronizar documentação de respostas
  - [x] Melhorar apresentação da documentação

## Finalização e Revisão

- [x] Realizar verificações finais
  - [x] Verificar cobertura de testes
  - [x] Executar análise estática de código
  - [x] Verificar conformidade com padrões do projeto
- [x] Verificar integrações com outros módulos
  - [x] Testar integração com módulo de solicitação
  - [x] Testar integração com módulo de cidadão
  - [x] Testar integração com módulo de auditoria
  - [x] Testar integração com módulo de documento
- [x] Verificar requisitos de segurança
  - [x] Confirmar mascaramento de dados sensíveis
  - [x] Verificar controle de acesso adequado
  - [x] Validar completude dos logs de auditoria
- [x] Implementar validador de erros padronizado
  - [x] Criar mensagens de erro consistentes
  - [x] Centralizar criação de exceções
  - [x] Garantir segurança em mensagens de erro

---

*Última atualização: 18/05/2025 - 18:50*  
*Responsável: Equipe de Desenvolvimento PGBen*
