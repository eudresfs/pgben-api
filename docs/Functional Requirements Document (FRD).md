# Sistema de Gestão de Benefícios Eventuais - SEMTAS

## 1. Introdução

### 1.1 Propósito

Este documento detalha os requisitos funcionais do Sistema de Gestão de Benefícios Eventuais para a Secretaria Municipal do Trabalho e Assistência Social (SEMTAS) de Natal/RN, com foco no MVP que contemplará inicialmente o Auxílio Natalidade e o Aluguel Social.

### 1.2 Escopo

O sistema visa automatizar e gerenciar todo o ciclo de vida das solicitações de benefícios eventuais, desde o cadastro do beneficiário até a liberação do benefício, conforme previsto na Lei Municipal 7.205/2021 e Decreto Municipal 12.346/2021.

### 1.3 Definições e Acrônimos

- **SEMTAS**: Secretaria Municipal do Trabalho e Assistência Social
- **CRAS**: Centro de Referência de Assistência Social
- **CREAS**: Centro de Referência Especializado de Assistência Social
- **MVP**: Minimum Viable Product (Produto Mínimo Viável)
- **LGPD**: Lei Geral de Proteção de Dados
- **CRUD**: Create, Read, Update, Delete (Criar, Ler, Atualizar, Excluir)

## 2. Requisitos Funcionais Detalhados

### 2.1 Gestão de unidade (FR-001)

#### 2.1.1 Cadastro de unidade (FR-001.1)

- O sistema deve permitir cadastrar unidade de atendimento (CRAS, CREAS, etc.)
- Dados obrigatórios: nome, sigla, tipo, endereço completo, telefone, whatsapp, e-mail
- Cada unidade deve ter um status (ativo/inativo)

#### 2.1.2 Listagem de unidade (FR-001.2)

- O sistema deve exibir lista de unidade cadastradas
- Deve permitir filtrar por nome, tipo, bairro e status
- Deve permitir ordenar por nome, tipo e bairro

#### 2.1.3 Edição de unidade (FR-001.3)

- O sistema deve permitir alterar dados de unidade existentes
- Deve registrar histórico de alterações com data, hora e usuário

#### 2.1.4 Inativação de unidade (FR-001.4)

- O sistema deve permitir inativar unidade (sem exclusão física)
- unidade inativas não devem aparecer para seleção em novos cadastros, nem permitir o login de seus usuários

#### 2.1.5 Gestão de setor (FR-001.5)

- O sistema deve permitir o cadastro e manutenção de setor
- Cada setor deve possuir nome, descrição e status (ativo/inativo)
- Deve ser possível vincular setor às unidade
- Deve permitir filtrar e buscar setor cadastrados

### 2.2 Gestão de Usuários (FR-002)

#### 2.2.1 Cadastro de Usuários do Sistema (FR-002.1)

- O sistema deve permitir o cadastro de usuários
- Dados de um usuário: nome, e-mail, CPF, whatsapp, unidade, perfil e setor
- O e-mail deve ser único no sistema
- O cadastro de um novo usuário poderá ser feito apenas com: nome, e-mail, unidade, perfil e setor
- Deve gerar senha provisória e enviar por e-mail para o primeiro acesso
- No primeiro acesso do usuário, o sistema deverá exigir: nome completo, cpf e whatsapp

#### 2.2.2 Perfis de Usuário (FR-002.2)

- O sistema deve suportar 4 perfis: Administrador, Gestor (SEMTAS), Técnico (SEMTAS), Técnico (Unidade)
- Cada perfil deve ter permissões específicas conforme matriz de permissões:

|Funcionalidade|Administrador|Gestor (SEMTAS)|Técnico (SEMTAS)|Técnico (Unidade)|
|---|---|---|---|---|
|Gestão de unidade|CRUD|R|R|R|
|Gestão de Usuários|CRUD|R|R|R|
|Gestão de Benefícios|CRUD|CRUD|R|R|
|Cadastro de Beneficiários|CRUD|CRUD|CRUD|CRUD|
|Solicitações|CRUD|CRUD|CRUD|CRU|
|Aprovação de Solicitações|Sim|Sim|Não|Não|
|Liberação de Benefícios|Sim|Sim|Não|Sim|
|Relatórios|Todos|Todos|Consulta|Apenas próprios|
|Configurações do Sistema|Sim|Não|Não|Não|

