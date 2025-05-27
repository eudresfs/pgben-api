# Especificação Técnica - Sistema de Benefícios Eventuais
**Secretaria Municipal do Trabalho e Assistência Social - SEMTAS**  
**Prefeitura Municipal de Natal/RN**

---

## Sumário Executivo

Este documento apresenta a especificação técnica completa para o desenvolvimento do Sistema de Benefícios Eventuais da SEMTAS, baseado na análise dos processos atuais, legislação vigente e modernizações previstas. O sistema gerenciará 5 modalidades principais de benefícios, atendendo famílias em situação de vulnerabilidade social através de cadastro digital direto.

---

## 1. INTRODUÇÃO

### 1.1 Contexto
Os benefícios eventuais são provisões suplementares e provisórias da assistência social, destinadas a cidadãos e famílias em situações de nascimento, morte, vulnerabilidade temporária e calamidade pública, conforme estabelecido pela Lei Orgânica da Assistência Social (LOAS) e regulamentado localmente pela Lei Municipal nº 7.205/2021.

### 1.2 Objetivo do Sistema
Desenvolver uma plataforma digital integrada para gestão completa dos benefícios eventuais, desde a solicitação até o monitoramento, com cadastro direto no sistema, controle de documentos, prazos, pagamentos e relatórios gerenciais.

### 1.3 Escopo
O sistema contemplará todas as modalidades de benefícios eventuais do município de Natal, integrando-se com a API em desenvolvimento e suportando as modernizações previstas no projeto de lei complementar em tramitação.

---

## 2. BASE LEGAL

### 2.1 Legislação Federal
- **Lei nº 8.742/1993** (LOAS) - alterada pela Lei nº 12.435/2011
- **Decreto nº 6.307/2007** - Regulamenta benefícios eventuais
- **Lei nº 14.674/2023** - Altera Lei Maria da Penha (auxílio-aluguel)

### 2.2 Legislação Municipal
- **Lei nº 7.205/2021** - Regulamenta benefícios eventuais em Natal
- **Decreto nº 12.346/2021** - Regulamentação específica
- **Projeto de Lei Complementar** - Em tramitação (modernizações)

---

## 3. MODALIDADES DE BENEFÍCIOS

### 3.1 Lista Completa (Art. 8º da Lei 7.205/21)

#### I. Benefício por Natalidade
- **Descrição**: Kit enxoval ou auxílio financeiro para recém-nascidos
- **Valor em pecúnia**: R$ 500,00 (projeto de lei)
- **Prazo**: Até 30 dias após o parto (com certidão de nascimento)

#### II. Benefício por Morte  
- **Descrição**: Urna funerária com translado
- **Tipos**: Padrão (até 100kg), Obeso (até 150kg), Especial, Infantil (até 50kg)
- **Melhorias previstas**: Flores, formol, velas e roupa

#### III. Benefícios em Vulnerabilidade Temporária
- **a) Cesta Básica**: Gêneros alimentícios ou vale alimentação (R$ 200,00)
- **b) Aluguel Social**: R$ 600,00 mensais por até 6 meses
- **c) Documentação Pessoal Básica**: Expedição de documentos
- **d) Passagem Terrestre**: Deslocamento intermunicipal/interestadual  
- **e) Passagem Aérea**: Para casos específicos

#### IV. Benefícios para Desastres/Calamidade Pública
- **Descrição**: Atendimento emergencial especializado

---

## 4. ESTRUTURA DE DADOS

### 4.1 Dados Pessoais do Cidadão
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

### 4.2 Dados de Endereço
- Endereço completo
- Número
- Complemento
- Bairro
- CEP
- Ponto de referência
- Tempo de residência em Natal

### 4.3 Dados Socioeconômicos
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

### 4.4 Benefícios e Programas Sociais
- Programa Bolsa Família (Sim/Não + Valor)
- BPC - Benefício de Prestação Continuada (Idoso/PCD + Valor)
- Tributo à Criança (Sim/Não + Valor)
- Pensão por Morte (Sim/Não)
- Aposentadoria (Sim/Não)
- Outros benefícios eventuais recebidos
- Acompanhamento pelos CRAS/CREAS (Sim/Não)

