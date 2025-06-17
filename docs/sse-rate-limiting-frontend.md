# Implementação de Rate Limiting SSE no Frontend

## Visão Geral

Este documento descreve como implementar o tratamento de rate limiting para Server-Sent Events (SSE) no frontend da aplicação SEMTAS. O sistema de rate limiting foi implementado no backend para proteger contra abuso e garantir a estabilidade do serviço.

## Headers de Rate Limiting

O backend retorna os seguintes headers em todas as respostas SSE:

```http
X-RateLimit-Limit: 10          # Limite máximo de requisições
X-RateLimit-Remaining: 5       # Requisições restantes na janela atual
X-RateLimit-Reset: 1640995200  # Timestamp Unix quando o limite será resetado
```

## Códigos de Status

### 200 OK
Conexão SSE estabelecida com sucesso.

### 429 Too Many Requests
Rate limit excedido. A resposta inclui:

```json
{
  "message": "Rate limit excedido",
  "statusCode": 429,
  "retryAfter": 30
}
```

## Implementação no Frontend

### 1. Classe SSE com Rate Limiting

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface SSEOptions {
  url: string;
  token?: string;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onRateLimit?: (info: RateLimitInfo) => void;
  onReconnect?: () => void;
  maxRetries?: number;
  baseRetryDelay?: number;
}

class SSEClient {
  private eventSource: EventSource | null = null;
  private options: SSEOptions;
  private retryCount = 0;
  private rateLimitInfo: RateLimitInfo | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(options: SSEOptions) {
    this.options = {
      maxRetries: 5,
      baseRetryDelay: 1000,
      ...options,
    };
  }

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    const url = new URL(this.options.url);
    if (this.options.token) {
      url.searchParams.set('token', this.options.token);
    }

    this.eventSource = new EventSource(url.toString());
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = (event) => {
      console.log('SSE conectado');
      this.retryCount = 0;
      this.extractRateLimitHeaders(event);
    };

    this.eventSource.onmessage = (event) => {
      this.extractRateLimitHeaders(event);
      this.options.onMessage?.(event);
    };

    this.eventSource.onerror = (event) => {
      console.error('Erro SSE:', event);
      
      // Verificar se é erro de rate limiting
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.handleConnectionError(event);
      }
      
      this.options.onError?.(event);
    };
  }

  private extractRateLimitHeaders(event: Event): void {
    // Note: EventSource não expõe headers diretamente
    // Esta informação deve vir através de mensagens especiais do servidor
    // ou ser obtida através de uma requisição HTTP separada
  }

  private async handleConnectionError(event: Event): Promise<void> {
    // Tentar obter informações de rate limit via API
    try {
      const response = await fetch('/api/sse/rate-limit/status', {
        headers: {
          'Authorization': `Bearer ${this.options.token}`,
        },
      });

      if (response.status === 429) {
        const rateLimitData = await response.json();
        this.handleRateLimit(rateLimitData.retryAfter || 60);
        return;
      }
    } catch (error) {
      console.warn('Não foi possível verificar status do rate limit:', error);
    }

    // Reconexão com backoff exponencial
    this.scheduleReconnect();
  }

  private handleRateLimit(retryAfter: number): void {
    console.warn(`Rate limit atingido. Tentando novamente em ${retryAfter}s`);
    
    this.rateLimitInfo = {
      limit: 0,
      remaining: 0,
      resetTime: Date.now() + (retryAfter * 1000),
      retryAfter,
    };

    this.options.onRateLimit?.(this.rateLimitInfo);

    // Agendar reconexão após o período de rate limit
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.options.onReconnect?.();
    }, retryAfter * 1000);
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= (this.options.maxRetries || 5)) {
      console.error('Máximo de tentativas de reconexão atingido');
      return;
    }

    const delay = this.options.baseRetryDelay! * Math.pow(2, this.retryCount);
    this.retryCount++;

    console.log(`Reconectando em ${delay}ms (tentativa ${this.retryCount})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.options.onReconnect?.();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.retryCount = 0;
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}
```

### 2. Hook React para SSE

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSSEOptions {
  url: string;
  token?: string;
  enabled?: boolean;
  onMessage?: (event: MessageEvent) => void;
  onRateLimit?: (info: RateLimitInfo) => void;
}

interface UseSSEReturn {
  isConnected: boolean;
  rateLimitInfo: RateLimitInfo | null;
  reconnect: () => void;
  disconnect: () => void;
  error: string | null;
}

export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sseClientRef = useRef<SSEClient | null>(null);

  const connect = useCallback(() => {
    if (!options.enabled) return;

    const client = new SSEClient({
      url: options.url,
      token: options.token,
      onMessage: options.onMessage,
      onError: (event) => {
        setIsConnected(false);
        setError('Erro na conexão SSE');
      },
      onRateLimit: (info) => {
        setRateLimitInfo(info);
        setError(`Rate limit atingido. Tentando novamente em ${info.retryAfter}s`);
        options.onRateLimit?.(info);
      },
      onReconnect: () => {
        setIsConnected(true);
        setError(null);
        setRateLimitInfo(null);
      },
    });

    client.connect();
    sseClientRef.current = client;
    setIsConnected(true);
    setError(null);
  }, [options.url, options.token, options.enabled, options.onMessage, options.onRateLimit]);

  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
      sseClientRef.current = null;
    }
    setIsConnected(false);
    setError(null);
    setRateLimitInfo(null);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    if (options.enabled) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [options.enabled, connect, disconnect]);

  return {
    isConnected,
    rateLimitInfo,
    reconnect,
    disconnect,
    error,
  };
}
```

### 3. Componente de Notificações

```typescript
import React, { useState, useCallback } from 'react';
import { useSSE } from './hooks/useSSE';
import { useAuth } from './hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

