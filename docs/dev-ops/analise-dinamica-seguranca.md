# Análise Dinâmica de Segurança (DAST) - PGBen

## Introdução

Este documento descreve a implementação da análise dinâmica de segurança (DAST) no sistema PGBen, uma técnica essencial para identificar vulnerabilidades em aplicações em execução, complementando a análise estática já implementada.

## Visão Geral

A análise dinâmica de segurança (DAST) é uma metodologia de teste que examina a aplicação em funcionamento, simulando ataques reais para identificar vulnerabilidades que podem ser exploradas por atacantes. Diferente da análise estática (SAST), que analisa o código-fonte, o DAST testa a aplicação em execução, permitindo identificar problemas que só se manifestam durante o runtime.

## Ferramenta Implementada: OWASP ZAP

O OWASP ZAP (Zed Attack Proxy) foi escolhido como a principal ferramenta para DAST no PGBen devido às suas capacidades abrangentes e natureza de código aberto:

### Características Principais

- **Proxy de Interceptação**: Permite examinar e modificar o tráfego entre o cliente e a aplicação.
- **Scanner Automático**: Identifica automaticamente vulnerabilidades comuns como XSS, SQL Injection, CSRF, etc.
- **Spider**: Rastreia a aplicação para descobrir endpoints e funcionalidades.
- **Fuzzer**: Testa entradas maliciosas para identificar problemas de validação.
- **API REST**: Permite integração com pipelines de CI/CD.
- **Relatórios Detalhados**: Gera relatórios abrangentes sobre as vulnerabilidades encontradas.

## Configuração Implementada

### 1. Workflow de Automação

Foi criado um workflow no GitHub Actions (`dast.yml`) que executa automaticamente os testes DAST:

- **Agendamento**: Execução semanal (toda segunda-feira às 2h da manhã).
- **Execução Manual**: Possibilidade de iniciar os testes manualmente quando necessário.
- **Ambiente Isolado**: Testes realizados em um ambiente dedicado para evitar impactos no ambiente de produção.

### 2. Tipos de Scan Configurados

Foram configurados dois tipos de scan complementares:

- **Baseline Scan**: Scan rápido que verifica problemas básicos de segurança sem realizar ataques ativos.
- **Full Scan**: Scan completo que realiza testes mais invasivos para identificar vulnerabilidades complexas.

### 3. Regras Personalizadas

Foi criado um arquivo de regras personalizado (`zap-rules.tsv`) que define:

- **Vulnerabilidades Críticas**: Configuradas como ERROR, causando falha no pipeline (ex: SQL Injection, XSS, CSRF).
- **Vulnerabilidades Médias**: Configuradas como WARN, gerando alertas mas não falhas (ex: cabeçalhos de segurança ausentes).
- **Falsos Positivos**: Configurados como IGNORE para evitar ruído nos relatórios.

### 4. Integração com Notificações

- **Artefatos**: Os relatórios de scan são salvos como artefatos do GitHub Actions para análise posterior.
- **Notificações**: Configuradas notificações via Slack para alertar a equipe sobre vulnerabilidades encontradas.

## Fluxo de Trabalho DAST

### 1. Preparação do Ambiente

1. Checkout do código-fonte do repositório.
2. Instalação das dependências e build da aplicação.
3. Inicialização da aplicação em um ambiente de teste isolado.

### 2. Execução dos Testes

1. **Baseline Scan**: Verificação inicial de problemas básicos de segurança.
2. **Full Scan**: Verificação completa incluindo testes ativos.
3. Geração de relatórios detalhados sobre as vulnerabilidades encontradas.

### 3. Análise e Remediação

1. Revisão dos relatórios pela equipe de segurança.
2. Priorização das vulnerabilidades com base na severidade e impacto.
3. Criação de issues para correção das vulnerabilidades encontradas.
4. Implementação das correções e verificação através de novos testes.

## Benefícios para o PGBen

### 1. Segurança Aprimorada

- **Detecção de Vulnerabilidades Runtime**: Identificação de problemas que só se manifestam durante a execução.
- **Validação de Defesas**: Verificação da eficácia das medidas de segurança implementadas.
- **Compliance com LGPD**: Suporte ao atendimento dos requisitos de segurança da LGPD através de testes contínuos.

### 2. Complemento à Análise Estática

- **Cobertura Abrangente**: Combinação de SAST e DAST para uma análise completa de segurança.
- **Validação em Contexto Real**: Testes em condições que simulam o ambiente de produção.
- **Redução de Falsos Positivos**: Confirmação de vulnerabilidades identificadas na análise estática.

### 3. Automação e Integração Contínua

- **Testes Regulares**: Execução automática e periódica de testes de segurança.
- **Feedback Rápido**: Identificação imediata de problemas introduzidos por novas alterações.
- **Documentação Automática**: Geração de relatórios que servem como evidência para auditorias.

## Próximos Passos

1. **Personalização Adicional**: Refinamento das regras com base nos padrões específicos do PGBen.
2. **Testes de Penetração Manuais**: Complementar os testes automatizados com testes manuais para cenários complexos.
3. **Integração com Gestão de Vulnerabilidades**: Implementação de um sistema para acompanhamento e gestão do ciclo de vida das vulnerabilidades.
4. **Treinamento da Equipe**: Capacitação dos desenvolvedores para entender e corrigir os problemas identificados pelo DAST.

## Conclusão

A implementação da análise dinâmica de segurança no PGBen representa um avanço significativo na estratégia de segurança do sistema. Esta prática, combinada com outras medidas como o middleware de auditoria, a criptografia de documentos e a análise estática, forma uma abordagem abrangente de segurança que protege os dados dos cidadãos e garante a conformidade com a LGPD.

A automação dos testes DAST através do GitHub Actions permite uma verificação contínua da segurança da aplicação, garantindo que novas vulnerabilidades sejam identificadas rapidamente e corrigidas antes que possam ser exploradas por atacantes.
