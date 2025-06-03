# Seed de Requisitos de Documentos por Benefício

## Descrição

Esta seed (`RequisitoDocumentoBeneficioSeed`) é responsável por popular a tabela `requisito_documento` com os requisitos específicos de documentos para cada tipo de benefício do sistema SEMTAS.

## Funcionalidades

- ✅ Mapeia corretamente os tipos de documentos usando o enum `TipoDocumentoEnum`
- ✅ Define requisitos específicos para cada tipo de benefício
- ✅ Especifica se cada documento é obrigatório ou opcional
- ✅ Inclui descrições detalhadas para cada requisito
- ✅ Atualiza registros existentes sem duplicar dados
- ✅ Tratamento de erros robusto

## Benefícios Contemplados

### 1. Auxílio Natalidade
- CPF e RG da gestante/mãe
- Comprovante de residência
- Cartão de pré-natal
- Certidão de nascimento (opcional)
- Exames pré-natais (opcional)
- Declaração de nascido vivo (opcional)
- Comprovante de gestação (opcional)
- Comprovante de renda familiar
- Folha resumo do CadÚnico (opcional)
- Declaração de composição familiar
- Dados bancários

### 2. Aluguel Social
- CPF e RG do solicitante
- Comprovante de residência anterior
- Contrato de aluguel
- Comprovante de renda familiar
- Boletim de ocorrência (opcional)
- Medida protetiva (opcional)
- Relatório social
- Parecer técnico (opcional)
- Folha resumo do CadÚnico (opcional)
- Declaração de composição familiar
- Dados bancários
- IPTU do imóvel (opcional)

### 3. Auxílio Funeral
- CPF e RG do solicitante
- Comprovante de residência
- Certidão de óbito
- Declaração de óbito (opcional)
- Comprovante de parentesco
- Autorização de sepultamento (opcional)
- Comprovante de renda familiar
- Folha resumo do CadÚnico (opcional)
- Declaração de hipossuficiência
- Dados bancários

### 4. Auxílio Alimentação
- CPF e RG do solicitante
- Comprovante de residência
- Comprovante de renda familiar
- Declaração de composição familiar
- Folha resumo do CadÚnico (opcional)
- Cartão do CadÚnico (opcional)
- Comprovante Bolsa Família (opcional)
- Declaração médica (opcional)
- Relatório social
- Dados bancários

### 5. Auxílio Transporte
- CPF e RG do solicitante
- Comprovante de residência
- Comprovante de viagem
- Autorização de viagem (opcional)
- Orçamento de passagem
- Declaração médica (opcional)
- Comprovante de renda familiar
- Folha resumo do CadÚnico (opcional)
- Relatório social

## Como Executar

### Opção 1: Script NPM (Recomendado)
```bash
npm run seed:requisito-documento-beneficio
```

### Opção 2: Execução Direta
```bash
npx ts-node src/database/seeds/run-requisito-documento-beneficio-seed.ts
```

### Opção 3: Como Parte das Seeds de Referência
```bash
npm run seed:direct
```

## Pré-requisitos

1. **Banco de dados configurado** com as tabelas criadas pelas migrations
2. **Tipos de benefício cadastrados** na tabela `tipo_beneficio`
3. **Enum `tipo_documento_enum`** criado no banco de dados

## Estrutura dos Dados

Cada requisito de documento contém:

```typescript
{
  tipo_documento: TipoDocumentoEnum,  // Enum do tipo de documento
  nome: string,                       // Nome descritivo do requisito
  descricao: string,                  // Descrição detalhada
  obrigatorio: boolean,               // Se é obrigatório ou opcional
}
```

## Logs e Monitoramento

A seed fornece logs detalhados durante a execução:

- ✅ **Sucesso**: Requisitos criados ou atualizados
- 🔄 **Atualização**: Requisitos existentes atualizados
- ⚠️ **Aviso**: Tipos de benefício não encontrados
- ❌ **Erro**: Falhas durante o processamento

## Tratamento de Erros

- **Tipo de benefício não encontrado**: Pula para o próximo benefício
- **Erro de inserção/atualização**: Registra o erro e continua
- **Falha de conexão**: Encerra a execução com código de erro

## Manutenção

### Adicionando Novos Benefícios

1. Adicione o novo benefício no array `requisitosPorBeneficio`
2. Defina os requisitos usando os valores do `TipoDocumentoEnum`
3. Execute a seed novamente

### Modificando Requisitos Existentes

1. Altere os dados no array `requisitosPorBeneficio`
2. Execute a seed - ela atualizará automaticamente os registros existentes

### Adicionando Novos Tipos de Documentos

1. Adicione o novo tipo no `TipoDocumentoEnum`
2. Execute a migration para atualizar o enum no banco
3. Adicione o novo tipo nos requisitos conforme necessário
4. Execute a seed

## Integração com o Sistema

Esta seed é executada automaticamente como parte do processo de setup do banco de dados:

```bash
npm run db:setup    # Executa migrations + todas as seeds
npm run db:reset    # Reseta o banco e executa setup completo
```

## Troubleshooting

### Erro: "Tipo de benefício não encontrado"
- Verifique se a seed `TipoBeneficioSeed` foi executada
- Confirme se os nomes dos benefícios estão corretos

### Erro: "Enum value not found"
- Verifique se a migration dos enums foi executada
- Confirme se o `TipoDocumentoEnum` está atualizado

### Erro: "Duplicate key value"
- A seed trata duplicatas automaticamente
- Se persistir, verifique a constraint única na tabela

## Arquivos Relacionados

- `src/entities/requisito-documento.entity.ts` - Entidade do requisito
- `src/enums/tipo-documento.enum.ts` - Enum dos tipos de documentos
- `src/database/migrations/*-CreateAllEnums.ts` - Migration dos enums
- `src/database/seeds/reference/ReferenceSeedRunner.ts` - Runner das seeds de referência