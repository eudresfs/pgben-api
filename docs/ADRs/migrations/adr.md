# Registro de Decisão de Arquitetura (ADR)

## ADR 002: Reestruturação do Modelo de Migrations e Seeds

### Data: 16/05/2025

### Status: Proposto

### Contexto

O Sistema de Gestão de Benefícios Eventuais da SEMTAS atualmente enfrenta desafios significativos relacionados à estrutura de migrations e seeds, que afetam a manutenibilidade, rastreabilidade e extensibilidade do projeto. Como o sistema ainda não está em produção, existe uma oportunidade para refatorar completamente a estrutura do banco de dados de forma segura.

Os problemas específicos identificados incluem:

1. **Fragmentação excessiva**: Múltiplas migrations incrementais criadas para resolver problemas isolados, resultando em uma história fragmentada da evolução do schema.
2. **Falta de padronização**: Mistura de arquivos `.ts` e scripts SQL diretos, sem uma abordagem consistente.
3. **Baixa coesão**: Alterações relacionadas a um mesmo domínio estão espalhadas em várias migrations, dificultando o entendimento da estrutura.
4. **Seeds inconsistentes**: Dados de seed com duplicações, dependências implícitas e sobreposições.
5. **Nomenclatura inconsistente**: Ausência de um padrão claro nos nomes de migrations, classes e métodos.

### Decisão

**Implementar uma refatoração completa da estrutura de migrations e seeds, eliminando as migrations existentes e construindo uma nova estrutura coesa, organizada por domínios de negócio e seguindo um padrão de nomenclatura rigoroso.**

Especificamente:

1. **Padronizar a nomenclatura das migrations:**
   ```typescript
   export class CreateBaseStructure1000000 implements MigrationInterface {
     name = 'CreateBaseStructure20250512121900';
     // implementação...
   }
   ```

2. **Organizar migrations em uma sequência lógica por domínio:**
   ```
   migrations/
   ├── 1000000-CreateBaseStructure.ts          
   ├── 1000100-CreateAuthSchema.ts             
   ├── 1000200-CreateUserAndRoles.ts           
   └── ...
   ```

3. **Estruturar seeds em categorias funcionais:**
   ```
   seeds/
   ├── core/             // Dados essenciais (roles, unidades, tipos de benefício)
   ├── reference/        // Dados de referência (situações moradia, motivos)
   ├── development/      // Dados para ambiente de desenvolvimento
   └── utils/            // Utilitários para execução e geração
   ```

4. **Implementar otimizações de banco de dados:**
   - Indexação adequada para campos frequentemente pesquisados
   - Estratégias de particionamento para tabelas de histórico e logs
   - Políticas de segurança RLS para controle de acesso granular
   - Constraints e validações para garantir integridade dos dados

5. **Desenvolver testes automatizados:**
   - Testes que validam a integridade referencial após migrations
   - Verificações das constraints e regras de negócio
   - Validação de idempotência das seeds

### Consequências

#### Positivas:

1. **Rastreabilidade melhorada**: A nova estrutura permitirá entender claramente a evolução e a intenção do schema do banco de dados.
2. **Manutenibilidade aprimorada**: Migrations organizadas por domínio facilitam identificar onde e como fazer alterações futuras.
3. **Onboarding simplificado**: Novos desenvolvedores poderão compreender a estrutura do banco mais rapidamente.
4. **Performance otimizada**: Indexação e particionamento estratégicos melhorarão o desempenho das consultas.
5. **Extensibilidade**: A estrutura modular facilita a adição de novos tipos de benefícios ou funcionalidades.
6. **Consistência**: Padrão de nomenclatura uniforme torna o código mais legível e previsível.
7. **Testabilidade**: Estrutura mais organizada facilita a implementação de testes automatizados.

#### Negativas:

