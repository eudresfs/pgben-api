# Checklist de Refatoração do Módulo de Benefício

## Fase 1: Análise e Planejamento

### Análise do Código Atual
- [x] Analisar estrutura atual do módulo de Benefício
- [x] Identificar e documentar todas as dependências com outros módulos
- [x] Mapear pontos de integração, especialmente com o módulo de Solicitação
- [x] Identificar problemas e limitações da implementação atual
- [x] Documentar casos de uso existentes para garantir compatibilidade

### Modelagem de Dados
- [x] Revisar e refinar modelo de dados proposto no ADR
- [x] Definir detalhadamente todos os relacionamentos entre entidades
- [x] Planejar índices para otimização de consultas em JSON
- [x] Definir regras de validação em nível de banco de dados
- [x] Documentar estratégia de migração de dados
- [x] Criar diagramas ER para o novo modelo

### Arquitetura
- [x] Definir interfaces claras entre módulos (Benefício × Solicitação)
- [x] Estabelecer contratos para serviços e repositórios
- [x] Definir estratégia de validação para formulários dinâmicos
- [x] Planejar mecanismo de cache para otimização
- [x] Estabelecer padrões de nomenclatura e documentação
- [x] Documentar arquitetura de componentes do módulo refatorado

## Fase 2: Implementação Backend

### Entidades e DTOs
- [x] Implementar entidade `TipoBeneficio` (já existia)
- [x] Implementar entidade `RequisitoDocumento` (já existia)
- [x] Implementar entidade `FluxoBeneficio` (já existia)
- [x] Implementar entidade `FormularioEspecifico` (equivalente a `CampoDinamicoBeneficio` já existente)
- [x] Implementar entidade `EspecificacaoNatalidade`
- [x] Implementar entidade `EspecificacaoAluguelSocial`
- [x] Implementar enum `Periodicidade` (já existia)
- [x] Implementar enum `FaseRequisito` (já existia)
- [x] Implementar enum `TipoAcao` (já existia)
- [x] Implementar enum `TipoCampo` (equivalente a `TipoDado` já existente)
- [x] Criar DTOs para criação de cada entidade
- [x] Criar DTOs para atualização de cada entidade
- [x] Criar DTOs para resposta de cada entidade
- [x] Implementar validadores para todos os DTOs

### Migrações
- [x] Criar migração para tabela `tipo_beneficio` (já existia)
- [x] Criar migração para tabela `requisito_documento` (já existia)
- [x] Criar migração para tabela `fluxo_beneficio` (já existia)
- [x] Criar migração para tabela `formulario_especifico` (equivalente a `campos_dinamicos_beneficio` já existente)
- [x] Criar migração para tabela `especificacao_natalidade`
- [x] Criar migração para tabela `especificacao_aluguel_social`
- [x] Criar migração para enums no PostgreSQL
- [x] Implementar índices para otimização (especialmente GIN para campos JSON)
- [x] Configurar chaves estrangeiras e restrições
- [x] Testar migrações em ambiente de desenvolvimento
- [x] Criar script para reverter migrações (down)

### Repositórios
- [x] Implementar `TipoBeneficioRepository` (já existia)
- [x] Implementar `RequisitoDocumentoRepository` (já existia ou incluído no BeneficioService)
- [x] Implementar `FluxoBeneficioRepository` (já existia ou incluído no BeneficioService)
- [x] Implementar `FormularioEspecificoRepository` (equivalente a repositório para CampoDinamicoBeneficio já existente)
- [x] Implementar `EspecificacaoNatalidadeRepository`
- [x] Implementar `EspecificacaoAluguelSocialRepository`
- [x] Implementar consultas otimizadas para trabalhar com JSONB
- [x] Configurar relacionamentos entre repositórios

