# ADR: Melhorias Pragmáticas no Módulo Shared

## Status

**Data**: 17/05/2025  
**Status**: Proposto  
**Versão**: 2.0  
**Autor**: Equipe de Arquitetura PGBen

## Contexto

O módulo `shared` do PGBen é fundamental para o funcionamento da aplicação, fornecendo:

- Gerenciamento unificado de logs
- Configurações da aplicação
- Serviços essenciais (criptografia, armazenamento)
- Interceptores e filtros globais
- Validações comuns

Identificamos oportunidades de melhoria que trazem benefícios reais sem adicionar complexidade desnecessária.

## Decisão

### 1. Consolidação de Módulos
- **Unificar `logger` e `logging`** em uma única implementação coesa
- **Padronizar níveis de log** em toda a aplicação
- **Manter estrutura simples** sem criar abstrações prematuras

### 2. Melhorias de Segurança
- **Reforçar segurança das chaves locais**
  - Ajustar permissões de arquivos (chmod 600)
  - Implementar monitoramento de alterações
- **Documentar procedimentos** de backup e rotação de chaves

### 3. Documentação Essencial
- **Documentar interfaces públicas** dos serviços principais
- **Criar guias práticos** para tarefas comuns
- **Manter documentação enxuta** e focada

### 4. Métricas e Otimizações
- **Implementar métricas básicas** de performance
- **Otimizar apenas gargalos comprovados**
- **Evitar otimizações prematuras**

## Consequências

### Benefícios Imediatos
- **Código mais limpo** com a unificação dos módulos de log
- **Segurança aprimorada** com práticas básicas bem implementadas
- **Documentação útil** focada no essencial
- **Melhor visibilidade** com métricas básicas

### Custos e Riscos
- **Baixo esforço** de implementação
- **Risco mínimo** de regressão
- **Curva de aprendizado** praticamente inexistente
## Alternativas Consideradas

1. **Manter a estrutura atual**
   - *Vantagem*: Nenhum esforço adicional
   - *Desvantagem*: Problemas de duplicação e manutenção continuariam

2. **Refatoração completa (opção inicial)**
   - *Vantagem*: Solução abrangente
   - *Desvantagem*: Alto esforço para benefícios questionáveis

3. **Abordagem incremental (escolhida)**
   - *Vantagem*: Baixo risco, entrega rápida de valor
   - *Desvantagem*: Menos abrangente, mas mais realista

## Plano de Ação

### Fase 1: Consolidação (Sprint 1)
1. [ ] Unificar `logger` e `logging`
   - Manter compatibilidade com código existente
   - Atualizar imports críticos
   - Remover código duplicado

2. [ ] Padronizar níveis de log
   - Definir convenção simples
   - Aplicar nos pontos principais

### Fase 2: Segurança (Sprint 2)
1. [ ] Reforçar segurança local
   - Ajustar permissões (chmod 600)
   - Implementar monitoramento básico
   - Documentar procedimentos

2. [ ] Revisar documentação
   - Atualizar README.md
   - Documentar interfaces principais
   - Criar guias práticos

### Fase 3: Métricas (Sprint 3)
1. [ ] Implementar métricas básicas
   - Coletar dados de performance
   - Identificar gargalos reais
   - Documentar descobertas

## Métricas de Sucesso

1. **Código unificado** sem duplicação de logs
2. **Segurança básica** implementada
3. **Documentação útil** disponível
4. **Métricas iniciais** coletadas

## Próximos Passos

1. [ ] Revisar e aprovar este ADR
2. [ ] Priorizar tarefas no backlog
3. [ ] Atribuir responsáveis
4. [ ] Iniciar implementação

## Referências

- [NestJS Documentation](https://docs.nestjs.com/)
- [OWASP Secure Coding](https://owasp.org/www-project-secure-coding-practices-quick-reference/)
- [12 Factor App](https://12factor.net/)