#### 2.2.3 Gestão de Senhas (FR-002.3)

- O sistema deve permitir recuperação de senha via e-mail
- Deve exigir troca de senha provisória no primeiro acesso
- Deve permitir que usuários alterem suas próprias senhas
- Deve implementar política de senha forte (mínimo 8 caracteres, letras maiúsculas e minúsculas, números)

#### 2.2.4 Autenticação e Autorização (FR-002.4)

- O sistema deve autenticar usuários por e-mail/CPF e senha
- Deve gerenciar sessões com timeout de 30 minutos de inatividade
- Deve verificar permissões para cada operação conforme perfil do usuário

### 2.3 Cadastro de Beneficiários (FR-003)

#### 2.3.1 Registro de Beneficiários (FR-003.1)

- O sistema deve permitir o cadastro de beneficiários (cidadãos)
- Dados pessoais: nome completo, CPF, RG, data de nascimento, sexo, NIS (se houver)
- Dados de contato: endereço completo, telefone, e-mail (opcional)
- Dados socioeconômicos: renda familiar, composição familiar, situação habitacional
- Dados bancários para pagamento via PIX:
	- Tipo de chave PIX (CPF, e-mail, telefone, chave aleatória)
	- Valor da chave PIX
	- Nome do titular da chave PIX
	- Banco (opcional)

#### 2.3.2 Validação de Cadastro (FR-003.2)

- O sistema deve validar formato de CPF e impedir duplicidade
- Deve validar CEP e auto-preencher dados de endereço quando possível

#### 2.3.3 Histórico do Beneficiário (FR-003.3)

- O sistema deve manter histórico de todas solicitações anteriores
- Deve exibir cronologicamente todos os benefícios já concedidos
- Deve permitir registrar observações sobre o atendimento

#### 2.3.4 Busca de Beneficiários (FR-003.4)

- O sistema deve permitir busca por nome, CPF ou NIS
- Deve exibir resultados com dados básicos (nome, CPF, data de nascimento)
- Deve permitir acesso ao cadastro completo a partir dos resultados

#### 2.3.5 Validação de Idade do Beneficiário (FR-003.5) - NOVO

- O sistema deve verificar automaticamente a idade do beneficiário através da data de nascimento
- Para beneficiários menores de 18 anos, o sistema deve exigir obrigatoriamente um solicitante como representante legal
- O sistema deve validar o grau de parentesco do representante legal (primeiro grau)
- O sistema deve impedir o prosseguimento da solicitação para menores sem representante legal válido

### 2.4 Gestão de Benefícios (FR-004)

#### 2.4.1 Cadastro de Tipos de Benefício (FR-004.1)

- O sistema deve permitir cadastrar tipos de benefício conforme legislação
- Para o MVP: Auxílio Natalidade e Aluguel Social
- Cada tipo deve ter: nome, descrição, base legal, periodicidade, valor (se aplicável), valor máximo (se aplicável)

#### 2.4.2 Configuração de Requisitos (FR-004.2)

- O sistema deve permitir definir requisitos documentais por tipo de benefício
- Deve permitir configurar campos obrigatórios nos formulários específicos
- Deve permitir configurar regras de validação específicas (ex: idade, renda máxima, etc.)

#### 2.4.3 Formulários Dinâmicos (FR-004.3)

- O sistema deve gerar formulários específicos para cada tipo de benefício
- Deve exibir apenas campos relevantes ao tipo selecionado
- Deve ter validações específicas conforme configuração do benefício

#### 2.4.4 Configuração de Fluxo de Trabalho (FR-004.4)

- O sistema deve permitir configurar o fluxo de setor/perfis de usuários para cada tipo de benefício
- Deve possibilitar a definição de etapas obrigatórias de aprovação para cada tipo de benefício
- Deve permitir personalizar a ordem de tramitação entre os setor para cada tipo de benefício
- Deve garantir que solicitações sigam apenas o fluxo configurado para seu tipo de benefício

