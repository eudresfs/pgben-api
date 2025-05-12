# Sistema de Gestão de Benefícios Eventuais - SEMTAS

## 1. Visão Geral de Segurança

### 1.1 Objetivos

Este documento detalha os controles de segurança e privacidade a serem implementados no Sistema de Gestão de Benefícios Eventuais, garantindo:

- Proteção de dados pessoais e sensíveis
- Conformidade com a LGPD
- Autorização e autenticação adequadas
- Auditabilidade das operações
- Prevenção contra vulnerabilidades comuns

### 1.2 Classificação de Dados

O sistema manipula dados classificados nas seguintes categorias:

|Categoria|Descrição|Exemplos|Controles Necessários|
|---|---|---|---|
|Dados Pessoais|Informações que identificam uma pessoa|Nome, CPF, RG, data de nascimento|Consentimento LGPD, acesso restrito|
|Dados Sensíveis|Dados pessoais com proteção especial|Renda familiar, composição familiar|Acesso restrito, logs de auditoria|
|Dados de Sistema|Informações operacionais|Códigos de benefícios, parâmetros|Controle de acesso por perfil|
|Documentos|Arquivos enviados como comprovação|PDFs, imagens de documentos|Armazenamento seguro, período de retenção|

### 1.3 Modelo de Ameaças

Principais ameaças identificadas:

1. **Acesso não autorizado a dados sensíveis**
    
    - Risco: Alto
    - Impacto: Alto
    - Mitigação: Autenticação forte, controle de acesso granular, criptografia
2. **Manipulação indevida de solicitações (fraude)**
    
    - Risco: Médio
    - Impacto: Alto
    - Mitigação: Segregação de funções, logs de auditoria, workflow aprovação
3. **Vazamento de dados pessoais**
    
    - Risco: Médio
    - Impacto: Alto
    - Mitigação: Minimização de dados, controle de acesso, criptografia
4. **Ataques de injeção (SQL, XSS)**
    
    - Risco: Médio
    - Impacto: Alto
    - Mitigação: Validação de entrada, parametrização de queries, sanitização
5. **Sessões comprometidas**
    
    - Risco: Médio
    - Impacto: Médio
    - Mitigação: Tokens JWT, timeout, renovação segura

## 2. Autenticação e Autorização

### 2.1 Autenticação

#### 2.1.1 Método de Autenticação

- Autenticação baseada em e-mail/CPF e senha
- Token JWT para manter sessão

#### 2.1.2 Política de Senhas

- Mínimo 8 caracteres
- Combinação de letras maiúsculas e minúsculas
- Pelo menos um número
- Pelo menos um caractere especial
- Bloqueio após 5 tentativas falhas consecutivas (desbloqueio em 15 minutos)
- Troca obrigatória no primeiro acesso
- Renovação a cada 90 dias
- Histórico de 5 senhas (impedir reutilização)

#### 2.1.3 Gestão de Sessão

##### Implementação Reforçada de JWT

- **Alteração crítica**: Reduzir a expiração de tokens JWT de 2 horas para **15-30 minutos** para minimizar a janela de exploração
- Armazenamento de tokens **exclusivamente** em cookies com flags:
    - `HttpOnly` - Previne acesso via JavaScript
    - `Secure` - Restringe a transmissão apenas por HTTPS
    - `SameSite=Strict` (ou `Lax` se necessário) - Mitiga ataques CSRF

##### Refresh Token com Rotação

- Implementar sistema de refresh tokens com **rotação** após cada uso
- Manter registro de tokens de refresh válidos no servidor para permitir revogação imediata
- Evitar renovação silenciosa automática sem validação de atividade do usuário
- Implementar mecanismo de revogação de todos os tokens ativos em caso de comprometimento da conta

### 2.2 Autorização

#### 2.2.1 Modelo de Controle de Acesso

