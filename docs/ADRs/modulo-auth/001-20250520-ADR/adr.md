# ADR: Aumentar a Granularidade do Sistema de Permissões

## Status

Aprovado

## Contexto

Atualmente, o Sistema de Gestão de Benefícios Eventuais da SEMTAS utiliza um modelo de controle de acesso baseado em roles (RBAC) com quatro perfis fixos: Administrador, Gestor (SEMTAS), Técnico (SEMTAS) e Técnico (Unidade). Este modelo apresenta limitações quando precisamos:

- Dar permissões específicas a usuários sem alterar todo seu perfil
- Revogar acessos pontuais dentro de um mesmo perfil
- Criar perfis customizados para casos especiais
- Gerenciar gradualmente a evolução de permissões para novas funcionalidades

O sistema atual já utiliza JWTs para autenticação, mas com granularidade apenas a nível de role, o que limita a flexibilidade necessária para uma gestão de acesso precisa.

## Decisão

Adotaremos um sistema híbrido baseado em Permissões (PBAC - Permission-Based Access Control) enquanto mantemos compatibilidade com o RBAC existente. Esta abordagem nos permitirá:

1. Usar permissões granulares para autorização em vez de papéis amplos
2. Incluir todas as permissões concedidas diretamente no token JWT
3. Migrar gradualmente do modelo atual para o novo sem quebrar a compatibilidade
4. Possibilitar a customização de permissões para casos específicos

## Consequências

### Positivas

- **Flexibilidade**: Capacidade de conceder/revogar permissões específicas sem alterar o papel completo
- **Manutenibilidade**: Facilita a adição de novas funcionalidades com controles de acesso específicos
- **Auditabilidade**: Melhora o rastreamento de quem pode fazer o quê no sistema
- **Segurança**: Implementa o princípio do privilégio mínimo, reduzindo superfícies de ataque
- **Escalabilidade**: Suporta perfis customizados e regras de negócio avançadas

### Negativas

- **Complexidade aumentada**: O modelo híbrido é mais complexo de implementar e manter
- **Overhead inicial**: Necessidade de definir todas as permissões e mapear para roles existentes
- **Performance**: Tokens JWT maiores e verificações mais elaboradas podem impactar levemente a performance
- **Período de transição**: Necessidade de manter dois sistemas funcionando em paralelo temporariamente

## Detalhes Arquiteturais

### 1. Estrutura de Permissões

Adotaremos uma nomenclatura padronizada para permissões usando a notação `recurso.operação`:

- **Exemplos**:
  - `usuario.criar`
  - `solicitacao.aprovar`
  - `cidadao.visualizar`
  - `relatorio.exportar`

Esta estrutura permite organização lógica e fácil identificação de domínios e operações permitidas.

### 2. Camadas de Implementação

A implementação será dividida em três camadas:

**Camada de Persistência**:
- Use a tabela `permissiao` com códigos de permissão únicos
- Tabela de associação `role_permissao` definindo permissões padrão por perfil
- Tabela opcional `usuario_permissao` para sobrescrever permissões específicas por usuário
- Possibilidade de incluir flags para "conceder" ou "revogar" permissões específicas

**Camada de Serviço**:
- Serviço de permissões que calcula o conjunto efetivo de permissões para um usuário
- Algoritmo que combina: permissões do papel + concessões específicas - revogações específicas
- Expansão do serviço de autenticação para incluir permissões no JWT
- Cache opcional para otimizar consultas frequentes

**Camada de Autorização**:
- Middleware/Guards que verificam permissões específicas em vez de roles
- Decoradores para definir permissões necessárias em endpoints da API
- Integração com frontend para habilitar/desabilitar elementos da UI com base em permissões

### 3. Estratégia de Migração

A migração será gradual, seguindo estas etapas:

1. **Preparação**: 
   - Definir catálogo de permissões existentes
   - Criar o mapeamento entre roles atuais e suas permissões
   - Implementar as tabelas e serviços necessários

2. **Implementação Paralela**:
   - Adicionar permissões ao JWT mantendo as roles atuais
   - Começar a usar o sistema de permissões para novas funcionalidades
   - Manter backward compatibility usando o sistema RBAC para funcionalidades existentes

3. **Transição Gradual**:
   - Migrar endpoints existentes para o novo sistema um por vez
   - Atualizar frontend para usar verificações baseadas em permissões
   - Monitorar impactos e fazer ajustes conforme necessário

4. **Consolidação**:
   - Remover gradualmente dependências do RBAC antigo
   - Adicionar ferramentas de gestão de permissões na interface admin
   - Documentar completamente o novo sistema

### 4. Considerações para Backend

- Extrair permissões do banco de dados durante o login
- Incluir array de permissões no payload do JWT
- Implementar novo middleware que verifica permissões específicas
- Manter compatibilidade com o middleware RBAC existente durante a transição
- Adicionar endpoints para gerenciar permissões customizadas

### 5. Considerações para Frontend

- Armazenar permissões na store junto com outras informações de autenticação
- Implementar utilitários para verificação de permissões na interface (diretivas, hooks)
- Condicionar exibição de elementos da UI com base em permissões, não em roles
- Criar interface de administração para gerenciar permissões (opcional no MVP)

### 6. Gestão de Permissões Customizadas

Teremos dois níveis de customização:

**Nível de Papel**: Modificar quais permissões cada papel tem por padrão
- Útil para ajustes gerais de responsabilidades entre departamentos

**Nível de Usuário**: Conceder ou revogar permissões específicas para usuários individuais
- Útil para casos excepcionais, usuários com responsabilidades mistas ou temporárias

## Próximos Passos

1. Criar inventário completo de operações do sistema e definir permissões granulares
2. Mapear permissões para os perfis existentes (matriz de acesso)
3. Implementar as alterações no modelo de dados
4. Modificar o processo de autenticação para incluir permissões no JWT
5. Desenvolver guards/middleware para verificação de permissões
6. Atualizar a documentação da API
7. Implementar utilitários no frontend para trabalhar com permissões
8. Definir plano de migração detalhado com cronograma