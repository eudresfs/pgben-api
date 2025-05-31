# 🔄 Integração SSE em Módulo de Notificações Existente

> Guia para adicionar **Server-Sent Events (SSE)** a um módulo de notificações já implementado em NestJS, mantendo a arquitetura existente e seguindo padrões enterprise.

---

## 🛠️ Implementação

### 1. Interfaces e DTOs

```typescript
// interfaces/sse-notification.interface.ts
export interface SseNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface SseConnection {
  userId: string;
  connectionId: string;
  lastHeartbeat: Date;
}
```

### 2. SSE Service (Novo)

```typescript
// services/sse.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { SseNotification, SseConnection } from '../interfaces';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly connections = new Map<string, Map<string, Subject<MessageEvent>>>();
  private readonly heartbeatInterval = 30000; // 30s

  /**
   * Cria uma nova conexão SSE para o usuário
   */
  createConnection(userId: string): Observable<MessageEvent> {
    const connectionId = this.generateConnectionId();
    const subject = new Subject<MessageEvent>();
    
    // Inicializa mapa do usuário se não existir
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }
    
    this.connections.get(userId)!.set(connectionId, subject);
    this.logger.log(`Nova conexão SSE: ${userId}:${connectionId}`);

    // Configura heartbeat
    const heartbeat$ = interval(this.heartbeatInterval).pipe(
      map(() => ({ 
        data: JSON.stringify({ type: 'heartbeat', timestamp: new Date() }) 
      } as MessageEvent))
    );

    // Combina notificações com heartbeat
    return new Observable<MessageEvent>(observer => {
      const subscription = subject.asObservable().subscribe(observer);
      const heartbeatSub = heartbeat$.subscribe(observer);

      // Cleanup na desconexão
      return () => {
        subscription.unsubscribe();
        heartbeatSub.unsubscribe();
        this.removeConnection(userId, connectionId);
      };
    });
  }

  /**
   * Envia notificação para usuário específico
   */
  sendToUser(userId: string, notification: SseNotification): void {
    const userConnections = this.connections.get(userId);
    
    if (!userConnections || userConnections.size === 0) {
      this.logger.warn(`Usuário ${userId} não tem conexões ativas`);
      return;
    }

    const messageEvent: MessageEvent = {
      data: JSON.stringify({
        ...notification,
        timestamp: notification.timestamp.toISOString()
      })
    } as MessageEvent;

    // Envia para todas as conexões do usuário
    userConnections.forEach((subject, connectionId) => {
      try {
        subject.next(messageEvent);
        this.logger.debug(`Notificação enviada: ${userId}:${connectionId}`);
      } catch (error) {
        this.logger.error(`Erro ao enviar notificação: ${error.message}`);
        this.removeConnection(userId, connectionId);
      }
    });
  }

  /**
   * Envia notificação para múltiplos usuários
   */
  sendToUsers(userIds: string[], notification: Omit<SseNotification, 'userId'>): void {
    userIds.forEach(userId => {
      this.sendToUser(userId, { ...notification, userId });
    });
  }

  /**
   * Retorna estatísticas das conexões
   */
  getConnectionStats(): { totalUsers: number; totalConnections: number } {
    let totalConnections = 0;
    this.connections.forEach(userConns => {
      totalConnections += userConns.size;
    });

    return {
      totalUsers: this.connections.size,
      totalConnections
    };
  }

  private generateConnectionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private removeConnection(userId: string, connectionId: string): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      
      // Remove mapa do usuário se não houver mais conexões
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
      
      this.logger.log(`Conexão removida: ${userId}:${connectionId}`);
    }
  }
}
```

### 3. SSE Guard (Novo)

```typescript
// guards/sse.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class SseGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.query.token as string;

    if (!token) {
      throw new UnauthorizedException('Token de acesso obrigatório');
    }

    try {
      const payload = this.jwtService.verify(token);
      request['user'] = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
```

### 4. Expandir NotificationsService (Existente)

