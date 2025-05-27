#  - SEMTAS

## 1. Visão Geral do Produto

### 1.1 Descrição

O Sistema de Gestão de Benefícios Eventuais é uma solução digital projetada para a Secretaria Municipal do Trabalho e Assistência Social (SEMTAS) de Natal/RN, que visa automatizar e gerenciar todo o ciclo de vida das solicitações de benefícios eventuais previstos na Lei Municipal 7.205/2021 e Decreto Municipal 12.346/2021.

### 1.2 Propósito

Facilitar o processo de solicitação, análise, aprovação e concessão de benefícios eventuais, garantindo transparência, auditabilidade e conformidade com a LGPD, além de proporcionar maior eficiência no atendimento às famílias em situação de vulnerabilidade.

### 1.3 Escopo do MVP

O MVP (Minimum Viable Product) abrangerá inicialmente dois tipos de benefícios:

- **Benefício Natalidade** (kit enxoval)
- **Aluguel Social**

Todavia, a estrutura de dados do projeto já deve suportar a inclusão de outros tipos de benefícios futuramente:

- **Benefício Mortalidade** (urna funerária)
- **Cesta Básica**
- **Passagens** (terrestre e aérea)
- **Documentação Pessoal Básica**
- **Benefícios para Desastres/Calamidade Pública**

### 1.4 Objetivos do Produto

- Digitalizar completamente o processo de solicitação e concessão de benefícios
- Implementar controle rigoroso de exclusividade de papéis (beneficiário vs. composição familiar)
- Reduzir o tempo de análise e aprovação das solicitações
- Melhorar a rastreabilidade e auditoria do processo
- Garantir conformidade com as normas legais e LGPD
- Facilitar o acesso aos serviços assistenciais para os cidadãos
- Possibilitar a geração de relatórios e indicadores de gestão
- Suportar determinações judiciais em caráter extraordinário

---

## 2. Base Legal e Regulamentação

### 2.1 Legislação Federal
- **Lei nº 8.742/1993** (LOAS) - alterada pela Lei nº 12.435/2011
- **Decreto nº 6.307/2007** - Regulamenta benefícios eventuais
- **Lei nº 14.674/2023** - Altera Lei Maria da Penha (auxílio-aluguel)

### 2.2 Legislação Municipal
- **Lei nº 7.205/2021** - Regulamenta benefícios eventuais em Natal
- **Decreto nº 12.346/2021** - Regulamentação específica
- **Projeto de Lei Complementar** - Em tramitação (modernizações previstas)

---

## 3. Modalidades de Benefícios

### 3.1 Lista Completa (Art. 8º da Lei 7.205/21)

#### I. Benefício por Natalidade
- **Descrição**: Kit enxoval ou auxílio financeiro para recém-nascidos
- **Valor em pecúnia**: R$ 500,00 (projeto de lei em tramitação)
- **Prazo**: Até 30 dias após o parto (com certidão de nascimento)
- **Modalidades**: Bens de consumo ou PIX

#### II. Benefício por Morte  
- **Descrição**: Urna funerária com translado
- **Tipos**: Padrão (até 100kg), Obeso (até 150kg), Especial, Infantil (até 50kg)
- **Melhorias previstas**: Flores, formol, velas e roupa
- **Atendimento**: 24h com profissionais de sobreaviso

#### III. Benefícios em Vulnerabilidade Temporária
- **a) Cesta Básica**: Gêneros alimentícios ou vale alimentação (R$ 200,00)
- **b) Aluguel Social**: R$ 600,00 mensais por até 6 meses (prorrogável)
- **c) Documentação Pessoal Básica**: Expedição de documentos
- **d) Passagem Terrestre**: Deslocamento intermunicipal/interestadual  
- **e) Passagem Aérea**: Para casos específicos

#### IV. Benefícios para Desastres/Calamidade Pública
- **Descrição**: Atendimento emergencial especializado
- **Exceção**: Famílias atingidas em 2014/2017 dispensadas de comprovante CadÚnico

