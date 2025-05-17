# Seeds para a Plataforma de Gestão de Benefícios (PGBen)

## Visão Geral

Este diretório contém os arquivos de seed para popular o banco de dados do Sistema de Gestão de Benefícios Eventuais da SEMTAS com dados iniciais necessários para o funcionamento básico do sistema.

## Nova Estrutura de Seeds

As seeds foram reorganizadas em uma estrutura mais modular e organizada, divididas em categorias específicas de acordo com seu propósito:

```
/seeds/
├── core/                 # Seeds essenciais (perfis, usuários, setores, etc.)
├── reference/            # Seeds de referência (categorias, modelos, etc.)
├── development/          # Seeds para ambiente de desenvolvimento
└── utils/                # Utilitários para geração e execução de seeds
```

### 1. Seeds Essenciais (core)

Contém dados fundamentais para o funcionamento do sistema:

- `UsuarioPerfilSeed`: Perfis de usuário e usuário administrador inicial
- `SetorSeed`: Setores básicos do sistema (Cadastro Único, Assistência Social, etc.)
- `UnidadeSeed`: Unidades de atendimento (CRAS, CREAS, etc.)
- `TipoBeneficioSeed`: Tipos de benefícios disponíveis no sistema

### 2. Seeds de Referência (reference)

Contém dados de referência utilizados em várias partes do sistema:

- `CategoriaDocumentoSeed`: Categorias para organização dos documentos
- `ModeloDocumentoSeed`: Modelos de documentos para geração automática
- `RequisitoDocumentoSeed`: Requisitos de documentos para cada tipo de benefício

### 3. Seeds de Desenvolvimento (development)

Contém dados fictícios para testes e desenvolvimento:

- `CidadaoDevSeed`: Cidadãos fictícios com dados completos
- `SolicitacaoDevSeed`: Solicitações de benefícios fictícias

### 4. Utilitários (utils)

Ferramentas para facilitar a geração e execução de seeds:

- `DataGenerator`: Geração de dados aleatórios (CPF, nomes, endereços, etc.)
- `SeedExecutor`: Execução organizada de seeds por ambiente

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