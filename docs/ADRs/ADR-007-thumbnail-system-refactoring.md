# ADR-007: Refatoração do Sistema de Thumbnail

## Status
**PROPOSTO** - Aguardando aprovação para implementação

## Data
2024-12-19

## Contexto

O sistema atual de thumbnails do módulo `documento` apresenta complexidade excessiva (overengineering) que resulta em:

- **Duplicação de lógica**: Implementação híbrida com fila assíncrona + geração on-demand
- **Performance subótima**: Timeouts excessivos (30s PDF, 15s imagem) e cache insuficiente (1h)
- **Riscos de segurança**: Processamento síncrono de PDFs sem sandboxing
- **Manutenção custosa**: Múltiplas dependências pesadas (Sharp ~30MB, pdf2pic, pdf-thumbnail)
- **Arquitetura complexa**: Controller "gordo" com lógica de negócio, acoplamento excessivo

### Problemas Identificados

#### 1. Estratégia Atual
- Geração assíncrona via `ThumbnailQueueService` após upload
- Geração on-demand via endpoint `GET /:id/thumbnail`
- Sistema de retry com backoff exponencial
- Fallback para thumbnails padrão

#### 2. Métricas de Complexidade
- **Linhas de código**: ~1.200 (thumbnail services + controller)
- **Dependências pesadas**: 3 (Sharp, pdf2pic, pdf-thumbnail)
- **Pontos de falha**: 8 diferentes cenários de erro
- **Tempo de resposta**: 2-30 segundos
- **Complexidade ciclomática**: Alta

## Decisão

**Simplificar para estratégia Lazy Generation com cache agressivo**

### Arquitetura Alvo

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Controller    │───▶│ ThumbnailFacade  │───▶│ StorageProvider │
│                 │    │                  │    │                 │
│ - GET thumbnail │    │ - generateLazy() │    │ - Cache 7 dias  │
│ - Cache headers │    │ - timeout 3s     │    │ - Fallback      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Princípios da Nova Arquitetura

1. **Simplicidade**: Uma única estratégia de geração (lazy)
2. **Performance**: Cache agressivo (7 dias) + timeouts reduzidos (3s)
3. **Segurança**: Rate limiting + timeouts baixos
4. **Manutenção**: Dependência única (Sharp) + código limpo

## Consequências

### Positivas ✅

- **Redução de 67% no código**: ~1.200 → ~400 linhas
- **Redução de 67% nas dependências**: 3 → 1 biblioteca
- **Melhoria de 90% na performance**: 2-30s → 0.1-3s
- **Redução de 70% na complexidade**: Eliminação da fila assíncrona
- **Redução de 63% nos pontos de falha**: 8 → 3 cenários
- **Manutenção simplificada**: Conhecimento de apenas Sharp
- **Mesma UX**: Usuário não percebe diferença funcional

### Negativas ⚠️

- **Latência inicial**: Primeira requisição pode demorar até 3s
- **Pico de CPU**: Geração concentrada no momento da requisição
- **Dependência de cache**: Performance depende de cache efetivo

### Riscos Mitigados 🛡️

- **DoS por timeout**: 30s → 3s máximo
- **Complexidade de debug**: Fluxo linear vs. assíncrono
- **Falhas de dependência**: 1 biblioteca vs. 3
- **Overhead operacional**: Sem fila para monitorar

## Alternativas Consideradas

### 1. Manter Status Quo
- **Prós**: Sem mudanças, funciona atualmente
- **Contras**: Mantém todos os problemas identificados
- **Veredicto**: ❌ Rejeitada - Não resolve problemas fundamentais

### 2. Serviço Externo (Cloudinary/ImageKit)
- **Prós**: Zero manutenção, performance excelente
- **Contras**: Custo recorrente (~$0.001/thumbnail), dependência externa
- **Veredicto**: 🔄 Considerar no futuro - Boa opção para escala

### 3. Microserviço Dedicado
- **Prós**: Escala independente, tecnologia otimizada
- **Contras**: Complexidade operacional, overhead de rede
- **Veredicto**: 🔄 Considerar no futuro - Para alta escala

### 4. Lazy Generation (Escolhida)
- **Prós**: Simplicidade, performance, manutenção
- **Contras**: Latência inicial mínima
- **Veredicto**: ✅ Aprovada - Melhor custo-benefício

## Implementação

### Estratégia de Deploy
- **Implementação definitiva** em nova branch
- **Testes abrangentes** antes do merge
- **Code review detalhado** com toda a equipe
- **Deploy direto** com monitoramento intensivo

### Timeline
- **Semana 1**: Preparação, correções críticas e implementação core
- **Semana 2**: Testes abrangentes, code review e deploy definitivo

Ver **Plano de Ação** detalhado no arquivo anexo.

## Métricas de Sucesso

### Técnicas
- [ ] Redução de 60%+ nas linhas de código
- [ ] Tempo de resposta < 3s (99% dos casos)
- [ ] Cache hit rate > 90%
- [ ] Zero timeouts > 5s

### Operacionais
- [ ] Redução de 50%+ no tempo de debug
- [ ] Eliminação de alertas de timeout
- [ ] Redução de 70%+ nos logs de erro

### Negócio
- [ ] Manutenção da funcionalidade atual
- [ ] Melhoria na experiência do usuário
- [ ] Redução no custo operacional

## Referências

- [Auditoria Completa do Sistema de Thumbnail](../implementacao/thumbnail-audit-2024.md)
- [Benchmark de Performance](../implementacao/thumbnail-performance-analysis.md)
- [Análise de Segurança](../implementacao/thumbnail-security-review.md)

---

**Autor**: Arquiteto de Software  
**Revisores**: Equipe de Desenvolvimento, DevOps  
**Próxima Revisão**: 2025-01-19 (1 mês após implementação)