---

## 4. Usuários e Stakeholders

### 4.1 Principais Stakeholders

- Secretaria Municipal do Trabalho e Assistência Social (SEMTAS)
- Unidades Solicitantes (CRAS, CREAS, outros)
- Beneficiários (cidadãos em situação de vulnerabilidade)
- Poder Judiciário (para determinações judiciais)

### 4.2 Unidades Solicitantes

- **CRAS**: Guarapes, Ponta Negra, NSA, Nordelândia, Felipe Camarão, Planalto, Pajuçara, Passo da Pátria, Lagoa Azul, Salinas, Mãe Luíza, África
- **CREAS**: Oeste, Norte
- **Centro Pop**: Pessoas em situação de rua
- **Outros**: DPSE/Comitê Refugiados, SEAS, Centro de Cidadania LGBT, CREN (Centro de Referência da Mulher)

### 4.3 Perfis de Usuário

1. **Administrador**
   - Acesso total ao sistema
   - Configuração de parâmetros
   - Gestão de usuários e permissões

2. **Gestor (SEMTAS)**
   - Visualização de todas as solicitações
   - Aprovação/pendenciamento de solicitações
   - Acesso a relatórios e dashboards

3. **Técnico (SEMTAS)**
   - Visualização de todas as solicitações
   - Análise de documentação
   - Registro de pareceres técnicos

4. **Assistente Social (Unidade Solicitante)**
   - Cadastro de beneficiários
   - Registro de solicitações
   - Resolução de pendências
   - Anexar documentos
   - Liberação (pagamento) dos benefícios aprovados

5. **Auditor**
   - Acesso completo para consulta
   - Relatórios de auditoria
   - Logs do sistema

---

## 5. Estrutura de Dados Completa

### 5.1 Dados Pessoais do Cidadão
- Nome completo
- Nome social (opcional)
- CPF (chave primária)
- RG
- NIS (Número de Identificação Social)
- Data de nascimento
- Naturalidade
- Nome da mãe
- Cor/Raça
- Gênero (M/F)
- Estado civil (Solteiro, Casado, União Estável, Divorciado, Separado de fato, Viúvo)
- Telefones de contato

### 5.2 Dados de Endereço
- Endereço completo
- Número
- Complemento
- Bairro
- CEP
- Ponto de referência
- Tempo de residência em Natal (validação: mínimo 2 anos, futuro: 1 ano)

### 5.3 Dados Socioeconômicos
- Renda familiar total
- Renda per capita
- Tipo de moradia (Própria/Cedida/Alugada/Posse/Invasão)
- Valor do aluguel (quando aplicável)
- Beneficiário do Programa Minha Casa Minha Vida (Sim/Não)
- Inscrito em Programa Habitacional (Sim/Não)

#### Despesas Fixas:
- Água
- Energia elétrica
- Gás
- Alimentação, higiene e limpeza
- Medicamentos
- Telefone
- Outras despesas

### 5.4 Benefícios e Programas Sociais
- Programa Bolsa Família (Sim/Não + Valor)
- BPC - Benefício de Prestação Continuada (Idoso/PCD + Valor)
- Tributo à Criança (Sim/Não + Valor)
- Pensão por Morte (Sim/Não)
- Aposentadoria (Sim/Não)
- Outros benefícios eventuais recebidos
- Acompanhamento pelos CRAS/CREAS (Sim/Não)

### 5.5 Composição Familiar
Para cada membro da família:
- Nome
- Idade
- Parentesco
- CPF
- Ocupação/Profissão
- Escolaridade
- Renda individual
- Fatores de risco social (Alcoolismo, Deficiências, Desemprego, Drogadição, Situação de rua, Trabalho infantil, Violência doméstica, etc.)

### 5.6 Dados Socioprofissionais