### 2.5 Solicitações de Benefícios (FR-005)

#### 2.5.1 Identificação do Solicitante (FR-005.1) - NOVO

- O sistema deve apresentar uma pergunta inicial: "O solicitante é o próprio beneficiário?"
- Se a resposta for "Sim", o sistema utiliza os dados do beneficiário
- Se a resposta for "Não", o sistema deve:
    - Coletar dados do solicitante (nome, CPF, RG, contato, parentesco)
    - Validar se o solicitante já está cadastrado no sistema
    - Registrar o vínculo entre solicitante e beneficiário
    - Verificar obrigatoriedade de parentesco de 1° grau para beneficiários menores de idade
#### 2.5.2 Abertura de Solicitação (FR-005.2)

- O sistema deve permitir criação de solicitações associadas a um beneficiário
- Deve registrar data, hora, unidade solicitante e técnico responsável
- Deve permitir selecionar o tipo de benefício (Auxílio Natalidade ou Aluguel Social no MVP)

#### 2.5.3 Preenchimento de Formulário (FR-005.3)

- O sistema deve apresentar formulário específico ao tipo de benefício
- Para Auxílio Natalidade:
    - Data prevista para o parto
    - Comprovação de realização de pré-natal
    - Composição do kit solicitado
- Para Aluguel Social:
    - Motivo da solicitação (categorias previstas na lei)
    - Valor solicitado
    - Período previsto
    - Dados de composição familiar

#### 2.5.4 Upload de Documentos (FR-005.4)

- O sistema deve permitir anexar documentos em formato PDF ou imagem
- Tamanho máximo: 5MB por arquivo
- Tipos de documento por benefício:
    - Auxílio Natalidade: identidade, CPF, cartão de gestante, comprovante de residência, comprovante de renda
    - Aluguel Social: identidade, CPF, comprovante de residência (mínimo 2 anos), comprovante de renda, laudo de interdição ou similar (quando aplicável)
- Deve validar documentos obrigatórios antes de permitir submissão
- O sistema deve exigir o upload dos seguintes documentos adicionais no momento da solicitação:
    - Para Auxílio Natalidade: Termo de responsabilidade assinado
    - Para Aluguel Social: Recibo de pagamento do aluguel do mês anterior (em caso de renovação/prorrogação)
- O sistema deve validar a presença destes documentos antes de permitir a submissão da solicitação

#### 2.5.4 Fluxo de Aprovação (FR-005.4)

- O sistema deve implementar workflow de estados para solicitações:
    - Rascunho: quando cadastrada via whatsapp pelo beneficiário ou outra pessoa responsável
    - Aberta: quando cadastrada (ou revisada) pelo técnico da unidade
    - Em análise: quando enviada para SEMTAS
    - Pendente: quando SEMTAS identifica pendências
    - Aprovada: quando aprovada pela SEMTAS
    - Liberada: quando técnico da unidade libera o benefício
    - Concluída: quando benefício é entregue ao beneficiário
    - Cancelada: quando cancelada por qualquer motivo

#### 2.5.5 Análise e Parecer (FR-005.5)

- O sistema deve permitir que gestores/técnicos SEMTAS analisem solicitações
- Deve permitir registro de parecer técnico com justificativa
- Deve permitir marcar pendências com descrição específica
- Deve permitir aprovar ou rejeitar solicitações com justificativa

#### 2.5.6 Liberação de Benefício (FR-005.6)

- O sistema deve permitir que técnico da unidade registre liberação de benefício aprovado
- Deve registrar data, hora e responsável pela liberação
- Deve permitir registrar observações sobre a entrega
- Deve gerar termo de recebimento para assinatura do beneficiário

#### 2.5.7 Histórico de Ações (FR-005.7)

- O sistema deve registrar histórico completo de cada solicitação
- Deve registrar cada mudança de estado com data, hora e responsável
- Deve permitir visualizar linha do tempo da solicitação com todas as ações

#### 2.5.8 Solicitações via WhatsApp (FR-005.8)

