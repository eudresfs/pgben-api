# Modelagem de Dados

# Documentação Técnica e Operacional

## 1\. Modelo Conceitual

  

### 1.1 Visão Geral

  

A PGBen (Plataforma de Gestão de Benefícios) da SEMTAS é estruturado em torno de um modelo de dados que permite o gerenciamento completo do ciclo de vida de benefícios sociais, desde a solicitação até a liberação, com foco em auditoria, segurança e conformidade com a LGPD.

  

Este documento apresenta o projeto de modelagem de dados para a PGBen (Plataforma de Gestão de Benefícios) da SEMTAS - Natal/RN, seguindo os requisitos funcionais identificados e a arquitetura tecnológica selecionada.

### 1.2 Principais Entidades

  

O sistema é estruturado ao redor das seguintes entidades principais:

  

1. **Usuário (User)**: Operadores do sistema com diferentes perfis de acesso (Administrador, Gestor SEMTAS, Técnico SEMTAS, Técnico Unidade)
2. **Unidade (Unidade)**: unidade de atendimento (CRAS, CREAS, etc.) onde são realizados os atendimentos
3. **Setor (Setor)**: Divisões organizacionais dentro das unidade
4. **Cidadão (Cidadao)**: Pessoas que podem atuar como beneficiários ou solicitantes de benefícios
5. **Tipo de Benefício (TipoBeneficio)**: Categorias de benefícios disponíveis (Auxílio Natalidade, Aluguel Social, etc.)
6. **Solicitação (Solicitacao)**: Pedidos de benefícios registrados no sistema
7. **Documento (Documento)**: Documentos anexados às solicitações
8. **Histórico (HistoricoSolicitacao)**: Registro cronológico de mudanças de status nas solicitações

  

### 1.3 Relacionamentos Principais

  

*   **Usuário → Unidade**: Um usuário está vinculado a uma unidade específica
*   **Usuário → Setor**: Um usuário pertence a um setor dentro da unidade
*   **Setor → Unidade**: Um setor pode estar presente em múltiplas unidade (N:M)
*   **Solicitação → Cidadão**: Uma solicitação está associada a um cidadão (beneficiário)
*   **Solicitação → Tipo de Benefício**: Uma solicitação refere-se a um tipo específico de benefício
*   **Solicitação → Unidade**: Uma solicitação é feita através de uma unidade de atendimento
*   **Solicitação → Usuário**: Uma solicitação é registrada, analisada, aprovada e liberada por diferentes usuários
*   **Documento → Solicitação**: Um documento pertence a uma solicitação específica
*   **Histórico → Solicitação**: Cada registro de histórico pertence a uma solicitação

  

### 1.4 Diagrama Conceitual

  

O sistema adota uma arquitetura em camadas com separação clara entre:

  

```css
[USUÁRIOS] → [unidade/setor]
    ↓
[TIPOS DE BENEFÍCIO] → [REQUISITOS/FLUXOS]
    ↓
[CIDADÃOS] → [DADOS SOCIAIS/COMPOSIÇÃO FAMILIAR]
    ↓
[SOLICITAÇÕES] → [DOCUMENTOS/PENDÊNCIAS]
    ↓
[HISTÓRICO/AUDITORIA]
```

  

## 2\. Guias Operacionais

  

### 2.1 Backup e Recuperação

  

#### 2.1.1 Estratégia de Backup

  

*   **Backup Incremental Diário**: Executado automaticamente todos os dias à 01:00
*   **Backup Completo Semanal**: Executado aos domingos às 02:00
*   **Retenção**:
    *   Backups diários: 7 dias
    *   Backups semanais: 4 semanas
    *   Backups mensais: 12 meses

  

#### 2.1.2 Procedimento de Recuperação

  

Em caso de necessidade de recuperação:

  

1. Parar todos os serviços relacionados ao sistema
2. Restaurar o backup mais recente do banco de dados
3. Restaurar arquivos de documento do backup correspondente
4. Verificar integridade dos dados restaurados
5. Reiniciar os serviços

  

### 2.2 Manutenção

  

#### 2.2.1 Manutenção de Rotina

  

*   **Verificação de Integridade**: Executar `VACUUM ANALYZE` semanalmente
*   **Gerenciamento de Índices**: Reconstruir índices fragmentados mensalmente
*   **Limpeza de Arquivos Temporários**: Limpar diretórios temporários semanalmente
*   **Verificação de Crescimento do Banco**: Monitorar crescimento das tabelas mensalmente

  

#### 2.2.2 Atualizações

  

