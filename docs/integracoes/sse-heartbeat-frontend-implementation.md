# Implementação do Sistema de Heartbeat Adaptativo no Frontend

## Visão Geral

Este documento descreve como implementar o sistema de heartbeat adaptativo no frontend para trabalhar com o sistema SSE (Server-Sent Events) do SEMTAS. O sistema permite detectar conexões perdidas e implementar reconexão automática.

## Arquitetura do Sistema

### Componentes Principais

1. **SSE Client**: Gerencia a conexão SSE
2. **Heartbeat Manager**: Processa heartbeats e detecta falhas
3. **Reconnection Manager**: Implementa reconexão automática
4. **Event Handler**: Processa eventos recebidos

## Implementação

### 1. Cliente SSE com Heartbeat

```typescript
interface HeartbeatResponse {
  connectionId: string;
  timestamp: number;
  latency?: number;
}

interface SSEConfig {
  url: string;
  token: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatTimeout?: number;
}

class SSEHeartbeatClient {
  private eventSource: EventSource | null = null;
  private connectionId: string | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private lastHeartbeatTime = 0;
  
  constructor(private config: SSEConfig) {
    this.config.maxReconnectAttempts = config.maxReconnectAttempts || 5;
    this.config.reconnectDelay = config.reconnectDelay || 3000;
    this.config.heartbeatTimeout = config.heartbeatTimeout || 35000;
  }

  connect(): void {
    try {
      const url = new URL(this.config.url);
      url.searchParams.set('token', this.config.token);
      
      this.eventSource = new EventSource(url.toString());
      
      this.eventSource.onopen = this.handleOpen.bind(this);
      this.eventSource.onmessage = this.handleMessage.bind(this);
      this.eventSource.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('Erro ao conectar SSE:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(event: Event): void {
    console.log('Conexão SSE estabelecida');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.startHeartbeatMonitoring();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connection_established':
          this.connectionId = data.connectionId;
          console.log('Connection ID recebido:', this.connectionId);
          break;
          
        case 'heartbeat':
          this.handleHeartbeat(data);
          break;
          
        case 'notification':
          this.handleNotification(data);
          break;
          
        case 'recovery_complete':
        case 'recovery_error':
          this.handleRecovery(data);
          break;
          
        default:
          console.log('Evento SSE recebido:', data);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem SSE:', error);
    }
  }

  private handleHeartbeat(data: any): void {
    const now = Date.now();
    this.lastHeartbeatTime = now;
    
    // Responder ao heartbeat
    if (this.connectionId) {
      this.sendHeartbeatResponse({
        connectionId: this.connectionId,
        timestamp: now,
        latency: data.timestamp ? now - data.timestamp : undefined
      });
    }
    
    // Resetar timeout de heartbeat
    this.resetHeartbeatTimeout();
  }

  private async sendHeartbeatResponse(response: HeartbeatResponse): Promise<void> {
    try {
      await fetch(`/api/v1/notifications/sse/heartbeat/${this.connectionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: JSON.stringify(response)
      });
    } catch (error) {
      console.error('Erro ao enviar resposta de heartbeat:', error);
    }
  }

  private startHeartbeatMonitoring(): void {
    this.resetHeartbeatTimeout();
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }
    
    this.heartbeatTimeout = setTimeout(() => {
      console.warn('Heartbeat timeout - conexão pode estar perdida');
      this.handleConnectionLost();
    }, this.config.heartbeatTimeout!);
  }

  private handleConnectionLost(): void {
    console.log('Conexão perdida detectada');
    this.isConnected = false;
    this.disconnect();
    this.scheduleReconnect();
  }

  private handleError(event: Event): void {
    console.error('Erro na conexão SSE:', event);
    this.isConnected = false;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('Máximo de tentativas de reconexão atingido');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Tentativa de reconexão ${this.reconnectAttempts} em ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleNotification(data: any): void {
    // Implementar lógica específica para notificações
    console.log('Notificação recebida:', data);
    
    // Exemplo: disparar evento customizado
    window.dispatchEvent(new CustomEvent('sse-notification', {
      detail: data
    }));
  }

  private handleRecovery(data: any): void {
    if (data.type === 'recovery_complete') {
      console.log('Recuperação de eventos concluída');
    } else {
      console.error('Erro na recuperação de eventos:', data.error);
    }
  }

  disconnect(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.connectionId = null;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getConnectionId(): string | null {
    return this.connectionId;
  }
}
```

### 2. Integração com React/Vue

#### React Hook

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  url: string;
  token: string;
  enabled?: boolean;
}

export function useSSE({ url, token, enabled = true }: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const clientRef = useRef<SSEHeartbeatClient | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const client = new SSEHeartbeatClient({ url, token });
    clientRef.current = client;

    // Listener para eventos de notificação
    const handleNotification = (event: CustomEvent) => {
      setLastEvent(event.detail);
    };

    window.addEventListener('sse-notification', handleNotification);

    // Monitorar status da conexão
    const statusInterval = setInterval(() => {
      setIsConnected(client.getConnectionStatus());
      setConnectionId(client.getConnectionId());
    }, 1000);

    client.connect();

    return () => {
      window.removeEventListener('sse-notification', handleNotification);
      clearInterval(statusInterval);
      client.disconnect();
    };
  }, [url, token, enabled]);

  return {
    isConnected,
    connectionId,
    lastEvent,
    disconnect: () => clientRef.current?.disconnect(),
    reconnect: () => clientRef.current?.connect()
  };
}
```

#### Componente React de Exemplo

```typescript
import React from 'react';
import { useSSE } from './hooks/useSSE';

interface NotificationComponentProps {
  token: string;
}

export const NotificationComponent: React.FC<NotificationComponentProps> = ({ token }) => {
  const { isConnected, connectionId, lastEvent } = useSSE({
    url: '/api/v1/notifications/sse',
    token
  });

  return (
    <div className="notification-status">
      <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>
      
      {connectionId && (
        <div className="connection-info">
          ID da Conexão: {connectionId}
        </div>
      )}
      
      {lastEvent && (
        <div className="last-event">
          <h4>Última Notificação:</h4>
          <pre>{JSON.stringify(lastEvent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
```

### 3. Configuração de Ambiente

#### Variáveis de Ambiente

```env
# Frontend .env
REACT_APP_SSE_URL=http://localhost:3000/api/v1/notifications/sse
REACT_APP_SSE_MAX_RECONNECT_ATTEMPTS=5
REACT_APP_SSE_RECONNECT_DELAY=3000
REACT_APP_SSE_HEARTBEAT_TIMEOUT=35000
```

#### Configuração do Cliente

```typescript
const sseConfig: SSEConfig = {
  url: process.env.REACT_APP_SSE_URL!,
  token: authToken,
  maxReconnectAttempts: parseInt(process.env.REACT_APP_SSE_MAX_RECONNECT_ATTEMPTS || '5'),
  reconnectDelay: parseInt(process.env.REACT_APP_SSE_RECONNECT_DELAY || '3000'),
  heartbeatTimeout: parseInt(process.env.REACT_APP_SSE_HEARTBEAT_TIMEOUT || '35000')
};
```

## Monitoramento e Debugging

### 1. Logs de Debug

```typescript
class SSELogger {
  private static instance: SSELogger;
  private logs: Array<{ timestamp: number; level: string; message: string; data?: any }> = [];

  static getInstance(): SSELogger {
    if (!SSELogger.instance) {
      SSELogger.instance = new SSELogger();
    }
    return SSELogger.instance;
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Manter apenas os últimos 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    
    console[level](`[SSE] ${message}`, data);
  }

  getLogs(): Array<{ timestamp: number; level: string; message: string; data?: any }> {
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}
```

### 2. Métricas de Conexão

```typescript
interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  averageLatency: number;
  lastHeartbeatTime: number;
}

class SSEMetrics {
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    averageLatency: 0,
    lastHeartbeatTime: 0
  };
  
  private latencyHistory: number[] = [];

  recordConnection(success: boolean): void {
    this.metrics.totalConnections++;
    if (success) {
      this.metrics.successfulConnections++;
    } else {
      this.metrics.failedConnections++;
    }
  }

  recordReconnectionAttempt(): void {
    this.metrics.reconnectionAttempts++;
  }

  recordLatency(latency: number): void {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 10) {
      this.latencyHistory.shift();
    }
    
    this.metrics.averageLatency = 
      this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
  }

  recordHeartbeat(): void {
    this.metrics.lastHeartbeatTime = Date.now();
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }
}
```

## Tratamento de Erros

### 1. Tipos de Erro

```typescript
enum SSEErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  HEARTBEAT_TIMEOUT = 'HEARTBEAT_TIMEOUT',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR'
}

interface SSEError {
  type: SSEErrorType;
  message: string;
  timestamp: number;
  details?: any;
}
```

### 2. Handler de Erros

```typescript
class SSEErrorHandler {
  private errorCallbacks: Map<SSEErrorType, Array<(error: SSEError) => void>> = new Map();

  onError(type: SSEErrorType, callback: (error: SSEError) => void): void {
    if (!this.errorCallbacks.has(type)) {
      this.errorCallbacks.set(type, []);
    }
    this.errorCallbacks.get(type)!.push(callback);
  }

  handleError(error: SSEError): void {
    const callbacks = this.errorCallbacks.get(error.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Erro no callback de erro:', err);
      }
    });
  }
}
```

## Testes

### 1. Teste de Integração

```typescript
describe('SSE Heartbeat Client', () => {
  let client: SSEHeartbeatClient;
  let mockEventSource: jest.Mocked<EventSource>;

  beforeEach(() => {
    // Mock EventSource
    mockEventSource = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
      dispatchEvent: jest.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      readyState: EventSource.CONNECTING,
      url: '',
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2
    };

    (global as any).EventSource = jest.fn(() => mockEventSource);
    
    client = new SSEHeartbeatClient({
      url: 'http://localhost:3000/api/v1/notifications/sse',
      token: 'test-token'
    });
  });

  test('deve conectar e estabelecer heartbeat', async () => {
    client.connect();
    
    // Simular abertura da conexão
    mockEventSource.onopen?.({} as Event);
    
    expect(client.getConnectionStatus()).toBe(true);
  });

  test('deve processar heartbeat corretamente', async () => {
    client.connect();
    mockEventSource.onopen?.({} as Event);
    
    const heartbeatData = {
      type: 'heartbeat',
      timestamp: Date.now()
    };
    
    mockEventSource.onmessage?.({
      data: JSON.stringify(heartbeatData)
    } as MessageEvent);
    
    // Verificar se o heartbeat foi processado
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/heartbeat/'),
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
```

## Considerações de Performance

1. **Throttling de Heartbeat**: Evitar envio excessivo de respostas
2. **Debounce de Reconexão**: Evitar tentativas muito frequentes
3. **Cleanup de Recursos**: Limpar timeouts e listeners adequadamente
4. **Gestão de Memória**: Limitar histórico de logs e métricas

## Próximos Passos

1. Implementar reconexão automática inteligente
2. Adicionar suporte a múltiplas abas/janelas
3. Implementar cache local de eventos
4. Adicionar métricas avançadas de performance
5. Criar dashboard de monitoramento em tempo real

## Conclusão

Esta implementação fornece uma base sólida para o sistema de heartbeat adaptativo no frontend, com recursos de reconexão automática, monitoramento de performance e tratamento robusto de erros. O sistema é extensível e pode ser adaptado para diferentes frameworks frontend.