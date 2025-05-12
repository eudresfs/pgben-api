# Sistema de Gestão de Benefícios Eventuais - SEMTAS

## 1. Visão Geral do Produto

### 1.1 Descrição

O Sistema de Gestão de Benefícios Eventuais é uma solução digital projetada para a Secretaria Municipal do Trabalho e Assistência Social (SEMTAS) de Natal/RN, que visa automatizar e gerenciar todo o ciclo de vida das solicitações de benefícios eventuais previstos na Lei Municipal 7.205/2021 e Decreto Municipal 12.346/2021.

### 1.2 Propósito

Facilitar o processo de solicitação, análise, aprovação e concessão de benefícios eventuais, garantindo transparência, auditabilidade e conformidade com a LGPD, além de proporcionar maior eficiência no atendimento às famílias em situação de vulnerabilidade.

### 1.3 Escopo do MVP

O MVP (Minimum Viable Product) abrangerá inicialmente dois tipos de benefícios:

- Auxílio Natalidade (kit enxoval)
- Aluguel Social

Todavia, a estrutura de dados do projeto já deve suportar a inclusão de outros tipos de benefícios futuramente para que sejam igualmente geridos, a saber:

- Auxílio Funeral
- Cesta Básica

### 1.4 Objetivos do Produto

- Digitalizar completamente o processo de solicitação e concessão de benefícios
- Reduzir o tempo de análise e aprovação das solicitações
- Melhorar a rastreabilidade e auditoria do processo
- Garantir conformidade com as normas legais e LGPD
- Facilitar o acesso aos serviços assistenciais para os cidadãos
- Possibilitar a geração de relatórios e indicadores de gestão

## 2. Usuários e Stakeholders

### 2.1 Principais Stakeholders

- Secretaria Municipal do Trabalho e Assistência Social (SEMTAS)
- unidade Solicitantes (CRAS, CREAS, outros)
- Beneficiários (cidadãos em situação de vulnerabilidade)

### 2.2 unidade Solicitantes

- CRAS: Guarapes, Ponta Negra, NSA, Nordelândia, Felipe Camarão, Planalto, Pajuçara, Passo da Pátria, Lagoa Azul, Salinas, Mãe Luíza, África
- CREAS: Oeste, Norte
- Outros: DPSE/Comitê Refugiados, SEAS

### 2.3 Perfis de Usuário

1. **Administrador**
    - Acesso total ao sistema
    - Configuração de parâmetros
    - Gestão de usuários e permissões
2. **Gestor (SEMTAS)**
    - Visualização de todas as solicitações
    - Aprovação/pendênciamento de solicitações
    - Acesso a relatórios e dashboards
3. **Técnico (SEMTAS)**
    - Visualização de todas as solicitações
    - Análise de documentação
    - Registro de pareceres técnicos
4. **Técnico (Unidade Solicitante)**
    - Cadastro de beneficiários
    - Registro de solicitações
    - Solicitações com Pendências para Resolver
    - Anexar de documentos
    - Liberação (pagamento) dos benefícios aprovados

## 3. Requisitos Funcionais

### 3.1 Gestão de unidade e Usuários

- Cadastro e manutenção de unidade solicitantes
- Cadastro e gerenciamento de usuários do sistema, seu setor e perfil de acesso
- Definição de perfis e permissões de acesso
- Cadastro e manutenção de setor

### 3.2 Gestão de Tipos de Benefícios

- Cadastro de tipos de benefícios e seus respectivos requisitos documentais
- Configuração de formulários por tipo de benefício
- Configuração do fluxo de setor/Perfis de usuários para cada tipo de benefício

### 3.3 Cadastro de Beneficiários

- Registro de dados pessoais e socioeconômicos
- Histórico de atendimentos e benefícios
- Registro de documentos de identificação

### 3.4 Solicitação de Benefício

Fluxo que uma solicitação de benefício normalmente seguirá:

- Selecionar o Beneficiário (ou cadastrar se primeira vez)
- Preencher todos os formulários configurados para o tipo de benefício
- Fazer upload de documentos comprobatórios (requisitos documentais definidos)
- Parecer do Técnico solicitante
- Análise SEMTAS: Aprovação ou pendênciamento
- Liberação do benefício pela unidade solicitante
- Registro de entrega ao beneficiário
- Ou no caso de solicitação pendenciada: solucionar as informações / documentos solicitados

Importante: cada solicitação seguirá o fluxo de setor configurados para o tipo de benefício, sendo listado apenas para os usuários do respectivo setor ou conforme as permissões do usuário.

### 3.5 Solicitações Pendenciadas

- Lista das solicitações pendenciadas conforme escopo de visão do usuário logado. Se SEMTAS listar de todas as unidade, caso contrário apenas da unidade solicitante
- Clicar para abrir os detalhes do pendenciamento
- Permitir alterar a solicitação original (informações e uploads de documentos)

### 3.6 Solicitações Aprovadas

- Lista das solicitações aprovadas e pendentes de liberação
- Permitir localizar por CPF ou NIS
- Permitir cadastrar as informações relativas à liberação/entrega do benefício ao beneficiário

### 3.7 Solicitações Whatsapp

- Lista das solicitações abertas pelo próprio cidadão através de whatsapp para revisão técnica inicial
- Edição das informações e upload de documentos se necessário, para então marcar a solicitação como formalmente iniciada

### 3.8 Relatórios e Dashboards

