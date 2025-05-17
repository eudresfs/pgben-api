# Prompt para Arquitetura de Banco de Dados - Sistema de Gestão de Benefícios Eventuais SEMTAS

## Perfil e Expertise

Atue como Arquiteto de Dados e DBA PostgreSQL sênior especializado em sistemas governamentais, com:

- 15+ anos de experiência em projetos complexos com PostgreSQL e sistemas de assistência social
- Certificações avançadas em PostgreSQL, Data Architecture, AWS Database e Data Governance
- Histórico comprovado em implementações para secretarias municipais, com expertise em:
  - Modelagem DDD aplicada a bancos relacionais
  - Conformidade com LGPD e LAI em sistemas governamentais
  - Otimização para alta concorrência com PostgreSQL avançado
  - Arquitetura de persistência compartilhada segura
  - Design de auditoria completa para rastreamento de benefícios sociais

## Contexto do Projeto

O Sistema de Gestão de Benefícios Eventuais da SEMTAS (Natal/RN) necessita:

1. **Gerenciar benefícios eventuais** concedidos a cidadãos vulneráveis (Auxílio Natalidade, Aluguel Social)
2. **Rastrear o histórico completo** de solicitações, aprovações, pendências e liberações
3. **Suportar múltiplos perfis de usuário** com diferentes níveis de acesso (Admin, Gestor SEMTAS, Técnicos)
4. **Garantir compliance com LGPD** e segurança de dados sensíveis
5. **Manter auditoria completa** para prestação de contas a órgãos de controle
6. **Escalar em períodos de calamidade** com aumento significativo de solicitações

## Problema Atual de Modelagem

O sistema atualmente apresenta:

1. **Fragmentação excessiva**: Migrations incrementais desordenadas, sem estrutura lógica clara
2. **Falta de padronização**: Mistura de arquivos `.ts` e `.sql` sem organização consistente
3. **Baixa coesão**: Alterações relacionadas espalhadas em múltiplas migrations
4. **Seeds duplicadas**: Dados de seed com redundância e dependências implícitas
5. **Nomenclatura inconsistente**: Ausência de padrão claro nos nomes de migrations e entidades

## Requisito de Refatoração

Como o sistema ainda **não está em produção**, temos a oportunidade para reconstruir completamente a estrutura do banco de dados, seguindo:

1. **Nomenclatura padronizada**:
   ```typescript
   export class CreateBaseStructure1000000 implements MigrationInterface {
     name = 'CreateBaseStructure${}T${}Z$';
     // implementação...
   }
   ```

2. **Organização hierárquica** de migrations por domínio e dependências funcionais
3. **Estruturação coesa** de seeds em categorias claras (core, reference, development)
4. **Implementação otimizada** com indexação adequada, particionamento e políticas RLS
5. **Documentação completa** para facilitar onboarding e manutenção

## Entregáveis Esperados

### 1. Arquitetura de Migrations

Desenvolva uma estrutura completa de migrations organizadas logicamente:

```
migrations/
├── 1000000-CreateBaseStructure.ts          // Classe: CreateBaseStructure1000000, name: 'CreateBaseStructure${}T${}Z$'
├── 1000100-CreateAuthSchema.ts             // Classe: CreateAuthSchema1000100, name: 'CreateAuthSchema${}T${}Z$'
├── 1000200-CreateUserAndRoles.ts           // ...e assim por diante
```

Cada migration deve:
- Seguir o padrão de nomenclatura específico
- Implementar métodos `up()` e `down()` completos e testáveis
- Incluir documentação clara do propósito e dependências
- Agrupar operações relacionadas (tabela + índices + constraints)

### 2. Estrutura de Seeds Otimizada

```
seeds/
├── core/                          // Dados essenciais sem os quais o sistema não funciona
├── reference/                     // Dados de referência que raramente mudam
├── development/                   // Dados exclusivos para ambiente de desenvolvimento
└── utils/                         // Utilitários para execução e geração de dados
```

### 3. Modelagem Física Otimizada

- **Scripts DDL** completos com índices apropriados
- **Estratégias de particionamento** para tabelas de histórico e logs
- **Políticas de segurança RLS** para controle de acesso granular
- **Constraints e validações** para garantir integridade de dados

### 4. Estratégia de Implementação

- **Plano de migração** detalhado para transição segura
- **Testes de validação** para verificar integridade após refatoração
- **Documentação técnica** completa da nova estrutura
- **Métricas de desempenho** esperadas após otimização

## Considerações Técnicas Específicas

### Stack Tecnológica
- **Backend**: NestJS com TypeORM
- **Banco de Dados**: PostgreSQL 14+
- **Validação**: class-validator integrado com TypeORM
- **Autenticação**: JWT com RBAC granular

### Otimizações Necessárias
- **Consultas em campos JSON** para propriedades dinâmicas de benefícios
- **Indexação apropriada** para consultas frequentes (CPF, protocolo, status)
- **Particionamento de logs** para gerenciamento eficiente de auditoria
- **Estratégias de cache** para dados frequentemente acessados

### Requisitos de Segurança
- **Mascaramento de dados sensíveis** nos logs
- **Rastreamento de alterações** em tabelas críticas
- **Segregação de acesso** por perfil e unidade

## Formato de Entrega

Apresente sua solução completa com análise técnica detalhada, incluindo:

1. **Estrutura proposta** para migrations e seeds
2. **Scripts de exemplo** seguindo o padrão de nomenclatura
3. **Estratégias de otimização** para consultas críticas
4. **Plano de implementação** com cronograma e marcos
5. **Trade-offs considerados** com justificativas técnicas

Sua resposta deve ser abrangente, focada em práticas recomendadas específicas para PostgreSQL e TypeORM, com exemplos concretos que possam ser implementados diretamente no sistema da SEMTAS.