1. **Esforço inicial**: Requer um esforço significativo para análise, planejamento e implementação completa.
2. **Riscos de migração**: Mesmo em ambiente de não-produção, existe o risco de perda de dados de desenvolvimento.
3. **Curva de aprendizado**: Desenvolvedores precisarão se adaptar ao novo padrão de organização e nomenclatura.
4. **Tempo de desenvolvimento**: O tempo dedicado à refatoração impactará temporariamente o desenvolvimento de novas funcionalidades.

### Alternativas Consideradas

1. **Refatoração incremental**: Corrigir gradualmente as migrations existentes mantendo a história. Rejeitada porque não resolveria os problemas estruturais fundamentais e aumentaria a complexidade.

2. **Manter estrutura atual com melhores práticas futuras**: Definir padrões apenas para novas migrations. Rejeitada porque perpetuaria os problemas existentes e criaria um sistema híbrido de difícil manutenção.

3. **Abordagem de micro-refatorações**: Refatorar partes específicas do schema mantendo outras. Rejeitada pela dificuldade em gerenciar dependências parciais e possíveis inconsistências.

### Plano de Implementação

1. **Fase de Análise e Documentação (3 dias)**:
   - Mapear completamente o schema atual
   - Documentar todas as tabelas, relacionamentos e constraints existentes
   - Identificar domínios de negócio e dependências

2. **Fase de Design (2 dias)**:
   - Definir a nova estrutura de migrations por domínio
   - Projetar schema otimizado com índices e particionamento
   - Preparar scripts de exemplo seguindo o padrão de nomenclatura

3. **Fase de Implementação (5 dias)**:
   - Criar novas migrations seguindo a estrutura e nomenclatura definidas
   - Implementar scripts de seed organizados por categoria
   - Desenvolver testes de validação de schema

4. **Fase de Testes (3 dias)**:
   - Validar a aplicação completa das migrations em ambiente limpo
   - Testar constraints e validações
   - Verificar a execução de seeds sem conflitos

5. **Fase de Documentação (2 dias)**:
   - Atualizar READMEs e documentação técnica
   - Gerar diagramas ER atualizados
   - Criar guias para manutenção futura

### Critérios de Aceitação

1. **Performance**:
   - Todas as migrations aplicadas em menos de 2 minutos em ambiente limpo
   - Consultas críticas executadas em menos de 100ms com dataset de teste

2. **Integridade**:
   - Todas as constraints e validações funcionando corretamente
   - Relacionamentos entre tabelas mantendo integridade referencial

3. **Usabilidade**:
   - Estrutura de diretórios clara e intuitiva
   - Nomenclatura consistente e auto-explicativa
   - Documentação abrangente e atualizada

4. **Robustez**:
   - Operações `down()` de cada migration funcionando corretamente
   - Seeds executáveis repetidamente sem efeitos colaterais
   - Testes automatizados validando a integridade do schema

### Documentação Adicional

A implementação desta decisão deve incluir:

1. **README detalhado** em cada diretório principal, explicando a estrutura e convenções
2. **Diagrama ER** atualizado refletindo a nova estrutura
3. **Guia de desenvolvimento** explicando como:
   - Adicionar novas migrations seguindo o padrão
   - Desenvolver seeds consistentes
   - Executar testes de validação

### Impacto nos Módulos do Sistema

Esta refatoração afetará principalmente:

1. **Módulo de Cidadão**: Implementação do novo modelo de papéis (conforme ADR-001)
2. **Módulo de Benefícios**: Estrutura para propriedades dinâmicas via campos JSON
3. **Módulo de Solicitações**: Workflow e histórico de mudanças de status
4. **Módulo de Auditoria**: Particionamento e otimização para rastreamento eficiente

---

### Referências

- TypeORM Migration Documentation: https://typeorm.io/#/migrations
- PostgreSQL 14 Documentation: https://www.postgresql.org/docs/14/index.html
- NestJS Database Documentation: https://docs.nestjs.com/techniques/database
- ADR-001: Modelo de Relacionamento para Papéis de Cidadão