# Guia de Gestão de Parâmetros

## Introdução

Os parâmetros do sistema permitem personalizar o comportamento da plataforma PGBen sem necessidade de alterações no código-fonte. Este guia explica como gerenciar esses parâmetros através da interface administrativa.

## Acessando o Gerenciador de Parâmetros

1. Faça login no sistema PGBen com um usuário que possua perfil de administrador
2. No menu principal, clique em "Administração"
3. Selecione "Configurações do Sistema"
4. Clique na aba "Parâmetros"

## Visualizando Parâmetros

A tela de parâmetros exibe uma lista com todos os parâmetros configurados no sistema, organizados por categoria. Para cada parâmetro, são exibidas as seguintes informações:

- **Chave**: Identificador único do parâmetro
- **Valor**: Valor atual do parâmetro
- **Tipo**: Tipo de dado (STRING, NUMBER, BOOLEAN, DATE, JSON)
- **Descrição**: Descrição detalhada do parâmetro
- **Categoria**: Agrupamento lógico do parâmetro
- **Última atualização**: Data e usuário da última modificação

### Filtrando Parâmetros

Você pode filtrar a lista de parâmetros utilizando as seguintes opções:

- **Filtro por texto**: Busca em chaves, valores e descrições
- **Filtro por categoria**: Exibe apenas parâmetros de uma categoria específica
- **Filtro por tipo**: Exibe apenas parâmetros de um tipo específico

## Editando Parâmetros

Para editar um parâmetro existente:

1. Localize o parâmetro na lista
2. Clique no botão "Editar" (ícone de lápis) na linha do parâmetro
3. No formulário de edição, modifique os campos desejados:
   - **Valor**: Novo valor para o parâmetro
   - **Descrição**: Descrição atualizada (opcional)
   - **Categoria**: Nova categoria (opcional)
4. Clique em "Salvar" para confirmar as alterações

> **Importante**: Não é possível alterar a chave ou o tipo de um parâmetro existente. Caso seja necessário, crie um novo parâmetro e desative o antigo.

### Validação de Valores

O sistema valida automaticamente os valores informados de acordo com o tipo do parâmetro:

- **STRING**: Qualquer texto é aceito
- **NUMBER**: Deve ser um número válido (inteiro ou decimal)
- **BOOLEAN**: Deve ser "true" ou "false"
- **DATE**: Deve ser uma data válida no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS)
- **JSON**: Deve ser um JSON válido (objeto ou array)

## Criando Novos Parâmetros

Para criar um novo parâmetro:

1. Clique no botão "Novo Parâmetro" no topo da página
2. Preencha o formulário com as informações do parâmetro:
   - **Chave**: Identificador único (use formato com pontos, ex: "modulo.funcionalidade.parametro")
   - **Valor**: Valor inicial do parâmetro
   - **Tipo**: Tipo de dado do parâmetro
   - **Descrição**: Descrição detalhada da função do parâmetro
   - **Categoria**: Categoria para agrupamento lógico
3. Clique em "Criar" para adicionar o parâmetro

> **Dica**: Use nomes de chaves descritivos e siga um padrão consistente para facilitar a manutenção.

## Excluindo Parâmetros

> **Atenção**: A exclusão de parâmetros pode causar problemas no funcionamento do sistema. Recomenda-se extrema cautela.

Para excluir um parâmetro:

1. Localize o parâmetro na lista
2. Clique no botão "Excluir" (ícone de lixeira) na linha do parâmetro
3. Confirme a exclusão na caixa de diálogo

> **Nota**: Parâmetros essenciais do sistema não podem ser excluídos. Se você tentar excluir um desses parâmetros, receberá uma mensagem de erro.

## Exportando e Importando Parâmetros

### Exportando Parâmetros

Para exportar os parâmetros atuais:

1. Clique no botão "Exportar" no topo da página
2. Selecione o formato desejado (JSON ou CSV)
3. Escolha se deseja exportar todos os parâmetros ou apenas uma categoria específica
4. Clique em "Exportar" para iniciar o download

### Importando Parâmetros

Para importar parâmetros:

