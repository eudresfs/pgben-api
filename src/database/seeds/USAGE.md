# Guia de Uso do Sistema de Seeds

## Visão Geral

Este documento descreve como utilizar o novo sistema de seeds implementado com `typeorm-extension` para o Sistema de Gestão de Benefícios Eventuais da SEMTAS.

## Configuração

O sistema de seeds foi atualizado para utilizar o pacote `typeorm-extension`, que oferece uma API mais moderna e compatível com as versões recentes do TypeORM. A configuração está distribuída em três arquivos principais:

1. **ormconfig.ts** - Configuração base do TypeORM na raiz do projeto
2. **src/database/seeds/seed-source.ts** - Configuração específica para seeds
3. **package.json** - Scripts para execução de seeds

## Scripts Disponíveis

Os seguintes scripts estão disponíveis para execução de seeds:

```bash
# Executa todas as seeds
npm run seed

# Alias para npm run seed
npm run seed:run

# Executa apenas as seeds iniciais (dados básicos do sistema)
npm run seed:run:initial

# Executa apenas as seeds de teste
npm run seed:run:test

# Reseta o banco de dados e popula com dados iniciais
npm run db:reset

# Executa migrações e todas as seeds
npm run db:setup

# Executa migrações, seeds iniciais e seeds de teste
npm run db:setup:test
```

## Estrutura de Seeds

As seeds devem ser organizadas seguindo a estrutura de diretórios:

```
src/database/seeds/
├── initial/           # Seeds para dados iniciais do sistema
│   ├── 01-tipo-documento.seed.ts
│   ├── 02-unidade.seed.ts
│   └── ...
├── test/              # Seeds para dados de teste
│   ├── 01-cidadao.seed.ts
│   ├── 02-solicitacao.seed.ts
│   └── ...
├── InitialDataSeed.ts # Classe orquestradora para seeds iniciais
├── TestDataSeed.ts    # Classe orquestradora para seeds de teste
└── seed-source.ts     # Configuração do DataSource para seeds
```

## Criando Novas Seeds

Para criar uma nova seed, siga o padrão abaixo:

```typescript
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { NomeEntidade } from '../../caminho/para/entidade';

export default class NomeEntidadeSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    const repository = dataSource.getRepository(NomeEntidade);
    
    // Verificar se já existem dados
    const count = await repository.count();
    if (count > 0) {
      console.log('Dados de NomeEntidade já existem. Pulando seed.');
      return;
    }
    
    // Inserir dados
    await repository.insert([
      {
        // dados da entidade
      },
      // mais entidades...
    ]);
    
    console.log('Seed de NomeEntidade concluída com sucesso.');
  }
}
```

## Classes Orquestradoras

As classes orquestradoras (`InitialDataSeed.ts` e `TestDataSeed.ts`) são responsáveis por executar as seeds na ordem correta. Exemplo:

```typescript
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager, runSeeder } from 'typeorm-extension';
import TipoDocumentoSeed from './initial/01-tipo-documento.seed';
import UnidadeSeed from './initial/02-unidade.seed';

export default class InitialDataSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<void> {
    // Executar seeds na ordem correta
    await runSeeder(dataSource, TipoDocumentoSeed);
    await runSeeder(dataSource, UnidadeSeed);
    // ... outras seeds
  }
}
```

## Observações Importantes

1. Sempre verifique se os dados já existem antes de inserir novos registros para evitar duplicações.
2. Mantenha a ordem de execução das seeds respeitando as dependências entre entidades.
3. Utilize nomes descritivos para as seeds, preferencialmente com prefixos numéricos para indicar a ordem.
4. Para dados de teste, utilize a pasta `test/` e a classe orquestradora `TestDataSeed.ts`.
5. Para dados iniciais do sistema, utilize a pasta `initial/` e a classe orquestradora `InitialDataSeed.ts`.