```typescript
// notifications.service.ts (adicionar métodos)
import { Injectable } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseNotification } from '../interfaces';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly sseService: SseService,
    // ...outros serviços existentes
  ) {}

  /**
   * Criar notificação e enviar via SSE
   */
  async createAndBroadcast(
    userId: string, 
    notificationData: CreateNotificationDto
  ): Promise<void> {
    // Lógica existente de criação da notificação
    const notification = await this.create(userId, notificationData);
    
    // Nova funcionalidade: broadcast via SSE
    const sseNotification: SseNotification = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.createdAt,
      priority: notification.priority
    };

    this.sseService.sendToUser(userId, sseNotification);
  }

  /**
   * Enviar notificação em massa via SSE
   */
  async broadcastToUsers(
    userIds: string[], 
    notificationData: CreateNotificationDto
  ): Promise<void> {
    // Criar notificações no banco (lógica existente)
    const notifications = await Promise.all(
      userIds.map(userId => this.create(userId, notificationData))
    );

    // Broadcast via SSE
    const sseNotification = {
      id: notifications[0].id, // ou gerar um ID único para broadcast
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data,
      timestamp: new Date(),
      priority: notificationData.priority
    };

    this.sseService.sendToUsers(userIds, sseNotification);
  }
}
```

### 5. Expandir NotificationsController (Existente)

```typescript
// notifications.controller.ts (adicionar endpoint)
import { Controller, Get, Sse, UseGuards, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from '../services/sse.service';
import { SseGuard } from '../guards/sse.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly sseService: SseService,
    // ...outros serviços existentes
  ) {}

  // ...endpoints existentes

  /**
   * Endpoint SSE para receber notificações em tempo real
   */
  @Sse('stream')
  @UseGuards(SseGuard)
  streamNotifications(@Req() request: any): Observable<MessageEvent> {
    const userId = request.user.sub; // ou request.user.id
    return this.sseService.createConnection(userId);
  }

  /**
   * Endpoint para estatísticas das conexões SSE (admin)
   */
  @Get('sse/stats')
  @UseGuards(AdminGuard) // assumindo que existe
  getSseStats() {
    return this.sseService.getConnectionStats();
  }
}
```

### 6. Atualizar NotificationsModule

```typescript
// notifications.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './services/notifications.service';
import { SseService } from './services/sse.service';
import { NotificationsController } from './controllers/notifications.controller';
import { SseGuard } from './guards/sse.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' }
    }),
    // ...outros imports existentes
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    SseService, // novo
    SseGuard,   // novo
    // ...outros providers existentes
  ],
  exports: [
    NotificationsService,
    SseService // exportar para uso em outros módulos
  ]
})
export class NotificationsModule {}
```
---

## 🔧 Configurações Adicionais

### 1. Variáveis de Ambiente

```bash
# .env
SSE_HEARTBEAT_INTERVAL=30000
SSE_MAX_CONNECTIONS_PER_USER=5
JWT_SSE_EXPIRES_IN=7d
```

### 2. Configuração CORS

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
});
```

---

## 📊 Monitoramento e Logs

### Health Check Endpoint

```typescript
@Get('health/sse')
checkSseHealth() {
  const stats = this.sseService.getConnectionStats();
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: stats
  };
}
```

### Métricas com Prometheus (opcional)

```typescript
// Adicionar métricas de conexões ativas, notificações enviadas, etc.
```

---

## 🚀 Deploy e Escalabilidade

### Para múltiplas instâncias (Redis)

```typescript
// Implementar SseRedisService para distribuir notificações
// entre instâncias usando Redis Pub/Sub
```

### Load Balancer (Nginx)

```nginx
# Configurar sticky sessions para SSE
upstream backend {
    ip_hash;
    server localhost:3000;
    server localhost:3001;
}
```

---

## ✅ Checklist de Implementação

- [ ] SseService implementado
- [ ] SseGuard configurado
- [ ] NotificationsService expandido
- [ ] Endpoint SSE adicionado
- [ ] Provider de contexto implementado
- [ ] Tratamento de reconexão
- [ ] Logs e monitoramento
- [ ] Testes unitários
- [ ] Documentação da API


Esta implementação mantém a compatibilidade com seu módulo existente enquanto adiciona capacidades de tempo real de forma robusta e escalável.