#### Do Beneficiário:
- Ocupação atual
- Exerce atividade remunerada (Sim/Não)
- Tipo de mercado (Formal/Informal)
- Escolaridade (Analfabeto, Fund. Incompleto/Completo, Médio Incompleto/Completo, Técnico, Superior Incompleto/Completo, Especialização, Mestrado/Doutorado)
- Possui curso profissionalizante (Sim/Não + Especificação)
- Interesse em curso profissionalizante (Sim/Não + Especificação)

#### Dos Membros da Família:
- Nome
- Escolaridade (mesmas opções do beneficiário)
- Possui curso profissionalizante (Sim/Não + Especificação)
- Interesse em curso profissionalizante (Sim/Não + Especificação)
- Trabalha (Sim/Não)
- Mercado (Formal/Informal + Especificação)

### 5.7 Dados Bancários (PIX)
- Tipo de chave PIX (CPF, e-mail, telefone, chave aleatória)
- Valor da chave PIX
- Nome do titular da chave PIX
- Banco (opcional)

### 5.8 Identificação do Requerente (quando diferente do beneficiário)
- Nome
- CPF
- RG
- NIS
- Contato
- Parentesco com o beneficiário
- Validação automática para menores de idade (representante legal obrigatório)

---

## 6. Regras de Negócio Críticas

### 6.1 Exclusividade de Papéis ⚠️ **CRÍTICO**
```
REGRA FUNDAMENTAL:
Um cidadão (CPF) NÃO pode simultaneamente:
1. Ser beneficiário principal de uma solicitação E
2. Fazer parte da composição familiar de outro beneficiário

VALIDAÇÕES OBRIGATÓRIAS:
- Antes de cadastrar beneficiário: verificar se CPF consta em composição familiar ativa
- Antes de adicionar à composição: verificar se CPF é beneficiário ativo
- Sistema deve disponibilizar endpoint para conversão de papel
- Registrar histórico da conversão
- Notificar técnicos responsáveis
```

### 6.2 Determinações Judiciais
- Solicitações ou prorrogações em caráter extraordinário por determinação judicial
- Tramitação prioritária absoluta
- Prazos diferenciados quando determinado judicialmente
- Documentação da determinação judicial obrigatória
- Relatórios específicos para acompanhamento
- Campos adicionais: número do processo, vara origem, data da determinação

### 6.3 Residência em Natal
- **Critério atual**: Mínimo 2 anos
- **Projeto de lei**: Redução para 1 ano
- **Exceção**: Famílias atingidas por calamidade em 2014/2017 (dispensadas de comprovante CadÚnico)

### 6.4 Benefício Natalidade - Regras Específicas
- **Durante gestação**: A partir do 6º mês
- **Após parto**: Até 30 dias (com certidão de nascimento obrigatória)
- **Modalidades**: Bens de consumo ou pecúnia (R$ 500,00 via PIX)
- **PIX obrigatório**: No CPF do beneficiário ou representante legal
- **Documento adicional**: Termo de responsabilidade assinado

### 6.5 Aluguel Social - Regras Específicas
- Valor fixo: R$ 600,00 mensais
- Prazo: Até 6 meses (prorrogável por igual período mediante análise profissional)
- Comprovação mensal obrigatória
- **Monitoramento obrigatório**: Visitas técnicas mensais (Art. 29 do Decreto 12.346/21)
- **Prioridades**: 
  - Famílias/indivíduo com violação de direito
  - Casos de desastres e/ou calamidade pública
  - Mulheres vítimas de violência doméstica (Lei Maria da Penha)
- **Pagamento retroativo**: Possível quando há suspensão por não entrega de recibo (solicitar em até 10 dias)
- **Timeline**: Pagamento até 15º dia útil
- **Documento adicional**: Recibo de pagamento do aluguel do mês anterior (renovação/prorrogação)

### 6.6 Benefício Mortalidade
- Tipos: Padrão (até 100kg), Obeso (até 150kg), Especial, Infantil (até 50kg)
- Funerária conveniada: Padre Cícero
- **Atendimento 24h**: Profissionais de sobreaviso
- Translado completo incluído
- Hipossuficiência obrigatória