- Indicadores de desempenho (KPIs)
- Novos beneficiários por período
- Benefícios concedidos por tipo e unidade
- Valor total concedido
- Taxa de aprovação vs. rejeição
- Tempo médio de atendimento (TMA)
- Exportação em PDF e CSV

### 3.9 Notificações

- Envio de e-mails para mudanças de status das solicitações de benefícios para a respectiva unidade solicitante
- Exibir notificações das solicitações pendenciadas
- Exibir notificações para renovação dentro do prazo de benefícios recorrentes
- Exibir notificações de benefícios suspensos por ausência da renovação no prazo
- Exibir notificações de benefícios cessados

### 3.10 Auditoria e Segurança

- Log de todas as operações CRUD
- Registro de acessos e ações no sistema
- Controle de versão de documentos

## 4. Requisitos Não-Funcionais

### 4.1 Segurança

- Autenticação segura para todos os usuários
- Autorização baseada em perfis
- Transmissão de dados via HTTPS
- Armazenamento seguro de dados pessoais

### 4.2 Disponibilidade

- Disponibilidade de 99,5% (mercado SaaS público gov)
- Backup diário com retenção de 30 dias

### 4.3 Usabilidade

- Interface responsiva (desktop, tablet e celular)
- Design intuitivo para usuários com diferentes níveis de familiaridade digital
- Acessibilidade conforme padrões W3C/e-MAG

### 4.4 Infraestrutura

- Hospedagem em nuvem
- Banco de dados relacional
- Armazenamento de documentos (PDFs e imagens até 5MB)
- Retenção de dados pessoais por até 5 anos

### 4.5 Stack de Desenvolvimento

- Backend: Nest JS com TypeORM
- Frontend: Quasar Framework (Vue 3 com Typescript e Pinia)
- Banco de Dados: PostgreSql

## 5. Fluxo de Trabalho (Workflow)

### 5.1 Fluxo Detalhado de Solicitação de Benefício

1. Cidadão solicita benefício presencialmente em uma unidade solicitante ou via WhatsApp
    - Se for via whatsapp, a solicitação deverá ficar vinculada à unidade solicitante mais próxima do beneficiário
2. **Técnico verifica se o solicitante é o próprio beneficiário**
    - **Se não for o beneficiário, técnico realiza cadastro do beneficiário e do vínculo com o solicitante**
    - **Para beneficiários menores de idade, sistema valida obrigatoriamente a existência de representante legal de primeiro grau**
3. Técnico cadastra o beneficiário no sistema (ou seleciona se já cadastrado), **incluindo dados de PIX para pagamento**
4. Técnico seleciona o tipo de benefício e o tipo de solicitação (novo, renovação, recorrência) e preenche formulário específico
5. Técnico anexa documentos obrigatórios conforme o tipo de benefício
    - **Para Auxílio Natalidade: Inclui termo de responsabilidade**
    - **Para Aluguel Social: Inclui recibo de pagamento do aluguel do mês anterior** (se renovação/prorrogação)
6. Técnico revisa dados e envia para SEMTAS
7. Equipe SEMTAS analisa solicitação:
    - Se completa e conforme: Aprova
    - Se incompleta ou não conforme: Marca como pendente com justificativa
8. Sistema notifica por e-mail e no próprio sistema sobre a aprovação/pendência
9. Em caso de aprovação, técnico da unidade registra **pagamento via PIX** e preencha informações pertinentes desta etapa
10. Sistema registra data/hora da liberação, **valor pago** e conclui o processo

### 5.2 Fluxo de Tratamento de Pendências

1. Quando identificadas pendências, SEMTAS registra os itens pendentes no sistema
2. Sistema notifica o técnico da unidade solicitante sobre as pendências
3. Técnico da unidade resolve pendências e reenvia para análise
4. Processo retorna à etapa de análise pela SEMTAS

## 6. Interfaces do Sistema

### 6.1 Interface de Usuário

- Painéis específicos por perfil de usuário
- Formulários dinâmicos por tipo de benefício
- Dashboard de indicadores
- Lista de solicitações com filtros e ordenação
- Tela de detalhes da solicitação
- Histórico de ações por solicitação
- **Tela de identificação de solicitante**:
    - Opção para identificar se o solicitante é o próprio beneficiário ou terceiro
    - Formulário para cadastro/seleção do solicitante quando diferente do beneficiário
    - Campos para registro do parentesco e validação automática para menores de idade
- **Formulário de dados bancários**:
    - Campos para registro de informações PIX do beneficiário (tipo de chave, valor da chave, titular)
    - Validações específicas por tipo de chave PIX
- **Tela de documentação expandida**:
    - Área para upload de termo de responsabilidade (Auxílio Natalidade)
    - Área para upload de recibo de pagamento anterior (Aluguel Social)
    - Validações de obrigatoriedade específicas por tipo de benefício
- **Tela de registro de pagamento**:
    - Exibição das informações PIX do beneficiário
    - Campo para confirmação do valor pago
    - Registro de dados do pagamento realizado

### 6.2 Interfaces Externas

- Integração com servidor SMTP para envio de e-mails
- Potencial integração futura com CadÚnico (fora do MVP)

## 7. Restrições e Premissas

### 7.1 Restrições

- Prazo de desenvolvimento do MVP: 3 semanas
- Armazenamento de anexos limitado a 5MB por arquivo
- Período de retenção de dados pessoais: 5 anos

### 7.2 Premissas

- Disponibilidade de servidor SMTP para envio de notificações
- Infraestrutura de nuvem para hospedagem do sistema
- Disponibilidade das equipes técnicas das unidade para treinamento