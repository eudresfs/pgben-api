# Use Cases do Sistema de Gestão de Benefícios Eventuais - SEMTAS

Conforme solicitado, seguem os use cases detalhados por módulo para o Sistema de Gestão de Benefícios Eventuais da SEMTAS.

## Módulo: Autenticação

### UC-AUTH-01: Login no Sistema

- **Ator Principal**: Todos os usuários (Administrador, Gestor SEMTAS, Técnico SEMTAS, Técnico Unidade)
- **Pré-condições**: Usuário cadastrado no sistema e com status ativo
- **Fluxo Principal**:
    1. Usuário acessa a página de login
    2. Usuário informa e-mail/CPF e senha
    3. Sistema valida credenciais
    4. Sistema gera token JWT
    5. Sistema registra log de acesso
    6. Sistema redireciona para dashboard conforme perfil do usuário
- **Fluxos Alternativos**:
    - Credenciais inválidas: Sistema exibe mensagem de erro e permite nova tentativa
    - Conta bloqueada: Sistema informa que a conta está bloqueada e orienta contato com administrador
    - Primeiro acesso: Sistema exige troca de senha temporária
- **Pós-condições**: Usuário autenticado com sessão ativa

### UC-AUTH-02: Recuperação de Senha

- **Ator Principal**: Todos os usuários
- **Pré-condições**: Usuário cadastrado no sistema
- **Fluxo Principal**:
    1. Usuário acessa função "Esqueci minha senha"
    2. Usuário informa e-mail/CPF
    3. Sistema valida existência do usuário
    4. Sistema gera token temporário
    5. Sistema envia e-mail com link para redefinição de senha
    6. Usuário acessa o link e define nova senha
    7. Sistema confirma alteração
- **Fluxos Alternativos**:
    - E-mail/CPF não encontrado: Sistema exibe mensagem de erro
    - Link expirado: Sistema solicita novo pedido de recuperação
- **Pós-condições**: Senha do usuário redefinida

### UC-AUTH-03: Troca de Senha

- **Ator Principal**: Todos os usuários
- **Pré-condições**: Usuário autenticado no sistema
- **Fluxo Principal**:
    1. Usuário acessa a opção "Alterar senha"
    2. Usuário informa senha atual e nova senha (com confirmação)
    3. Sistema valida senha atual
    4. Sistema valida força da nova senha conforme política
    5. Sistema atualiza senha e registra alteração
    6. Sistema notifica sucesso
- **Fluxos Alternativos**:
    - Senha atual incorreta: Sistema exibe mensagem de erro
    - Nova senha fraca: Sistema orienta requisitos de senha
- **Pós-condições**: Senha do usuário alterada no sistema

### UC-AUTH-04: Gestão de Sessão

- **Ator Principal**: Sistema
- **Pré-condições**: Usuário autenticado no sistema
- **Fluxo Principal**:
    1. Sistema monitora atividade do usuário
    2. Sistema mantém sessão ativa enquanto há interação
    3. Sistema encerra sessão após 30 minutos de inatividade
- **Fluxos Alternativos**:
    - Usuário solicita logout manualmente
    - Token JWT expira
- **Pós-condições**: Sessão do usuário encerrada ou renovada conforme interação

## Módulo: Gestão de unidade

### UC-UNID-01: Cadastro de Unidade

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa módulo de unidade
    2. Administrador seleciona "Nova Unidade"
    3. Administrador preenche formulário com: nome, sigla, tipo, endereço completo, telefone, whatsapp, e-mail
    4. Sistema valida dados obrigatórios
    5. Sistema salva nova unidade com status ativo
    6. Sistema registra log de criação
- **Fluxos Alternativos**:
    - Dados incompletos: Sistema destaca campos obrigatórios
    - Sigla já existente: Sistema notifica duplicidade
- **Pós-condições**: Nova unidade cadastrada e disponível no sistema

### UC-UNID-02: Edição de Unidade

- **Ator Principal**: Administrador
- **Pré-condições**: Unidade cadastrada no sistema
- **Fluxo Principal**:
    1. Administrador acessa lista de unidade
    2. Administrador seleciona unidade para edição
    3. Administrador modifica dados necessários
    4. Sistema valida dados obrigatórios
    5. Sistema salva alterações
    6. Sistema registra histórico de alterações
- **Fluxos Alternativos**:
    - Dados incompletos: Sistema destaca campos obrigatórios
    - Sigla já existente: Sistema notifica duplicidade
- **Pós-condições**: Dados da unidade atualizados no sistema

### UC-UNID-03: Inativação de Unidade

