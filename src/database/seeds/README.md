# Seeds para o Sistema de Gestão de Benefícios Eventuais

## Visão Geral

Este diretório contém os arquivos de seed para popular o banco de dados do Sistema de Gestão de Benefícios Eventuais da SEMTAS com dados iniciais necessários para o funcionamento básico do sistema.

## Estrutura de Seeds

As seeds foram organizadas seguindo a ordem de dependência entre as entidades:

1. **Entidades Básicas (sem dependências)**:
   - `TipoDocumentoSeed`: Tipos de documentos necessários para solicitações
   - `UnidadeSeed`: Unidades de atendimento (CRAS, CREAS, etc.)
   - `SetorTipoBeneficioSeed`: Setores administrativos e tipos de benefícios disponíveis

2. **Entidades com Dependências**:
   - `RequisitoDocumentoSeed`: Associação entre tipos de benefícios e documentos necessários
   - `UserSeed`: Usuários administrativos do sistema

## Dados Populados

### Usuários
- Administrador do Sistema
- Gestor SEMTAS
- Técnico SEMTAS

### Unidades
- Secretaria Municipal de Trabalho e Assistência Social (SEMTAS)
- CRAS Oeste
- CRAS Leste
- CREAS Norte
- Centro POP

### Setores
- Proteção Social Básica
- Proteção Social Especial
- Gestão do SUAS
- Vigilância Socioassistencial
- Administrativo

### Tipos de Benefícios
- Auxílio Funeral
- Auxílio Natalidade
- Cesta Básica Emergencial
- Auxílio Moradia
- Passagem Interestadual

### Tipos de Documentos
- RG
- CPF
- Comprovante de Residência
- Certidão de Nascimento
- Certidão de Óbito
- Comprovante de Renda
- Cartão do NIS
- Laudo Médico
- Declaração Escolar
- Laudo da Defesa Civil

## Como Executar as Seeds

As seeds podem ser executadas através do comando:

```bash
npm run seed
```

Ou diretamente via TypeORM:

```bash
npx typeorm-extension seed:run
```

## Ordem de Execução

A classe `InitialDataSeed` orquestra a execução de todas as seeds na ordem correta, garantindo que as dependências sejam respeitadas. A ordem de execução é:

1. TipoDocumentoSeed
2. UnidadeSeed
3. SetorTipoBeneficioSeed
4. RequisitoDocumentoSeed
5. UserSeed

## Verificação de Dados Existentes

Cada seed verifica se já existem dados no banco antes de inserir novos registros, evitando duplicações. Se dados já existirem, a seed será ignorada com uma mensagem informativa no console.

## Extensão

Para adicionar novas seeds ao sistema:

1. Crie um novo arquivo de seed na pasta `initial/`
2. Implemente a interface `Seeder` do TypeORM Extension
3. Adicione a importação e execução da nova seed na classe `InitialDataSeed`

## Observações

- Todos os usuários criados possuem a senha padrão `Semtas@2023`
- Os dados inseridos são apenas para ambiente de desenvolvimento e testes
- Em ambiente de produção, recomenda-se revisar e ajustar os dados conforme necessário