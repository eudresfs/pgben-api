# Estrutura de Módulos do Sistema SEMTAS

Este documento descreve a estrutura de módulos do Sistema de Gestão de Benefícios Eventuais da SEMTAS, seguindo o padrão modular do NestJS e as especificações do checklist de preparação.

## Visão Geral da Arquitetura

O sistema segue uma arquitetura modular baseada em domínios, onde cada módulo representa uma área funcional específica do sistema. Cada módulo contém seus próprios componentes (controllers, services, entities, DTOs, etc.) e pode ser desenvolvido, testado e mantido de forma independente.


## Descrição dos Módulos

### 1. Módulo de unidade

**Responsabilidade**: Gerenciar unidade (CRAS, CREAS) e setor da SEMTAS.

**Entidades principais**:
- `Unidade`: Representa uma unidade física da SEMTAS (CRAS, CREAS).
- `Setor`: Representa um setor dentro de uma unidade ou da administração central.

**Funcionalidades**:
- CRUD de unidade
- CRUD de setor
- Associação de setor a unidade
- Listagem de unidade com filtros

### 2. Módulo de Cidadãos

**Responsabilidade**: Gerenciar o cadastro de beneficiários/solicitantes.

**Entidades principais**:
- `Cidadao`: Dados pessoais do cidadão.
- `DadosSociais`: Informações socioeconômicas do cidadão.

**Funcionalidades**:
- CRUD de cidadãos
- Busca por CPF, nome, etc.
- Gestão de dados sociais
- Histórico de benefícios recebidos

### 3. Módulo de Benefícios

**Responsabilidade**: Gerenciar tipos de benefícios e seus requisitos.

**Entidades principais**:
- `Beneficio`: Tipo de benefício (Auxílio Natalidade, Aluguel Social).
- `Requisito`: Requisitos documentais e critérios para cada benefício.

**Funcionalidades**:
- CRUD de tipos de benefícios
- Configuração de requisitos por benefício
- Definição de regras de concessão

### 4. Módulo de Solicitações

**Responsabilidade**: Gerenciar o workflow de solicitações de benefícios.

**Entidades principais**:
- `Solicitacao`: Solicitação de benefício feita por um cidadão.
- `HistoricoSolicitacao`: Registro de alterações de status e observações.

**Funcionalidades**:
- Criação de solicitações
- Workflow de aprovação
- Histórico de alterações
- Consulta de status

### 5. Módulo de Documentos

**Responsabilidade**: Gerenciar uploads e armazenamento de documentos.

**Entidades principais**:
- `Documento`: Metadados de documento enviado.

**Funcionalidades**:
- Upload de documentos
- Validação de tipos de arquivo
- Armazenamento seguro no MinIO
- Geração de URLs assinadas

### 6. Módulo de Relatórios

**Responsabilidade**: Gerar relatórios e dashboards.

**Funcionalidades**:
- Relatórios de benefícios concedidos
- Estatísticas por unidade/período
- Dashboards de KPIs
- Exportação em diferentes formatos

### 7. Módulo de Notificações

**Responsabilidade**: Gerenciar notificações e emails.

**Entidades principais**:
- `Notificacao`: Registro de notificação enviada.

**Funcionalidades**:
- Envio de emails
- Notificações de status
- Templates de mensagens
- Histórico de comunicações

### 8. Módulo de Auth (Estendido)

**Responsabilidade**: Gerenciar autenticação e autorização.

**Funcionalidades**:
- Login/logout
- Refresh token
- RBAC (Role-Based Access Control)
- Perfis específicos da SEMTAS

## Relacionamentos entre Módulos

- Um `Cidadao` pode ter múltiplas `Solicitacao`
- Uma `Solicitacao` está associada a um `Beneficio`
- Uma `Solicitacao` pode ter múltiplos `Documento`
- Um `Usuario` pertence a uma `Unidade` e um `Setor`
- Uma `Notificacao` pode estar associada a uma `Solicitacao`

## Convenções de Nomenclatura

- **Entidades**: Singular, PascalCase (ex: `Unidade`, `Cidadao`)
- **DTOs**: PascalCase com sufixo Dto (ex: `CreateUnidadeDto`)
- **Controllers**: Plural, sufixo Controller (ex: `unidadeController`)
- **Services**: Singular ou plural conforme contexto, sufixo Service (ex: `CidadaosService`)
- **Repositories**: Plural, sufixo Repository (ex: `SolicitacoesRepository`)

## Implementação Inicial

Para o MVP, focar na implementação dos módulos:
1. Unidades
2. Cidadãos
3. Benefícios (Auxílio Natalidade e Aluguel Social)
4. Solicitações
5. Documentos

Os módulos de Relatórios e Notificações podem ser implementados em uma fase posterior.