- **Ator Principal**: Administrador
- **Pré-condições**: Unidade cadastrada e ativa no sistema
- **Fluxo Principal**:
    1. Administrador acessa lista de unidade
    2. Administrador seleciona unidade para inativação
    3. Administrador confirma inativação
    4. Sistema verifica existência de usuários ativos vinculados
    5. Sistema altera status da unidade para inativo
    6. Sistema registra log de inativação
- **Fluxos Alternativos**:
    - Existem usuários ativos: Sistema alerta antes da inativação
    - Existem solicitações abertas: Sistema alerta antes da inativação
- **Pós-condições**: Unidade inativada no sistema, não aparecendo para seleção em novos cadastros

### UC-UNID-04: Cadastro de Setor

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa módulo de setor
    2. Administrador seleciona "Novo Setor"
    3. Administrador preenche nome, descrição e status
    4. Administrador vincula setor a uma ou mais unidade
    5. Sistema valida dados
    6. Sistema salva novo setor
- **Fluxos Alternativos**:
    - Dados incompletos: Sistema destaca campos obrigatórios
    - Nome já existente: Sistema notifica duplicidade
- **Pós-condições**: Novo setor cadastrado e disponível para vinculação de usuários

## Módulo: Gestão de Usuários

### UC-USU-01: Cadastro de Usuário

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa módulo de Usuários
    2. Administrador seleciona "Novo Usuário"
    3. Administrador preenche nome, e-mail, unidade, perfil e setor
    4. Sistema valida dados obrigatórios
    5. Sistema gera senha provisória
    6. Sistema envia e-mail com credenciais provisórias
    7. Sistema salva novo usuário
- **Fluxos Alternativos**:
    - E-mail já existente: Sistema notifica duplicidade
    - Falha no envio de e-mail: Sistema gera alerta
- **Pós-condições**: Novo usuário cadastrado com senha provisória

### UC-USU-02: Primeiro Acesso do Usuário

- **Ator Principal**: Qualquer usuário
- **Pré-condições**: Usuário recém-cadastrado com senha provisória
- **Fluxo Principal**:
    1. Usuário acessa o sistema com senha provisória
    2. Sistema exige complemento de cadastro
    3. Usuário preenche nome completo, CPF e whatsapp
    4. Usuário define senha permanente
    5. Sistema valida dados
    6. Sistema salva informações e atualiza status
- **Fluxos Alternativos**:
    - Dados incompletos: Sistema destaca campos obrigatórios
    - CPF inválido: Sistema notifica formato incorreto
    - Senha fraca: Sistema orienta requisitos de senha
- **Pós-condições**: Usuário com cadastro completo e senha permanente

### UC-USU-03: Edição de Perfil de Usuário

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário cadastrado no sistema
- **Fluxo Principal**:
    1. Administrador acessa lista de usuários
    2. Administrador seleciona usuário para edição
    3. Administrador modifica dados necessários (unidade, perfil, setor, status)
    4. Sistema valida dados obrigatórios
    5. Sistema salva alterações
    6. Sistema registra log de alteração
- **Fluxos Alternativos**:
    - Alteração de e-mail: Sistema verifica duplicidade
    - Alteração de perfil: Sistema informa sobre alterações de permissões
- **Pós-condições**: Dados do usuário atualizados no sistema

### UC-USU-04: Inativação de Usuário

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário cadastrado e ativo no sistema
- **Fluxo Principal**:
    1. Administrador acessa lista de usuários
    2. Administrador seleciona usuário para inativação
    3. Administrador confirma inativação
    4. Sistema verifica existência de processos em andamento
    5. Sistema inativa o usuário
    6. Sistema registra log de inativação
- **Fluxos Alternativos**:
    - Existem processos pendentes: Sistema alerta e sugere transferência
    - Usuário tenta acessar após inativação: Sistema informa status inativo
- **Pós-condições**: Usuário inativado sem possibilidade de login

## Módulo: Cadastro de Beneficiários

### UC-BEN-01: Cadastro de Beneficiário

- **Ator Principal**: Técnico (Unidade ou SEMTAS)
- **Pré-condições**: Usuário autenticado com permissão para cadastro
- **Fluxo Principal**:
    1. Técnico acessa módulo de Beneficiários
    2. Técnico seleciona "Novo Beneficiário"
    3. Técnico preenche dados pessoais (nome, CPF, RG, data de nascimento, sexo, NIS)
    4. Técnico preenche dados de contato (endereço, telefone, e-mail)
    5. Técnico preenche dados socioeconômicos (renda, composição familiar)
    6. Sistema valida CPF e dados obrigatórios
    7. Sistema salva novo beneficiário
- **Fluxos Alternativos**:
    - CPF já cadastrado: Sistema exibe dados do beneficiário existente
    - CPF inválido: Sistema notifica formato incorreto
    - Dados incompletos: Sistema destaca campos obrigatórios
- **Pós-condições**: Novo beneficiário cadastrado no sistema