const NotificationCenter: React.FC = () => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showRateLimit, setShowRateLimit] = useState(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        setNotifications(prev => [data, ...prev.slice(0, 49)]); // Manter apenas 50 notificações
      } else if (data.type === 'heartbeat') {
        console.log('Heartbeat recebido:', data.timestamp);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem SSE:', error);
    }
  }, []);

  const handleRateLimit = useCallback((info: RateLimitInfo) => {
    setShowRateLimit(true);
    
    // Ocultar aviso após o período de rate limit
    setTimeout(() => {
      setShowRateLimit(false);
    }, (info.retryAfter || 60) * 1000);
  }, []);

  const { isConnected, rateLimitInfo, reconnect, error } = useSSE({
    url: '/api/notifications/sse',
    token,
    enabled: !!token,
    onMessage: handleMessage,
    onRateLimit: handleRateLimit,
  });

  return (
    <div className="notification-center">
      {/* Status da Conexão */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-indicator" />
        {isConnected ? 'Conectado' : 'Desconectado'}
        {!isConnected && (
          <button onClick={reconnect} className="reconnect-btn">
            Reconectar
          </button>
        )}
      </div>

      {/* Aviso de Rate Limit */}
      {showRateLimit && rateLimitInfo && (
        <div className="rate-limit-warning">
          <strong>Limite de requisições atingido</strong>
          <p>Reconectando em {Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)}s</p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Lista de Notificações */}
      <div className="notifications-list">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <h4>{notification.title}</h4>
            <p>{notification.message}</p>
            <small>{new Date(notification.timestamp).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
```

### 4. Monitoramento de Rate Limit

```typescript
// Serviço para monitorar status do rate limit
class RateLimitMonitor {
  private static instance: RateLimitMonitor;
  private listeners: ((info: RateLimitInfo) => void)[] = [];

  static getInstance(): RateLimitMonitor {
    if (!RateLimitMonitor.instance) {
      RateLimitMonitor.instance = new RateLimitMonitor();
    }
    return RateLimitMonitor.instance;
  }

  async checkStatus(token: string): Promise<RateLimitInfo | null> {
    try {
      const response = await fetch('/api/sse/rate-limit/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
          remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
          resetTime: parseInt(response.headers.get('X-RateLimit-Reset') || '0'),
        };
      }
    } catch (error) {
      console.error('Erro ao verificar status do rate limit:', error);
    }
    return null;
  }

  subscribe(listener: (info: RateLimitInfo) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(info: RateLimitInfo): void {
    this.listeners.forEach(listener => listener(info));
  }
}

export default RateLimitMonitor;
```

## Estilos CSS

```css
.notification-center {
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.connection-status.connected {
  background-color: #d4edda;
  color: #155724;
}

.connection-status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.rate-limit-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border-left: 4px solid #ffc107;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.reconnect-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification {
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  border-left: 4px solid #007bff;
  background-color: #f8f9fa;
}

.notification.success {
  border-left-color: #28a745;
}

.notification.warning {
  border-left-color: #ffc107;
}

.notification.error {
  border-left-color: #dc3545;
}

.notification h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.notification p {
  margin: 0 0 0.5rem 0;
  color: #6c757d;
}

.notification small {
  color: #6c757d;
  font-size: 0.875rem;
}
```

## Considerações Importantes

### 1. Limitações do EventSource
- O EventSource não expõe headers HTTP diretamente
- Para obter informações de rate limit, use requisições HTTP separadas
- Implemente fallback para quando a API de status não estiver disponível

### 2. Estratégias de Reconexão
- Use backoff exponencial para evitar sobrecarga
- Implemente limite máximo de tentativas
- Respeite os tempos de rate limit retornados pelo servidor

### 3. UX/UI
- Mostre claramente o status da conexão
- Informe ao usuário sobre rate limits de forma não intrusiva
- Permita reconexão manual quando necessário
- Mantenha histórico limitado de notificações para performance

### 4. Monitoramento
- Implemente logs para debugging
- Monitore métricas de conexão e reconexão
- Colete feedback sobre rate limits para ajustes

### 5. Testes
- Teste cenários de rate limiting
- Simule falhas de conexão
- Verifique comportamento de reconexão
- Teste com diferentes perfis de usuário

## Próximos Passos

Após implementar o rate limiting no frontend:

1. **Testes de Integração**: Teste a integração completa entre frontend e backend
2. **Monitoramento**: Implemente dashboards para acompanhar métricas de rate limiting
3. **Otimizações**: Ajuste limites baseado no uso real
4. **Documentação**: Atualize documentação da API com novos endpoints
5. **Treinamento**: Capacite a equipe sobre o novo sistema de rate limiting