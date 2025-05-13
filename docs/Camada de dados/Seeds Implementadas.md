# Seeds Implementadas para o Sistema de Gestão de Benefícios Eventuais

## Introdução

Este documento descreve o processo de implementação das seeds iniciais para o Sistema de Gestão de Benefícios Eventuais da SEMTAS, baseado na análise das migrations existentes e na documentação do projeto. As seeds foram criadas seguindo a estrutura atual do banco de dados, sem adicionar novas entidades ou tabelas.

## Processo de Desenvolvimento

### 1. Análise das Migrations Existentes

O processo iniciou com a análise detalhada das migrations implementadas no diretório `src/database/migrations`. As principais migrations analisadas foram:

- `1000000-CreateBaseStructure.ts`: Estrutura base do sistema (usuários, etc.)
- `1000001-CreateCidadaoStructure.ts`: Estrutura de cidadãos e beneficiários
- `1000002-CreateBeneficioStructure.ts`: Tipos de benefícios e requisitos
- `1000003-CreateSolicitacaoStructure.ts`: Solicitações de benefícios
- `1000004-CreateDemandaMotivos.ts`: Motivos de demanda para ocorrências
- `1000006-CreateDocumentosHistoricoRequisitos.ts`: Documentos e histórico
- `1000009-CreatePendenciaOcorrenciaStructures.ts`: Pendências e ocorrências

A partir desta análise, foram identificadas as entidades principais do sistema e suas relações, bem como os campos obrigatórios e opcionais.

### 2. Consulta à Documentação do Projeto

A documentação existente no diretório `docs/Camada de dados` foi consultada para entender o propósito dos dados e as regras de negócio associadas. Isso permitiu criar seeds que não apenas preenchem o banco de dados, mas também representam dados realistas e úteis para o desenvolvimento e testes.

### 3. Planejamento das Seeds

As seeds foram planejadas seguindo a ordem de dependência entre as entidades, começando pelas entidades básicas (sem dependências) e avançando para as entidades que dependem de outras:

1. **Entidades Básicas**:
   - Tipos de Documento
   - Unidades
   - Setores e Tipos de Benefício
   - Motivos de Demanda

2. **Entidades com Dependências**:
   - Requisitos de Documento (depende de Tipos de Benefício e Tipos de Documento)
   - Usuários (depende de Unidades e Setores)
   - Ocorrências (depende de Usuários e Motivos de Demanda)
   - Pendências (depende de Solicitações e Usuários)

### 4. Implementação das Seeds

Cada seed foi implementada como uma classe que implementa a interface `Seeder` do pacote `typeorm-extension`, seguindo o padrão já estabelecido no projeto. As seeds verificam se já existem dados nas tabelas antes de inserir novos registros, evitando duplicações.

## Seeds Implementadas

### 1. TipoDocumentoSeed

Popula a tabela `tipo_documento` com os tipos de documentos básicos necessários para solicitações de benefícios, como RG, CPF, comprovante de residência, etc.

### 2. UnidadeSeed

Popula a tabela `unidade` com as unidades de atendimento da SEMTAS, como CRAS, CREAS e a própria Secretaria, incluindo informações de endereço e contato.

### 3. SetorTipoBeneficioSeed

Popula as tabelas `setor` e `tipos_beneficio` com os setores administrativos e os tipos de benefícios disponíveis no sistema, incluindo informações como periodicidade, valor e base legal.

### 4. RequisitoDocumentoSeed

Popula a tabela `requisito_documento` com a associação entre tipos de benefícios e documentos necessários para cada fase do processo (solicitação, análise, liberação).

### 5. UserSeed

Popula a tabela `usuario` com usuários administrativos iniciais para acesso ao sistema, com diferentes perfis (administrador, gestor, técnico).

### 6. DemandaMotivoSeed (Nova)

Popula a tabela `demanda_motivos` com os motivos de demanda para ocorrências, categorizados por tipo (denúncia, reclamação, sugestão, elogio, informação, outro).

### 7. OcorrenciaSeed (Nova)

Popula a tabela `ocorrencia` com ocorrências iniciais para demonstração do sistema, associadas a usuários e motivos de demanda.

### 8. PendenciaSeed (Nova - Placeholder)

Placeholder para futura implementação de pendências associadas a solicitações. Como as pendências dependem de solicitações existentes, este seed não cria registros reais, apenas demonstra a estrutura.

## Orquestração das Seeds

A classe `InitialDataSeed` foi atualizada para incluir as novas seeds na sequência de execução, respeitando a ordem de dependência entre as entidades:

```typescript
public async run(
  dataSource: DataSource,
  factoryManager: SeederFactoryManager
): Promise<void> {
  // Executa as seeds em ordem específica para respeitar dependências
  await runSeeder(dataSource, TipoDocumentoSeed);
  await runSeeder(dataSource, UnidadeSeed);
  await runSeeder(dataSource, UserSeed);
  await runSeeder(dataSource, SetorTipoBeneficioSeed);
  await runSeeder(dataSource, RequisitoDocumentoSeed);
  await runSeeder(dataSource, DemandaMotivoSeed);
  await runSeeder(dataSource, OcorrenciaSeed);
  await runSeeder(dataSource, PendenciaSeed);

  console.log('✅ Seed de dados iniciais concluída com sucesso!');
}
```

## Validação e Testes

As seeds foram projetadas para serem executadas em sequência, garantindo a integridade referencial entre as tabelas. Cada seed verifica se já existem dados nas tabelas antes de inserir novos registros, evitando duplicações.

Para testar as seeds, utilize os scripts disponíveis no `package.json`:

```bash
# Executa todas as seeds
npm run seed

# Executa apenas as seeds iniciais (dados básicos do sistema)
npm run seed:run:initial

# Reseta o banco de dados e popula com dados iniciais
npm run db:reset
```

## Próximos Passos

Para completar o conjunto de seeds para o sistema, seria necessário implementar seeds para as seguintes entidades:

1. **CidadaoSeed**: Cidadãos e beneficiários
2. **SolicitacaoSeed**: Solicitações de benefícios
3. **DocumentoEnviadoSeed**: Documentos enviados para solicitações
4. **HistoricoSolicitacaoSeed**: Histórico de solicitações

Estas seeds dependeriam de dados mais complexos e específicos do domínio, que poderiam ser implementados em uma fase posterior do projeto, conforme necessidade.

## Conclusão

As seeds implementadas fornecem dados iniciais suficientes para o desenvolvimento e testes básicos do sistema, seguindo a estrutura atual do banco de dados e respeitando as regras de negócio identificadas na documentação. A abordagem modular e incremental permite que novas seeds sejam adicionadas conforme necessário, sem afetar as existentes.