### UC-BEN-02: Busca de Beneficiário

- **Ator Principal**: Qualquer usuário com acesso a beneficiários
- **Pré-condições**: Usuário autenticado no sistema
- **Fluxo Principal**:
    1. Usuário acessa busca de beneficiários
    2. Usuário insere critério de busca (nome, CPF ou NIS)
    3. Sistema realiza busca no banco de dados
    4. Sistema exibe lista de resultados com dados básicos
    5. Usuário seleciona beneficiário para visualizar detalhes
- **Fluxos Alternativos**:
    - Nenhum resultado encontrado: Sistema sugere novo cadastro
    - Múltiplos resultados: Sistema exibe lista para seleção
- **Pós-condições**: Detalhes do beneficiário exibidos em tela

### UC-BEN-03: Edição de Beneficiário

- **Ator Principal**: Técnico (Unidade ou SEMTAS)
- **Pré-condições**: Beneficiário cadastrado no sistema
- **Fluxo Principal**:
    1. Técnico localiza beneficiário via busca
    2. Técnico seleciona beneficiário para edição
    3. Técnico modifica dados necessários
    4. Sistema valida dados obrigatórios
    5. Sistema salva alterações
    6. Sistema registra histórico de modificações
- **Fluxos Alternativos**:
    - Tentativa de alteração de CPF: Sistema impede modificação
    - Dados incompletos: Sistema destaca campos obrigatórios
- **Pós-condições**: Dados do beneficiário atualizados no sistema

### UC-BEN-04: Visualização de Histórico do Beneficiário

- **Ator Principal**: Técnico (Unidade ou SEMTAS)
- **Pré-condições**: Beneficiário cadastrado no sistema
- **Fluxo Principal**:
    1. Técnico localiza beneficiário via busca
    2. Técnico acessa aba "Histórico"
    3. Sistema exibe cronologicamente todos os benefícios concedidos
    4. Sistema exibe observações registradas sobre atendimentos
- **Fluxos Alternativos**:
    - Nenhum histórico: Sistema exibe mensagem informativa
    - Filtro por tipo de benefício: Sistema exibe apenas itens filtrados
- **Pós-condições**: Histórico do beneficiário visualizado em tela

### UC-BEN-05: Validação de Solicitante - NOVO

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Tentativa de abertura de solicitação
- **Fluxo Principal**:
    1. Sistema pergunta se solicitante é o próprio beneficiário
    2. Técnico indica que solicitante é diferente do beneficiário
    3. Técnico pesquisa solicitante existente ou inicia novo cadastro
    4. Técnico preenche/confirma dados do solicitante
    5. Técnico indica grau de parentesco com o beneficiário
    6. Sistema valida dados e relacionamento
    7. Sistema vincula solicitante ao beneficiário
- **Fluxos Alternativos**:
    - **Beneficiário menor sem representante legal**: Sistema impede prosseguimento
    - **Grau de parentesco inadequado para menor**: Sistema alerta sobre restrição
- **Pós-condições**: Solicitante validado e vinculado ao beneficiário

## Módulo: Gestão de Benefícios

### UC-BNF-01: Cadastro de Tipo de Benefício

- **Ator Principal**: Administrador ou Gestor SEMTAS
- **Pré-condições**: Usuário autenticado com perfil adequado
- **Fluxo Principal**:
    1. Usuário acessa módulo de Tipos de Benefício
    2. Usuário seleciona "Novo Tipo de Benefício"
    3. Usuário preenche nome, descrição, base legal, periodicidade, valor
    4. Sistema valida dados obrigatórios
    5. Sistema salva novo tipo de benefício
- **Fluxos Alternativos**:
    - Dados incompletos: Sistema destaca campos obrigatórios
    - Nome já existente: Sistema notifica duplicidade
- **Pós-condições**: Novo tipo de benefício disponível para solicitações

### UC-BNF-02: Configuração de Requisitos Documentais

- **Ator Principal**: Administrador ou Gestor SEMTAS
- **Pré-condições**: Tipo de benefício cadastrado
- **Fluxo Principal**:
    1. Usuário acessa tipo de benefício
    2. Usuário seleciona "Configurar Requisitos"
    3. Usuário adiciona documentos necessários (tipo, descrição, obrigatoriedade)
    4. Sistema salva requisitos documentais
- **Fluxos Alternativos**:
    - Nenhum documento obrigatório: Sistema exibe alerta
    - Documento já adicionado: Sistema impede duplicidade
- **Pós-condições**: Requisitos documentais configurados para o tipo de benefício

### UC-BNF-03: Configuração de Formulário Específico

