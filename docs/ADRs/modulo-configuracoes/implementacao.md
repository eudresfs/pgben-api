# ADR: Implementação do Módulo de Configuração

## 1. Contexto

O PGBen (Plataforma de Gestão de Benefícios Eventuais) da SEMTAS necessita de um módulo centralizado para gerenciar configurações, parâmetros, templates e workflows. Atualmente, estas configurações estão espalhadas pelo código-fonte, tornando difíceis e arriscadas as alterações operacionais. Este ADR documenta as decisões arquiteturais para a implementação do Módulo de Configuração que permitirá a personalização do sistema sem alterações no código.

## 2. Status

PROPOSTO

## 3. Problema

O sistema precisa de um mecanismo flexível, seguro e centralizador para gerenciar:

1. Parâmetros operacionais (prazos, limites, URLs, etc.)
2. Templates para comunicações (emails, notificações) e documentos
3. Workflows de aprovação por tipo de benefício
4. Configurações de integrações externas

Estes elementos devem ser gerenciáveis via API por usuários administradores, mantendo controle sobre alterações, garantindo segurança para dados sensíveis e tendo um impacto mínimo de desempenho.

## 4. Decisões

### 4.1. Armazenamento de Parâmetros

**Decisão**: Armazenar parâmetros em banco de dados relacional com conversão dinâmica de tipos.

**Rationale**:
- Permite persistência confiável e transacional
- Facilita auditoria de alterações
- Permite agrupamento e categorização
- Possibilita conversão automática para tipos nativos (number, boolean, date, etc.)

### 4.2. Motor de Template

**Decisão**: Utilizar Handlebars como motor de template com extensões customizadas para segurança.

**Rationale**:
- Sintaxe simples e familiar para administradores ({{variavel}})
- Suporte a condicionais, loops e helpers
- Boa performance e segurança contra injeções
- Ecossistema maduro com documentação extensa

### 4.3. Definição de Workflows

**Decisão**: Definir workflows como sequência ordenada de etapas associadas a setores e ações.

**Rationale**:
- Flexibilidade para diferentes tipos de benefícios
- Capacidade de cálculo de SLA por etapa
- Facilidade de visualização sequencial
- Controle de permissões por setor

### 4.4. Segurança de Integrações

**Decisão**: Implementar criptografia de credenciais em nível de aplicação utilizando AES-256-GCM.

**Rationale**:
- Proteção de credenciais mesmo em caso de vazamento de banco de dados
- Controle granular de acesso (apenas administradores podem visualizar)
- Mascaramento em logs e respostas de API
- Compatibilidade com modelo de segurança existente

### 4.5. Sistema de Cache

**Decisão**: Implementar cache em dois níveis: memória (in-process) e distribuído (Redis).

**Rationale**:
- Redução significativa de latência para parâmetros frequentemente acessados
- Capacidade de invalidação seletiva por categoria ou chave
- Escalabilidade horizontal com cache distribuído
- Resiliência em caso de falha do Redis (fallback para DB)

### 4.6. Validação de Templates

**Decisão**: Implementar validação estática e dinâmica de templates com sanitização.

**Rationale**:
- Prevenção de erros em runtime durante renderização
- Proteção contra XSS e injeções
- Validação de variáveis utilizadas contra schema de dados disponíveis
- Feedback antecipado para administradores

### 4.7. Estrutura de Dados para Workflows

**Decisão**: Utilizar estrutura JSON para definição de etapas de workflow, com validação de schema.

**Rationale**:
- Flexibilidade para evolução futura sem migrações de banco
- Validação contra schema JSON para garantir consistência
- Facilidade de serialização/deserialização
- Performance de consulta com índices JSON especializados

## 5. Alternativas Consideradas

### 5.1. Para Armazenamento de Parâmetros

**Alternativa**: Arquivos de configuração YAML/JSON.
- **Vantagens**: Versionamento via git, simplicidade.
- **Desvantagens**: Requer deploy para alterações, não é gerenciável via UI, dificuldade em auditoria.

**Alternativa**: Serviço dedicado de configuração (etcd, Consul).
- **Vantagens**: Alta disponibilidade, replicação, observabilidade.
- **Desvantagens**: Complexidade adicional, dependência externa, curva de aprendizado.

### 5.2. Para Motor de Template

**Alternativa**: EJS ou Pug.
- **Vantagens**: Mais expressivos, sintaxe mais próxima de HTML/JS.
- **Desvantagens**: Maior risco de segurança, complexidade para usuários não-técnicos.

**Alternativa**: Implementação proprietária simples.
- **Vantagens**: Controle total, simplicidade.
- **Desvantagens**: Limitação de funcionalidades, manutenção, bugs não detectados.

### 5.3. Para Segurança de Integrações

**Alternativa**: Vault HashiCorp ou AWS Secrets Manager.
- **Vantagens**: Segurança de nível empresarial, rotação automática.
- **Desvantagens**: Complexidade, dependência externa, custo.

**Alternativa**: Variáveis de ambiente.
- **Vantagens**: Simplicidade, padrão para configurações sensíveis.
- **Desvantagens**: Não gerenciável via API, difícil rotação, limitações de tamanho.

### 5.4. Para Sistema de Cache

**Alternativa**: Apenas Redis sem cache local.
- **Vantagens**: Consistência garantida, simplicidade.
- **Desvantagens**: Maior latência, ponto único de falha.

**Alternativa**: Apenas cache em memória.
- **Vantagens**: Performance, simplicidade.
- **Desvantagens**: Não escala horizontalmente, perda em reinicializações.

## 6. Consequências

### 6.1. Positivas

- Centralização de configurações facilita manutenção e auditoria
- Administradores podem alterar comportamento do sistema sem envolvimento de desenvolvimento
- Isolamento de regras de negócio em configurações permite evolução independente
- Maior segurança para dados sensíveis com criptografia e controle de acesso
- Performance melhorada com sistema de cache

### 6.2. Negativas

- Aumento da complexidade do sistema
- Necessidade de documentação detalhada para administradores
- Potencial para inconsistências se o cache não for gerenciado adequadamente
- Dependência de bibliotecas externas (Handlebars, Redis)
- Curva de aprendizado para criação de templates complexos

## 7. Dependências Técnicas

- TypeORM para modelo de persistência
- Handlebars para motor de template
- Redis para cache distribuído (opcional)
- Biblioteca de criptografia para proteção de credenciais (crypto nativo ou biblioteca especializada)
- Bibliotecas de validação para schemas JSON

## 8. Requisitos de Segurança

- Criptografia de credenciais em repouso
- Mascaramento de dados sensíveis em logs e API
- Controle de acesso granular por tipo de configuração
- Validação rigorosa de inputs para prevenir injeções
- Auditoria completa de alterações em configurações críticas

## 9. Métricas e Observabilidade

Métricas a serem implementadas:
- Taxa de hit/miss do cache
- Tempo de renderização de templates
- Número de alterações de configuração por período
- Número de falhas de validação
- Utilização de memória pelo cache

## 10. Implementação Faseada

1. **Fase 1**: Parâmetros básicos e sistema de cache
2. **Fase 2**: Sistema de templates e motor de renderização
3. **Fase 3**: Workflows e validação
4. **Fase 4**: Configurações de integração e segurança
5. **Fase 5**: Otimizações de performance e documentação
