Documentação do Plano de Reestruturação de Migrations do PGBen

1. Visão Geral

Este documento detalha o plano completo para a reestruturação das migrations do Sistema de Gestão de Benefícios Eventuais da SEMTAS. O objetivo é criar uma estrutura organizada, coesa e otimizada para o banco de dados, seguindo as melhores práticas de PostgreSQL e TypeORM.

2. Checklist de Implementação

Fase 1: Análise e Mapeamento
[ ] 1.1 Mapear todas as tabelas existentes
[ ] 1.2 Documentar relacionamentos entre tabelas
[ ] 1.3 Identificar constraints e índices atuais
[ ] 1.4 Mapear tipos de dados e enumerações
[ ] 1.5 Identificar domínios de negócio
[ ] 1.6 Documentar dependências entre tabelas
[ ] 1.7 Analisar queries críticas para otimização
[ ] 1.8 Criar diagrama ER da estrutura atual

Fase 2: Design da Nova Estrutura
[ ] 2.1 Definir hierarquia de migrations por domínio
[ ] 2.2 Criar template para novas migrations
[ ] 2.3 Projetar esquema otimizado com índices
[ ] 2.4 Definir estratégia de particionamento para tabelas grandes
[ ] 2.5 Projetar políticas RLS para segurança
[ ] 2.6 Definir estrutura de seeds por categoria
[ ] 2.7 Criar diagrama ER da nova estrutura
[ ] 2.8 Documentar estratégias de otimização

Fase 3: Implementação
[ ] 3.1 Criar migration base (1000000-CreateBaseStructure.ts)
[ ] 3.2 Implementar migration de autenticação (1010000-CreateAuthSchema.ts)
[ ] 3.3 Implementar migration de cidadão (1020000-CreateCidadaoSchema.ts)
[ ] 3.4 Implementar migration de benefício (1030000-CreateBeneficioSchema.ts)
[ ] 3.5 Implementar migration de solicitação (1040000-CreateSolicitacaoSchema.ts)
[ ] 3.6 Implementar migration de documento (1050000-CreateDocumentoSchema.ts)
[ ] 3.7 Implementar migration de auditoria (1060000-CreateAuditoriaSchema.ts)
[ ] 3.8 Implementar migration de relatório (1070000-CreateRelatorioSchema.ts)
[ ] 3.9 Implementar migration de integração (1080000-CreateIntegracaoSchema.ts)
[ ] 3.10 Criar seeds essenciais (core)
[ ] 3.11 Criar seeds de referência (reference)
[ ] 3.12 Criar seeds de desenvolvimento (development)
[ ] 3.13 Implementar utilitários para seeds (utils)

Fase 4: Testes
[ ] 4.1 Criar ambiente de teste limpo
[ ] 4.2 Executar migrations em ordem
[ ] 4.3 Verificar integridade referencial
[ ] 4.4 Testar operações down() de cada migration
[ ] 4.5 Executar seeds e verificar consistência
[ ] 4.6 Testar políticas RLS
[ ] 4.7 Validar performance de queries críticas
[ ] 4.8 Testar particionamento de tabelas
[ ] 4.9 Documentar resultados dos testes

Fase 5: Documentação
[ ] 5.1 Atualizar README principal
[ ] 5.2 Criar README para diretório de migrations
[ ] 5.3 Criar README para diretório de seeds
[ ] 5.4 Gerar diagrama ER final
[ ] 5.5 Documentar estratégias de otimização implementadas
[ ] 5.6 Criar guia para adição de novas migrations
[ ] 5.7 Documentar métricas de performance
[ ] 5.8 Finalizar ADR com decisões tomadas