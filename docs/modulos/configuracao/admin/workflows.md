# Guia de Configuração de Workflows

## Introdução

Os workflows definem os fluxos de trabalho para cada tipo de benefício no sistema PGBen, estabelecendo as etapas do processo, ações permitidas, perfis autorizados e prazos. Este guia explica como configurar e gerenciar workflows através da interface administrativa.

## Acessando o Gerenciador de Workflows

1. Faça login no sistema PGBen com um usuário que possua perfil de administrador
2. No menu principal, clique em "Administração"
3. Selecione "Configurações do Sistema"
4. Clique na aba "Workflows"

## Visualizando Workflows

A tela de workflows exibe uma lista com todos os workflows configurados no sistema, organizados por tipo de benefício. Para cada workflow, são exibidas as seguintes informações:

- **Nome**: Nome descritivo do workflow
- **Tipo de Benefício**: Tipo de benefício associado ao workflow
- **Status**: Ativo ou Inativo
- **Quantidade de Etapas**: Número total de etapas no workflow
- **Última atualização**: Data e usuário da última modificação

### Filtrando Workflows

Você pode filtrar a lista de workflows utilizando as seguintes opções:

- **Filtro por texto**: Busca em nomes e descrições
- **Filtro por tipo de benefício**: Exibe apenas workflows de um tipo específico
- **Filtro por status**: Exibe apenas workflows ativos ou inativos

## Visualizando um Workflow

Para visualizar os detalhes de um workflow:

1. Localize o workflow na lista
2. Clique no nome do workflow ou no botão "Visualizar" (ícone de olho)
3. Na tela de detalhes, você verá:
   - Informações básicas (nome, tipo de benefício, status, etc.)
   - Diagrama visual do fluxo de trabalho
   - Lista de etapas com suas propriedades
   - Histórico de alterações

### Diagrama de Fluxo

O diagrama de fluxo apresenta uma visualização gráfica do workflow, mostrando:

- Etapas como caixas
- Transições como setas
- Ações como rótulos nas setas
- Etapas iniciais com borda verde
- Etapas finais com borda vermelha (rejeição) ou azul (aprovação)

Você pode:
- Ampliar/reduzir o diagrama
- Arrastar para navegar
- Clicar em uma etapa para ver detalhes
- Exportar o diagrama como imagem

## Criando um Novo Workflow

Para criar um novo workflow:

1. Clique no botão "Novo Workflow" no topo da página
2. Preencha o formulário com as informações básicas:
   - **Nome**: Nome descritivo do workflow
   - **Descrição**: Descrição detalhada da função do workflow
   - **Tipo de Benefício**: Selecione o tipo de benefício associado
   - **Status**: Ativo ou Inativo
3. Clique em "Próximo" para configurar as etapas

### Configurando Etapas

Na tela de configuração de etapas:

1. Clique em "Adicionar Etapa" para criar uma nova etapa
2. Para cada etapa, configure:
   - **Código**: Identificador único da etapa (use maiúsculas e underscores, ex: "ANALISE_DOCUMENTAL")
   - **Nome**: Nome descritivo da etapa
   - **Descrição**: Descrição detalhada da etapa
   - **Prazo (dias)**: Prazo em dias úteis para conclusão da etapa
   - **Etapa Inicial**: Marque se for a etapa inicial do processo
   - **Etapa Final**: Marque se for uma etapa final (conclusiva)
   - **Tipo Final**: Se for final, selecione "Aprovação" ou "Rejeição"
   - **Perfis Permitidos**: Selecione os perfis de usuário que podem atuar nesta etapa
3. Após configurar todas as etapas, clique em "Próximo" para configurar as transições

### Configurando Transições

Na tela de configuração de transições:

1. Para cada etapa, configure as ações permitidas:
   - Clique em "Adicionar Ação" para a etapa
   - Selecione a **Ação** (ex: APROVAR, REJEITAR, SOLICITAR_REVISAO)
   - Selecione a **Etapa de Destino** para esta ação
   - Opcionalmente, adicione **Condições** para a transição