### 6.7 Cesta Básica
- Periodicidade: Máximo 6 meses, renovável por até 3 meses
- **Modalidades futuras**: Bens de consumo ou Vale Alimentação (R$ 200,00)
- Diferenciação: Não confundir com política de segurança alimentar

---

## 7. Fluxo Operacional Detalhado

### 7.1 Timeline Aluguel Social (Mensal)
```
ATÉ DIA 25: Requerimento/Concessão
ATÉ DIA 30: Renovação (no mês da 6ª parcela)
ATÉ DIA 05: Relatório Informativo (quando necessário)
ATÉ DIA 24: E-mail às unidades descentralizadas
ATÉ DIA 10: Lançamento de crédito
ATÉ DIA 05: Abertura de conta
15º DIA ÚTIL: Pagamento do benefício
ATÉ 10 DIAS ÚTEIS: Envio dos recibos
```

### 7.2 Fluxo de Estados da Solicitação
```
RASCUNHO → ABERTA → EM ANÁLISE → PENDENTE/APROVADA → LIBERADA → CONCLUÍDA
                                     ↓
                                 CANCELADA
```

#### Estados Detalhados:
- **Rascunho**: Cadastrada via WhatsApp pelo beneficiário
- **Aberta**: Cadastrada/revisada pelo técnico da unidade
- **Em análise**: Enviada para SEMTAS
- **Pendente**: SEMTAS identifica pendências
- **Aprovada**: Aprovada pela SEMTAS
- **Liberada**: Técnico da unidade libera o benefício
- **Concluída**: Benefício entregue ao beneficiário
- **Cancelada**: Cancelada por qualquer motivo

### 7.3 Processo Completo de Solicitação

1. **Identificação do Solicitante**
   - Pergunta: "O solicitante é o próprio beneficiário?"
   - Se NÃO: Coletar dados do solicitante e validar parentesco
   - Para menores: Validar representante legal obrigatório

2. **Cadastro/Seleção do Beneficiário**
   - Buscar por CPF/NIS/Nome
   - Validar exclusividade de papel
   - Incluir dados bancários (PIX)

3. **Preenchimento Específico por Benefício**
   - Formulário dinâmico conforme tipo
   - Validações específicas
   - Upload de documentos obrigatórios

4. **Análise SEMTAS**
   - Parecer técnico
   - Aprovação ou pendenciamento
   - Notificação automática

5. **Liberação**
   - Registro de pagamento via PIX
   - Confirmação de valor pago
   - Conclusão do processo

---

## 8. Dados Específicos por Benefício

### 8.1 Benefício Natalidade
- Data prevista para o parto
- Comprovação de pré-natal
- Realiza pré-natal (Sim/Não)
- Atendida pelo PSF/UBS (Sim/Não)
- Gravidez de risco (Sim/Não)
- Gêmeos/Trigêmeos (Sim/Não)
- Já tem filhos (Sim/Não + Quantidade)
- PIX obrigatoriamente no CPF do beneficiário/representante

### 8.2 Aluguel Social
- **Público prioritário** (apenas 1 opção):
  - Crianças/Adolescentes
  - Gestantes/Nutrizes
  - Idosos
  - Mulheres vítimas de violência
  - PCD
  - Atingidos por calamidade
  - Situação de risco/vulnerabilidade

- **Especificação** (até 2 opções):
  - Trabalho infantil, Exploração sexual, Vítima de violência
  - LGBTQIA+, Conflito com lei, Drogadição
  - Situação de rua, Gravidez na adolescência, etc.

- Situação da moradia atual
- Possui imóvel interditado (Sim/Não)
- Motivo da solicitação
- Valor solicitado
- Período previsto
- Composição familiar

### 8.3 Benefício Mortalidade
- Nome completo do falecido
- Data do óbito
- Local do óbito
- Data da autorização
- Grau de parentesco do requerente
- Tipo de urna necessária

### 8.4 Outros Benefícios (Estrutura Futura)
- Cesta Básica: Quantidade, período, origem do atendimento
- Passagens: Destino, quantidade, data do embarque, técnica responsável
- Documentação: Tipos de documentos solicitados

