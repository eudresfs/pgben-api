# Seeds para o Sistema de Gestão de Benefícios Eventuais da SEMTAS

## Visão Geral

Este documento descreve os arquivos de seed implementados para popular o banco de dados do Sistema de Gestão de Benefícios Eventuais da SEMTAS com dados iniciais necessários para o funcionamento básico do sistema.

## Estrutura de Seeds

As seeds foram organizadas seguindo a ordem de dependência entre as entidades:

1. **Entidades Básicas (sem dependências)**:
   - `TipoDocumentoSeed`: Tipos de documentos necessários para solicitações
   - `UnidadeSeed`: Unidades de atendimento (CRAS, CREAS, etc.)
   - `SetorTipoBeneficioSeed`: Setores administrativos e tipos de benefícios disponíveis
   - `DemandaMotivoSeed`: Motivos de demanda para ocorrências

2. **Entidades com Dependências**:
   - `RequisitoDocumentoSeed`: Associação entre tipos de benefícios e documentos necessários
   - `UserSeed`: Usuários administrativos do sistema
   - `OcorrenciaSeed`: Ocorrências registradas no sistema
   - `PendenciaSeed`: Pendências associadas a solicitações (placeholder)

## Seeds Implementados

### TipoDocumentoSeed

Popula a tabela `tipo_documento` com os tipos de documentos básicos necessários para solicitações de benefícios, como RG, CPF, comprovante de residência, etc.

### UnidadeSeed

Popula a tabela `unidade` com as unidades de atendimento da SEMTAS, como CRAS, CREAS e a própria Secretaria.

### SetorTipoBeneficioSeed

Popula as tabelas `setor` e `tipos_beneficio` com os setores administrativos e os tipos de benefícios disponíveis no sistema.

### RequisitoDocumentoSeed

Popula a tabela `requisito_documento` com a associação entre tipos de benefícios e documentos necessários para cada fase do processo.

### UserSeed

Popula a tabela `usuario` com usuários administrativos iniciais para acesso ao sistema.

### DemandaMotivoSeed

Popula a tabela `demanda_motivos` com os motivos de demanda para ocorrências, categorizados por tipo (denúncia, reclamação, sugestão, elogio, informação, outro).

### OcorrenciaSeed

Popula a tabela `ocorrencia` com ocorrências iniciais para demonstração do sistema, associadas a usuários e motivos de demanda.

### PendenciaSeed

Placeholder para futura implementação de pendências associadas a solicitações. Como as pendências dependem de solicitações existentes, este seed não cria registros reais, apenas demonstra a estrutura.

## Ordem de Execução

A classe `InitialDataSeed` orquestra a execução das seeds na seguinte ordem:

1. TipoDocumentoSeed
2. UnidadeSeed
3. UserSeed
4. SetorTipoBeneficioSeed
5. RequisitoDocumentoSeed
6. DemandaMotivoSeed
7. OcorrenciaSeed
8. PendenciaSeed

Esta ordem respeita as dependências entre as entidades, garantindo que os dados sejam inseridos corretamente.

## Como Executar

Para executar as seeds, utilize os scripts disponíveis no `package.json`:

```bash
# Executa todas as seeds
npm run seed

# Executa apenas as seeds iniciais (dados básicos do sistema)
npm run seed:run:initial

# Reseta o banco de dados e popula com dados iniciais
npm run db:reset
```

## Extensão

Para adicionar novas seeds ao sistema:

1. Crie um novo arquivo de seed na pasta `initial/`
2. Implemente a interface `Seeder` do TypeORM Extension
3. Adicione a importação e execução da nova seed na classe `InitialDataSeed`

## Considerações

- Todas as seeds verificam se já existem dados nas tabelas antes de inserir novos registros, evitando duplicações.
- Os dados inseridos são representativos e suficientes para testes funcionais básicos do sistema.
- Para ambiente de produção, é recomendado revisar e ajustar os dados conforme necessário.
- Seeds adicionais para entidades como Solicitação, Cidadão, etc. podem ser implementadas posteriormente conforme necessidade.