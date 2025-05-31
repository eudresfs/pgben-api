# Configuração SSE (Server-Sent Events)

## Visão Geral

Este documento descreve as configurações necessárias para o funcionamento adequado do sistema SSE no PGBEN.

## Configurações do Servidor

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Configurações SSE
SSE_HEARTBEAT_INTERVAL=30000          # Intervalo de heartbeat em ms (30 segundos)
SSE_CONNECTION_TIMEOUT=300000         # Timeout de conexão em ms (5 minutos)
SSE_MAX_CONNECTIONS_PER_USER=5       # Máximo de conexões por usuário
SSE_CLEANUP_INTERVAL=60000            # Intervalo de limpeza em ms (1 minuto)
SSE_ENABLE_COMPRESSION=true           # Habilitar compressão gzip
SSE_CORS_ORIGINS=http://localhost:3000,https://pgben.semtas.gov.br
```

### 2. Configuração do NestJS

Crie um arquivo de configuração específico para SSE:

```typescript
// src/config/sse.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('sse', () => ({
  heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL) || 30000,
  connectionTimeout: parseInt(process.env.SSE_CONNECTION_TIMEOUT) || 300000,
  maxConnectionsPerUser: parseInt(process.env.SSE_MAX_CONNECTIONS_PER_USER) || 5,
  cleanupInterval: parseInt(process.env.SSE_CLEANUP_INTERVAL) || 60000,
  enableCompression: process.env.SSE_ENABLE_COMPRESSION === 'true',
  corsOrigins: process.env.SSE_CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
}));
```

### 3. Configuração CORS

Atualize a configuração CORS no `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuração CORS para SSE
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://pgben.semtas.gov.br',
      // Adicione outros domínios conforme necessário
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Last-Event-ID'
    ],
  });
  
  await app.listen(3000);
}
bootstrap();
```

## Configurações por Ambiente

### Desenvolvimento

```env
# .env.development
SSE_HEARTBEAT_INTERVAL=10000
SSE_CONNECTION_TIMEOUT=600000
SSE_MAX_CONNECTIONS_PER_USER=10
SSE_CLEANUP_INTERVAL=30000
SSE_ENABLE_COMPRESSION=false
SSE_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Homologação

```env
# .env.staging
SSE_HEARTBEAT_INTERVAL=20000
SSE_CONNECTION_TIMEOUT=300000
SSE_MAX_CONNECTIONS_PER_USER=5
SSE_CLEANUP_INTERVAL=45000
SSE_ENABLE_COMPRESSION=true
SSE_CORS_ORIGINS=https://pgben-staging.semtas.gov.br
```

### Produção

```env
# .env.production
SSE_HEARTBEAT_INTERVAL=30000
SSE_CONNECTION_TIMEOUT=300000
SSE_MAX_CONNECTIONS_PER_USER=3
SSE_CLEANUP_INTERVAL=60000
SSE_ENABLE_COMPRESSION=true
SSE_CORS_ORIGINS=https://pgben.semtas.gov.br
```

## Configuração de Proxy/Load Balancer

### Nginx

```nginx
# /etc/nginx/sites-available/pgben
server {
    listen 80;
    server_name pgben.semtas.gov.br;
    
    # Configuração específica para SSE
    location /api/v1/notificacao/sse {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Configurações específicas para SSE
        proxy_cache off;
        proxy_buffering off;
        proxy_read_timeout 24h;
        proxy_send_timeout 24h;
        
        # Headers para SSE
        add_header Cache-Control 'no-cache';
        add_header X-Accel-Buffering 'no';
    }
    
    # Outras rotas da API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Upstream para o backend
upstream backend {
    # Para SSE, use ip_hash para sticky sessions
    ip_hash;
    server 127.0.0.1:3000;
    # server 127.0.0.1:3001; # Adicione mais servidores se necessário
}
```

### Apache

```apache
# /etc/apache2/sites-available/pgben.conf
<VirtualHost *:80>
    ServerName pgben.semtas.gov.br
    
    # Habilitar módulos necessários
    LoadModule proxy_module modules/mod_proxy.so
    LoadModule proxy_http_module modules/mod_proxy_http.so
    LoadModule headers_module modules/mod_headers.so
    
    # Configuração para SSE
    ProxyPreserveHost On
    ProxyRequests Off
    
    # SSE específico
    <Location "/api/v1/notificacao/sse">
        ProxyPass "http://127.0.0.1:3000/api/v1/notificacao/sse"
        ProxyPassReverse "http://127.0.0.1:3000/api/v1/notificacao/sse"
        
        # Headers para SSE
        Header always set Cache-Control "no-cache"
        Header always set X-Accel-Buffering "no"
        
        # Timeout longo para SSE
        ProxyTimeout 86400
    </Location>
    
    # Outras rotas da API
    <Location "/api/">
        ProxyPass "http://127.0.0.1:3000/api/"
        ProxyPassReverse "http://127.0.0.1:3000/api/"
    </Location>
</VirtualHost>
```

