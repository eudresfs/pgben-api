# Sistema de Templates

## Visão Geral

O sistema de templates do PGBen permite a criação e renderização de conteúdos dinâmicos para e-mails, notificações, documentos e relatórios. O motor de templates utiliza o Handlebars como base, oferecendo suporte a variáveis, condicionais, loops e helpers personalizados.

## Tipos de Templates Suportados

O sistema suporta os seguintes tipos de templates:

| Tipo | Descrição | Uso Típico |
|------|-----------|------------|
| `EMAIL` | Templates para mensagens de e-mail em HTML | Comunicações oficiais, notificações de status |
| `SMS` | Templates para mensagens SMS (texto curto) | Alertas, códigos de confirmação |
| `NOTIFICACAO` | Templates para notificações no sistema | Alertas internos, lembretes |
| `DOCUMENTO` | Templates para documentos gerados | Termos, declarações, formulários |
| `RELATORIO` | Templates para relatórios | Relatórios estatísticos, extratos |

## Templates Pré-configurados

O sistema vem com os seguintes templates pré-configurados:

| Código | Nome | Tipo | Descrição |
|--------|------|------|-----------|
| `email-bem-vindo` | E-mail de Boas-vindas | `EMAIL` | Template para e-mail de boas-vindas enviado aos novos usuários |
| `notificacao-solicitacao-recebida` | Notificação de Solicitação Recebida | `NOTIFICACAO` | Template para notificação enviada ao cidadão quando sua solicitação é recebida |

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

## Sintaxe do Template

O sistema utiliza a sintaxe do Handlebars para templates:

### Variáveis Simples

```handlebars
Olá, {{nome}}!

Sua solicitação de {{tipo_beneficio}} foi recebida com sucesso.
Protocolo: {{protocolo}}
```

### Formatação de Dados

```handlebars
Data da solicitação: {{formatDate data_solicitacao "DD/MM/YYYY"}}
Valor aprovado: {{formatCurrency valor}}
```

### Condicionais

```handlebars
{{#if prazo.dias_restantes}}
  Você tem {{prazo.dias_restantes}} dias para completar esta etapa.
{{else}}
  O prazo para esta etapa já expirou.
{{/if}}

{{#if valor}}
  Valor aprovado: {{formatCurrency valor}}
{{else}}
  Valor ainda não definido.
{{/if}}
```

### Loops

```handlebars
<h3>Documentos Pendentes:</h3>
<ul>
  {{#each documentos_pendentes}}
    <li>{{this.nome}} - {{this.descricao}}</li>
  {{/each}}
</ul>

{{#unless documentos_pendentes}}
  <p>Não há documentos pendentes.</p>
{{/unless}}
```

## Helpers Personalizados

O sistema fornece os seguintes helpers personalizados:

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

## Utilizando o Serviço de Templates

Para utilizar o serviço de templates em seu código:

```typescript
import { Injectable } from '@nestjs/common';
import { TemplateService } from '../configuracao/services/template.service';

@Injectable()
export class NotificacaoService {
  constructor(
    private readonly templateService: TemplateService
  ) {}

  async enviarNotificacaoSolicitacaoRecebida(solicitacao, cidadao) {
    // Buscar o template pelo código
    const template = await this.templateService.buscarPorCodigo(
      'notificacao-solicitacao-recebida'
    );
    
    // Preparar os dados para o template
    const dados = {
      nome: cidadao.nome,
      protocolo: solicitacao.protocolo,
      tipo_beneficio: solicitacao.tipoBeneficio.nome,
      data_solicitacao: solicitacao.created_at
    };
    
    // Renderizar o template com os dados
    const conteudo = await this.templateService.renderizar(template, dados);
    
    // Usar o conteúdo renderizado (exemplo: enviar notificação)
    await this.enviarNotificacao({
      usuario_id: cidadao.usuario_id,
      titulo: `Solicitação ${solicitacao.protocolo} recebida`,
      conteudo: conteudo,
      link: `/solicitacoes/${solicitacao.id}`
    });
  }
}
```

## Testando Templates

Você pode testar a renderização de templates sem salvá-los:

