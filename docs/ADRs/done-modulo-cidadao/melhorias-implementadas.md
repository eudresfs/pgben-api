# ADR: Melhorias no Módulo de Cidadão

## Status

Implementado

## Contexto

O módulo de Cidadão é um componente crítico do sistema PGBen, responsável pelo gerenciamento de dados de cidadãos e beneficiários. Uma análise técnica identificou diversas oportunidades de melhoria relacionadas à performance, segurança, conformidade com LGPD e experiência do desenvolvedor.

## Decisão

Implementamos as seguintes melhorias no módulo de Cidadão:

### 1. Otimização de Performance

- **Índices Compostos**: Adicionamos índices compostos na tabela `cidadao` para melhorar a performance das consultas mais frequentes:
  - `IDX_cidadao_bairro_ativo`: Para consultas por bairro e status
  - `IDX_cidadao_cidade_bairro_ativo`: Para consultas por cidade, bairro e status
  - `IDX_cidadao_nome_ativo`: Para consultas por nome e status
  - `IDX_cidadao_created_at_ativo`: Para consultas por data de criação e status

- **Sistema de Cache**: Implementamos um sistema de cache utilizando Bull/Redis para reduzir a carga no banco de dados:
  - Cache por ID, CPF e NIS
  - Invalidação automática do cache em atualizações
  - TTL configurável (padrão: 1 hora)

### 2. Segurança e LGPD

- **Interceptor de Auditoria**: Implementamos um interceptor para registrar todas as operações sensíveis conforme exigido pela LGPD:
  - Registro de quem acessou dados sensíveis
  - Mascaramento de dados sensíveis nos logs
  - Preparação para integração com sistema de auditoria

- **Validações Avançadas**: Melhoramos as validações de dados para garantir a integridade e segurança:
  - Validador personalizado para CPF
  - Validador personalizado para NIS
  - Validador personalizado para CEP
  - Validador personalizado para telefone

### 3. Experiência do Desenvolvedor

- **Versionamento de API**: Implementamos versionamento da API (v1) para facilitar futuras evoluções sem quebrar compatibilidade

- **Documentação Aprimorada**: Melhoramos a documentação Swagger:
  - Exemplos detalhados de respostas de erro
  - Descrições mais completas dos endpoints
  - Documentação de códigos de erro específicos

- **Validações Cruzadas**: Implementamos validações que dependem de múltiplos campos:
  - Validação específica para beneficiários (NIS obrigatório)
  - Validação de composição familiar baseada no tipo de cidadão e renda

### 4. Migrações

- Criamos uma migração (`1716558823000-AddCidadaoCompositeIndices.ts`) para adicionar os índices compostos no banco de dados

## Consequências

### Positivas

- **Melhor Performance**: Consultas mais rápidas, especialmente para filtragem por bairro e status
- **Menor Carga no Banco**: Redução de consultas repetitivas graças ao sistema de cache
- **Conformidade com LGPD**: Rastreamento completo de acesso a dados sensíveis
- **Melhor Experiência do Desenvolvedor**: API mais consistente e bem documentada
- **Validações Mais Robustas**: Menos erros de dados e melhor feedback para o usuário

### Negativas

- **Complexidade Adicional**: A adição do sistema de cache e auditoria aumenta a complexidade do código
- **Dependência do Redis**: O sistema agora depende do Redis para funcionalidades de cache

### Mitigações

- A complexidade adicional é compensada por uma documentação detalhada
- A dependência do Redis é gerenciada através de configuração centralizada e fallbacks

## Alternativas Consideradas

- **Cache em Memória**: Consideramos usar cache em memória, mas optamos pelo Redis para suportar múltiplas instâncias
- **Auditoria via Banco de Dados**: Consideramos implementar auditoria diretamente no banco de dados, mas optamos por um interceptor para maior flexibilidade

## Referências

- [Documento de Melhorias do Módulo Cidadão](../../melhorias-modulo-cidadao.md)
- [Lei Geral de Proteção de Dados (LGPD)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm)
- [Documentação do Bull Queue](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md)
- [Documentação do TypeORM sobre índices](https://typeorm.io/#/indices)