- **Ator Principal**: Administrador ou Gestor SEMTAS
- **Pré-condições**: Tipo de benefício cadastrado
- **Fluxo Principal**:
    1. Usuário acessa tipo de benefício
    2. Usuário seleciona "Configurar Formulário"
    3. Usuário define campos específicos para o benefício
    4. Usuário configura regras de validação
    5. Sistema salva configuração do formulário
- **Fluxos Alternativos**:
    - Configuração incompleta: Sistema exibe alerta
    - Campo com regra inválida: Sistema destaca problema
- **Pós-condições**: Formulário específico configurado para o tipo de benefício

### UC-BNF-04: Configuração de Fluxo de Trabalho

- **Ator Principal**: Administrador ou Gestor SEMTAS
- **Pré-condições**: Tipo de benefício cadastrado
- **Fluxo Principal**:
    1. Usuário acessa tipo de benefício
    2. Usuário seleciona "Configurar Fluxo"
    3. Usuário define etapas do fluxo e setor/perfis responsáveis
    4. Usuário configura ordem de tramitação
    5. Sistema salva configuração do fluxo
- **Fluxos Alternativos**:
    - Fluxo sem aprovação SEMTAS: Sistema exibe alerta
    - Setor inexistente: Sistema impede seleção
- **Pós-condições**: Fluxo de trabalho configurado para o tipo de benefício

## Módulo: Solicitações de Benefícios

### UC-SOL-01: Abertura de Solicitação - Atualização

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Beneficiário cadastrado, tipo de benefício disponível
- **Fluxo Principal**:
    1. Técnico acessa "Nova Solicitação"
    2. **Técnico confirma se o solicitante é o próprio beneficiário**
    3. **Se for diferente, técnico cadastra ou seleciona solicitante**
    4. Técnico seleciona beneficiário existente ou cadastra novo
    5. **Para beneficiários menores de idade, sistema valida o representante legal**
    6. Técnico seleciona tipo de benefício e tipo de solicitação
    7. Sistema apresenta formulário específico ao tipo selecionado
    8. Técnico preenche dados específicos, **incluindo informações de PIX**
    9. **Técnico anexa documentos obrigatórios incluindo termos e comprovantes específicos**
    10. Sistema registra data, hora, unidade e técnico responsável
    11. Sistema salva solicitação com status "Aberta"
- **Fluxos Alternativos**:
    - **Beneficiário menor sem representante legal**: Sistema impede prosseguimento
    - **Documentação específica incompleta**: Sistema impede submissão
    - Beneficiário não elegível: Sistema exibe alerta
- **Pós-condições**: Solicitação criada e pronta para submissão

### UC-SOL-02: Upload de Documentos

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Solicitação aberta no sistema
- **Fluxo Principal**:
    1. Técnico acessa solicitação
    2. Técnico seleciona "Anexar Documentos"
    3. Sistema exibe requisitos documentais para o tipo de benefício
    4. Técnico realiza upload de documentos (PDF ou imagem)
    5. Sistema valida formato e tamanho (máximo 5MB por arquivo)
    6. Sistema armazena documentos vinculados à solicitação
- **Fluxos Alternativos**:
    - Arquivo muito grande: Sistema notifica limite excedido
    - Formato inválido: Sistema rejeita upload
    - Documento obrigatório faltante: Sistema alerta antes da submissão
- **Pós-condições**: Documentos anexados à solicitação

### UC-SOL-03: Submissão para Análise

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Solicitação aberta com documentos anexados
- **Fluxo Principal**:
    1. Técnico revisa dados da solicitação
    2. Técnico preenche parecer técnico
    3. Técnico submete para análise da SEMTAS
    4. Sistema valida documentos obrigatórios
    5. Sistema atualiza status para "Em Análise"
    6. Sistema notifica SEMTAS sobre nova solicitação
- **Fluxos Alternativos**:
    - Documentação incompleta: Sistema impede submissão
    - Dados inconsistentes: Sistema exibe alerta
- **Pós-condições**: Solicitação enviada para análise da SEMTAS

### UC-SOL-04: Análise de Solicitação

- **Ator Principal**: Gestor ou Técnico (SEMTAS)
- **Pré-condições**: Solicitação com status "Em Análise"
- **Fluxo Principal**:
    1. Gestor/Técnico SEMTAS acessa lista de solicitações em análise
    2. Gestor/Técnico SEMTAS seleciona solicitação
    3. Gestor/Técnico SEMTAS verifica dados e documentos
    4. Gestor/Técnico SEMTAS registra parecer técnico
    5. Gestor SEMTAS aprova ou marca pendências
    6. Sistema registra decisão e atualiza status
    7. Sistema notifica unidade solicitante
- **Fluxos Alternativos**:
    - Aprovação: Status muda para "Aprovada"
    - Pendência: Status muda para "Pendente" com descrição das pendências
    - Rejeição: Status muda para "Rejeitada" com justificativa