```typescript
// Testar renderização de um template
const resultado = await this.templateService.testar({
  conteudo: 'Olá, {{nome}}! Seu protocolo é {{protocolo}}.',
  tipo: TemplateTipoEnum.NOTIFICACAO,
  dados: {
    nome: 'João Silva',
    protocolo: '2025.05.0001234'
  }
});

console.log(resultado.conteudo); // "Olá, João Silva! Seu protocolo é 2025.05.0001234."
```

## Gerenciando Templates Programaticamente

Além de usar a interface administrativa, você pode gerenciar templates programaticamente:

```typescript
// Criar novo template
await this.templateService.criar({
  codigo: 'email-confirmacao-pagamento',
  nome: 'E-mail de Confirmação de Pagamento',
  descricao: 'E-mail enviado quando um pagamento é confirmado',
  tipo: TemplateTipoEnum.EMAIL,
  conteudo: `
    <h1>Pagamento Confirmado</h1>
    <p>Olá, {{nome}}!</p>
    <p>O pagamento do benefício {{tipo_beneficio}} no valor de {{formatCurrency valor}} foi confirmado em {{formatDate data_pagamento "DD/MM/YYYY"}}.</p>
    <p>Atenciosamente,<br>Equipe PGBen</p>
  `
});

// Atualizar template existente
await this.templateService.atualizar('email-bem-vindo', {
  conteudo: '<h1>Bem-vindo ao PGBen!</h1><p>Olá, {{nome}}!</p>...',
  descricao: 'Template atualizado para e-mail de boas-vindas'
});

// Alterar status de um template (ativar/desativar)
await this.templateService.alterarStatus('email-bem-vindo', false); // desativar
```

## Segurança

O motor de templates implementa medidas de segurança para prevenir vulnerabilidades como XSS (Cross-Site Scripting):

1. **Escape automático**: Por padrão, todas as variáveis são escapadas para prevenir injeção de HTML.
2. **Sanitização**: Conteúdo HTML é sanitizado para remover scripts e atributos perigosos.
3. **Validação**: Templates são validados antes da renderização para detectar problemas.

Para incluir HTML não-escapado (use com cautela):

```handlebars
{{{conteudo_html}}}
```

## Boas Práticas

1. **Mantenha templates simples**: Evite lógica complexa em templates.
2. **Teste com dados reais**: Sempre teste templates com dados que representem casos reais.
3. **Versione seus templates**: Mantenha um histórico de alterações importantes.
4. **Documente variáveis**: Ao criar novos templates, documente as variáveis esperadas.
5. **Considere a responsividade**: Para e-mails e documentos, considere diferentes tamanhos de tela.

## Exemplos Práticos

### E-mail de Notificação de Status

```handlebars
<html>
<body>
  <h1>Atualização de Status</h1>
  <p>Olá, {{nome}}!</p>
  
  <p>Sua solicitação de {{tipo_beneficio}} (protocolo: {{protocolo}}) teve seu status atualizado para <strong>{{status}}</strong>.</p>
  
  {{#if (eq status "Aprovado")}}
    <p>Parabéns! Seu benefício foi aprovado.</p>
    <p>Valor aprovado: {{formatCurrency valor}}</p>
    <p>Data prevista para pagamento: {{formatDate data_prevista_pagamento "DD/MM/YYYY"}}</p>
  {{/if}}
  
  {{#if (eq status "Em Análise")}}
    <p>Sua solicitação está sendo analisada pela nossa equipe.</p>
    <p>Prazo estimado para conclusão: {{formatDate prazo.data_limite "DD/MM/YYYY"}} ({{prazo.dias_restantes}} dias)</p>
  {{/if}}
  
  {{#if (eq status "Documentação Pendente")}}
    <p>Para prosseguir com sua solicitação, precisamos dos seguintes documentos:</p>
    <ul>
      {{#each documentos_pendentes}}
        <li>{{this.nome}} - {{this.descricao}}</li>
      {{/each}}
    </ul>
    <p>Por favor, envie os documentos até {{formatDate prazo.data_limite "DD/MM/YYYY"}}.</p>
  {{/if}}
  
  <p>Para mais detalhes, acesse sua área no sistema: <a href="{{link}}">Acessar PGBen</a></p>
  
  <p>Atenciosamente,<br>Equipe PGBen</p>
</body>
</html>
```