2. Repita o processo para todas as etapas
3. Clique em "Verificar" para validar o workflow
4. Se não houver erros, clique em "Salvar" para criar o workflow

> **Importante**: O sistema verifica automaticamente a consistência do workflow, garantindo que não haja ciclos infinitos e que todas as etapas sejam alcançáveis.

## Editando Workflows

Para editar um workflow existente:

1. Localize o workflow na lista
2. Clique no botão "Editar" (ícone de lápis) na linha do workflow
3. Siga o mesmo processo de criação, com as informações pré-preenchidas
4. Faça as alterações necessárias e clique em "Salvar"

> **Nota**: Alterações em workflows afetam apenas novas solicitações. Solicitações existentes continuarão seguindo o workflow original.

## Ativando/Desativando Workflows

Para alterar o status de um workflow:

1. Localize o workflow na lista
2. Clique no botão "Ativar/Desativar" (ícone de toggle) na linha do workflow
3. Confirme a alteração na caixa de diálogo

> **Importante**: Desativar um workflow impede que novas solicitações sejam criadas com ele, mas não afeta solicitações existentes.

## Clonando Workflows

Para criar um novo workflow baseado em um existente:

1. Localize o workflow na lista
2. Clique no botão "Clonar" (ícone de cópia) na linha do workflow
3. Modifique as informações conforme necessário
4. Clique em "Salvar" para criar o novo workflow

Esta função é útil quando você precisa criar workflows similares para diferentes tipos de benefício.

## Excluindo Workflows

> **Atenção**: A exclusão de workflows pode causar problemas no funcionamento do sistema. Recomenda-se desativar em vez de excluir.

Para excluir um workflow:

1. Localize o workflow na lista
2. Clique no botão "Excluir" (ícone de lixeira) na linha do workflow
3. Confirme a exclusão na caixa de diálogo

> **Nota**: Não é possível excluir workflows que possuem solicitações associadas.

## Ações Disponíveis

O sistema suporta as seguintes ações padrão:

| Ação | Código | Descrição |
|------|--------|-----------|
| Criar | `CRIAR` | Criar uma nova solicitação |
| Visualizar | `VISUALIZAR` | Visualizar detalhes da solicitação |
| Editar | `EDITAR` | Editar dados da solicitação |
| Aprovar | `APROVAR` | Aprovar a etapa atual |
| Rejeitar | `REJEITAR` | Rejeitar a solicitação |
| Solicitar Revisão | `SOLICITAR_REVISAO` | Solicitar revisão de dados/documentos |
| Enviar Documentos | `ENVIAR_DOCUMENTOS` | Anexar documentos à solicitação |
| Marcar Entrevista | `MARCAR_ENTREVISTA` | Agendar entrevista com o cidadão |
| Realizar Entrevista | `REALIZAR_ENTREVISTA` | Registrar realização da entrevista |
| Encaminhar | `ENCAMINHAR` | Encaminhar para outro setor/profissional |
| Arquivar | `ARQUIVAR` | Arquivar a solicitação |

## Perfis de Usuário

Os seguintes perfis de usuário podem ser associados a etapas:

| Perfil | Código | Descrição |
|--------|--------|-----------|
| Administrador | `ADMIN` | Administrador do sistema |
| Coordenador | `COORDENADOR` | Coordenador de setor |
| Assistente Social | `ASSISTENTE_SOCIAL` | Assistente social |
| Atendente | `ATENDENTE` | Atendente de recepção |
| Financeiro | `FINANCEIRO` | Responsável financeiro |
| Cidadão | `CIDADAO` | Cidadão solicitante |

## Exemplos de Workflows

### Auxílio Natalidade

Um workflow típico para Auxílio Natalidade inclui as seguintes etapas:

1. **Recebimento**
   - Ações: Aprovar (→ Análise Documental), Rejeitar (→ Rejeitada)
   - Perfis: Atendente, Assistente Social
   - Prazo: 2 dias

2. **Análise Documental**
   - Ações: Aprovar (→ Entrevista), Solicitar Revisão (→ Pendente Documentação), Rejeitar (→ Rejeitada)
   - Perfis: Assistente Social
   - Prazo: 5 dias