### 4.5 Composição Familiar
Para cada membro da família:
- Nome
- Idade
- Parentesco
- CPF
- Ocupação/Profissão
- Escolaridade
- Renda individual
- Fatores de risco social (Alcoolismo, Deficiências, Desemprego, Drogadição, Situação de rua, Trabalho infantil, Violência doméstica, etc.)

### 4.6 Dados Socioprofissionais
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

### 4.7 Identificação do Requerente (quando diferente do beneficiário)
- Nome
- CPF
- RG
- NIS
- Contato
- Parentesco com o beneficiário

---

## 5. REGRAS DE NEGÓCIO CRÍTICAS

### 5.1 Exclusividade de Papéis
```
REGRA FUNDAMENTAL:
Um cidadão (CPF) NÃO pode simultaneamente:
1. Ser beneficiário principal de uma solicitação E
2. Fazer parte da composição familiar de outro beneficiário

VALIDAÇÕES OBRIGATÓRIAS:
- Antes de cadastrar beneficiário: verificar se CPF consta em composição familiar ativa
- Antes de adicionar à composição: verificar se CPF é beneficiário ativo
- Oferecer funcionalidade de conversão de papel
```

### 5.2 Conversão de Papéis
- Sistema deve disponibilizar endpoint para converter um cidadão de composição familiar em beneficiário
- Processo deve remover o cidadão da composição familiar original
- Deve registrar histórico da conversão
- Notificar técnicos responsáveis

### 5.3 Determinações Judiciais
- Solicitações ou prorrogações em caráter extraordinário por determinação judicial
- Tramitação prioritária
- Prazos diferenciados quando determinado
- Documentação da determinação judicial obrigatória
- Relatórios específicos para acompanhamento

### 5.4 Residência em Natal
- **Critério atual**: Mínimo 2 anos
- **Projeto de lei**: Redução para 1 ano
- **Exceção**: Famílias atingidas por calamidade em 2014/2017 (dispensadas de comprovante de cadastro único)

### 5.5 Aluguel Social - Regras Específicas
- Valor fixo: R$ 600,00 mensais
- Prazo: Até 6 meses (prorrogável por igual período mediante análise profissional)
- Comprovação mensal obrigatória
- Finalidade exclusiva: locação em Natal
- Monitoramento in loco obrigatório (Art. 29 do Decreto 12.346/21)
- Prioridades: Famílias/indivíduo com violação de direito; Casos de desastres e/ou calamidade pública
- Pagamento retroativo: Possível quando há suspensão por não entrega de recibo (solicitar em até 10 dias via Relatório Informativo)
- Timeline de pagamento: Até o 15º dia útil

### 5.6 Benefício Natalidade - Prazos
- **Durante gestação**: A partir do 6º mês
- **Após parto**: Até 30 dias (com certidão de nascimento obrigatória)
- **Modalidades**: Bens de consumo ou pecúnia (R$ 500,00 via PIX)

### 5.7 Benefício Mortalidade
- Tipos de urna: Padrão (até 100kg), Obeso (até 150kg), Especial, Infantil (até 50kg)
- Funerária conveniada: Padre Cícero (Rua Presidente Leão Veloso, 376 - Alecrim)
- Atendimento 24h: Profissionais de sobreaviso para fins de semana, feriados e fora do expediente
- Translado incluso: Do óbito ao cemitério, passando pelo ITEP/SVO

### 5.8 Cesta Básica
- Periodicidade: Máximo 6 meses, renovável por até 3 meses adicionais
- Modalidades (projeto de lei): Bens de consumo ou Vale Alimentação (R$ 200,00 mensais)
- Diferenciação: Não confundir com política de segurança alimentar

### 5.9 Passagens
- Modalidades: Terrestre e aérea
- Acompanhamento técnico obrigatório durante embarque
- Justificativa técnica necessária

---

## 6. DADOS ESPECÍFICOS POR BENEFÍCIO

