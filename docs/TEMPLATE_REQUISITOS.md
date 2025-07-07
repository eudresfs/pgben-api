# Templates para Requisitos Documentais

Este documento descreve como utilizar o sistema de templates para requisitos documentais no sistema PGBEN.

## Visão Geral

O sistema de templates permite que administradores forneçam modelos de documentos para facilitar o preenchimento pelos usuários. Cada requisito documental pode ter um template associado com URL, nome e descrição.

## Campos de Template

### Campos Disponíveis

- **template_url** (string, opcional): URL para download do arquivo template
- **template_nome** (string, opcional): Nome do arquivo template para identificação
- **template_descricao** (string, opcional): Descrição ou instruções sobre o template
- **observacoes** (string, opcional): Observações adicionais sobre o documento

### Validações

- `template_url`: Deve ser uma URL válida quando fornecida
- `template_nome`: Máximo de 255 caracteres
- Todos os campos são opcionais

## Endpoints da API

### 1. Criar Requisito com Template

```http
POST /api/beneficios/{beneficioId}/requisitos
```

**Body:**
```json
{
  "tipo_documento": "COMPROVANTE_RESIDENCIA",
  "nome": "Comprovante de Residência",
  "descricao": "Comprovante de residência dos últimos 3 meses",
  "obrigatorio": true,
  "observacoes": "Aceitar conta de água, luz ou telefone",
  "template_url": "https://storage.exemplo.com/templates/comprovante-residencia.pdf",
  "template_nome": "modelo-comprovante-residencia.pdf",
  "template_descricao": "Template padrão para comprovante de residência. Preencher com dados atualizados."
}
```

### 2. Atualizar Requisito com Template

```http
PUT /api/beneficios/{beneficioId}/requisitos/{requisitoId}
```

**Body:**
```json
{
  "template_url": "https://storage.exemplo.com/templates/novo-modelo.pdf",
  "template_nome": "novo-modelo-v2.pdf",
  "template_descricao": "Versão atualizada do template com novos campos"
}
```

### 3. Obter Informações do Template

```http
GET /api/beneficios/{beneficioId}/requisitos/{requisitoId}/template
```

**Resposta:**
```json
{
  "temTemplate": true,
  "template_url": "https://storage.exemplo.com/templates/comprovante.pdf",
  "template_nome": "modelo-comprovante.pdf",
  "template_descricao": "Template padrão para comprovante de residência",
  "extensao": "pdf",
  "ehPdf": true,
  "ehImagem": false,
  "ehDocumentoOffice": false,
  "templateCompleto": true,
  "infoTemplate": {
    "nome": "modelo-comprovante.pdf",
    "descricao": "Template padrão para comprovante de residência",
    "url": "https://storage.exemplo.com/templates/comprovante.pdf",
    "extensao": "pdf"
  }
}
```

## Métodos Utilitários da Entidade

A entidade `RequisitoDocumento` possui diversos métodos para trabalhar com templates:

### Verificação de Template

- `temTemplate()`: Verifica se o requisito possui template
- `templateUrlEhValida()`: Valida se a URL do template é válida
- `templateEstaCompleto()`: Verifica se o template tem todas as informações necessárias

### Informações do Template

- `getNomeTemplate()`: Retorna o nome do template ou nome padrão
- `getDescricaoTemplate()`: Retorna a descrição do template
- `getExtensaoTemplate()`: Extrai a extensão do arquivo da URL
- `getInfoTemplate()`: Retorna objeto com todas as informações do template

### Verificação de Tipo de Arquivo

- `templateEhPdf()`: Verifica se o template é um arquivo PDF
- `templateEhImagem()`: Verifica se o template é uma imagem
- `templateEhDocumentoOffice()`: Verifica se é um documento do Office

### Manipulação de Template

- `atualizarTemplate(url, nome, descricao)`: Atualiza informações do template
- `removerTemplate()`: Remove o template do requisito
- `cloneComTemplate()`: Clona o requisito mantendo as informações do template

## Exemplos de Uso

### Exemplo 1: Requisito com Template PDF

```typescript
// Criar requisito com template PDF
const requisito = await beneficioService.addRequisito(beneficioId, {
  tipo_documento: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
  nome: 'Comprovante de Residência',
  descricao: 'Comprovante de residência dos últimos 3 meses',
  obrigatorio: true,
  template_url: 'https://storage.exemplo.com/templates/comprovante.pdf',
  template_nome: 'modelo-comprovante.pdf',
  template_descricao: 'Preencher com dados pessoais atualizados'
});

// Verificar se tem template
if (requisito.temTemplate()) {
  console.log('Template disponível:', requisito.getNomeTemplate());
}
```

### Exemplo 2: Atualizar Template

```typescript
// Atualizar apenas o template
const requisitoAtualizado = await beneficioService.updateRequisito(
  beneficioId,
  requisitoId,
  {
    template_url: 'https://storage.exemplo.com/templates/novo-modelo.docx',
    template_nome: 'novo-modelo.docx',
    template_descricao: 'Versão atualizada com novos campos'
  }
);
```

### Exemplo 3: Remover Template

```typescript
// Remover template do requisito
const requisito = await requisitoRepository.findOne({ where: { id: requisitoId } });
requisito.removerTemplate();
await requisitoRepository.save(requisito);
```

## Considerações de Segurança

1. **Validação de URL**: Todas as URLs de template são validadas antes de serem salvas
2. **Sanitização**: Nomes e descrições são sanitizados para prevenir XSS
3. **Controle de Acesso**: Apenas usuários autorizados podem gerenciar templates
4. **Auditoria**: Todas as alterações em templates são registradas nos logs

## Migração de Dados

Para aplicar as mudanças no banco de dados, execute a migration:

```bash
npm run migration:run
```

A migration `AddTemplateFieldsToRequisitoDocumento` adiciona os campos:
- `observacoes` (text)
- `template_url` (varchar 500)
- `template_nome` (varchar 255)
- `template_descricao` (text)

## Troubleshooting

### Problemas Comuns

1. **URL inválida**: Verificar se a URL está bem formada e acessível
2. **Template não encontrado**: Verificar se o arquivo existe no storage
3. **Permissões**: Verificar se o usuário tem permissão para acessar o template

### Logs

Os logs do sistema registram:
- Criação e atualização de templates
- Tentativas de acesso a templates inválidos
- Erros de validação de URL