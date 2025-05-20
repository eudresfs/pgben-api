# Guia de Criação de Templates

## Introdução

Os templates são modelos reutilizáveis para e-mails, notificações, documentos e relatórios gerados pelo sistema PGBen. Este guia explica como criar e gerenciar templates através da interface administrativa.

## Acessando o Gerenciador de Templates

1. Faça login no sistema PGBen com um usuário que possua perfil de administrador
2. No menu principal, clique em "Administração"
3. Selecione "Configurações do Sistema"
4. Clique na aba "Templates"

## Visualizando Templates

A tela de templates exibe uma lista com todos os templates configurados no sistema, organizados por tipo. Para cada template, são exibidas as seguintes informações:

- **Código**: Identificador único do template
- **Nome**: Nome descritivo do template
- **Tipo**: Tipo de template (EMAIL, SMS, NOTIFICAÇÃO, DOCUMENTO, RELATÓRIO)
- **Status**: Ativo ou Inativo
- **Última atualização**: Data e usuário da última modificação

### Filtrando Templates

Você pode filtrar a lista de templates utilizando as seguintes opções:

- **Filtro por texto**: Busca em códigos, nomes e descrições
- **Filtro por tipo**: Exibe apenas templates de um tipo específico
- **Filtro por status**: Exibe apenas templates ativos ou inativos

## Visualizando um Template

Para visualizar os detalhes de um template:

1. Localize o template na lista
2. Clique no nome do template ou no botão "Visualizar" (ícone de olho)
3. Na tela de detalhes, você verá:
   - Informações básicas (código, nome, tipo, etc.)
   - Conteúdo do template
   - Pré-visualização renderizada (se disponível)
   - Histórico de alterações

## Criando um Novo Template

Para criar um novo template:

1. Clique no botão "Novo Template" no topo da página
2. Preencha o formulário com as informações do template:
   - **Código**: Identificador único (use formato com hífens, ex: "email-bem-vindo")
   - **Nome**: Nome descritivo do template
   - **Descrição**: Descrição detalhada da função do template
   - **Tipo**: Tipo de template (EMAIL, SMS, NOTIFICAÇÃO, DOCUMENTO, RELATÓRIO)
   - **Conteúdo**: Conteúdo do template com variáveis e formatação
3. Clique em "Criar" para adicionar o template

> **Dica**: Use códigos descritivos e siga um padrão consistente para facilitar a manutenção.

## Editando Templates

Para editar um template existente:

1. Localize o template na lista
2. Clique no botão "Editar" (ícone de lápis) na linha do template
3. No formulário de edição, modifique os campos desejados
4. Clique em "Salvar" para confirmar as alterações

> **Importante**: Não é possível alterar o código ou o tipo de um template existente. Caso seja necessário, crie um novo template e desative o antigo.

## Ativando/Desativando Templates

Para alterar o status de um template:

1. Localize o template na lista
2. Clique no botão "Ativar/Desativar" (ícone de toggle) na linha do template
3. Confirme a alteração na caixa de diálogo

> **Nota**: Templates inativos não são utilizados pelo sistema, mas permanecem no banco de dados para referência futura.

## Excluindo Templates

> **Atenção**: A exclusão de templates pode causar problemas no funcionamento do sistema. Recomenda-se desativar em vez de excluir.

Para excluir um template:

1. Localize o template na lista
2. Clique no botão "Excluir" (ícone de lixeira) na linha do template
3. Confirme a exclusão na caixa de diálogo

> **Nota**: Templates essenciais do sistema não podem ser excluídos. Se você tentar excluir um desses templates, receberá uma mensagem de erro.

## Sintaxe de Templates

Os templates utilizam a sintaxe do Handlebars, que permite a inclusão de variáveis, condicionais e loops.

### Variáveis Simples

Para incluir uma variável, use chaves duplas:

```handlebars
Olá, {{nome}}!

Sua solicitação de {{tipo_beneficio}} foi recebida com sucesso.
Protocolo: {{protocolo}}
```

### Formatação de Dados

Para formatar datas, valores monetários e outros tipos de dados, use os helpers disponíveis:

```handlebars
Data da solicitação: {{formatDate data_solicitacao "DD/MM/YYYY"}}
Valor aprovado: {{formatCurrency valor}}
CPF: {{formatCpf cpf}}
Telefone: {{formatPhone telefone}}
```

### Condicionais

Para incluir conteúdo condicional, use as estruturas `if`, `else` e `unless`:

```handlebars
{{#if prazo.dias_restantes}}
  Você tem {{prazo.dias_restantes}} dias para completar esta etapa.
{{else}}
  O prazo para esta etapa já expirou.
{{/if}}

{{#unless documentos_pendentes}}
  <p>Não há documentos pendentes.</p>
{{/unless}}
```