- RBAC (Role-Based Access Control) com 4 perfis definidos
- Verificação de permissões em cada requisição (backend)
- UI adaptativa conforme permissões

#### 2.2.2 Matriz de Permissões

Implementar conforme definido no FRD:

| Funcionalidade            | Administrador | Gestor (SEMTAS) | Técnico (SEMTAS) | Técnico (Unidade) |
| ------------------------- | ------------- | --------------- | ---------------- | ----------------- |
| Gestão de unidade        | CRUD          | R               | R                | R                 |
| Gestão de Usuários        | CRUD          | R               | R                | R                 |
| Gestão de Benefícios      | CRUD          | CRUD            | R                | R                 |
| Cadastro de Beneficiários | CRUD          | CRUD            | CRUD             | CRUD              |
| Solicitações              | CRUD          | CRUD            | CRUD             | CRU               |
| Aprovação de Solicitações | Sim           | Sim             | Não              | Não               |
| Liberação de Benefícios   | Sim           | Sim             | Não              | Sim               |
| Relatórios                | Todos         | Todos           | Consulta         | Apenas próprios   |
| Configurações do Sistema  | Sim           | Sim             | Não              | Não               |

#### 2.2.3 Implementação

- Middleware de autorização em cada rota da API
- Tokens JWT contendo perfil e permissões
- Validação em dois níveis:
    - Backend: Verificação obrigatória em cada endpoint
    - Frontend: Adaptação da interface (não mostrar opções não permitidas)

## 3. Proteção de Dados e Privacidade

### 3.1 Conformidade com LGPD

#### 3.1.1 Consentimento

- Banner de consentimento no primeiro login
- Texto explicativo sobre finalidade da coleta de dados
- Registro de consentimento com timestamp e IP
- Opção para revisar política de privacidade a qualquer momento

#### 3.1.2 Minimização de Dados

- Coletar apenas dados estritamente necessários
- Definir finalidade clara para cada dado coletado
- Implementar período de retenção (5 anos para dados pessoais)
- Implementar período de retenção reduzido para documentos (3 meses)

#### 3.1.3 Direitos do Titular

Implementar APIs para suportar:

- Acesso aos dados pessoais
- Correção de dados incorretos
- Anonimização quando possível
- Portabilidade de dados (exportação)

### 3.2 Criptografia e Proteção

#### 3.2.1 Dados em Trânsito

- HTTPS obrigatório (TLS 1.2+)
- Certificados válidos e atualizados
- HSTS habilitado
- Configuração segura de cifras

#### 3.2.2 Dados em Repouso
##### Armazenamento Seguro de Documentos

- **URLs assinadas com expiração** (signed URLs):
    - Gerar URLs temporárias válidas por no máximo 15 minutos
    - Validar parâmetros de autorização em cada requisição de documento
- **Auditoria completa de acessos**:
    - Registrar todas as solicitações de visualização/download (usuário, IP, timestamp)
    - Alertar para padrões anômalos (muitos downloads consecutivos)
- **Verificação de segurança de arquivos**:
    - Implementar escaneamento anti-malware em todos os uploads
    - Validar tipo de arquivo além da extensão (verificação de magic bytes)
    - Sanitizar metadados de arquivos

#### 3.2.3 Chaves e Segredos

##### Gerenciamento Avançado de Segredos

- **Segurança baseada em identidade**:
    - Implementar managed identities para comunicação entre serviços
    - Eliminar credenciais hardcoded ou armazenadas em variáveis de ambiente
- **Monitoramento ativo de acesso a segredos**:
    - Registrar todas as operações de leitura/uso de segredos
    - Configurar alertas para acessos incomuns ou fora do horário esperado
- **Compartimentalização de segredos**:
    - Separar segredos por ambiente e por funcionalidade
    - Aplicar política de menor privilégio para acesso a segredos

## 4. Auditoria e Logging

### 4.1 Logs de Auditoria

#### 4.1.1 Eventos Auditados

