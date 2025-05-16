# Plano de Reestruturação de Migrations - PGBen

## Visão Geral

Este documento detalha o plano completo para a reestruturação das migrations do Sistema de Gestão de Benefícios Eventuais da SEMTAS. O objetivo é criar uma estrutura organizada, coesa e otimizada para o banco de dados, seguindo as melhores práticas de PostgreSQL e TypeORM.

## Checklist de Implementação

### Fase 1: Análise e Mapeamento
- [x] 1.1 Mapear todas as tabelas existentes
- [x] 1.2 Documentar relacionamentos entre tabelas
- [x] 1.3 Identificar constraints e índices atuais
- [x] 1.4 Mapear tipos de dados e enumerações
- [x] 1.5 Identificar domínios de negócio
- [x] 1.6 Documentar dependências entre tabelas
- [x] 1.7 Analisar queries críticas para otimização
- [ ] 1.8 Criar diagrama ER da estrutura atual

### Fase 2: Design da Nova Estrutura
- [x] 2.1 Definir hierarquia de migrations por domínio
- [x] 2.2 Criar template para novas migrations
- [x] 2.3 Projetar esquema otimizado com índices
- [x] 2.4 Definir estratégia de particionamento para tabelas grandes
- [x] 2.5 Projetar políticas RLS para segurança
- [x] 2.6 Definir estrutura de seeds por categoria
- [ ] 2.7 Criar diagrama ER da nova estrutura
- [x] 2.8 Documentar estratégias de otimização

### Fase 3: Implementação
- [x] 3.1 Criar migration base (1000000-CreateBaseStructure.ts)
- [x] 3.2 Implementar migration de autenticação (1010000-CreateAuthSchema.ts)
- [x] 3.3 Implementar migration de cidadão (1020000-CreateCidadaoSchema.ts)
- [x] 3.4 Implementar migration de benefício (1030000-CreateBeneficioSchema.ts)
- [x] 3.5 Implementar migration de solicitação (1040000-CreateSolicitacaoSchema.ts)
- [x] 3.6 Implementar migration de documento (1050000-CreateDocumentoSchema.ts)
- [x] 3.7 Implementar migration de auditoria (1060000-CreateAuditoriaSchema.ts)
- [x] 3.8 Implementar migration de relatório (1070000-CreateRelatorioSchema.ts)
- [x] 3.9 Implementar migration de integração (1080000-CreateIntegracaoSchema.ts)
- [ ] 3.10 Criar seeds essenciais (core)
- [ ] 3.11 Criar seeds de referência (reference)
- [ ] 3.12 Criar seeds de desenvolvimento (development)
- [ ] 3.13 Implementar utilitários para seeds (utils)

### Fase 4: Testes
- [ ] 4.1 Criar ambiente de teste limpo
- [ ] 4.2 Executar migrations em ordem
- [ ] 4.3 Verificar integridade referencial
- [ ] 4.4 Testar operações down() de cada migration
- [ ] 4.5 Executar seeds e verificar consistência
- [ ] 4.6 Testar políticas RLS
- [ ] 4.7 Validar performance de queries críticas
- [ ] 4.8 Testar particionamento de tabelas
- [ ] 4.9 Documentar resultados dos testes

### Fase 5: Documentação
- [ ] 5.1 Atualizar README principal
- [ ] 5.2 Criar README para diretório de migrations
- [ ] 5.3 Criar README para diretório de seeds
- [ ] 5.4 Gerar diagrama ER final
- [ ] 5.5 Documentar estratégias de otimização implementadas
- [ ] 5.6 Criar guia para adição de novas migrations
- [ ] 5.7 Documentar métricas de performance
- [ ] 5.8 Finalizar ADR com decisões tomadas

## Cronograma de Implementação

| Fase | Duração | Data Início | Data Fim |
|------|---------|-------------|----------|
| 1. Análise e Mapeamento | 3 dias | 16/05/2025 | 18/05/2025 |
| 2. Design da Nova Estrutura | 2 dias | 19/05/2025 | 20/05/2025 |
| 3. Implementação | 5 dias | 21/05/2025 | 25/05/2025 |
| 4. Testes | 3 dias | 26/05/2025 | 28/05/2025 |
| 5. Documentação | 2 dias | 29/05/2025 | 30/05/2025 |

## Responsáveis

- **Análise e Design**: Arquiteto de Dados
- **Implementação**: Desenvolvedores Backend
- **Testes**: Equipe de QA
- **Documentação**: Arquiteto de Dados e Desenvolvedores

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Perda de dados durante migração | Média | Alto | Backup completo antes de iniciar, scripts de verificação de integridade |
| Atraso no cronograma | Alta | Médio | Priorização de domínios críticos, implementação incremental |
| Problemas de compatibilidade com código existente | Alta | Alto | Testes de integração completos, período de validação |
| Resistência à mudança | Média | Médio | Documentação clara, treinamento da equipe |

## Critérios de Aceitação

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