### Serviços
- [x] Implementar `TipoBeneficioService` (já existia como parte do BeneficioService)
- [x] Implementar `RequisitoDocumentoService` (já existia como parte do BeneficioService)
- [x] Implementar `FluxoBeneficioService` (já existia como parte do BeneficioService)
- [x] Implementar `FormularioEspecificoService` (equivalente a CampoDinamicoService já existente)
- [x] Implementar `ValidacaoDinamicaService` (já existia)
- [x] Implementar serviços específicos para cada tipo de benefício
- [x] Desenvolver lógica de negócio para validações específicas
- [x] Implementar sistema de cache para configurações frequentemente acessadas
- [x] Criar utilitários para transformação de dados

### Controllers
- [x] Implementar `TipoBeneficioController` (já existia como parte do BeneficioController)
- [x] Implementar `RequisitoDocumentoController` (já existia como endpoints no BeneficioController)
- [x] Implementar `FluxoBeneficioController` (já existia como endpoints no BeneficioController)
- [x] Implementar `FormularioEspecificoController` (equivalente a CampoDinamicoController já existente)
- [x] Implementar controllers específicos para configurações por tipo de benefício
- [x] Configurar rotas REST para todas as operações
- [x] Implementar documentação Swagger para todas as APIs
- [x] Configurar validação de entrada e tratamento de erros
- [x] Implementar paginação para listagens extensas

### Módulo Principal
- [x] Criar/refatorar `BeneficioModule`
- [x] Configurar providers e controllers
- [x] Estabelecer importações e exportações
- [x] Configurar injeção de dependências
- [x] Configurar middlewares necessários

## Fase 3: Testes e Validação

### Testes Unitários
- [ ] Implementar testes para `TipoBeneficioService`
- [ ] Implementar testes para `RequisitoDocumentoService`
- [ ] Implementar testes para `FluxoBeneficioService`
- [ ] Implementar testes para `FormularioEspecificoService`
- [ ] Implementar testes para `ValidacaoDinamicaService`
- [ ] Implementar testes para validações específicas por tipo de benefício
- [ ] Garantir cobertura de código >80%

### Testes de Integração
- [ ] Testar integração entre todos os serviços do módulo
- [ ] Testar integração com módulo de Solicitação
- [ ] Testar fluxo completo de configuração e uso dos formulários
- [ ] Validar comportamento com dados reais
- [ ] Testar performance com volume significativo de dados
- [ ] Testar cenários de erro e recuperação

### Testes de API
- [ ] Testar todas as rotas REST implementadas
- [ ] Validar respostas, códigos HTTP e formatos de dados
- [ ] Testar segurança e controle de acesso
- [ ] Testar validações de entrada
- [ ] Documentar resultados dos testes

## Fase 4: Migração e Implantação

### Dados Iniciais (Seeds)
- [ ] Criar seed para tipos de benefícios iniciais
- [ ] Criar seed para requisitos documentais padrão
- [ ] Criar seed para fluxos de aprovação iniciais
- [ ] Criar seed para campos de formulário do Auxílio Natalidade
- [ ] Criar seed para campos de formulário do Aluguel Social
- [ ] Testar seeds em ambiente de desenvolvimento

### Migração de Dados
- [ ] Desenvolver scripts de migração para dados existentes
- [ ] Criar rotinas de verificação de integridade
- [ ] Testar migração em ambiente de homologação
- [ ] Criar plano de rollback
- [ ] Configurar monitoramento durante migração

### Documentação
- [ ] Documentar APIs com Swagger
- [ ] Criar documentação técnica detalhada da nova arquitetura
- [ ] Documentar processo de configuração de novos tipos de benefícios
- [ ] Criar manual para administradores
- [ ] Documentar procedimentos de troubleshooting
- [ ] Atualizar diagramas e documentação arquitetural

### Implantação
- [ ] Preparar ambiente de staging
- [ ] Executar testes de aceitação
- [ ] Preparar scripts de deploy
- [ ] Configurar monitoramento pós-implantação
- [ ] Realizar deploy em produção
- [ ] Validar funcionamento em produção

## Fase 5: Melhorias

### Melhorias Futuras
- [ ] Preparar estrutura para Auxílio Funeral
- [ ] Preparar estrutura para Cesta Básica
- [ ] Documentar plano de evolução do módulo
- [ ] Identificar oportunidades de otimização
- [ ] Planejar futuras integrações