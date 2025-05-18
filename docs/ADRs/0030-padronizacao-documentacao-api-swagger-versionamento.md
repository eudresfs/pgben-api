# ADR-0030: Padronização da Documentação de API, Swagger e Estratégia de Versionamento

## Status
Proposto

## Contexto

A documentação da API do PGBen atualmente apresenta inconsistências na estratégia de versionamento, documentação de respostas de erro e exemplos de uso. Além disso, a implementação do Swagger, embora robusta, pode ser melhorada em termos de organização e padronização.

## Decisão

### 1. Estratégia de Versionamento

#### 1.1 Abordagem
- Adotar o versionamento por URL como estratégia principal
- Padrão: `/v{major}/recurso` (ex: `/v1/cidadao`, `/v1/beneficios`)

#### 1.2 Políticas
- Seguir versionamento semântico (MAJOR.MINOR.PATCH)
- Manter compatibilidade com versões anteriores por pelo menos 12 meses após o lançamento de uma nova versão principal
- Fornecer documentação de migração entre versões

### 2. Documentação da API

#### 2.1 Padrões de Documentação
- Todos os endpoints devem incluir:
  - Descrição clara do propósito
  - Parâmetros documentados com exemplos
  - Códigos de resposta HTTP com exemplos
  - Exemplos de requisição/resposta
  - Documentação de erros comuns

#### 2.2 Organização
- Agrupar documentação por domínio de negócio
- Incluir guias de início rápido
- Documentar fluxos de trabalho comuns

### 3. Implementação Swagger

#### 3.1 Estrutura
- Manter configurações centralizadas em `src/shared/configs/swagger/`
- Organizar schemas por domínio
- Utilizar decoradores Swagger de forma consistente

#### 3.2 Melhorias na UI
- Manter a customização atual da interface
- Adicionar mais exemplos interativos
- Melhorar a navegação entre endpoints relacionados

## Consequências

### Positivas
- Melhor experiência para desenvolvedores consumindo a API
- Maior consistência no código
- Facilidade de manutenção
- Melhor suporte a consumidores externos

### Negativas
- Esforço inicial para padronizar os controladores existentes
- Necessidade de atualizar a documentação continuamente

### Riscos
- Possível quebra de compatibilidade durante a transição
- Sobrecarga de trabalho para manter a documentação atualizada

## Alternativas Consideradas

### 1. Versionamento por Header
- **Vantagens**: URLs mais limpas
- **Desvantagens**: Menos descoberta na documentação, mais difícil de testar
- **Razão da rejeição**: Menos intuitivo para desenvolvedores iniciantes

### 2. Versionamento por Query Parameter
- **Vantagens**: Fácil de implementar
- **Desvantagens**: Menos explícito, pode ser esquecido
- **Razão da rejeição**: Menos limpo que o versionamento por URL

## Próximos Passos

1. [ ] Atualizar todos os controladores para usar o padrão `/v1/recurso`
2. [ ] Padronizar a documentação de erros e respostas
3. [ ] Adicionar exemplos para todos os endpoints
4. [ ] Criar documentação de migração entre versões
5. [ ] Implementar validação automática de schemas
6. [ ] Atualizar documentação da equipe sobre os novos padrões

## Links Relacionados

- [Análise completa da documentação de API](LINK_PARA_ANALISE_COMPLETA)
- [Documentação do Swagger](https://docs.nestjs.com/openapi/introduction)
- [Boas práticas de versionamento de API](https://restfulapi.net/versioning/)

## Histórico de Revisões

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2025-05-17 | 1.0 | Versão inicial | [Seu Nome] |
