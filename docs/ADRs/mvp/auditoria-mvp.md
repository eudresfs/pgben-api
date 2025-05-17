# Título: Otimização do Módulo de Auditoria para MVP

## Status
Implementado

## Contexto
O módulo de Auditoria da plataforma PGBen (Plataforma de Gestão de Benefícios) da SEMTAS precisa ser otimizado para atender aos requisitos mínimos de segurança e compliance, mas com foco na entrega rápida do MVP em 3 semanas. 

A análise técnica identificou que o módulo atual apresenta funcionalidades excessivas para um MVP, como mecanismos complexos de exportação (PDF, Excel), sanitização complexa de dados e armazenamento de informações não essenciais. Além disso, existem problemas de qualidade de código, como duplicação, métodos longos e complexos, e falta de controle de acesso adequado.

## Decisão
Optamos por simplificar o módulo de Auditoria, mantendo apenas as funcionalidades essenciais para o MVP, com foco em:

1. Reduzir o escopo da captura de dados para apenas operações CRUD críticas
2. Simplificar o modelo de dados, removendo campos não essenciais
3. Implementar exportação básica apenas em formatos JSON e CSV
4. Remover processamento complexo e sanitização excessiva
5. Implementar controle de acesso básico às informações de auditoria
6. Corrigir problemas de qualidade de código

## Checklist de Implementação

### 1. Simplificação do Modelo de Dados
- [x] 1.1 Reduzir campos na entidade LogAuditoria para apenas os essenciais
  - *Concluído: Removidos campos não essenciais como dados_anteriores, dados_novos, dados_sensiveis_acessados, ip_origem, user_agent, motivo, descricao, data_hora*
- [x] 1.2 Atualizar migrations correspondentes
  - *Concluído: Criada migração 1716035485000-simplifica-auditoria-mvp.ts para remover colunas desnecessárias*
- [x] 1.3 Ajustar repositório e serviços para refletir a nova estrutura
  - *Concluído: Atualizados DTOs e interfaces para refletir a estrutura simplificada*

### 2. Otimização do Interceptor de Auditoria
- [x] 2.1 Simplificar captura de dados no interceptor
  - *Concluído: Implementada versão simplificada do interceptor que captura apenas dados essenciais*
- [x] 2.2 Remover captura de dados não essenciais
  - *Concluído: Removidos métodos complexos de extração e sanitização de dados sensíveis*
- [x] 2.3 Otimizar performance eliminando processamento desnecessário
  - *Concluído: Substituído o processo complexo de enfileiramento por processamento direto e simplificado*

### 3. Simplificação do Serviço de Exportação
- [x] 3.1 Consolidar métodos de exportação em uma implementação simplificada
  - *Concluído: Criado novo serviço AuditoriaExportacaoService com implementação simplificada e limpa*
- [x] 3.2 Limitar formatos de exportação apenas para JSON e CSV no MVP
  - *Concluído: Removidos formatos Excel e PDF do enum FormatoExportacao, mantendo apenas JSON e CSV*
- [x] 3.3 Remover sanitização complexa e processos assíncronos desnecessários
  - *Concluído: Simplificada a sanitização de dados e removidos processos complexos*
- [x] 3.4 Corrigir erros de sintaxe e tipagem nos métodos de exportação
  - *Concluído: Implementada nova versão livre de erros de tipagem e sintaxe*

### 4. Implementação de Controle de Acesso Básico
- [x] 4.1 Criar guard simples baseado em perfil de usuário
  - *Concluído: Criado AuditoriaGuard que verifica perfis de usuário (admin, supervisor, gestor, auditor)*
- [x] 4.2 Aplicar guard nas rotas de auditoria
  - *Concluído: Guard implementado com validação de acesso usando Forbidden Exception*

### 5. Limpeza Geral do Código
- [x] 5.1 Remover importações não utilizadas
  - *Concluído: Removidas importações desnecessárias nos novos arquivos implementados*
- [x] 5.2 Corrigir problemas de lint
  - *Concluído: Resolvidos problemas de lint implementando novos arquivos padronizados*
- [x] 5.3 Atualizar ou remover comentários redundantes/desatualizados
  - *Concluído: Adicionada documentação atualizada e removidos comentários desnecessários*
- [x] 5.4 Garantir consistência de estilo com o padrão do projeto
  - *Concluído: Novos arquivos seguem o padrão de estilo do projeto*

### 6. Documentação e Testes
- [x] 6.1 Atualizar documentação Swagger da API
  - *Concluído: Adicionada documentação apropriada em todos os novos componentes*
- [x] 6.2 Manter apenas testes unitários essenciais
  - *Concluído: Removida complexidade dos testes existentes*
- [x] 6.3 Adiar implementação de testes de carga para pós-MVP
  - *Concluído: Testes de carga serão implementados após o MVP*

## Resumo da Implementação

Todas as tarefas planejadas foram concluídas com sucesso, resultando em um módulo de auditoria otimizado para o MVP. As principais melhorias incluem:

1. **Simplificação do modelo de dados**: Removidos campos não essenciais da entidade LogAuditoria, mantendo apenas os necessários para o rastreamento básico.

2. **Otimização do interceptor**: Implementado um interceptor simplificado que captura apenas os dados essenciais das operações.

3. **Criação de um serviço de exportação otimizado**: Desenvolvido um novo serviço (AuditoriaExportacaoService) com suporte apenas aos formatos essenciais (JSON e CSV).

4. **Controle de acesso**: Implementado um guard básico para proteger as rotas de auditoria, garantindo acesso apenas a usuários autorizados.

5. **Correção de problemas de qualidade de código**: Resolvidos problemas de lint, tipagem e comentários desatualizados.

Estas otimizações permitirão a entrega de um MVP funcional dentro do prazo de 3 semanas, mantendo a qualidade essencial e a segurança necessária para o módulo de auditoria.

## Consequências

### Positivas
- Entrega mais rápida do MVP dentro do prazo de 3 semanas
- Foco nas funcionalidades essenciais de auditoria
- Melhoria da qualidade do código base
- Simplicidade facilita manutenção e evolução futura
- Redução do consumo de recursos (processamento e armazenamento)

### Negativas / Limitações
- Funcionalidades avançadas de exportação não estarão disponíveis no MVP
- Detalhamento limitado nos logs de auditoria
- Análise estatística avançada adiada para versões futuras

## Funcionalidades Adiadas para Pós-MVP
- Exportação em formatos PDF e Excel
- Compressão de arquivos exportados
- Sanitização avançada de dados
- Particionamento de tabelas de log
- Assinatura digital para garantia de integridade
- Dashboard analítico para visualização de logs
- Testes de carga e performance
