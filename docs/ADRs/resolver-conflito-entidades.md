# ADR: Resolução de Conflitos entre Entidades com Nomes Duplicados

## Contexto

Durante o desenvolvimento do sistema PGBen, identificamos conflitos entre entidades com nomes idênticos em diferentes módulos, causando erros durante a inicialização do TypeORM. Especificamente:

1. Conflito entre `Notificacao` (módulo de notificação) e `Notificacao` (outro módulo)
2. Conflito entre `HistoricoSolicitacao` (módulo de benefício) e `HistoricoSolicitacao` (módulo de solicitação)

Esses conflitos impedem a inicialização correta do sistema, pois o TypeORM não consegue diferenciar entre as entidades com o mesmo nome de classe, mesmo quando as tabelas no banco de dados têm nomes diferentes.

## Decisão

Para resolver esses conflitos, decidimos:

1. **Renomear entidades conflitantes**: 
   - Renomear `Notificacao` para `NotificacaoSistema` no módulo de notificação
   - Renomear `HistoricoSolicitacao` para `HistoricoSolicitacaoBeneficio` no módulo de benefício

2. **Criar arquivos de compatibilidade**:
   - Manter arquivos de redirecionamento que exportam as novas entidades com os nomes antigos para manter a compatibilidade com código existente

3. **Atualizar referências**:
   - Atualizar todas as referências às entidades renomeadas em controllers, services e módulos
   - Atualizar a configuração do TypeORM para incluir as entidades com os novos nomes

## Consequências

### Positivas
- Eliminação dos conflitos de nomes entre entidades
- Maior clareza na nomenclatura das entidades, refletindo melhor seu propósito e módulo
- Manutenção da compatibilidade com código existente através de arquivos de redirecionamento

### Negativas
- Necessidade de atualizar múltiplos arquivos em diferentes módulos
- Potencial para erros de referência se alguma referência não for atualizada
- Complexidade adicional com os arquivos de redirecionamento

## Implementação

### Para a entidade Notificacao:
1. Renomeamos a classe para `NotificacaoSistema`
2. Renomeamos o enum `StatusNotificacao` para `StatusNotificacaoProcessamento`
3. Criamos um arquivo de compatibilidade que exporta `NotificacaoSistema` como `Notificacao`
4. Atualizamos todas as referências nos controllers e services
5. Atualizamos o arquivo `data-source.ts` para usar a entidade renomeada

### Para a entidade HistoricoSolicitacao:
1. Renomeamos a classe para `HistoricoSolicitacaoBeneficio` no módulo de benefício
2. Mantivemos a tabela com o nome `historico_solicitacao_beneficio` para evitar conflitos no banco de dados
3. Atualizamos todas as referências no módulo de benefício
4. Atualizamos o arquivo `data-source.ts` para incluir a entidade renomeada

## Desafios Adicionais

Durante a implementação, enfrentamos desafios com as relações entre entidades no TypeORM. Especificamente:

1. Relações entre entidades que não foram incluídas na configuração do TypeORM
2. Dependências entre entidades que requerem a inclusão de entidades adicionais

Para resolver esses desafios, criamos scripts de diagnóstico para identificar e corrigir problemas com as entidades do TypeORM.

## Recomendações para Desenvolvimentos Futuros

1. **Nomenclatura de Entidades**:
   - Adotar um padrão de nomenclatura que inclua o nome do módulo como prefixo ou sufixo para evitar conflitos
   - Exemplo: `BeneficioHistoricoSolicitacao` em vez de `HistoricoSolicitacao`

2. **Organização de Módulos**:
   - Manter entidades relacionadas no mesmo módulo para evitar dependências circulares
   - Criar interfaces compartilhadas para entidades que precisam ser referenciadas em múltiplos módulos

3. **Documentação de Entidades**:
   - Documentar claramente o propósito e as relações de cada entidade
   - Manter um diagrama de entidades atualizado para facilitar a compreensão do modelo de dados

4. **Testes de Inicialização**:
   - Implementar testes automatizados para verificar a inicialização correta do TypeORM
   - Incluir esses testes no pipeline de CI/CD para detectar problemas precocemente

## Conclusão

A resolução dos conflitos entre entidades com nomes duplicados melhorou a organização do código e evitou problemas de inicialização do TypeORM. No entanto, é importante adotar práticas de desenvolvimento que evitem esses problemas no futuro, como padrões de nomenclatura consistentes e documentação adequada.