### 6.1 Aluguel Social
- Público prioritário (apenas 1 opção): Crianças/Adolescentes, Gestantes/Nutrizes, Idosos, Mulheres vítimas de violência, PCD, Atingidos por calamidade, Situação de risco
- Especificação (até 2 opções): Trabalho infantil, Exploração sexual, Vítima de violência, LGBTQIA+, Conflito com lei, Drogadição, Situação de rua, Gravidez na adolescência, etc.
- Situação da moradia atual
- Possui imóvel interditado (Sim/Não)
- Casos judicializados: Lei Maria da Penha (Art. 23, inciso VI)

### 6.2 Benefício Natalidade
- Realiza pré-natal (Sim/Não)
- Atendida pelo PSF/UBS (Sim/Não)
- Gravidez de risco (Sim/Não)
- Data provável do parto
- Gêmeos/Trigêmeos (Sim/Não)
- Já tem filhos (Sim/Não + Quantidade)
- Critérios para pecúnia: Telefone cadastrado no CPF, Chave PIX = CPF

### 6.3 Benefício Mortalidade
- Nome completo do falecido
- Data do óbito
- Local do óbito
- Data da autorização
- Grau de parentesco do requerente
- Tipo de urna necessária

### 6.4 Cesta Básica
- Quantidade de cestas solicitadas
- Período de concessão
- Origem do atendimento

### 6.5 Passagens
- Destino da viagem
- Quantidade de passagens
- Data do embarque
- Técnica responsável pelo acompanhamento
- Unidade descentralizada solicitante

---

## 7. FLUXO OPERACIONAL

### 7.1 Processo Padrão
1. **Solicitação** na unidade descentralizada
2. **Cadastro direto** no sistema (sem ficha física)
3. **Entrevista técnica** e coleta de dados
4. **Upload de documentos** digitais
5. **Elaboração de memorando** (coordenação CRAS)
6. **Visita domiciliar** (quando necessária)
7. **Relatório técnico** no sistema
8. **Parecer técnico** (deferimento/indeferimento)
9. **Concessão e geração** automática de documentos
10. **Acompanhamento** durante vigência
11. **Prestação de contas** digital
12. **Renovação** (quando aplicável)
13. **Encerramento** com relatório final

### 7.2 Timeline Aluguel Social
```
ATÉ DIA 25: Requerimento/Concessão
ATÉ DIA 30: Renovação (no mês da 6ª parcela)
ATÉ DIA 05: Relatório Informativo (quando necessário)
ATÉ DIA 24: E-mail às descentralizadas
ATÉ DIA 10: Lançamento de crédito
ATÉ DIA 05: Abertura de conta
15º DIA ÚTIL: Pagamento do benefício
ATÉ 10 DIAS ÚTEIS: Envio dos recibos
```

### 7.3 Atores e Perfis
- **Beneficiário/Requerente**: Acesso limitado para consulta
- **Técnico responsável**: Assistente Social com perfil completo
- **Coordenação do CRAS**: Responsável por memorandos e aprovações
- **Gestão de Benefícios Eventuais**: Supervisão geral
- **SEMTAS**: Administração do sistema
- **Outras políticas públicas**: CREN, Centro LGBT (perfis específicos)

---

## 8. DOCUMENTOS GERADOS PELO SISTEMA

### 8.1 Documentos Comuns
- Relatório Técnico e Parecer
- Memorandos de solicitação (por tipo de benefício)
- Declarações específicas (por benefício)
- Relatórios Informativos
- Termos de Desistência (quando aplicável)

### 8.2 Documentos por Benefício

#### Aluguel Social
- Termo de Adesão (marcação concessão/renovação)
- Recibo de Pagamento do Aluguel Social
- Declaração de período de recebimento
- Termo de Desistência específico

#### Benefício Natalidade
- Recibo de Entrega de Kit(s) Enxoval(is)
- Termo de Responsabilidade (modalidade pecúnia)

#### Benefício Mortalidade
- Formulários específicos por tipo de urna (Padrão, Obeso, Especial, Infantil)
- Recibo de Entrega de Urna Funerária

#### Cesta Básica
- Recibo de Entrega de Cesta(s) Básica(s)

#### Passagens
- Recibo de Concessão de Passagem

---

