# Documentação de Testes - PGBEN Server

Este documento descreve a estrutura de testes implementada para o PGBEN Server, incluindo testes unitários e de integração.

## Estrutura de Testes

Os testes estão organizados da seguinte forma:

- **Testes Unitários**: Localizados dentro de cada módulo na pasta `tests`
- **Testes de Integração (E2E)**: Localizados na pasta `test` na raiz do projeto

## Executando os Testes

### Testes Unitários

Para executar todos os testes unitários:

```bash
npm test
```

Para executar testes específicos de um módulo:

```bash
# Testes do módulo de autenticação
npm run test:auth

# Testes do módulo de cidadão
npm run test:cidadao

# Testes do módulo de benefício
npm run test:beneficio

# Testes do módulo de logging
npm run test:logging

# Testes do módulo de monitoramento
npm run test:monitoring
```

Para executar os testes em modo de observação (watch mode):

```bash
npm run test:watch
```

### Testes de Integração (E2E)

Para executar todos os testes de integração:

```bash
npm run test:e2e
```

Para executar testes de integração específicos:

```bash
# Testes de integração do módulo de autenticação
npm run test:e2e:auth

# Testes de integração do módulo de benefício
npm run test:e2e:beneficio
```

## Cobertura de Testes

Para gerar um relatório de cobertura de testes:

```bash
npm run test:cov
```

O relatório será gerado na pasta `coverage` na raiz do projeto.

## Módulos Testados

### Módulo de Autenticação
- Testes unitários para o serviço de autenticação
- Testes unitários para o controlador de autenticação
- Testes de integração para as rotas de autenticação

### Módulo de Cidadão
- Testes unitários para o serviço de cidadão
- Testes unitários para o controlador de cidadão

### Módulo de Benefício
- Testes unitários para o serviço de benefício
- Testes unitários para o controlador de benefício
- Testes de integração para as rotas de benefício

### Módulo de Logging
- Testes unitários para o serviço de logging
- Testes unitários para o interceptor de logging
- Testes unitários para o filtro de exceções global

### Módulo de Monitoramento
- Testes unitários para o serviço de métricas
- Testes unitários para o controlador de métricas
- Testes unitários para o interceptor de métricas
- Testes unitários para o controlador de saúde

## Melhores Práticas

1. **Isolamento**: Os testes unitários devem ser isolados, utilizando mocks para dependências externas.
2. **Nomenclatura**: Siga o padrão de nomenclatura `*.spec.ts` para testes unitários e `*.e2e-spec.ts` para testes de integração.
3. **Cobertura**: Busque uma cobertura de testes abrangente, testando tanto os casos de sucesso quanto os de erro.
4. **Manutenção**: Mantenha os testes atualizados conforme o código evolui.
5. **Documentação**: Documente os testes com comentários claros sobre o que está sendo testado.

## Configuração

A configuração dos testes está definida nos seguintes arquivos:

- `jest.config.js`: Configuração para testes unitários
- `test/jest-e2e.json`: Configuração para testes de integração
