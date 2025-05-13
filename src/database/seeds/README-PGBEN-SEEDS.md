# Seeds para o Sistema de Gestão de Benefícios Eventuais (PGBEN)

Este documento descreve os seeds criados para popular o banco de dados do sistema PGBEN com dados iniciais para desenvolvimento e testes.

## Estrutura dos Seeds

Os seeds foram organizados em arquivos separados para facilitar a manutenção e o entendimento:

1. **UserSeed.ts** - Cria usuários administrativos iniciais com diferentes papéis.
2. **UnidadeSeed.ts** - Cria unidades de atendimento da SEMTAS.
3. **SetorTipoBeneficioSeed.ts** - Cria setores dentro das unidades e associa tipos de benefícios.
4. **TipoDocumentoSeed.ts** - Cria tipos de documentos necessários para solicitações.
5. **TipoBeneficioSeed.ts** - Cria tipos de benefícios eventuais oferecidos pela SEMTAS.
6. **RequisitosBeneficioSeed.ts** - Cria requisitos documentais para cada tipo de benefício.
7. **FluxoBeneficioSeed.ts** - Cria o fluxo de aprovação para cada tipo de benefício.
8. **CidadaoSeed.ts** - Cria cidadãos de exemplo com dados pessoais, situação de moradia, composição familiar, etc.
9. **SolicitacaoSeed.ts** - Cria solicitações de benefícios em diferentes status com histórico completo.

## Dados Gerados

### Usuários
- Administrador do Sistema
- Gestor SEMTAS
- Técnico SEMTAS
- Técnicos de Unidades

### Unidades
- SEMTAS (Secretaria)
- CRAS (Centros de Referência de Assistência Social)
- CREAS (Centros de Referência Especializados de Assistência Social)

### Tipos de Benefícios
- Auxílio Funeral
- Auxílio Natalidade
- Aluguel Social
- Cesta Básica Emergencial
- Auxílio Passagem Interestadual
- Auxílio Documentação Civil
- Auxílio Calamidade

### Cidadãos
- 50 cidadãos com dados pessoais completos
- Situação de moradia para cada cidadão
- Composição familiar para 70% dos cidadãos
- Benefícios sociais para 50% dos cidadãos
- Informações bancárias para 60% dos cidadãos

### Solicitações
- 100 solicitações em diferentes status
- Histórico completo de alterações de status
- Documentos enviados para requisitos atendidos
- Pendências para solicitações com status "pendente"
- Ocorrências para 30% das solicitações

## Como Executar os Seeds

Os seeds podem ser executados de duas maneiras:

### 1. Através do script npm

```bash
npm run seed
```

Este comando executará todos os seeds na ordem correta.

### 2. Através do TypeORM CLI

```bash
npx typeorm-extension seed:run
```

## Ordem de Execução

Os seeds são executados na seguinte ordem para garantir a integridade referencial:

1. UserSeed
2. UnidadeSeed
3. SetorTipoBeneficioSeed
4. TipoDocumentoSeed
5. TipoBeneficioSeed
6. RequisitosBeneficioSeed
7. FluxoBeneficioSeed
8. CidadaoSeed
9. SolicitacaoSeed

## Observações Importantes

- Os seeds verificam se já existem dados no banco antes de inserir novos registros, evitando duplicações.
- Os dados gerados são fictícios e servem apenas para fins de desenvolvimento e teste.
- As senhas dos usuários são criptografadas com bcrypt e o valor padrão é "Semtas@2023".
- As datas de criação, atualização e remoção são geradas automaticamente.
- Os relacionamentos entre as entidades são mantidos corretamente.

## Customização

Para customizar os dados gerados, você pode editar os arquivos de seed correspondentes e ajustar os valores conforme necessário.

## Limpeza do Banco de Dados

Para limpar o banco de dados e executar os seeds novamente, você pode usar o seguinte comando:

```bash
npm run db:reset
```

Este comando irá dropar o banco, executar as migrations e depois os seeds.