## 9. UNIDADES DE ATENDIMENTO E SOLICITAÇÃO

### 9.1 Locais de Solicitação
- **CRAS** (vulnerabilidade temporária)
- **CREAS** (violações de direitos, conforme território de abrangência)
- **Centro Pop** (pessoas em situação de rua)
- **Serviços de Alta Complexidade**
- **Serviço de Proteção para Calamidades Públicas** (CRAS, CREAS ou serviço próprio)

### 9.2 Solicitações por Outras Políticas
- **Opção 1**: Centro de Cidadania LGBT e Centro de Referência da Mulher (CREN)
  - Via ofício à SEMTAS e e-mail ao Setor de Aluguel Social
- **Opção 2**: Demais políticas públicas
  - Referenciamento aos CRAS ou CREAS conforme situação (vulnerabilidade ou violação de direitos)

---

## 10. CONTROLES DE ACESSO E SEGURANÇA

### 10.1 Sistema de Autorização PBAC (Policy-Based Access Control)
```
POLÍTICAS DE ACESSO:
- Baseadas em atributos do usuário (cargo, unidade, especialização)
- Contexto da solicitação (tipo de benefício, status, urgência)
- Regras dinâmicas configuráveis
- Controle granular por funcionalidade

NÍVEIS DE ACESSO:
- Leitura: Consulta de dados
- Escrita: Cadastro e edição
- Aprovação: Deferimento/Indeferimento
- Supervisão: Relatórios gerenciais
- Administração: Configuração do sistema
```

### 10.2 Controles de Segurança
- Auditoria completa de operações
- Log de todas as alterações
- Rastreabilidade por usuário e timestamp
- Backup automático
- Conformidade LGPD
- Assinatura digital para documentos oficiais

---

## 11. INTEGRAÇÕES NECESSÁRIAS

### 11.1 API em Desenvolvimento
- Integração com API existente em fase final
- Endpoints para todas as operações de benefícios
- Sincronização de dados entre sistemas
- Versionamento da API para compatibilidade

### 11.2 Sistemas Externos
- **Receita Federal**: Validação de CPF e dados pessoais
- **CadÚnico**: Dados socioeconômicos das famílias
- **SUAS**: Prontuário e acompanhamento
- **Sistema bancário**: Para pagamentos em pecúnia (PIX)
- **Correios**: Validação de CEP e endereços
- **Terceirizadas**: Para Vale Alimentação
- **Meu SUS Digital**: Para Programa Dignidade Menstrual

---

## 12. MODERNIZAÇÕES PREVISTAS

### 12.1 Projeto de Lei Complementar em Tramitação
- **Residência**: Redução de 2 para 1 ano em Natal
- **Benefício Natalidade**: Modalidade pecúnia R$ 500,00 via PIX
- **Cesta Básica**: Vale Alimentação R$ 200,00 mensais
- **Benefício Mortalidade**: Inclusão de flores, formol, velas e roupa

### 12.2 Sistema SOBE (Sistema Operacional de Benefícios Eventuais)
- Digitalização completa dos processos
- Workflow automatizado
- Controle inteligente de prazos
- Relatórios e dashboards avançados

### 12.3 Vantagens da Modernização
- **Lógica**: Maior autonomia do beneficiário
- **Gerencial**: Redução de custos operacionais
- **Técnica**: Melhor controle e rastreabilidade

---

## 13. PROGRAMA DIGNIDADE MENSTRUAL

### 13.1 Integração com Sistema Federal
- **Critérios**: Idade 10-49 anos, CadÚnico, renda até R$ 218,00
- **Benefício**: 40 absorventes para dois ciclos menstruais (56 dias)
- **Local**: Farmácias credenciadas Programa Farmácia Popular
- **Autorização**: Via Meu SUS Digital (validade 180 dias)

---

## 14. CASOS DE USO PRINCIPAIS