---

## 9. Documentos Gerados pelo Sistema

### 9.1 Documentos Comuns
- Relatório Técnico e Parecer
- Memorandos de solicitação (por tipo de benefício)
- Declarações específicas (por benefício)
- Relatórios Informativos
- Termos de Desistência

### 9.2 Documentos por Benefício

#### Benefício Natalidade
- Recibo de Entrega de Kit(s) Enxoval(is)
- Termo de Responsabilidade (modalidade pecúnia)

#### Aluguel Social
- Termo de Adesão (marcação concessão/renovação)
- Recibo de Pagamento do Aluguel Social
- Declaração de período de recebimento

#### Benefício Mortalidade
- Formulários específicos por tipo (Padrão, Obeso, Especial, Infantil)
- Recibo de Entrega de Urna Funerária

#### Outros
- Cesta Básica: Recibo de Entrega
- Passagens: Recibo de Concessão

---

## 10. Requisitos Técnicos

### 10.1 Stack de Desenvolvimento
- **Backend**: Nest JS com TypeORM
- **Frontend**: Quasar Framework (Vue 3 com TypeScript e Pinia)
- **Banco de Dados**: PostgreSQL
- **Integração**: API existente em fase final de desenvolvimento

### 10.2 Controle de Acesso - PBAC (Policy-Based Access Control)
```
POLÍTICAS DE ACESSO:
- Baseadas em atributos do usuário (cargo, unidade, especialização)
- Contexto da solicitação (tipo de benefício, status, urgência)
- Regras dinâmicas configuráveis
- Controle granular por funcionalidade

MATRIZ DE PERMISSÕES:
|Funcionalidade|Administrador|Gestor|Técnico|Assistente Social|Auditor|
|---|---|---|---|---|---|
|Gestão de Unidades|CRUD|R|R|R|R|
|Gestão de Usuários|CRUD|R|R|R|R|
|Gestão de Benefícios|CRUD|CRUD|R|R|R|
|Cadastro de Beneficiários|CRUD|CRUD|CRUD|CRUD|R|
|Solicitações|CRUD|CRUD|CRUD|CRUD|CRUD|
|Aprovação|Sim|Sim|Não|Não|Não|
|Liberação|Sim|Sim|Não|Sim|Não|
|Relatórios|Todos|Todos|Consulta|Consulta|Consulta|
```

### 10.3 Integrações Necessárias
- **API existente**: Compatibilidade com desenvolvimento em andamento
- **Receita Federal**: Validação de CPF
- **CadÚnico**: Dados socioeconômicos (futuro)
- **SUAS**: Prontuário e acompanhamento
- **Sistema bancário**: Pagamentos PIX
- **Correios**: Validação de CEP
- **SMTP**: Notificações por e-mail

### 10.4 Segurança e Auditoria
- Logs completos de todas operações CRUD
- Registro de acessos com IP, data, hora e usuário
- Controle de versão de documentos
- Backup diário com retenção de 30 dias
- Conformidade LGPD
- HTTPS obrigatório
- Armazenamento seguro (até 5MB por arquivo)
- Retenção de dados: 5 anos

---

## 11. Funcionalidades Específicas do Sistema

### 11.1 Validações Automáticas
- Conflitos de papéis (beneficiário vs. composição familiar)
- Idade para representante legal obrigatório
- Residência em Natal (tempo mínimo)
- Formato de CPF e duplicidade
- Validação de chaves PIX
- Documentos obrigatórios por tipo de benefício

### 11.2 Endpoint de Conversão de Papéis
```
Funcionalidade: Converter cidadão de composição familiar em beneficiário
Parâmetros:
- cpf_origem: CPF do cidadão na composição
- beneficiario_origem_id: ID do beneficiário atual
- novo_beneficio_tipo: Tipo do novo benefício

Processo:
1. Validar existência na composição
2. Remover da composição original
3. Criar novo perfil como beneficiário
4. Registrar histórico da conversão
5. Notificar técnicos responsáveis
```

