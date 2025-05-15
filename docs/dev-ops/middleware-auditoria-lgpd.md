# Middleware de Auditoria para Compliance com LGPD

## Introdução

Este documento descreve a implementação do middleware de auditoria no sistema PGBen, desenvolvido para garantir a compliance com a Lei Geral de Proteção de Dados (LGPD) e fornecer rastreabilidade completa das operações realizadas no sistema.

## Visão Geral

O middleware de auditoria é um componente central para a segurança e compliance do sistema PGBen, registrando automaticamente todas as operações realizadas pelos usuários, com foco especial no acesso a dados pessoais e sensíveis.

## Funcionalidades Implementadas

### 1. Registro Automático de Operações

O middleware intercepta todas as requisições HTTP e registra automaticamente:

- **Tipo de operação**: Create, Read, Update ou Delete
- **Entidade afetada**: Qual entidade do sistema foi manipulada
- **Dados manipulados**: Estado anterior e posterior dos dados (quando aplicável)
- **Usuário responsável**: Identificação do usuário que realizou a operação
- **Contexto da operação**: IP, User-Agent, endpoint acessado, método HTTP
- **Timestamp**: Data e hora exata da operação

### 2. Detecção de Acesso a Dados Sensíveis

O middleware identifica automaticamente quando dados sensíveis são acessados, como:

- CPF, RG e outros documentos de identificação
- Dados de renda familiar
- Informações de contato (telefone, endereço)
- Composição familiar
- Informações sobre vulnerabilidades sociais

Estes acessos são registrados de forma especial, permitindo a geração de relatórios específicos para compliance com a LGPD.

### 3. API de Consulta de Logs

Foram implementados endpoints para consulta dos logs de auditoria:

- Busca por período
- Busca por usuário
- Busca por entidade
- Busca por tipo de operação
- Relatórios de acesso a dados sensíveis

### 4. Segurança dos Logs

Os logs de auditoria são protegidos por:

- Acesso restrito apenas a usuários com perfil de administrador ou gestor
- Armazenamento em tabela específica com índices otimizados
- Impossibilidade de alteração ou exclusão dos registros

## Arquitetura

A implementação segue uma arquitetura modular:

1. **Middleware de Auditoria**: Intercepta requisições e registra operações
2. **Entidade LogAuditoria**: Define a estrutura dos logs no banco de dados
3. **Serviço de Auditoria**: Gerencia a persistência e consulta dos logs
4. **Controlador de Auditoria**: Expõe endpoints para consulta dos logs

## Compliance com LGPD

Esta implementação atende aos seguintes requisitos da LGPD:

### Artigo 6º - Princípios

- **Transparência**: Todas as operações são registradas e podem ser auditadas
- **Segurança**: Controle de acesso rigoroso aos dados pessoais
- **Prevenção**: Detecção proativa de acessos indevidos
- **Responsabilização e prestação de contas**: Rastreabilidade completa das operações

### Artigo 46 - Segurança e Sigilo de Dados

O middleware implementa medidas técnicas para:
- Proteger os dados pessoais de acessos não autorizados
- Registrar quem acessou quais dados e quando
- Identificar situações de vazamento de dados

### Artigo 37 - Relatórios de Impacto

Os logs gerados permitem a elaboração de relatórios detalhados sobre:
- Quais dados pessoais são tratados
- Quem tem acesso a esses dados
- Frequência e finalidade dos acessos

## Como Utilizar

### Consulta de Logs via API

```
GET /api/v1/auditoria?entidade=Cidadao&data_inicial=2025-01-01T00:00:00Z
```

### Geração de Relatórios de Compliance

```
GET /api/v1/auditoria/relatorios/dados-sensiveis?data_inicial=2025-01-01T00:00:00Z&data_final=2025-01-31T23:59:59Z
```

## Próximos Passos

1. **Dashboards de Auditoria**: Implementar visualizações gráficas dos logs
2. **Alertas Automáticos**: Configurar alertas para padrões suspeitos de acesso
3. **Exportação de Relatórios**: Adicionar funcionalidade de exportação em formatos como PDF e CSV
4. **Retenção de Logs**: Implementar política de retenção de logs conforme necessidades legais

## Conclusão

O middleware de auditoria é um componente fundamental para garantir a compliance com a LGPD e a segurança do sistema PGBen. Sua implementação permite o rastreamento completo das operações realizadas no sistema, com foco especial no acesso a dados pessoais e sensíveis, fornecendo as evidências necessárias para demonstrar conformidade com a legislação.
