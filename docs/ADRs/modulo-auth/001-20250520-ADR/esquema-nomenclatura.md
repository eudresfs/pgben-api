# Esquema de Nomenclatura para Permissões Granulares

## Visão Geral

Para implementar o sistema de permissões granulares no PGBen, adotaremos um esquema de nomenclatura padronizado que segue o formato:

```
modulo.recurso.operacao
```

Este formato permite uma grande flexibilidade e granularidade, facilitando tanto o desenvolvimento quanto a administração do sistema.

## Componentes da Nomenclatura

### 1. Módulo

Representa o módulo do sistema ao qual a permissão se aplica. Deve ser em minúsculas, sem acentos e utilizando apenas caracteres alfanuméricos.

**Exemplos:**
- `cidadao`
- `beneficio`
- `solicitacao`
- `documento`
- `auditoria`
- `usuario`
- `unidade`
- `relatorio`
- `configuracao`

### 2. Recurso

Representa a entidade ou funcionalidade específica dentro do módulo. Deve ser em minúsculas, sem acentos e utilizando apenas caracteres alfanuméricos.

**Exemplos:**
- `cidadao.perfil`
- `beneficio.tipo`
- `solicitacao.status`
- `documento.upload`
- `auditoria.log`
- `usuario.senha`
- `unidade.setor`
- `relatorio.exportacao`
- `configuracao.parametro`

### 3. Operação

Representa a ação que pode ser executada sobre o recurso. Utilizaremos um conjunto padronizado de operações para manter a consistência.

**Operações Padrão:**
- `ler` - Visualizar informações (operações GET)
- `criar` - Adicionar novos registros (operações POST)
- `atualizar` - Modificar registros existentes (operações PUT/PATCH)
- `excluir` - Remover registros (operações DELETE)
- `listar` - Listar múltiplos registros (operações GET com retorno de coleções)
- `aprovar` - Aprovar uma solicitação ou alterar status
- `rejeitar` - Rejeitar uma solicitação ou alterar status
- `cancelar` - Cancelar uma solicitação ou processo
- `exportar` - Exportar dados em formato específico
- `configurar` - Alterar configurações específicas

## Exemplos Completos

Exemplos de permissões seguindo este esquema:

- `cidadao.perfil.ler` - Permite visualizar o perfil de um cidadão
- `beneficio.tipo.criar` - Permite criar novos tipos de benefícios
- `solicitacao.status.aprovar` - Permite aprovar solicitações (mudar status para aprovado)
- `documento.upload.criar` - Permite fazer upload de documentos
- `auditoria.log.listar` - Permite listar logs de auditoria
- `usuario.senha.atualizar` - Permite atualizar senhas de usuários
- `relatorio.beneficio.exportar` - Permite exportar relatórios de benefícios
- `configuracao.parametro.atualizar` - Permite atualizar parâmetros do sistema

## Permissões Compostas e Coringa

Além das permissões individuais, o sistema suportará permissões compostas e uso de coringa:

### Permissões de Nível Superior

Uma permissão em um nível superior concede automaticamente todas as permissões em níveis inferiores:

- `beneficio.*` - Concede todas as permissões relacionadas ao módulo de benefícios
- `beneficio.tipo.*` - Concede todas as permissões relacionadas a tipos de benefícios

### Permissões Específicas por Instância

Para casos que exigem controle ainda mais granular, podemos incluir o ID ou um identificador no esquema:

- `unidade.{id}.ler` - Permite ler informações apenas da unidade específica
- `solicitacao.{id}.status.atualizar` - Permite atualizar o status apenas da solicitação específica

## Aplicação e Verificação

O sistema de verificação de permissões seguirá uma lógica hierárquica, onde:

1. Verifica se o usuário possui uma permissão coringa de alto nível que inclui a permissão solicitada
2. Verifica se o usuário possui a permissão específica solicitada
3. Verifica se o usuário possui uma permissão para a instância específica (se aplicável)

## Considerações Especiais

- **Escopo de Unidade**: Permissões podem ter um escopo de unidade, significando que a permissão só é válida para recursos dentro da unidade do usuário
- **Transições de Status**: As transições de status seguirão regras especiais, onde cada transição (de → para) terá sua própria permissão
- **Auditoria**: Todas as verificações de permissões serão registradas para fins de auditoria, especialmente para operações sensíveis