### 11.3 Notificações Inteligentes
- E-mails automáticos por mudança de status
- Alertas de pendências no sistema
- Notificações de renovação de benefícios recorrentes
- Alertas de benefícios suspensos/cessados
- Lembretes de monitoramento obrigatório

### 11.4 Relatórios e Dashboards
- Dashboard por perfil de usuário
- KPIs: novos beneficiários, aprovações, valores, TMA
- Relatórios operacionais e gerenciais
- Análise de tendências e projeções
- Exportação em PDF e CSV
- Filtros e ordenações personalizáveis

---

## 12. Casos Judiciais Especiais

### 12.1 Campos Adicionais
- Determinação judicial: boolean
- Número do processo: string
- Vara origem: string
- Data da determinação: date
- Arquivo da determinação: file
- Observações judiciais: text

### 12.2 Regras Especiais
- Tramitação prioritária absoluta
- Prazos diferenciados dos ordinários
- Renovações automáticas se determinado judicialmente
- Relatórios específicos para acompanhamento judicial
- Alertas especiais para casos judicializados

---

## 13. Programa Dignidade Menstrual (Integração)

### 13.1 Critérios
- Idade: 10-49 anos
- CadÚnico obrigatório
- Renda até R$ 218,00 mensais OU estudante de baixa renda OU situação de rua

### 13.2 Benefício
- 40 absorventes para dois ciclos menstruais (56 dias)
- Retirada em farmácias credenciadas
- Autorização via Meu SUS Digital (validade 180 dias)

---

## 14. Modernizações Previstas

### 14.1 Projeto de Lei Complementar
- **Residência**: Redução de 2 para 1 ano em Natal
- **Benefício Natalidade**: Modalidade pecúnia R$ 500,00 via PIX
- **Cesta Básica**: Vale Alimentação R$ 200,00 mensais
- **Benefício Mortalidade**: Inclusão de flores, formol, velas e roupa

### 14.2 Sistema SOBE Futuro
- Digitalização completa dos processos
- Workflow automatizado avançado
- Controle inteligente de prazos
- Relatórios e dashboards com IA
- Integração completa com outros sistemas governamentais

---

## 15. Cronograma de Implementação

### Fase 1 - MVP (3 semanas)
- Gestão de usuários e unidades
- Cadastro de beneficiários com controle de exclusividade
- Benefício Natalidade completo
- Aluguel Social completo
- Sistema de notificações básico

### Fase 2 - Expansão (Futuro)
- Benefício Mortalidade
- Cesta Básica
- Passagens
- Documentação Pessoal
- Relatórios avançados
- Integrações externas completas

---

## 16. Considerações Finais

### 16.1 Fatores Críticos de Sucesso
1. **Controle rigoroso de exclusividade de papéis**
2. **Integração eficiente com API existente**
3. **Flexibilidade para mudanças legislativas**
4. **Interface intuitiva para diferentes perfis**
5. **Performance para alto volume de transações**
6. **Treinamento adequado das equipes**

### 16.2 Impacto Social Esperado
- Agilização significativa dos processos
- Redução de erros operacionais
- Transparência completa no acompanhamento
- Melhoria na experiência do cidadão
- Otimização dos recursos públicos
- Controle eficaz contra fraudes

### 16.3 Observações Importantes
- Sistema preparado para API já em desenvolvimento
- Cadastro digital direto (sem fichas físicas)
- PBAC para controle granular de acesso
- Suporte completo a determinações judiciais
- Estrutura preparada para expansão futura

---

**Documento elaborado por:** Equipe de Análise de Sistemas  
**Data:** 2025  
**Versão:** 2.0  
**Aprovação:** Secretaria Municipal do Trabalho e Assistência Social - SEMTAS

---

*Este documento consolida todos os requisitos identificados na análise dos processos atuais, integrando as regras específicas solicitadas e considerando a API em desenvolvimento e as modernizações previstas na legislação municipal.*