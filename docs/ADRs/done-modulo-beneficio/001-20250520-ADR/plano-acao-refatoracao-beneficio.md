# Plano de Ação: Refatoração do Módulo de Benefício

## 1. Visão Geral

Este plano de ação detalha o processo de refatoração do módulo de Benefício do sistema PGBen, conforme a Decisão Arquitetural (ADR-001) que define a implementação de Formulários Específicos Configuráveis. A refatoração visa reestruturar o módulo para que ele se concentre em suas responsabilidades principais: definir tipos de benefícios, estruturar formulários dinâmicos, gerenciar regras e requisitos documentais, e configurar fluxos de aprovação.

## 2. Objetivos

1. Implementar um sistema de Formulários Específicos Configuráveis
2. Separar claramente as responsabilidades entre módulos (Benefício × Solicitação)
3. Suportar inicialmente dois tipos de benefícios (Auxílio Natalidade e Aluguel Social)
4. Criar uma arquitetura extensível para futuros tipos de benefícios
5. Proporcionar autonomia para administradores configurarem campos sem alterações no código
6. Garantir performance, segurança e manutenibilidade

## 3. Etapas de Implementação

### Fase 1: Análise e Planejamento (5 dias)

1. **Análise do Código Atual (1 dia)**
   - Mapear estrutura existente do módulo de Benefício
   - Identificar dependências e acoplamentos
   - Documentar pontos de integração com outros módulos

2. **Modelagem de Dados (2 dias)**
   - Revisar e ajustar o modelo de dados proposto no ADR
   - Definir relacionamentos e índices
   - Planejar estratégia de migração de dados existentes

3. **Arquitetura de Componentes (2 dias)**
   - Definir interfaces e contratos de serviço
   - Planejar estrutura de repositórios, serviços e controladores
   - Estabelecer padrões de validação dinâmica
   - Definir estratégia de caching para otimização

### Fase 2: Implementação Backend (10 dias)

1. **Criar Entidades Base (2 dias)**
   - Implementar entidade `TipoBeneficio`
   - Implementar entidade `RequisitoDocumento`
   - Implementar entidade `FluxoBeneficio`
   - Implementar entidade `FormularioEspecifico`
   - Implementar entidades específicas (`EspecificacaoNatalidade`, `EspecificacaoAluguelSocial`)

2. **Desenvolver Migrações (1 dia)**
   - Criar scripts de migração TypeORM
   - Implementar índices para otimização de consultas
   - Configurar chaves estrangeiras e validações

3. **Implementar Repositórios (2 dias)**
   - Desenvolver repositórios para cada entidade
   - Implementar consultas otimizadas para campos JSON
   - Criar métodos de busca específicos

4. **Desenvolver Serviços (3 dias)**
   - Implementar `TipoBeneficioService`
   - Implementar `FormularioEspecificoService`
   - Implementar `RequisitoDocumentoService`
   - Implementar `FluxoBeneficioService`
   - Desenvolver validadores dinâmicos baseados em JSON Schema

5. **Criar Controllers e DTOs (2 dias)**
   - Implementar controllers REST para cada entidade
   - Desenvolver DTOs para validação de entrada
   - Configurar documentação Swagger
   - Implementar testes de API

### Fase 3: Integração e Testes (7 dias)

1. **Testes Unitários (2 dias)**
   - Implementar testes para serviços e validadores
   - Testar regras de negócio específicas
   - Validar comportamento com diferentes configurações

2. **Testes de Integração (2 dias)**
   - Testar fluxo completo de configuração
   - Validar integração com módulo de Solicitação
   - Testar performance com volume de dados realista

3. **Integração com Frontend (3 dias)**
   - Colaborar com equipe de frontend para integração
   - Ajustar APIs conforme necessidades da interface
   - Validar renderização dinâmica de formulários

### Fase 4: Migração e Implantação (5 dias)

1. **Plano de Migração (1 dia)**
   - Definir estratégia de migração sem downtime
   - Criar scripts de transformação de dados
   - Estabelecer pontos de rollback

2. **Migração de Dados (2 dias)**
   - Migrar configurações existentes para novo modelo
   - Validar integridade após migração
   - Executar testes de aceitação

3. **Documentação e Capacitação (2 dias)**
   - Documentar APIs e integração
   - Atualizar documentação técnica
   - Preparar materiais de treinamento para administradores

## 4. Recursos Necessários

### Equipe
- 1 Desenvolvedor Backend Principal (responsável pela refatoração)
- 1 Desenvolvedor Frontend (para integração)
- 1 QA/Tester (para validação)
- 1 DBA (para otimizações de banco de dados)

### Ferramentas
- TypeORM para migrações e acesso a dados
- Jest para testes unitários e de integração
- Swagger para documentação de API
- Git para controle de versão e revisão de código

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Complexidade das validações dinâmicas | Alta | Médio | Adotar biblioteca de validação JSON Schema estabelecida |
| Performance com consultas em campos JSON | Média | Alto | Utilizar índices GIN e implementar caching |
| Incompatibilidade com dados existentes | Média | Alto | Testes exaustivos com dados reais antes da migração |
| Complexidade de manutenção | Baixa | Médio | Documentação detalhada e padrões claros de código |
| Resistência à mudança de paradigma | Média | Baixo | Treinamento e documentação para equipe de desenvolvimento |

## 6. Marcos (Milestones)

1. **M1: Conclusão da Fase de Análise e Planejamento** - Dia 5
   - Entregáveis: Documento de arquitetura, diagramas ER e plano de implementação

2. **M2: Implementação de Entidades e Repositórios** - Dia 10
   - Entregáveis: Código-fonte das entidades, migrações e repositórios

3. **M3: Implementação de Serviços e Controllers** - Dia 15
   - Entregáveis: Código-fonte dos serviços, controllers e documentação Swagger

4. **M4: Testes Unitários e de Integração** - Dia 20
   - Entregáveis: Conjunto de testes automatizados com cobertura >80%

5. **M5: Migração e Implementação Completa** - Dia 27
   - Entregáveis: Sistema refatorado em produção e documentação final

## 7. Monitoramento e Métricas

Após a implementação, monitoraremos:

1. Tempo de renderização dos formulários dinâmicos
2. Taxa de erros em validações
3. Utilização (quais campos são mais preenchidos/ignorados)
4. Impacto na performance do banco de dados
5. Tempo de resposta das APIs do módulo

## 8. Próximos Passos

Após aprovação deste plano:

1. Iniciar a fase de análise detalhada do código atual
2. Configurar ambiente de desenvolvimento para a refatoração
3. Criar branch específica para o desenvolvimento
4. Implementar as primeiras entidades e migrações
5. Agendar revisões de código periódicas

## 9. Conclusão

Este plano de ação fornece um roteiro detalhado para a refatoração do módulo de Benefício, implementando o sistema de Formulários Específicos Configuráveis conforme definido no ADR-001. A abordagem modular e as fases incrementais permitirão uma transição segura e controlada para a nova arquitetura, garantindo que o sistema continue a atender aos requisitos da SEMTAS e permaneça flexível para futuras extensões.