- **Pós-condições**: Solicitação analisada e com status atualizado

### UC-SOL-05: Resolução de Pendências

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Solicitação com status "Pendente"
- **Fluxo Principal**:
    1. Técnico acessa lista de solicitações pendentes
    2. Técnico visualiza descrição das pendências
    3. Técnico complementa informações ou documentos
    4. Técnico registra observações sobre correções
    5. Técnico reenvia para análise
    6. Sistema atualiza status para "Em Análise"
    7. Sistema notifica SEMTAS sobre resolução de pendências
- **Fluxos Alternativos**:
    - Cancelamento da solicitação: Técnico cancela solicitação com justificativa
    - Nova pendência incompleta: Sistema impede reenvio
- **Pós-condições**: Pendências resolvidas e solicitação reenviada para análise

### UC-SOL-06: Liberação de Benefício - Atualização

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Solicitação com status "Aprovada"
- **Fluxo Principal**:
    1. Técnico acessa lista de solicitações aprovadas
    2. Técnico seleciona solicitação para liberação
    3. **Técnico registra pagamento via PIX**
    4. **Sistema exibe informações de PIX do beneficiário**
    5. **Técnico confirma valor e execução do pagamento**
    6. Técnico confirma liberação do benefício
    7. Sistema atualiza status para "Liberado"
    8. Sistema registra data, hora, valor pago e responsável pela liberação
- **Fluxos Alternativos**:
    - **PIX inválido/incorreto**: Técnico notifica necessidade de atualização cadastral
    - Beneficiário não comparece: Técnico registra ausência
- **Pós-condições**: Benefício liberado e registrado no histórico do beneficiário

### UC-SOL-07: Gestão de Solicitações via WhatsApp

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Solicitação iniciada via WhatsApp
- **Fluxo Principal**:
    1. Técnico acessa lista de solicitações via WhatsApp
    2. Técnico seleciona solicitação para revisão
    3. Técnico complementa/corrige informações
    4. Técnico realiza upload de documentos adicionais
    5. Técnico marca solicitação como formalmente iniciada
    6. Sistema atualiza status para "WhatsApp"
- **Fluxos Alternativos**:
    - Informações insuficientes: Técnico contata solicitante
    - Beneficiário já cadastrado: Sistema vincula solicitação
- **Pós-condições**: Solicitação via WhatsApp formalizada e pronta para submissão

### UC-SOL-08: Visualização de Histórico de Solicitação

- **Ator Principal**: Qualquer usuário com acesso à solicitação
- **Pré-condições**: Solicitação cadastrada no sistema
- **Fluxo Principal**:
    1. Usuário acessa detalhes da solicitação
    2. Usuário seleciona aba "Histórico"
    3. Sistema exibe linha do tempo da solicitação
    4. Sistema mostra cada mudança de estado com data, hora e responsável
- **Fluxos Alternativos**:
    - Filtragem por tipo de evento: Sistema exibe apenas eventos filtrados
    - Exportação do histórico: Sistema gera PDF do histórico
- **Pós-condições**: Histórico da solicitação visualizado em tela

## Módulo: Benefícios Específicos

### UC-AUX-01: Solicitação de Auxílio Natalidade

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Beneficiário cadastrado
- **Fluxo Principal**:
    1. Técnico inicia nova solicitação
    2. Técnico seleciona "Auxílio Natalidade" (sempre novo)
    3. Sistema apresenta formulário específico
    4. Técnico preenche data prevista para parto ou data de nascimento
    5. Técnico indica comprovação de pré-natal
    6. Técnico seleciona itens do kit solicitado
    7. Técnico anexa documentação específica
    8. Sistema valida dados conforme Lei 7.205/2021
- **Fluxos Alternativos**:
    - Criança com mais de 3 meses: Sistema alerta sobre limite de idade
    - Falta de comprovação de residência: Sistema destaca documento obrigatório
- **Pós-condições**: Solicitação de Auxílio Natalidade pronta para análise

### UC-ALG-01: Solicitação de Aluguel Social

- **Ator Principal**: Técnico (Unidade)
- **Pré-condições**: Beneficiário cadastrado
- **Fluxo Principal**:
    1. Técnico inicia nova solicitação
    2. Técnico seleciona "Aluguel Social"
    3. Técnico seleciona o tipo da solicitação (novo, renovação, prorrogação de ciclo (máx. 1))
    4. Sistema apresenta formulário específico
    5. Técnico seleciona motivo da solicitação (categorias da lei)
    6. Técnico preenche valor solicitado
    7. Técnico indica período previsto (máximo 6 meses)
    8. Técnico detalha composição familiar
    9. Técnico anexa documentação específica
    10. Sistema valida dados conforme Lei 7.205/2021