### Loops

Para iterar sobre arrays, use a estrutura `each`:

```handlebars
<h3>Documentos Pendentes:</h3>
<ul>
  {{#each documentos_pendentes}}
    <li>{{this.nome}} - {{this.descricao}}</li>
  {{/each}}
</ul>
```

### Operadores de Comparação

Para comparações mais complexas, use os helpers de comparação:

```handlebars
{{#if (eq status "Aprovado")}}
  Seu benefício foi aprovado!
{{/if}}

{{#if (gt valor 500)}}
  Valor superior a R$ 500,00
{{/if}}

{{#if (and (eq tipo "Auxílio") (lt dias_restantes 5))}}
  Atenção: prazo curto para auxílio!
{{/if}}
```

## Testando Templates

O sistema permite testar a renderização de templates antes de salvá-los:

1. Na tela de criação ou edição de template, clique na aba "Testar"
2. Insira dados de exemplo no formato JSON no campo "Dados de Teste"
3. Clique em "Renderizar" para ver o resultado

Exemplo de dados de teste para um e-mail de boas-vindas:

```json
{
  "nome": "João Silva",
  "email": "joao.silva@exemplo.com",
  "link": "https://pgben.natal.rn.gov.br/login"
}
```

## Variáveis Disponíveis por Contexto

As variáveis disponíveis dependem do contexto em que o template é utilizado:

### Contexto: Usuário

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `nome` | String | Nome completo do usuário | `"João Silva"` |
| `email` | String | E-mail do usuário | `"joao.silva@exemplo.com"` |
| `perfil` | String | Perfil/papel do usuário | `"Assistente Social"` |
| `setor` | Object | Informações do setor do usuário | `{ nome: "CRAS Centro", endereco: "..." }` |
| `ultimo_acesso` | Date | Data do último acesso | `"2025-05-15T14:30:00"` |

### Contexto: Cidadão

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `nome` | String | Nome completo do cidadão | `"Maria Oliveira"` |
| `cpf` | String | CPF formatado | `"123.456.789-00"` |
| `data_nascimento` | Date | Data de nascimento | `"1985-03-10"` |
| `endereco` | Object | Endereço completo | `{ logradouro: "Rua A", numero: "123", ... }` |
| `telefone` | String | Telefone principal | `"(84) 98765-4321"` |

### Contexto: Solicitação

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `protocolo` | String | Número do protocolo | `"2025.05.0001234"` |
| `data_solicitacao` | Date | Data da solicitação | `"2025-05-10T09:15:00"` |
| `tipo_beneficio` | String | Nome do tipo de benefício | `"Auxílio Natalidade"` |
| `status` | String | Status atual da solicitação | `"Em Análise"` |
| `prazo` | Object | Informações de prazo | `{ data_limite: "2025-05-25", dias_restantes: 10 }` |
| `valor` | Number | Valor do benefício (se aplicável) | `500.00` |

## Helpers Disponíveis

O sistema fornece os seguintes helpers para uso em templates:

| Helper | Descrição | Exemplo |
|--------|-----------|---------|
| `formatDate` | Formata uma data | `{{formatDate data "DD/MM/YYYY"}}` |
| `formatCurrency` | Formata um valor monetário | `{{formatCurrency valor}}` |
| `formatCpf` | Formata um CPF | `{{formatCpf cpf}}` |
| `formatPhone` | Formata um telefone | `{{formatPhone telefone}}` |
| `eq` | Compara igualdade | `{{#if (eq status "Aprovado")}}...{{/if}}` |
| `neq` | Compara desigualdade | `{{#if (neq status "Rejeitado")}}...{{/if}}` |
| `gt` | Maior que | `{{#if (gt valor 500)}}...{{/if}}` |
| `lt` | Menor que | `{{#if (lt dias_restantes 5)}}...{{/if}}` |
| `and` | Operador lógico AND | `{{#if (and condicao1 condicao2)}}...{{/if}}` |
| `or` | Operador lógico OR | `{{#if (or condicao1 condicao2)}}...{{/if}}` |

## Exportando e Importando Templates

### Exportando Templates

Para exportar os templates atuais:

1. Clique no botão "Exportar" no topo da página
2. Selecione o formato desejado (JSON)
3. Escolha se deseja exportar todos os templates ou apenas um tipo específico
4. Clique em "Exportar" para iniciar o download

### Importando Templates

Para importar templates:

