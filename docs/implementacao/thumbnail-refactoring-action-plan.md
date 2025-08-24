# Plano de Ação: Refatoração do Sistema de Thumbnail

## Visão Geral

Este documento detalha o plano de implementação para refatorar o sistema de thumbnail conforme definido no [ADR-007](../ADRs/ADR-007-thumbnail-system-refactoring.md).

**Objetivo**: Simplificar de estratégia híbrida para Lazy Generation com cache agressivo

**Timeline**: 2 semanas (10 dias úteis)

**Impacto Esperado**: Redução de 67% no código, 90% melhoria na performance

---

## Fase 1: Preparação e Análise (Semana 1)

### 1.1 Setup do Ambiente

#### ✅ Checklist - Preparação
- [ ] **Criar branch feature**: `feature/thumbnail-refactoring`
- [ ] **Backup do código atual**: Commit com tag `thumbnail-v1-backup`
- [ ] **Documentar APIs atuais**: Endpoints e contratos
- [ ] **Executar testes existentes**: Garantir baseline funcional
- [ ] **Análise de dependências**: Verificar uso atual de Sharp, pdf2pic, pdf-thumbnail

```bash
# Comandos para preparação
git checkout -b feature/thumbnail
git tag thumbnail-v1-backup
npm test -- src/modules/documento
```

### 1.2 Ações Imediatas (Dia 1-2)

#### ✅ Checklist - Correções Críticas
- [ ] **Reduzir timeouts**
  - [ ] PDF: 30s → 5s em `thumbnail.config.ts`
  - [ ] Imagem: 15s → 3s em `thumbnail.config.ts`
  - [ ] Testar com documentos reais

- [ ] **Implementar rate limiting**
  - [ ] 10 thumbnails/minuto por usuário
  - [ ] Usar `@nestjs/throttler`
  - [ ] Aplicar no controller

- [ ] **Aumentar cache HTTP**
  - [ ] 1 hora → 7 dias no header `Cache-Control`
  - [ ] Adicionar `ETag` para validação
  - [ ] Testar com navegador

#### 📝 Código - Rate Limiting
```typescript
// src/modules/documento/controllers/documento.controller.ts
@Throttle(10, 60) // 10 requests per minute
@Get(':id/thumbnail')
async getThumbnail(...) {
  // Implementação existente
  res.set({
    'Cache-Control': 'public, max-age=604800', // 7 dias
    'ETag': `"${id}-${documento.updated_at}"`,
  });
}
```

### 1.3 Análise de Impacto (Dia 3-5)

#### ✅ Checklist - Mapeamento
- [ ] **Identificar todos os pontos de uso**
  - [ ] Controllers que chamam thumbnail services
  - [ ] Frontend que consome endpoints
  - [ ] Jobs/crons que processam thumbnails

- [ ] **Mapear dependências**
  - [ ] Serviços que dependem de `ThumbnailQueueService`
  - [ ] Configurações específicas por ambiente
  - [ ] Monitoramento e alertas existentes

- [ ] **Definir estratégia de migração**
  - [ ] Manter compatibilidade durante transição
  - [ ] Testes de regressão

---

## Fase 2: Implementação Core (Semana 2)

### 2.1 Criação do ThumbnailFacadeService (Dia 6-8)

#### ✅ Checklist - Nova Arquitetura
- [ ] **Criar ThumbnailFacadeService**
  - [ ] Interface limpa e simples
  - [ ] Geração lazy com cache
  - [ ] Timeout configurável (3s padrão)
  - [ ] Fallback para placeholder

- [ ] **Implementar cache em disco**
  - [ ] Usar StorageProvider existente
  - [ ] Estrutura: `thumbnails/{documentoId}.jpg`
  - [ ] TTL de 7 dias
  - [ ] Limpeza automática

#### 📝 Código - ThumbnailFacadeService
```typescript
// src/modules/documento/services/thumbnail/thumbnail-facade.service.ts
@Injectable()
export class ThumbnailFacadeService {
  constructor(
    private readonly storageProvider: StorageProviderFactory,
    private readonly logger: LoggingService,
  ) {}

  async getThumbnail(
    documentoId: string,
    documento: Documento,
  ): Promise<ThumbnailResult> {
    // 1. Verificar cache
    const cached = await this.getCachedThumbnail(documentoId);
    if (cached) return cached;

    // 2. Gerar novo thumbnail
    const generated = await this.generateThumbnail(documento);
    
    // 3. Salvar no cache
    await this.cacheThumbnail(documentoId, generated);
    
    return generated;
  }

  private async generateThumbnail(documento: Documento): Promise<Buffer> {
    const timeout = 3000; // 3 segundos
    
    try {
      return await Promise.race([
        this.processDocument(documento),
        this.timeoutPromise(timeout),
      ]);
    } catch (error) {
      this.logger.warn(`Thumbnail generation failed: ${error.message}`);
      return this.getPlaceholderThumbnail(documento.mimetype);
    }
  }
}
```

### 2.2 Simplificação do Controller (Dia 9-10)

#### ✅ Checklist - Controller Refactoring
- [ ] **Remover lógica de negócio**
  - [ ] Mover para ThumbnailFacadeService
  - [ ] Controller apenas orquestra
  - [ ] Validações no service

- [ ] **Simplificar endpoints**
  - [ ] Manter apenas `GET /:id/thumbnail`
  - [ ] Remover endpoints de fila
  - [ ] Deprecar regeneração manual

- [ ] **Otimizar headers HTTP**
  - [ ] Cache agressivo
  - [ ] Compression
  - [ ] Content-Type correto