- **Fluxos Alternativos**:
    - Residência inferior a 2 anos em Natal: Sistema alerta sobre requisito
    - Valor acima do permitido: Sistema limita ao valor máximo
    - Outro membro da família já recebe: Sistema impede duplicidade
- **Pós-condições**: Solicitação de Aluguel Social pronta para análise

## Módulo: Relatórios e Dashboards

### UC-REL-01: Visualização de Dashboard

- **Ator Principal**: Administrador, Gestor ou Técnico SEMTAS
- **Pré-condições**: Usuário autenticado com permissão para relatórios
- **Fluxo Principal**:
    1. Usuário acessa módulo de Relatórios
    2. Usuário seleciona "Dashboard"
    3. Sistema carrega KPIs principais
    4. Sistema exibe gráficos de novos beneficiários e benefícios concedidos
    5. Sistema mostra taxa de aprovação vs. rejeição
    6. Sistema apresenta tempo médio de atendimento
    7. Sistema exibe distribuição geográfica dos beneficiários
- **Fluxos Alternativos**:
    - Filtragem por período: Sistema recalcula indicadores
    - Filtragem por unidade: Sistema exibe dados específicos
- **Pós-condições**: Dashboard visualizado com indicadores atualizados

### UC-REL-02: Geração de Relatório Operacional

- **Ator Principal**: Usuário com permissão para relatórios
- **Pré-condições**: Usuário autenticado no sistema
- **Fluxo Principal**:
    1. Usuário acessa módulo de Relatórios
    2. Usuário seleciona tipo de relatório operacional
    3. Usuário configura parâmetros (período, unidade, tipo de benefício)
    4. Sistema processa dados
    5. Sistema exibe relatório em tela
    6. Usuário exporta relatório em PDF ou CSV
- **Fluxos Alternativos**:
    - Nenhum dado encontrado: Sistema exibe mensagem informativa
    - Erro de processamento: Sistema notifica falha
- **Pós-condições**: Relatório gerado e disponível para exportação

### UC-REL-03: Geração de Relatório Gerencial

- **Ator Principal**: Administrador ou Gestor SEMTAS
- **Pré-condições**: Usuário autenticado com perfil adequado
- **Fluxo Principal**:
    1. Usuário acessa módulo de Relatórios
    2. Usuário seleciona tipo de relatório gerencial
    3. Usuário configura parâmetros (período, indicadores)
    4. Sistema processa dados e análises comparativas
    5. Sistema exibe relatório com tendências e projeções
    6. Usuário exporta relatório em PDF
- **Fluxos Alternativos**:
    - Dados insuficientes para projeção: Sistema notifica limitação
    - Período muito extenso: Sistema sugere segmentação
- **Pós-condições**: Relatório gerencial gerado com análises avançadas

## Módulo: Notificações

### UC-NOT-01: Geração de Notificação Automática

- **Ator Principal**: Sistema
- **Pré-condições**: Evento que requer notificação ocorrido
- **Fluxo Principal**:
    1. Sistema identifica evento de notificação (mudança de status, pendência)
    2. Sistema determina destinatários conforme regras
    3. Sistema gera notificação por e-mail e/ou sistema
    4. Sistema registra envio de notificação
- **Fluxos Alternativos**:
    - Falha no envio de e-mail: Sistema registra erro e tenta novamente
    - Usuário inativo: Sistema redireciona para supervisor
- **Pós-condições**: Notificação enviada aos destinatários

### UC-NOT-02: Visualização de Notificações no Sistema

- **Ator Principal**: Qualquer usuário
- **Pré-condições**: Usuário autenticado no sistema
- **Fluxo Principal**:
    1. Usuário acessa ícone de notificações no painel
    2. Sistema exibe lista de notificações não lidas
    3. Usuário seleciona notificação para visualizar detalhes
    4. Sistema marca notificação como lida
    5. Sistema permite ação direta a partir da notificação
- **Fluxos Alternativos**:
    - Marcar todas como lidas: Usuário marca todas notificações
    - Filtrar por tipo: Usuário visualiza apenas um tipo de notificação
- **Pós-condições**: Notificação lida e, se aplicável, usuário direcionado para ação relacionada

### UC-NOT-03: Gestão de Preferências de Notificação

- **Ator Principal**: Qualquer usuário
- **Pré-condições**: Usuário autenticado no sistema
- **Fluxo Principal**:
    1. Usuário acessa perfil
    2. Usuário seleciona "Preferências de Notificação"
    3. Usuário configura tipos de notificação desejados (e-mail, sistema)
    4. Usuário seleciona eventos para notificação
    5. Sistema salva preferências
- **Fluxos Alternativos**:
    - Restaurar padrões: Usuário restaura configurações padrão
    - Desativar todas: Sistema alerta sobre impactos operacionais