3. **Pendente Documentação**
   - Ações: Enviar Documentos (→ Análise Documental)
   - Perfis: Cidadão
   - Prazo: 10 dias

4. **Entrevista**
   - Ações: Marcar Entrevista (→ Entrevista Agendada), Aprovar (→ Aprovação), Rejeitar (→ Rejeitada)
   - Perfis: Assistente Social
   - Prazo: 3 dias

5. **Entrevista Agendada**
   - Ações: Realizar Entrevista (→ Aprovação)
   - Perfis: Assistente Social
   - Prazo: 7 dias

6. **Aprovação**
   - Ações: Aprovar (→ Pagamento), Rejeitar (→ Rejeitada)
   - Perfis: Coordenador
   - Prazo: 3 dias

7. **Pagamento**
   - Ações: Aprovar (→ Concluída)
   - Perfis: Financeiro
   - Prazo: 5 dias

8. **Concluída**
   - Etapa final (Aprovação)
   - Sem ações

9. **Rejeitada**
   - Etapa final (Rejeição)
   - Sem ações

## Boas Práticas

### Estrutura de Workflows

1. **Mantenha workflows simples**: Evite fluxos excessivamente complexos
2. **Defina claramente as responsabilidades**: Associe perfis adequados a cada etapa
3. **Estabeleça prazos realistas**: Considere a capacidade operacional da equipe
4. **Preveja exceções**: Inclua caminhos alternativos para situações atípicas
5. **Documente as etapas**: Forneça descrições claras para cada etapa

### Nomeação de Etapas

Siga estas convenções ao criar etapas:

- Use nomes curtos e descritivos
- Use códigos em maiúsculas com underscores
- Seja consistente na terminologia

**Exemplos bons**:
- `ANALISE_DOCUMENTAL`
- `ENTREVISTA_AGENDADA`

**Exemplos ruins**:
- `etapa1` (não é descritivo)
- `analise-doc` (não segue o padrão)

### Validação de Workflows

Antes de ativar um workflow, verifique:

1. Se há pelo menos uma etapa inicial
2. Se há pelo menos uma etapa final
3. Se todas as etapas são alcançáveis a partir da etapa inicial
4. Se não há ciclos infinitos
5. Se todos os perfis necessários estão associados às etapas corretas

## Monitoramento de Workflows

O sistema fornece ferramentas para monitorar a execução dos workflows:

### Relatório de Prazos

Para acessar o relatório de prazos:

1. No menu principal, clique em "Relatórios"
2. Selecione "Prazos por Etapa"
3. Filtre por tipo de benefício, período e/ou status
4. Visualize estatísticas de cumprimento de prazos

### Dashboard de Fluxos

Para acessar o dashboard de fluxos:

1. No menu principal, clique em "Dashboard"
2. Selecione "Fluxos de Trabalho"
3. Visualize gráficos e estatísticas sobre:
   - Distribuição de solicitações por etapa
   - Tempo médio por etapa
   - Gargalos no processo
   - Taxas de aprovação/rejeição

## Resolução de Problemas

### Validação Falha

Se a validação do workflow falhar:

1. Verifique se há pelo menos uma etapa inicial
2. Verifique se há pelo menos uma etapa final
3. Verifique se todas as etapas têm pelo menos uma ação (exceto etapas finais)
4. Verifique se não há ciclos infinitos
5. Verifique se todas as ações apontam para etapas existentes

### Solicitações Travadas

Se solicitações estiverem travadas em uma etapa:

1. Verifique se há ações definidas para a etapa
2. Verifique se os perfis corretos estão associados à etapa
3. Verifique se os usuários têm os perfis necessários
4. Considere adicionar uma ação de contingência (ex: encaminhar para coordenador)

### Migração de Solicitações

Se for necessário migrar solicitações de um workflow para outro:

1. Entre em contato com o suporte técnico
2. Forneça os IDs das solicitações a serem migradas
3. Especifique o workflow de destino
4. Indique a etapa equivalente no novo workflow

> **Nota**: A migração de solicitações é uma operação avançada que requer intervenção técnica.