- O sistema deve permitir receber e gerenciar solicitações abertas pelo próprio cidadão através de WhatsApp
- Deve apresentar uma lista destas solicitações para revisão técnica inicial
- Deve permitir ao técnico editar as informações e realizar upload de documentos adicionais conforme necessário
- Deve possibilitar marcar a solicitação como formalmente iniciada após a revisão técnica
- Deve permitir agendar visita técnica se fizer necessário para o tipo de benefício

### 2.6 Notificações (FR-006)

#### 2.6.1 Notificações por E-mail (FR-006.1)

- O sistema deve enviar e-mails automáticos para:
    - Pendências identificadas pela SEMTAS
    - Aprovação de solicitações
    - Confirmação de liberação de benefício
- Deve permitir configurar templates de e-mail por tipo de notificação

#### 2.6.2 Notificações no Sistema (FR-006.2)

- O sistema deve exibir notificações no painel de cada usuário
- Deve mostrar contagem de itens pendentes de ação
- Deve permitir marcar notificações como lidas

#### 2.6.3 Notificações para Renovação de Benefícios (FR-006.3)

- O sistema deve exibir notificações para renovação de benefícios recorrentes dentro do prazo estipulado
- Deve alertar sobre benefícios suspensos por ausência de renovação no prazo
- Deve notificar sobre benefícios cessados automaticamente

#### 2.6.4 Gestão de Notificações (FR-006.4)

- O sistema deve permitir visualizar histórico de notificações enviadas
- Deve permitir configurar preferências de notificação por tipo e usuário
- Deve implementar sistema de leitura/não leitura das notificações

### 2.7 Relatórios e Dashboards (FR-007)

#### 2.7.1 Dashboard de Indicadores (FR-007.1)

- O sistema deve apresentar dashboard com KPIs principais:
    - Novos beneficiários (comparativo mês a mês)
    - Benefícios concedidos por tipo e unidade
    - Valor total concedido
    - Taxa de aprovação vs. rejeição
    - Tempo médio de atendimento (TMA)
    - Distribuição geográfica dos beneficiários

#### 2.7.2 Relatórios Operacionais (FR-007.2)

- O sistema deve gerar relatórios operacionais:
    - Solicitações por unidade/período
    - Solicitações por status
    - Beneficiários atendidos por período
    - Documentos pendentes
    - Tempo médio em cada etapa do processo

#### 2.7.3 Relatórios Gerenciais (FR-007.3)

- O sistema deve gerar relatórios gerenciais:
    - Análise comparativa mensal de benefícios
    - Distribuição geográfica dos benefícios
    - Análise de tendências
    - Projeções de demanda

#### 2.7.4 Exportação de Dados (FR-007.4)

- O sistema deve permitir exportar relatórios em PDF e CSV
- Deve permitir filtrar dados antes da exportação
- Deve incluir metadados (data de geração, usuário, filtros aplicados)

### 2.8 Auditoria e Segurança (FR-008)

#### 2.8.1 Logs de Auditoria (FR-008.1)

- O sistema deve registrar logs de todas as operações CRUD
- Deve registrar: data, hora, usuário, ação, IP, dados alterados
- Deve manter histórico de versões de documentos

#### 2.8.2 Segurança de Dados (FR-008.2)

- O sistema deve implementar controles de acesso baseados em perfil
- Deve utilizar HTTPS para transmissão de dados
- Deve garantir armazenamento seguro de dados pessoais conforme LGPD
- Deve exibir termo de consentimento LGPD no primeiro login de cada usuário

#### 2.8.3 Backup e Recuperação (FR-008.3)

- O sistema deve realizar backup diário automatizado
- Deve manter backups por 30 dias
- Deve permitir recuperação de dados em caso de falhas

#### 2.8.4 Controle de Versão de Documentos (FR-008.4)

- O sistema deve manter histórico de versões de documentos anexados
- Deve registrar todas as alterações em documentos com data, hora e usuário
- Deve permitir visualização de versões anteriores quando necessário

## 3. Requisitos Específicos por Tipo de Benefício

### 3.1 Auxílio Natalidade (FR-009)

#### 3.1.1 Critérios de Elegibilidade (FR-009.1)