Todas as operações CRUD devem ser registradas:

- Criação de registros
- Leitura de dados sensíveis
- Atualização de registros
- Deleção/inativação de registros
- Alterações de estado em solicitações
- Login/logout
- Alterações em permissões
- Exportação de relatórios

#### 4.1.2 Dados Registrados

Cada log deve conter:

- Data e hora (ISO 8601, UTC)
- Usuário que realizou a ação
- IP de origem
- Ação realizada
- Entidade afetada (ID, tipo)
- Alterações realizadas (antes/depois para atualizações)
- ID de correlação (para rastrear ações relacionadas)

#### 4.1.3 Proteção dos Logs

- Logs imutáveis (append-only)
- Backups regulares dos logs
- Retenção por 5 anos
- Acesso restrito à consulta (apenas administrador)

### 4.2 Monitoramento

#### 4.2.1 Alertas de Segurança

Configurar alertas para:

- Múltiplas tentativas de login falhas
- Acesso fora do horário normal
- Acessos de IPs não usuais
- Volume anormal de solicitações
- Comportamento suspeito (muitas exportações, muitas aprovações rápidas)

#### 4.2.2 Resposta a Incidentes

- Definir procedimento de resposta a incidentes
- Designar responsáveis por analisar alertas
- Implementar mecanismo de bloqueio preventivo
- Estabelecer canal de comunicação para incidentes

## 5. Segurança da Aplicação

### 5.1 Proteção contra Vulnerabilidades Comuns

#### 5.1.1 Injeção de SQL

- Uso de ORM com queries parametrizadas
- Validação e sanitização de entradas
- Princípio do menor privilégio no acesso ao banco
- Prepared statements

#### 5.1.2 XSS (Cross-Site Scripting)

- Sanitização de entradas de usuário
- Content Security Policy (CSP)
- Encoding adequado na saída (HTML, JS, URL, CSS)
- Framework frontend com proteção nativa (React)

#### 5.1.3 CSRF (Cross-Site Request Forgery)

- Tokens anti-CSRF
- Verificação de origem (Origin/Referer)
- SameSite cookies

### 5.1.4 - Proteção contra Ataques de Força Bruta e DoS

- **Rate limiting** em duas camadas:
    - Por endereço IP - Limitar tentativas por origem de rede
    - Por identificador de usuário (email/CPF) - Prevenir ataques distribuídos
- **Estratégia de backoff exponencial** - Aumentar progressivamente o tempo de espera após falhas sucessivas
- **CAPTCHA progressivo** após 3 tentativas inválidas de login
- **Limite de tentativas de cadastros** por IP para prevenir criação em massa de contas
- **Alertas em tempo real** para padrões suspeitos de tentativas de acesso

### 5.1.5 - Headers de Segurança HTTP

- Configurar Nginx/servidor de aplicação com os seguintes headers:
    - `Content-Security-Policy`: Restringir origens de recursos (scripts, estilos, imagens)
    - `X-Frame-Options: DENY`: Prevenir clickjacking
    - `X-Content-Type-Options: nosniff`: Prevenir MIME sniffing
    - `Strict-Transport-Security`: Forçar HTTPS (max-age=31536000)
    - `Referrer-Policy: strict-origin-when-cross-origin`: Limitar informações de referência
    - `Permissions-Policy`: Restringir acesso a APIs do navegador

### 5.1.6 - Proteção contra Vazamento de Dados

- **Prevenção de Data Leakage**:
    - Implementar WAF (Web Application Firewall) para detectar padrões suspeitos de exfiltração
    - Limitar volume de dados retornados em paginação (máximo 100 registros por página)
    - Mascarar dados sensíveis em logs (****-****-1234 para CPF)
- **Monitoramento de comportamento anômalo**:
    - Alertar para requisições excessivas de dados por usuário
    - Detectar acessos sequenciais a grandes volumes de registros