1. Clique no botão "Importar" no topo da página
2. Selecione o arquivo de importação (formato JSON)
3. Escolha a estratégia de importação:
   - **Adicionar apenas novos**: Importa apenas templates que não existem
   - **Atualizar existentes**: Atualiza templates existentes e adiciona novos
   - **Substituir todos**: Remove todos os templates atuais e importa os novos
4. Clique em "Importar" para iniciar o processo

## Boas Práticas

### Design Responsivo para E-mails

Para templates de e-mail, considere as seguintes práticas:

1. Use tabelas para layout (muitos clientes de e-mail não suportam CSS avançado)
2. Mantenha a largura em torno de 600px para melhor visualização em dispositivos móveis
3. Use fontes seguras (Arial, Verdana, Georgia, Times New Roman)
4. Teste em diferentes clientes de e-mail

### Segurança

1. Evite incluir scripts ou código executável em templates
2. Tenha cuidado com conteúdo HTML não escapado (`{{{conteudo}}}` com três chaves)
3. Valide dados de entrada antes de renderizar templates

### Organização

1. Mantenha templates simples e focados em um único propósito
2. Use comentários para documentar seções complexas:
   ```handlebars
   {{!-- Seção de documentos pendentes --}}
   ```
3. Reutilize componentes comuns entre templates quando possível

## Exemplos de Templates

### E-mail de Boas-vindas

```handlebars
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #0066cc; padding: 20px; text-align: center; color: white;">
    <h1>Bem-vindo(a) ao PGBen!</h1>
  </div>
  
  <div style="padding: 20px;">
    <p>Olá, <strong>{{nome}}</strong>!</p>
    
    <p>Sua conta foi criada com sucesso na Plataforma de Gestão de Benefícios Eventuais (PGBen) da Prefeitura Municipal de Natal.</p>
    
    <p>Para acessar o sistema, utilize o seguinte link:</p>
    
    <p style="text-align: center;">
      <a href="{{link}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar PGBen</a>
    </p>
    
    <p>Em caso de dúvidas, entre em contato com nossa equipe de suporte pelo e-mail: <a href="mailto:suporte@pgben.gov.br">suporte@pgben.gov.br</a></p>
    
    <p>Atenciosamente,<br>Equipe PGBen</p>
  </div>
  
  <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
    <p>Este é um e-mail automático. Por favor, não responda.</p>
  </div>
</body>
</html>
```

### Notificação de Status

```handlebars
<div class="notification">
  <h4>Atualização de Status</h4>
  
  <p>Sua solicitação de <strong>{{tipo_beneficio}}</strong> (protocolo: {{protocolo}}) teve seu status atualizado para <strong>{{status}}</strong>.</p>
  
  {{#if (eq status "Aprovado")}}
    <p class="success">Parabéns! Seu benefício foi aprovado.</p>
    <p>Valor aprovado: {{formatCurrency valor}}</p>
    <p>Data prevista para pagamento: {{formatDate data_prevista_pagamento "DD/MM/YYYY"}}</p>
  {{/if}}
  
  {{#if (eq status "Em Análise")}}
    <p class="info">Sua solicitação está sendo analisada pela nossa equipe.</p>
    <p>Prazo estimado para conclusão: {{formatDate prazo.data_limite "DD/MM/YYYY"}} ({{prazo.dias_restantes}} dias)</p>
  {{/if}}
  
  {{#if (eq status "Documentação Pendente")}}
    <p class="warning">Para prosseguir com sua solicitação, precisamos dos seguintes documentos:</p>
    <ul>
      {{#each documentos_pendentes}}
        <li>{{this.nome}} - {{this.descricao}}</li>
      {{/each}}
    </ul>
    <p>Por favor, envie os documentos até {{formatDate prazo.data_limite "DD/MM/YYYY"}}.</p>
  {{/if}}
</div>
```

## Resolução de Problemas

### Template Não Renderiza Corretamente

Se um template não estiver renderizando corretamente:

1. Verifique a sintaxe do template (chaves, tags de fechamento)
2. Teste o template com dados de exemplo
3. Verifique se as variáveis esperadas estão sendo fornecidas
4. Consulte o log de erros do sistema para mensagens específicas

### Variáveis Não Aparecem no Resultado

Se as variáveis não estiverem sendo substituídas:

1. Verifique se o nome da variável está correto (incluindo maiúsculas/minúsculas)
2. Confirme se a variável está sendo fornecida no contexto
3. Teste com valores simples para isolar o problema

### Problemas de Formatação em E-mails

Se a formatação de e-mails estiver inconsistente:

1. Use HTML básico e tabelas para layout
2. Evite CSS avançado ou externo
3. Teste em diferentes clientes de e-mail
4. Considere usar um serviço de teste de e-mail como Litmus ou Email on Acid