## Configuração de Monitoramento

### Métricas Prometheus

```typescript
// src/modules/notificacao/services/sse-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class SseMetricsService {
  private readonly activeConnections = new Gauge({
    name: 'sse_active_connections',
    help: 'Number of active SSE connections',
    labelNames: ['user_id'],
  });

  private readonly totalConnections = new Counter({
    name: 'sse_total_connections',
    help: 'Total number of SSE connections established',
  });

  private readonly connectionDuration = new Histogram({
    name: 'sse_connection_duration_seconds',
    help: 'Duration of SSE connections in seconds',
    buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  });

  private readonly messagesSent = new Counter({
    name: 'sse_messages_sent_total',
    help: 'Total number of SSE messages sent',
    labelNames: ['type'],
  });

  incrementActiveConnections(userId: string) {
    this.activeConnections.inc({ user_id: userId });
    this.totalConnections.inc();
  }

  decrementActiveConnections(userId: string) {
    this.activeConnections.dec({ user_id: userId });
  }

  recordConnectionDuration(duration: number) {
    this.connectionDuration.observe(duration);
  }

  incrementMessagesSent(type: string) {
    this.messagesSent.inc({ type });
  }
}
```

### Health Check

```typescript
// src/modules/notificacao/controllers/sse-health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { SseService } from '../services/sse.service';

@Controller('health/sse')
export class SseHealthController {
  constructor(private readonly sseService: SseService) {}

  @Get()
  async checkHealth() {
    const stats = this.sseService.getConnectionStats();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      connections: {
        total: stats.totalConnections,
        active: stats.activeConnections,
        byUser: stats.connectionsByUser,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

## Configuração de Segurança

### Rate Limiting

```typescript
// src/modules/notificacao/guards/sse-rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class SseRateLimitGuard implements CanActivate {
  private readonly connectionAttempts = new Map<string, number[]>();
  private readonly maxAttemptsPerMinute = 10;

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = request.ip || request.connection.remoteAddress;
    
    if (!clientIp) {
      return false;
    }

    const now = Date.now();
    const attempts = this.connectionAttempts.get(clientIp) || [];
    
    // Remove tentativas antigas (mais de 1 minuto)
    const recentAttempts = attempts.filter(time => now - time < 60000);
    
    if (recentAttempts.length >= this.maxAttemptsPerMinute) {
      return false;
    }
    
    recentAttempts.push(now);
    this.connectionAttempts.set(clientIp, recentAttempts);
    
    return true;
  }
}
```

### Validação de Token

```typescript
// src/modules/notificacao/guards/sse-token-validation.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class SseTokenValidationGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      const token = this.extractToken(request);
      
      if (!token) {
        return false;
      }

      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private extractToken(request: Request): string | null {
    // Tentar extrair do query parameter
    if (request.query.token) {
      return request.query.token as string;
    }
    
    // Tentar extrair do header Authorization
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Tentar extrair do cookie
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }
    
    return null;
  }
}
```

## Configuração de Logs

### Winston Logger

```typescript
// src/config/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp} [${context}] ${level}: ${message}`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/sse.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      level: 'info',
    }),
    new winston.transports.File({
      filename: 'logs/sse-error.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      level: 'error',
    }),
  ],
});
```

## Troubleshooting

### Problemas Comuns

1. **Conexões não estabelecidas**
   - Verificar configuração CORS
   - Validar token JWT
   - Confirmar configuração de proxy

2. **Desconexões frequentes**
   - Ajustar timeout de conexão
   - Verificar configuração de heartbeat
   - Analisar logs de erro

3. **Performance degradada**
   - Monitorar número de conexões ativas
   - Ajustar intervalo de limpeza
   - Verificar uso de memória

### Scripts de Diagnóstico

```bash
#!/bin/bash
# scripts/sse-diagnostics.sh

echo "=== Diagnóstico SSE PGBEN ==="
echo

# Verificar conexões ativas
echo "Conexões SSE ativas:"
curl -s "http://localhost:3000/api/v1/notificacao/sse/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq .

echo

# Verificar health check
echo "Health check SSE:"
curl -s "http://localhost:3000/health/sse" | jq .

echo

# Verificar logs recentes
echo "Logs SSE recentes:"
tail -n 20 logs/sse.log

echo
echo "=== Fim do diagnóstico ==="
```

## Backup e Recuperação

### Estratégia de Backup

- **Configurações**: Backup automático dos arquivos de configuração
- **Logs**: Rotação e arquivamento de logs
- **Métricas**: Backup das métricas de monitoramento

### Procedimento de Recuperação

1. Restaurar configurações
2. Verificar conectividade
3. Validar funcionamento
4. Monitorar métricas

## Considerações de Produção

1. **Escalabilidade**: Use sticky sessions em load balancers
2. **Monitoramento**: Implemente alertas para métricas críticas
3. **Segurança**: Mantenha tokens seguros e implemente rate limiting
4. **Performance**: Monitore uso de recursos e otimize conforme necessário