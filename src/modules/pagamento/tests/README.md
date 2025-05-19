# Testes do Módulo de Pagamento

## Visão Geral

Este diretório contém os testes automatizados para o módulo de pagamento do sistema PGBen. Os testes estão organizados em diferentes categorias para garantir a qualidade e o funcionamento correto de todas as funcionalidades do módulo.

## Estrutura de Diretórios

```
tests/
├── unit/                    # Testes unitários
│   ├── controllers/         # Testes para controladores
│   ├── services/            # Testes para serviços
│   ├── validators/          # Testes para validadores
│   └── guards/              # Testes para guards
├── integration/             # Testes de integração
│   ├── pagamento-fluxo-completo.spec.ts
│   ├── comprovantes.spec.ts
│   ├── confirmacoes.spec.ts
│   └── pagamento-seguranca.spec.ts
├── setup-pagamento-tests.ts # Configuração do ambiente de testes
├── jest.config.js           # Configuração do Jest para o módulo
└── README.md                # Esta documentação
```

## Tipos de Testes

### Testes Unitários

Os testes unitários validam o funcionamento de componentes individuais do módulo de pagamento, isolados de suas dependências externas. Estes testes são essenciais para garantir que cada parte do sistema funcione conforme o esperado.

#### Controladores
- **PagamentoController**: Testa os endpoints para criação, consulta e atualização de pagamentos.
- **ComprovanteController**: Testa os endpoints para upload, listagem e remoção de comprovantes.
- **ConfirmacaoController**: Testa os endpoints para registro e consulta de confirmações de recebimento.

#### Serviços
- **PagamentoService**: Testa a lógica de negócio relacionada a pagamentos.
- **RelatorioPagamentoService**: Testa a geração de relatórios de pagamento.
- **MetricasPagamentoService**: Testa a coleta e disponibilização de métricas de pagamento.

#### Validadores
- **DadosBancariosValidator**: Testa a validação de dados bancários.
- **PixValidator**: Testa a validação de chaves PIX.
- **StatusTransitionValidator**: Testa a validação de transições de status de pagamento.

#### Guards
- **PagamentoAccessGuard**: Testa o controle de acesso baseado em perfis e unidades.

### Testes de Integração

Os testes de integração validam a interação entre diferentes componentes do módulo de pagamento, garantindo que eles funcionem corretamente em conjunto.

- **pagamento-fluxo-completo.spec.ts**: Testa o fluxo completo de pagamento, desde a criação até a confirmação.
- **comprovantes.spec.ts**: Testa o fluxo de upload, listagem e remoção de comprovantes.
- **confirmacoes.spec.ts**: Testa o fluxo de registro e consulta de confirmações de recebimento.
- **pagamento-seguranca.spec.ts**: Testa os aspectos de segurança do módulo de pagamento.

### Testes E2E (End-to-End)

Os testes E2E validam o funcionamento do módulo de pagamento em um ambiente próximo ao de produção, incluindo interações com outros módulos do sistema.

- **pagamento-e2e.spec.ts**: Testa o fluxo completo de pagamento em um ambiente integrado.

## Configuração

### Arquivo `setup-pagamento-tests.ts`

Este arquivo configura o ambiente de testes para o módulo de pagamento, incluindo:

- Configuração de timeout para testes mais complexos
- Mocks para serviços externos (JWT, MinIO, etc.)
- Mocks para serviços de integração (Solicitação, Cidadão, Documento)
- Configuração do ambiente de teste (variáveis de ambiente)

### Arquivo `jest.config.js`

Este arquivo configura o Jest para executar os testes do módulo de pagamento, incluindo:

- Diretórios e arquivos a serem testados
- Configuração de timeout
- Configuração de cobertura de código
- Configuração de ambiente de teste

## Execução dos Testes

### Pré-requisitos

- Node.js >= 18
- npm >= 8

### Comandos

Os seguintes comandos estão disponíveis para executar os testes:

```bash
# Executar todos os testes do módulo de pagamento
npm run test:pagamento

# Executar apenas os testes unitários
npm run test:pagamento:unit

# Executar apenas os testes de integração
npm run test:pagamento:integration

# Executar apenas os testes E2E
npm run test:pagamento:e2e

# Executar os testes com cobertura de código
npm run test:pagamento:coverage
```

## Cobertura de Código

A cobertura de código é gerada no diretório `coverage/pagamento` e inclui relatórios para:

- Linhas de código
- Funções
- Branches
- Statements

O objetivo é manter uma cobertura de pelo menos 80% para todos os componentes do módulo de pagamento.

## Melhores Práticas

### Organização de Testes

- Cada teste deve ter uma descrição clara e objetiva
- Utilize o padrão AAA (Arrange, Act, Assert)
- Mantenha os testes independentes entre si
- Evite dependências externas em testes unitários
- Utilize mocks para isolar o componente sendo testado

### Nomenclatura

- Arquivos de teste devem ter o sufixo `.spec.ts`
- Descrições de testes devem ser claras e indicar o comportamento esperado
- Utilize nomes significativos para variáveis e funções

### Manutenção

- Atualize os testes sempre que o código for modificado
- Mantenha a documentação atualizada
- Revise regularmente a cobertura de código
- Adicione novos testes para funcionalidades novas ou modificadas

## Troubleshooting

### Problemas Comuns

#### Testes Falhando com Timeout

Aumente o timeout no arquivo `jest.config.js`:

```javascript
testTimeout: 60000, // 60 segundos
```

#### Testes Falhando com Erro de Conexão

Verifique se os mocks para serviços externos estão configurados corretamente no arquivo `setup-pagamento-tests.ts`.

#### Testes Falhando com Erro de Dependência

Verifique se todas as dependências estão instaladas e atualizadas:

```bash
npm install
```

## Contribuição

Ao adicionar novos testes, siga as diretrizes abaixo:

1. Mantenha a mesma estrutura de diretórios
2. Siga o padrão de nomenclatura existente
3. Documente o propósito do teste
4. Atualize esta documentação se necessário

## Conclusão

Os testes automatizados são essenciais para garantir a qualidade e o funcionamento correto do módulo de pagamento. Eles permitem identificar problemas rapidamente e garantir que novas funcionalidades não quebrem o código existente.

A combinação de testes unitários, de integração e E2E fornece uma cobertura abrangente do módulo, garantindo sua robustez e confiabilidade.