1. Clique no botão "Importar" no topo da página
2. Selecione o arquivo de importação (formato JSON ou CSV)
3. Escolha a estratégia de importação:
   - **Adicionar apenas novos**: Importa apenas parâmetros que não existem
   - **Atualizar existentes**: Atualiza parâmetros existentes e adiciona novos
   - **Substituir todos**: Remove todos os parâmetros atuais e importa os novos
4. Clique em "Importar" para iniciar o processo

## Parâmetros por Categoria

### Sistema

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `sistema.nome` | STRING | Nome do sistema exibido na interface | "PGBen - Plataforma de Gestão de Benefícios Eventuais" |
| `sistema.versao` | STRING | Versão atual do sistema | "1.0.0" |
| `sistema.contato.email` | STRING | Email de contato para suporte | "suporte@pgben.gov.br" |

### Upload

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `upload.tamanho_maximo` | NUMBER | Tamanho máximo de arquivos para upload (em bytes) | 10485760 |
| `upload.arquivos_maximo` | NUMBER | Número máximo de arquivos por cidadão | 20 |
| `upload.tipos_permitidos` | JSON | Tipos de arquivo permitidos para upload | ["jpg","jpeg","png","pdf","doc","docx"] |
| `upload.max_por_requisicao` | NUMBER | Número máximo de arquivos por requisição de upload | 5 |

### Prazos

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `prazo.analise_solicitacao` | NUMBER | Prazo para análise de solicitação de benefício (em dias) | 15 |
| `prazo.agendamento_entrevista` | NUMBER | Prazo para agendamento de entrevista (em dias) | 7 |
| `prazo.entrada_recurso` | NUMBER | Prazo para entrada de recurso (em dias) | 10 |
| `prazo.validade_documentos` | NUMBER | Prazo de validade de documentos (em dias) | 90 |

## Boas Práticas

### Nomenclatura de Parâmetros

Siga estas convenções ao criar novos parâmetros:

- Use letras minúsculas e pontos como separadores
- Agrupe logicamente usando prefixos consistentes
- Seja específico e descritivo

**Exemplos bons**:
- `email.remetente.nome`
- `solicitacao.auxilio_natalidade.valor_maximo`

**Exemplos ruins**:
- `EmailRemetente` (não usa minúsculas e pontos)
- `param1` (não é descritivo)

### Valores Sensíveis

Não armazene informações sensíveis (senhas, chaves de API, etc.) como parâmetros do sistema. Para esse tipo de dado, utilize o sistema de integrações, que oferece criptografia adequada.

### Documentação

Sempre forneça descrições claras e completas para os parâmetros, especialmente se eles afetarem o comportamento do sistema de forma significativa.

## Resolução de Problemas

### Cache de Parâmetros

O sistema utiliza cache para melhorar o desempenho na leitura de parâmetros. Se uma alteração não estiver sendo refletida imediatamente:

1. Acesse a aba "Parâmetros"
2. Clique no botão "Limpar Cache" no topo da página
3. Verifique se a alteração foi aplicada

### Parâmetros Corrompidos

Se um parâmetro estiver com valor corrompido ou incompatível com seu tipo:

1. Tente editar o parâmetro e corrigir o valor
2. Se não for possível, exclua o parâmetro e crie-o novamente
3. Se o parâmetro não puder ser excluído, entre em contato com o suporte técnico

## Exemplos de Uso

### Configurando Limites de Upload

Para ajustar os limites de upload de arquivos:

1. Localize os parâmetros na categoria "upload"
2. Edite os seguintes parâmetros conforme necessário:
   - `upload.tamanho_maximo`: Ajuste para o tamanho máximo desejado em bytes (ex: 20971520 para 20MB)
   - `upload.tipos_permitidos`: Adicione ou remova extensões de arquivo permitidas
   - `upload.arquivos_maximo`: Defina o número máximo de arquivos por cidadão

### Configurando Prazos

Para ajustar os prazos operacionais:

1. Localize os parâmetros na categoria "prazo"
2. Edite os valores conforme necessário, considerando dias úteis
3. Lembre-se que alterações nos prazos afetarão apenas novas solicitações, não as existentes
