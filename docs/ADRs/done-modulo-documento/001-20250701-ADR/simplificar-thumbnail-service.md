# Plano de Refatoração Simples - PDF e Imagens

## 🎯 Contexto e Decisões

### Por que esta abordagem?
- **Foco no problema real**: PDFs não estão gerando thumbnails reais
- **MVP funcional**: Resolver 80% dos casos com 20% do esforço
- **Manutenibilidade**: Código simples é mais fácil de debugar e manter
- **Performance**: Otimizações diretas sem abstrações desnecessárias

### Escopo Reduzido
- ✅ **PDFs**: Problema crítico atual  
- ✅ **Imagens**: Otimizar processamento existente
- ❌ **Office**: Pode ser adicionado depois como feature separada
- ❌ **Redis**: Memory queue é suficiente para maioria dos casos
- ❌ **Métricas complexas**: Logs simples resolvem

---

## 📋 Fases do Plano (3 semanas)

## 🔥 Fase 1: Corrigir PDF Thumbnails (1 semana)
*Problema atual: PDFs gerando thumbnails genéricos*

### 1.1 Diagnosticar Problema Atual (1 dia)
```typescript
// ✅ Adicionar logs detalhados para entender onde falha
private async generatePdfThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
  this.logger.debug(`PDF Buffer size: ${pdfBuffer.length} bytes`);
  
  try {
    const pdf = require('pdf-thumbnail');
    // Log cada tentativa de configuração
  } catch (error) {
    this.logger.error(`PDF generation failed: ${error.message}`, {
      bufferSize: pdfBuffer.length,
      configTried: 'current',
      errorStack: error.stack
    });
  }
}
```

### 1.2 Implementar pdf2pic (3 dias)
**Decisão**: pdf2pic é mais confiável que pdf-thumbnail baseado na pesquisa

```typescript
// ✅ Substituir implementação atual
private async generatePdfThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
  // Validação básica
  if (!pdfBuffer?.length || !pdfBuffer.slice(0, 4).toString().startsWith('%PDF')) {
    return this.getDefaultThumbnail('pdf');
  }

  try {
    const { fromBuffer } = require('pdf2pic');
    const options = {
      density: 150,
      format: "jpeg",
      width: 200,
      height: 200,
      quality: 80
    };

    const convert = fromBuffer(pdfBuffer, options);
    const result = await convert(1, { responseType: "buffer" });
    
    return result.buffer;
  } catch (error) {
    this.logger.warn(`PDF thumbnail failed, using default: ${error.message}`);
    return this.getDefaultThumbnail('pdf');
  }
}
```

### 1.3 Verificar Dependências na Inicialização (1 dia)
```typescript
// ✅ Verificar se pdf2pic está disponível
async onModuleInit() {
  try {
    require('pdf2pic');
    this.logger.info('pdf2pic dependency OK');
  } catch (error) {
    this.logger.error('pdf2pic not installed: npm install pdf2pic');
  }
}
```

### 1.4 Scripts de Instalação (1 dia)
```bash
#!/bin/bash
# setup-thumbnails.sh
echo "Installing thumbnail dependencies..."

# System dependencies
apt-get update
apt-get install -y graphicsmagick ghostscript

# Node dependencies  
npm install pdf2pic sharp

echo "Setup complete!"
```

---

## 🖼️ Fase 2: Otimizar Imagens (1 semana)

### 2.1 Melhorar Configurações Sharp (2 dias)
**Decisão**: Sharp atual pode estar usando configurações subótimas

```typescript
// ✅ Configurações otimizadas por tipo de imagem
private async generateImageThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = require('sharp');
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    this.logger.debug(`Processing image: ${metadata.format}, ${metadata.width}x${metadata.height}`);

    // Configuração otimizada
    return await image
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true,
        mozjpeg: true  // Melhor compressão
      })
      .toBuffer();
      
  } catch (error) {
    this.logger.warn(`Image thumbnail failed: ${error.message}`);
    return this.getDefaultThumbnail('image');
  }
}
```

### 2.2 Timeout e Validações (2 dias)
```typescript
// ✅ Adicionar timeout para evitar travamentos
private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ✅ Usar em todas as operações
const result = await this.withTimeout(
  this.generatePdfThumbnail(buffer),
  30000 // 30 segundos
);
```

### 2.3 Validação de Input (1 dia)
```typescript
// ✅ Validar antes de processar
private validateInput(buffer: Buffer, mimeType: string): void {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer vazio');
  }
  
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (buffer.length > maxSize) {
    throw new Error(`Arquivo muito grande: ${buffer.length} bytes`);
  }
  
  const supportedTypes = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ];
  
  if (!supportedTypes.includes(mimeType)) {
    throw new Error(`Tipo não suportado: ${mimeType}`);
  }
}
```

---

## ⚙️ Fase 3: Configurações e Estabilidade (1 semana)