#### 📝 Código - Controller Simplificado
```typescript
// src/modules/documento/controllers/documento.controller.ts
@Get(':id/thumbnail')
@Throttle(10, 60)
async getThumbnail(
  @Param('id', ParseUUIDPipe) id: string,
  @Query('size') size: 'small' | 'medium' | 'large' = 'medium',
  @Res() res: Response,
  @GetUser() usuario: Usuario,
) {
  // Verificar acesso
  const documento = await this.documentoService.findById(id);
  
  // Gerar/obter thumbnail
  const result = await this.thumbnailFacade.getThumbnail(id, documento, size);
  
  // Headers otimizados
  res.set({
    'Content-Type': 'image/jpeg',
    'Content-Length': result.buffer.length.toString(),
    'Cache-Control': 'public, max-age=604800, immutable',
    'ETag': `"${id}-${documento.updated_at}"`,
  });
  
  res.send(result.buffer);
}
```

### 2.3 Otimização de Dependências (Dia 11)

#### ✅ Checklist - Dependências
- [ ] **Avaliar Sharp vs. alternativas**
  - [ ] Benchmark de performance
  - [ ] Tamanho do bundle
  - [ ] Compatibilidade

- [ ] **Remover dependências desnecessárias**
  - [ ] pdf2pic (manter apenas para PDFs críticos)
  - [ ] pdf-thumbnail (remover)
  - [ ] Dependências transitivas

- [ ] **Configurar Sharp otimizado**
  - [ ] WebP com qualidade 85
  - [ ] Progressive JPEG
  - [ ] Resize inteligente

---

## Fase 3: Testes e Validação (Semana 2)

### 3.1 Testes Abrangentes (Dia 8-9)

#### ✅ Checklist - Testes
- [ ] **Testes unitários**
  - [ ] ThumbnailFacadeService
  - [ ] Cache behavior
  - [ ] Error handling
  - [ ] Timeout scenarios

- [ ] **Testes de integração**
  - [ ] Endpoints completos
  - [ ] Performance benchmarks
  - [ ] Stress testing
  - [ ] Memory leaks

- [ ] **Testes de regressão**
  - [ ] Funcionalidade existente
  - [ ] Compatibilidade de APIs
  - [ ] Edge cases

#### 📝 Código - Testes
```typescript
// src/modules/documento/services/thumbnail/thumbnail-facade.service.spec.ts
describe('ThumbnailFacadeService', () => {
  it('should generate thumbnail within timeout', async () => {
    const start = Date.now();
    const result = await service.getThumbnail(mockDocumentoId, mockDocumento);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
    expect(result.buffer).toBeDefined();
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('should return cached thumbnail on second call', async () => {
    // First call
    await service.getThumbnail(mockDocumentoId, mockDocumento);
    
    // Second call should be faster (cached)
    const start = Date.now();
    await service.getThumbnail(mockDocumentoId, mockDocumento);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Cache hit
  });
});
```

### 3.2 Limpeza e Documentação (Dia 10)

#### ✅ Checklist - Finalização
- [ ] **Remover código legado**
  - [ ] ThumbnailQueueService (após migração)
  - [ ] Endpoints deprecados
  - [ ] Configurações antigas
  - [ ] Testes obsoletos

- [ ] **Atualizar documentação**
  - [ ] README do módulo
  - [ ] Swagger/OpenAPI
  - [ ] Guias de troubleshooting
  - [ ] Changelog

- [ ] **Configurar monitoramento**
  - [ ] Métricas de performance
  - [ ] Alertas de timeout
  - [ ] Dashboard de cache hit rate

---

## Validação e Rollout

### Critérios de Aceitação

#### ✅ Performance
- [ ] 99% das requisições < 3s
- [ ] Cache hit rate > 90%
- [ ] Zero timeouts > 5s
- [ ] Redução de 60%+ no código

#### ✅ Funcionalidade
- [ ] Todos os tipos de documento suportados
- [ ] Qualidade visual mantida
- [ ] APIs compatíveis
- [ ] Error handling robusto

#### ✅ Operacional
- [ ] Logs estruturados
- [ ] Monitoramento ativo
- [ ] Alertas configurados
- [ ] Documentação atualizada

## Monitoramento Pós-Implementação

### Métricas Chave

#### 📊 Performance
- **Tempo de resposta**: P50, P95, P99
- **Cache hit rate**: % de thumbnails servidos do cache
- **Error rate**: % de falhas na geração
- **Throughput**: Thumbnails/segundo

#### 📊 Recursos
- **CPU usage**: Durante geração de thumbnails
- **Memory usage**: Picos e vazamentos
- **Disk usage**: Crescimento do cache
- **Network**: Bandwidth para thumbnails

#### 📊 Negócio
- **User experience**: Tempo de carregamento percebido
- **Support tickets**: Redução em problemas de thumbnail
- **Development velocity**: Tempo para implementar features

### Alertas Configurados

```yaml
# prometheus/alerts/thumbnail.yml
groups:
  - name: thumbnail.rules
    rules:
      - alert: ThumbnailHighLatency
        expr: histogram_quantile(0.95, thumbnail_generation_duration_seconds) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Thumbnail generation is slow"
          
      - alert: ThumbnailLowCacheHitRate
        expr: thumbnail_cache_hit_rate < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Thumbnail cache hit rate is low"
```

---

## Conclusão

Este plano de ação fornece um roadmap detalhado para refatorar o sistema de thumbnail, reduzindo complexidade enquanto mantém funcionalidade. O sucesso será medido pela redução significativa no código, melhoria na performance e simplificação da manutenção.

**Próximos Passos**:
1. Aprovação do ADR-007
2. Alocação de recursos (1 desenvolvedor senior)
3. Início da Fase 1 (Preparação)

**Contato**: Arquiteto de Software  
**Última Atualização**: 2024-12-19