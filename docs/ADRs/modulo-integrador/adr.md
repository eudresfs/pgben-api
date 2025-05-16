# ADR 0001: Sistema de Gestão de Integradores com Tokens de Longa Duração

## Status

Aceito

## Data

2025-05-16

## Contexto

Nosso sistema necessita fornecer acesso programático à API para sistemas externos (como ERPs, CRMs e aplicações parceiras). Atualmente, todos os acessos são tratados através do mesmo mecanismo de autenticação JWT com refresh tokens, projetado principalmente para usuários humanos. Isso causa dificuldades para integrações automatizadas:

1. Tokens de curta duração (1h) exigem renovação frequente, criando pontos potenciais de falha
2. O mecanismo de refresh token é inadequado para sistemas automatizados
3. Não há separação clara entre usuários humanos e sistemas integrados
4. A autorização atual não oferece granularidade suficiente para controlar o acesso de sistemas externos
5. A administração e revogação de acessos externos é complexa e não-auditável

Necessitamos de uma solução que permita:
- Autenticação segura para sistemas automatizados
- Controle granular sobre quais recursos cada sistema pode acessar
- Monitoramento de uso e auditoria
- Capacidade de revogar acessos específicos

## Decisão

Implementaremos um Sistema de Gestão de Integradores dedicado com as seguintes características:

1. **Modelo de entidades separado**:
   - `Integrador`: Representa um sistema ou parceiro externo
   - `IntegradorToken`: Representa credenciais de acesso específicas

2. **Tokens JWT de longa duração ou sem expiração**:
   - Elimina necessidade de refresh tokens para integrações
   - Permite estabelecer integrações contínuas sem quebras
   - Cada token terá seu próprio conjunto de permissões

3. **Sistema de escopos granulares**:
   - Permissões baseadas no padrão `acao:recurso` (ex: `read:usuarios`, `write:dados`)
   - Cada token poderá acessar apenas os endpoints autorizados pelos seus escopos
   - Endpoints protegidos por um guard específico que verifica permissões

4. **Mecanismos de segurança adicionais**:
   - Armazenamento apenas do hash do token (nunca o token em texto puro)
   - Registro completo de uso para auditoria
   - Capacidade de restringir acesso por IP
   - Revogação imediata de tokens específicos
   - Lista de tokens revogados em cache para verificação rápida

5. **Interface administrativa dedicada**:
   - Gestão de integradores e seus tokens
   - Monitoramento de uso
   - Auditoria de ações

Utilizaremos o algoritmo de assinatura RS256 (assimétrico) para os tokens JWT, mantendo a compatibilidade com o sistema de autenticação existente, mas com um fluxo de processamento distinto.

## Consequências

### Positivas

1. **Experiência melhorada para integradores**:
   - Tokens de longa duração eliminam necessidade de renovação frequente
   - Integrações mais estáveis e menos propensas a falhas
   - Menor overhead de autenticação para sistemas parceiros

2. **Maior segurança e controle**:
   - Separação clara entre usuários humanos e sistemas
   - Princípio do privilégio mínimo aplicado via escopos granulares
   - Auditoria completa de todas as ações realizadas por sistemas externos
   - Capacidade de revogar acessos específicos imediatamente

3. **Administração simplificada**:
   - Interface dedicada para gestão de integradores
   - Visibilidade sobre quais sistemas têm acesso e a quais recursos
   - Capacidade de ajustar permissões sem interromper integrações

4. **Flexibilidade para diferentes casos de uso**:
   - Suporte a tokens de diferentes durações dependendo do caso
   - Possibilidade de tokens sem expiração para integrações críticas de longo prazo
   - Controle granular por parceiro e por token

### Negativas

1. **Maior complexidade de implementação**:
   - Necessidade de criar e manter um novo subsistema
   - Dois mecanismos distintos de autenticação (usuários vs. integradores)

2. **Considerações de segurança com tokens de longa duração**:
   - Tokens sem expiração representam um risco se comprometidos
   - Necessidade de mecanismos adicionais de segurança (lista de revogação, monitoramento)

3. **Overhead de manutenção**:
   - Necessidade de manter lista de revogação eficiente
   - Monitoramento adicional requerido
   - Educação de parceiros sobre o novo mecanismo

4. **Considerações de desempenho**:
   - Verificação de escopos em cada requisição
   - Validação contra lista de revogação
   - Necessidade de otimização para manter baixa latência

## Alternativas Consideradas

### 1. Manter mecanismo atual com tokens de refresh de longa duração

**Prós**: Implementação mais simples, mecanismo unificado.
**Contras**: Mantém problemas fundamentais de design para sistemas automatizados, complexidade de refresh.

### 2. Utilizar OAuth 2.0 completo com servidor de autorização separado

**Prós**: Padrão maduro e amplamente adotado, maior flexibilidade.
**Contras**: Complexidade significativamente maior, excesso para necessidades atuais, curva de aprendizado para parceiros.

### 3. API keys simples (sem JWT)

**Prós**: Simplicidade extrema, fácil de implementar.
**Contras**: Limitações de segurança, falta de capacidade para transportar metadados (como escopos), difícil renovação.

## Conformidade

Esta abordagem está alinhada com padrões e recomendações de segurança:

1. **OWASP API Security Top 10**:
   - Aborda API1:2023 (Broken Object Level Authorization) através de escopos granulares
   - Mitiga API2:2023 (Broken Authentication) com tokens seguros e gerenciados
   - Implementa API9:2023 (Improper Inventory Management) com gestão centralizada de integradores

2. **Princípios de Segurança**:
   - Segue o princípio do privilégio mínimo (least privilege)
   - Implementa defesa em profundidade com múltiplas camadas de proteção
   - Permite auditabilidade completa

## Implementação

A implementação seguirá estas etapas:

1. **Fase 1**: Desenvolvimento do modelo de dados e serviços básicos
   - Entidades `Integrador` e `IntegradorToken`
   - Serviços para gerenciamento de tokens
   - Guard básico para validação

2. **Fase 2**: Implementação do sistema de escopos e proteção de endpoints
   - Decoradores para definição de escopos necessários
   - Verificação de permissões no guard
   - Testes de segurança

3. **Fase 3**: Desenvolvimento da interface administrativa
   - CRUD de integradores
   - Gestão de tokens
   - Visualização de uso e auditoria

4. **Fase 4**: Migração e documentação
   - Documentação para uso interno
   - Guias para integradores
   - Migração gradual de integrações existentes

## Notas

1. Essa solução foi projetada especificamente para integrações sistema-a-sistema, não para autenticação de usuários finais.

2. A decisão de permitir tokens sem expiração é um trade-off consciente entre segurança e conveniência, mitigado por mecanismos adicionais de segurança e monitoramento rigoroso.

3. Reavaliaremos esta decisão em 12 meses, baseado em métricas de uso, incidentes de segurança e feedback de integradores.