### 14.1 Solicitação de Aluguel Social
```
ATOR: Técnico do CRAS
PRÉ-CONDIÇÕES: Cidadão com dados válidos, residência comprovada
FLUXO:
1. Acessar módulo Aluguel Social no sistema
2. Buscar/cadastrar cidadão no sistema
3. Validar exclusividade de papel automaticamente
4. Preencher dados específicos do benefício
5. Selecionar público prioritário (apenas 1 opção)
6. Upload de documentos obrigatórios
7. Sistema gera memorando automaticamente
8. Submeter para análise da coordenação
9. Acompanhar timeline via dashboard

VALIDAÇÕES: CPF único, residência em Natal, não conflito de papéis
```

### 14.2 Conversão de Papel (Composição Familiar → Beneficiário)
```
ATOR: Técnico do CRAS
CENÁRIO: Cidadão na composição familiar deseja ser beneficiário
FLUXO:
1. Sistema identifica conflito automaticamente
2. Técnico acessa funcionalidade "Converter Papel"
3. Sistema exibe dados da composição atual
4. Confirmar remoção da composição original
5. Sistema cria automaticamente novo perfil de beneficiário
6. Notificação automática ao técnico responsável original
7. Registro no histórico com justificativa

REGRAS: Autorização necessária, histórico obrigatório
```

### 14.3 Monitoramento Obrigatório (Aluguel Social)
```
ATOR: Técnico responsável
FREQUÊNCIA: Mensal (exigência legal Art. 29)
FLUXO:
1. Sistema gera lista automática de beneficiários ativos
2. Agendar visitas via calendário integrado
3. Registrar dados da visita no sistema móvel/web
4. Certificar uso adequado via formulário digital
5. Sistema gera relatório mensal automaticamente
6. Submissão eletrônica para gestão central
7. Controle de pendências via dashboard

OBRIGATORIEDADE: Legal para manutenção do benefício
```

---

## 15. ESPECIFICAÇÕES FUNCIONAIS

### 15.1 Módulos Principais
- **Gestão de Cidadãos**: Cadastro único com controle de exclusividade
- **Benefício Aluguel Social**: Fluxo completo com timeline
- **Benefício Natalidade**: Gestão de gestantes e recém-nascidos
- **Benefício Mortalidade**: Diferentes tipos de urna e translado
- **Cesta Básica**: Modalidades física e pecúnia
- **Passagens**: Terrestre e aérea com acompanhamento
- **Documentos Digitais**: Upload, versionamento e assinatura
- **Relatórios e Dashboards**: Indicadores gerenciais
- **Monitoramento**: Agendamento e controle de visitas

### 15.2 Funcionalidades Críticas
- Validação automática de conflitos de papéis
- Conversão de papel (endpoint específico)
- Geração automática de documentos
- Controle de prazos com alertas
- Timeline visual para Aluguel Social
- Dashboard de indicadores em tempo real
- Sistema de notificações automáticas
- Backup e auditoria completa

---

## 16. CONSIDERAÇÕES FINAIS

### 16.1 Integração com API Existente
O sistema será desenvolvido considerando a API já em fase final de desenvolvimento, garantindo compatibilidade e aproveitamento da infraestrutura existente.

### 16.2 Cadastro Digital Direto
Todos os dados serão cadastrados diretamente no sistema, eliminando fichas físicas e otimizando o processo de coleta de informações.

### 16.3 Impacto Social Esperado
- Agilização dos processos de concessão
- Transparência no acompanhamento dos benefícios
- Redução de erros operacionais
- Melhoria na experiência do cidadão
- Otimização dos recursos públicos

### 16.4 Fatores Críticos de Sucesso
1. **Flexibilidade legislativa**: Adaptação rápida a mudanças legais
2. **Integração robusta**: Compatibilidade com API existente
3. **Controle rigoroso**: Validações automáticas para evitar fraudes
4. **Usabilidade**: Interface intuitiva para diferentes perfis de usuário
5. **Performance**: Suporte a alto volume de transações simultâneas

---

**Documento elaborado por:** Equipe de Análise de Sistemas  
**Data:** 2025  
**Versão:** 2.0  
**Aprovação:** Secretaria Municipal do Trabalho e Assistência Social - SEMTAS

---

*Este documento serve como especificação técnica para desenvolvimento do Sistema de Benefícios Eventuais, considerando a API existente e os requisitos específicos identificados na análise dos processos atuais.*