*   **Janela de Manutenção**: Domingos das 22:00 às 02:00
*   **Procedimento de Atualização**:
    1. Criar backup completo pré-atualização
    2. Executar migrations pendentes
    3. Atualizar código da aplicação
    4. Executar testes de verificação
    5. Retornar o sistema à operação

  

## 3\. Monitoramento e Logs

  

### 3.1 Infraestrutura de Monitoramento

  

*   **PostgreSQL Metrics**: Monitoramento de performance do banco de dados
*   **Logs de Aplicação**: Registros detalhados de atividades do sistema
*   **Logs de Auditoria**: Registro de todas as ações realizadas pelos usuários

  

### 3.2 Alertas

  

*   **Disco**: Alerta quando o espaço disponível for menor que 20%
*   **CPU/Memória**: Alerta quando o uso persistir acima de 80% por mais de 10 minutos
*   **Erros de Aplicação**: Alerta imediato para erros críticos ou falhas em transações
*   **Segurança**: Alerta para múltiplas tentativas de login mal-sucedidas

  

### 3.3 Logs de Auditoria

  

O sistema mantém um registro detalhado de todas as ações realizadas:

  

*   **Escopo**: Todas as operações CRUD em entidades críticas
*   **Detalhamento**: Usuário, ação, data/hora, IP, dados antes/depois
*   **Retenção**: 5 anos, com particionamento mensal para performance
*   **Acesso**: Visualização restrita a usuários com perfil administrador

  

## 4\. Segurança e LGPD

  

### 4.1 Medidas de Segurança

  

*   **Autenticação**: Senhas com requisitos de complexidade, expiração a cada 90 dias
*   **Autorização**: RBAC (Role-Based Access Control) com perfis claramente definidos
*   **Proteção de Dados**: Dados sensíveis nunca expostos em logs ou URLs
*   **Auditoria**: Registro de todas as ações para rastreabilidade
*   **Comunicação**: HTTPS obrigatório para todas as comunicações
*   **Documentos**: Armazenamento seguro com acesso controlado e verificação de permissões

  

### 4.2 Conformidade com a LGPD

  

*   **Minimização de Dados**: Coleta apenas de informações necessárias
*   **Finalidade Específica**: Cada dado tem propósito claro e documentado
*   **Consentimento**: Registro de consentimento com data e IP
*   **Direitos do Titular**:
    *   Acesso aos dados pessoais
    *   Correção de dados incorretos
    *   Portabilidade (exportação)
    *   Anonimização após período definido
*   **Retenção de Dados**:
    *   Dados pessoais: 5 anos após última interação
    *   Documentos sensíveis: 3 meses após conclusão do processo
    *   Logs de acesso: 6 meses
*   **Vazamento de Dados**: Procedimento documentado para notificação e contenção

  

### 4.3 Anonimização Automática

  

O sistema implementa rotinas automáticas para:

*   Limpar documentos antigos (após 3 meses da conclusão)
*   Anonimizar dados de beneficiários inativos (após 5 anos sem interação)
*   Mascarar dados sensíveis em APIs e relatórios

  

## 5\. Recomendações

  

### 5.1 Desempenho

  

*   Manter índices atualizados conforme padrões de consulta
*   Considerar cache para consultas frequentes sobre dados estáticos
*   Monitorar crescimento das tabelas `logs_auditoria` e `documentos`
*   Implementar particionamento para tabelas que crescem rapidamente

  

### 5.2 Segurança

  

*   Implementar rotação regular de chaves de criptografia
*   Realizar testes de penetração periodicamente
*   Revisar permissões de usuários trimestralmente
*   Manter política de senhas forte e implementar 2FA

  

### 5.3 Extensibilidade

  

*   Ao adicionar novos tipos de benefício, seguir o padrão estabelecido
*   Utilizar a tabela unificada `dados_beneficios` para novos benefícios
*   Manter consistência nos nomes das entidades e campos
*   Considerar particionamento por tipo de benefício em caso de grande volume

  

## 6\. Conclusão

  

O modelo de dados da Plataforma de Gestão de Benefícios PGBen da SEMTAS foi projetado para atender aos requisitos funcionais da legislação municipal, enquanto garante performance, segurança e conformidade com regulamentações de proteção de dados.

  

A arquitetura permite fácil extensão para novos tipos de benefícios, mantém registro completo das atividades para auditoria e proporciona uma experiência eficiente para os técnicos que gerenciam os processos.

  

Para uma implementação bem-sucedida, é essencial seguir as recomendações de indexação, monitoramento e segurança descritas nesta documentação, além de manter rotinas regulares de manutenção e backup.