- O sistema deve validar critérios conforme Lei 7.205/2021:
    - Residência comprovada em Natal
    - Comprovação de acompanhamento pré-natal básico
    - Criança de 0 a 3 meses
    - Requerimento preferencial até 90 dias antes do parto

#### 3.1.2 Processo Específico (FR-009.2)

- O sistema deve permitir registro de composição do kit enxoval
- Deve gerar formulário específico conforme Art. 9º-16 da Lei 7.205/2021
- Deve permitir anexar documentação específica conforme Art. 16

### 3.2 Aluguel Social (FR-010)

#### 3.2.1 Critérios de Elegibilidade (FR-010.1)

- O sistema deve validar critérios conforme Lei 7.205/2021:
    - Residência em Natal há pelo menos 2 anos
    - Situações específicas previstas no Art. 32 (risco habitacional, desalojamento, violência doméstica, etc.)
    - Documentação conforme Art. 34
    - Período de 6 meses, renovável por igual período

#### 3.2.2 Processo Específico (FR-010.2)

- O sistema deve considerar valor do auxílio em dinheiro
- Deve controlar prazo de concessão (6 meses)
- Deve gerenciar renovações mediante análise técnica
- Deve verificar se mais de um membro da mesma família está recebendo o benefício (vedado conforme Art. 38)

## 4. Interfaces do Sistema

### 4.1 Interface de Usuário (FR-011)

#### 4.1.1 Tela de Login (FR-011.1)

- O sistema deve apresentar tela de login segura
- Deve incluir opção de recuperação de senha
- Deve exibir aviso de política de privacidade

#### 4.1.2 Painel Principal (FR-011.2)

- O sistema deve apresentar dashboard adequado ao perfil do usuário
- Deve exibir indicadores relevantes à função do usuário
- Deve mostrar notificações e alertas relevantes

#### 4.1.3 Formulários (FR-011.3)

- O sistema deve implementar formulários responsivos
- Deve apresentar validação em tempo real
- Deve permitir salvamento parcial (rascunho) de formulários longos

#### 4.1.4 Listas e Tabelas (FR-011.4)

- O sistema deve implementar listas paginadas
- Deve permitir filtragem e ordenação
- Deve destacar visualmente itens que requerem atenção

#### 4.1.5 Responsividade (FR-011.5)

- O sistema deve funcionar adequadamente em desktop, tablet e celular
- Deve apresentar layout responsivo para diferentes resoluções

### 4.2 Integração (FR-012)

#### 4.2.1 Envio de E-mails (FR-012.1)

- O sistema deve integrar-se com servidor SMTP para envio de notificações
- Deve permitir configuração dos parâmetros do servidor de e-mail

#### 4.2.2 Validação de CEP (FR-012.2)

- O sistema deve integrar-se com serviço de validação de CEP
- Deve auto-preencher endereço a partir de CEP válido

## 5. Requisitos de Transição

### 5.1 Carga Inicial de Dados (FR-013)

- O sistema deve permitir carga inicial das unidade de atendimento
- Deve permitir importação inicial de usuários do sistema
- Deve permitir configuração inicial dos tipos de benefício

### 5.2 Treinamento (FR-014)

- O sistema deve incluir manual de usuário online acessível por dentro do sistema
- Deve apresentar tooltips explicativos em campos complexos
- Deve incluir seção de FAQ para dúvidas comuns

## 6. Futuras Funcionalidades (Fora do MVP)

### 6.1 Para Futuras Versões

- Integração com CadÚnico
- Mais tipos de benefícios (Auxílio Funeral, Cesta Básica, etc.)
- Cadastro de ocorrências
- Controle de pagamentos
- Regras de priorização e elegibilidade

## 7. Matriz de Rastreabilidade

|ID|Requisito|Origem|Benefício|Critério de Aceitação|
|---|---|---|---|---|
|FR-001|Gestão de unidade|Lei 7.205/2021, Art. 49|Controle organizacional|Cadastro completo das unidade participantes|
|FR-002|Gestão de Usuários|LGPD, Necessidade operacional|Controle de acesso|Perfis funcionando conforme matriz de permissões|
|FR-003|Cadastro de Beneficiários|Lei 7.205/2021, Arts. 14, 20, 26|Registro de dados||