### 3.1 Externalizar Configurações Básicas (2 dias)
**Decisão**: Apenas configurações realmente necessárias

```typescript
// ✅ Configurações simples via environment
interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  timeout: number;
  maxFileSize: number;
}

@Injectable()
export class ThumbnailConfigService {
  getConfig(): ThumbnailConfig {
    return {
      width: +this.configService.get('THUMBNAIL_WIDTH', 200),
      height: +this.configService.get('THUMBNAIL_HEIGHT', 200),
      quality: +this.configService.get('THUMBNAIL_QUALITY', 80),
      timeout: +this.configService.get('THUMBNAIL_TIMEOUT', 30000),
      maxFileSize: +this.configService.get('THUMBNAIL_MAX_SIZE', 50 * 1024 * 1024)
    };
  }
}
```

### 3.2 Melhorar Logs para Debug (2 dias)
```typescript
// ✅ Logs estruturados para debug fácil
async generateThumbnail(buffer: Buffer, mimeType: string, documentoId: string) {
  const startTime = Date.now();
  
  this.logger.info('Starting thumbnail generation', {
    documentoId,
    mimeType,
    bufferSize: buffer.length
  });

  try {
    // ... processamento
    
    const duration = Date.now() - startTime;
    this.logger.info('Thumbnail generated successfully', {
      documentoId,
      duration,
      thumbnailSize: result.thumbnailBuffer.length
    });
    
  } catch (error) {
    this.logger.error('Thumbnail generation failed', {
      documentoId,
      mimeType,
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}
```

### 3.3 Health Check Simples (1 dia)
```typescript
// ✅ Endpoint simples para verificar saúde
@Controller('thumbnails')
export class ThumbnailController {
  
  @Get('health')
  async health(): Promise<any> {
    const deps = await this.checkDependencies();
    const queue = this.queueService.getQueueStatus();
    
    return {
      status: deps.allOk ? 'healthy' : 'degraded',
      dependencies: deps,
      queue: {
        size: queue.queueSize,
        processing: queue.processing
      },
      timestamp: new Date().toISOString()
    };
  }
}
```

### 3.4 Dockerfile Atualizado (1 dia)
```dockerfile
# ✅ Incluir dependências do sistema
FROM node:18-alpine

# Instalar dependências para thumbnails
RUN apk add --no-cache \
    graphicsmagick \
    ghostscript \
    libreoffice

COPY package*.json ./
RUN npm ci --only=production

COPY . .
CMD ["npm", "start"]
```

---

## 🗂️ Estrutura Final (Simples)

```
src/modules/thumbnail/
├── services/
│   ├── thumbnail.service.ts           # Refatorado com pdf2pic
│   ├── thumbnail-queue.service.ts     # Melhorias mínimas  
│   └── thumbnail-config.service.ts    # Novo (simples)
├── controllers/
│   └── thumbnail.controller.ts        # Health check
├── interfaces/
│   └── thumbnail.interface.ts         # Mantido
└── thumbnail.module.ts                # Atualizado
```

---

## ✅ Critérios de Sucesso

### Funcional
- [ ] PDFs geram thumbnails reais (não genéricos)
- [ ] Imagens processadas com boa qualidade  
- [ ] Timeouts previnem travamentos
- [ ] Logs permitem debug fácil

### Performance
- [ ] < 30s para gerar thumbnail
- [ ] Sem vazamentos de memória
- [ ] Graceful handling de erros

### Manutenção
- [ ] Configurações via ENV
- [ ] Dependencies verificadas na inicialização
- [ ] Health check funcional

---

## 🚀 Deploy Incremental

### Semana 1: PDF Fix
```bash
# Deploy apenas correção PDF
git checkout feature/pdf-fix
docker-compose up -d
# Testar com PDFs reais
```

### Semana 2: Image Optimization  
```bash
# Deploy otimizações de imagem
git checkout feature/image-optimization
docker-compose up -d
# Comparar qualidade antes/depois
```

### Semana 3: Config & Stability
```bash
# Deploy configurações e estabilidade
git checkout feature/config-stability
docker-compose up -d
# Monitorar logs e health check
```

---

## 💡 Por que Esta Abordagem?

### ✅ Vantagens
- **Foco no problema real**: Resolve PDFs genéricos rapidamente
- **Baixo risco**: Mudanças incrementais e testáveis
- **Manutenível**: Código simples, fácil de entender
- **Extensível**: Base sólida para adicionar Office docs depois

### ⚠️ Trade-offs Aceitos
- **Sem Redis**: Memory queue ok para volumes atuais
- **Sem métricas complexas**: Logs simples são suficientes  
- **Sem abstrações**: YAGNI - implementar quando necessário

### 🔮 Próximos Passos (Futuro)
- Office docs (quando necessário)
- Redis queue (se volume aumentar)
- Métricas avançadas (se precisar de analytics)

Esta abordagem resolve 80% dos problemas com 20% da complexidade, mantendo o sistema simples, funcional e performático.