- **Pós-condições**: Preferências de notificação atualizadas para o usuário

### UC-NOT-04: Notificação para Renovação de Benefícios

- **Ator Principal**: Sistema
- **Pré-condições**: Benefício próximo do prazo de renovação
- **Fluxo Principal**:
    1. Sistema identifica benefícios a vencer em 30, 15 e 5 dias
    2. Sistema gera notificação para unidade responsável
    3. Sistema registra alerta no painel de notificações
    4. Sistema envia e-mail para responsáveis
- **Fluxos Alternativos**:
    - Benefício não renovável: Sistema não gera notificação
    - Beneficiário inelegível para renovação: Sistema notifica encerramento
- **Pós-condições**: Notificações de renovação enviadas conforme prazos

## Módulo: Auditoria e Segurança

### UC-AUD-01: Registro de Logs de Auditoria

- **Ator Principal**: Sistema
- **Pré-condições**: Ação registrável ocorrida no sistema
- **Fluxo Principal**:
    1. Sistema detecta operação CRUD
    2. Sistema registra data, hora, usuário, ação, IP
    3. Sistema armazena dados alterados (antes/depois)
    4. Sistema associa log à entidade principal
- **Fluxos Alternativos**:
    - Falha no registro: Sistema alerta administrador
    - Operação em massa: Sistema consolida logs
- **Pós-condições**: Log de auditoria registrado para consulta futura

### UC-AUD-02: Consulta de Logs de Auditoria

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa módulo de Auditoria
    2. Administrador configura filtros (data, usuário, tipo de ação, entidade)
    3. Sistema processa busca nos logs
    4. Sistema exibe resultados paginados
    5. Administrador visualiza detalhes de operações
- **Fluxos Alternativos**:
    - Exportação de logs: Sistema gera relatório em CSV
    - Nenhum resultado: Sistema exibe mensagem informativa
- **Pós-condições**: Logs de auditoria consultados conforme filtros

### UC-AUD-03: Controle de Versão de Documentos

- **Ator Principal**: Sistema
- **Pré-condições**: Documento anexado à solicitação
- **Fluxo Principal**:
    1. Sistema recebe novo upload de documento
    2. Sistema registra versão com metadados (data, usuário)
    3. Sistema mantém histórico de versões anteriores
    4. Sistema exibe versão mais recente como padrão
- **Fluxos Alternativos**:
    - Visualização de versão anterior: Usuário seleciona versão específica
    - Comparação de versões: Sistema mostra diferenças (quando possível)
- **Pós-condições**: Documento versionado no sistema com histórico mantido

### UC-AUD-04: Monitoramento de Atividades Suspeitas

- **Ator Principal**: Sistema
- **Pré-condições**: Logs de atividade registrados
- **Fluxo Principal**:
    1. Sistema analisa padrões de uso
    2. Sistema detecta comportamentos anômalos
    3. Sistema registra alerta para atividade suspeita
    4. Sistema notifica administrador
- **Fluxos Alternativos**:
    - Bloqueio preventivo: Sistema bloqueia conta temporariamente
    - Falso positivo: Administrador marca alerta como falso positivo
- **Pós-condições**: Atividade suspeita registrada e notificada

## Módulo: Configurações do Sistema

### UC-CFG-01: Configuração de Parâmetros Globais

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa módulo de Configurações
    2. Administrador ajusta parâmetros globais (timeout de sessão, tentativas de login)
    3. Administrador confirma alterações
    4. Sistema aplica configurações imediatamente
    5. Sistema registra alteração no log de auditoria
- **Fluxos Alternativos**:
    - Restaurar padrões: Administrador reverte para configurações originais
    - Valores inválidos: Sistema exibe alerta de validação
- **Pós-condições**: Parâmetros globais do sistema atualizados

### UC-CFG-02: Configuração de Servidor de E-mail

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa configurações de E-mail
    2. Administrador preenche parâmetros SMTP (servidor, porta, autenticação)
    3. Administrador configura e-mail remetente e nome de exibição
    4. Administrador testa configuração
    5. Sistema valida e salva configurações
- **Fluxos Alternativos**:
    - Teste falha: Sistema exibe erro detalhado
    - Credenciais inválidas: Sistema solicita correção
- **Pós-condições**: Servidor de e-mail configurado e testado

### UC-CFG-03: Configuração de Templates de E-mail

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa configurações de Templates
    2. Administrador seleciona tipo de notificação
    3. Administrador edita assunto e corpo do e-mail
    4. Administrador insere variáveis de substituição disponíveis
    5. Administrador visualiza preview
    6. Sistema salva template
- **Fluxos Alternativos**:
    - Restaurar padrão: Administrador reverte para template original
    - Variável inválida: Sistema destaca erro de sintaxe
- **Pós-condições**: Template de e-mail configurado para uso nas notificações

### UC-CFG-04: Gestão de Termos e Políticas

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa módulo de Termos e Políticas
    2. Administrador seleciona documento para edição (Privacidade, Termos de Uso)
    3. Administrador edita conteúdo
    4. Administrador define data de vigência
    5. Sistema publica nova versão
    6. Sistema notifica usuários sobre atualização
- **Fluxos Alternativos**:
    - Versões anteriores: Administrador consulta histórico de versões
    - Exigir concordância: Sistema força aceite na próxima autenticação
- **Pós-condições**: Novos termos ou políticas publicados no sistema

## Módulo: Integração com WhatsApp

### UC-WPP-01: Recebimento de Solicitação via WhatsApp

- **Ator Principal**: Sistema
- **Pré-condições**: Integração com WhatsApp configurada
- **Fluxo Principal**:
    1. Sistema recebe mensagem do beneficiário via WhatsApp
    2. Sistema identifica intenção de solicitar benefício
    3. Sistema inicia chatbot para coleta de informações básicas
    4. Sistema solicita dados de identificação (CPF, nome)
    5. Sistema solicita tipo de benefício desejado
    6. Sistema registra solicitação preliminar
    7. Sistema associa à unidade mais próxima do beneficiário
- **Fluxos Alternativos**:
    - Beneficiário já cadastrado: Sistema recupera informações
    - Conversa abandonada: Sistema registra parcialmente e notifica unidade
    - Demanda não relacionada: Sistema encaminha para atendimento humano
- **Pós-condições**: Solicitação via WhatsApp registrada para revisão técnica

### UC-WPP-02: Acompanhamento de Solicitação via WhatsApp

- **Ator Principal**: Beneficiário
- **Pré-condições**: Solicitação cadastrada no sistema
- **Fluxo Principal**:
    1. Beneficiário solicita status via WhatsApp
    2. Sistema identifica solicitante por CPF
    3. Sistema recupera status atual da solicitação
    4. Sistema informa status com linguagem amigável
    5. Sistema oferece opções adicionais (falar com atendente, cancelar)
- **Fluxos Alternativos**:
    - Múltiplas solicitações: Sistema lista todas e pede seleção
    - Solicitação não encontrada: Sistema orienta contato com unidade
    - Pendências identificadas: Sistema informa quais documentos/dados faltam
- **Pós-condições**: Beneficiário informado sobre status atual da solicitação

### UC-WPP-03: Notificação via WhatsApp

- **Ator Principal**: Sistema
- **Pré-condições**: Beneficiário com WhatsApp cadastrado e solicitação com mudança de status
- **Fluxo Principal**:
    1. Sistema detecta mudança relevante no status da solicitação
    2. Sistema gera mensagem apropriada ao novo status
    3. Sistema envia notificação via WhatsApp
    4. Sistema registra envio da notificação
- **Fluxos Alternativos**:
    - Falha no envio: Sistema tenta novamente após intervalo
    - Mensagem não entregue: Sistema registra e notifica unidade
- **Pós-condições**: Beneficiário notificado via WhatsApp sobre mudança de status

## Módulo: Importação e Exportação

### UC-IMP-01: Exportação de Dados

- **Ator Principal**: Administrador ou Gestor SEMTAS
- **Pré-condições**: Usuário autenticado com perfil adequado
- **Fluxo Principal**:
    1. Usuário acessa função de Exportação
    2. Usuário seleciona entidade para exportação (beneficiários, solicitações)
    3. Usuário configura filtros e campos desejados
    4. Usuário seleciona formato (CSV, Excel)
    5. Sistema processa dados
    6. Sistema gera arquivo para download
- **Fluxos Alternativos**:
    - Volume grande de dados: Sistema processa em background e notifica
    - Erro de processamento: Sistema informa falha específica
- **Pós-condições**: Arquivo de exportação gerado e disponível para download

### UC-IMP-02: Importação de Dados

- **Ator Principal**: Administrador
- **Pré-condições**: Usuário autenticado com perfil de Administrador
- **Fluxo Principal**:
    1. Administrador acessa função de Importação
    2. Administrador seleciona entidade para importação
    3. Administrador faz upload de arquivo (CSV, Excel)
    4. Sistema valida estrutura do arquivo
    5. Sistema exibe preview dos dados
    6. Administrador mapeia campos e confirma importação
    7. Sistema processa importação em background
    8. Sistema notifica quando concluído
- **Fluxos Alternativos**:
    - Erros de validação: Sistema exibe lista detalhada de problemas
    - Dados duplicados: Sistema oferece opções (ignorar, atualizar, manter ambos)
    - Cancelamento: Administrador cancela importação em andamento
- **Pós-condições**: Dados importados no sistema conforme arquivo fornecido
