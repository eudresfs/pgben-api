# Integração Ably (Real-time Messaging) - Frontend

## Visão Geral

Este documento descreve como integrar o sistema de notificações em tempo real via Ably no frontend da aplicação PGBEN. O Ably substitui o sistema SSE anterior, oferecendo maior confiabilidade, escalabilidade e recursos avançados de mensageria em tempo real.

## Migração do SSE para Ably

> **⚠️ IMPORTANTE**: Este sistema substitui completamente a implementação anterior baseada em Server-Sent Events (SSE). O Ably oferece:
> - Maior confiabilidade de entrega
> - Reconexão automática
> - Suporte a múltiplos canais
> - Melhor performance em escala
> - Recursos avançados de presença e histórico

## Configuração Inicial

### 1. Instalação do SDK Ably

```bash
npm install ably
# ou
yarn add ably
```

### 2. Configuração do Cliente

```typescript
// services/ably.service.ts
import Ably from 'ably';

export class AblyService {
  private client: Ably.Realtime;
  private channels: Map<string, Ably.RealtimeChannel> = new Map();

  constructor(private apiKey: string, private userId: string) {
    this.client = new Ably.Realtime({
      key: apiKey,
      clientId: userId,
      autoConnect: true,
      recover: true, // Recupera conexão após desconexão
      disconnectedRetryTimeout: 3000,
      suspendedRetryTimeout: 30000
    });

    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    this.client.connection.on('connected', () => {
      console.log('Ably conectado com sucesso');
    });

    this.client.connection.on('disconnected', () => {
      console.warn('Ably desconectado');
    });

    this.client.connection.on('failed', (error) => {
      console.error('Falha na conexão Ably:', error);
    });
  }

  // Subscrever a um canal específico
  subscribeToChannel(channelName: string, callback: (message: any) => void): () => void {
    let channel = this.channels.get(channelName);
    
    if (!channel) {
      channel = this.client.channels.get(channelName);
      this.channels.set(channelName, channel);
    }

    channel.subscribe(callback);

    // Retorna função para cancelar subscrição
    return () => {
      channel?.unsubscribe(callback);
    };
  }

  // Subscrever a notificações do usuário
  subscribeToUserNotifications(callback: (notification: any) => void): () => void {
    const channelName = `user:${this.userId}:notifications`;
    return this.subscribeToChannel(channelName, callback);
  }

  // Subscrever a eventos de aprovação
  subscribeToApprovalEvents(callback: (event: any) => void): () => void {
    const channelName = `user:${this.userId}:aprovacao`;
    return this.subscribeToChannel(channelName, callback);
  }

  // Desconectar cliente
  disconnect() {
    this.channels.clear();
    this.client.close();
  }
}
```

## Implementação no Frontend

### 1. Hook React para Ably

```typescript
// hooks/useAbly.ts
import { useEffect, useState, useRef } from 'react';
import { AblyService } from '../services/ably.service';

interface UseAblyOptions {
  apiKey: string;
  userId: string;
  enabled?: boolean;
}

interface UseAblyReturn {
  isConnected: boolean;
  connectionState: string;
  subscribeToChannel: (channelName: string, callback: (message: any) => void) => () => void;
  subscribeToUserNotifications: (callback: (notification: any) => void) => () => void;
  subscribeToApprovalEvents: (callback: (event: any) => void) => () => void;
}

export function useAbly({ apiKey, userId, enabled = true }: UseAblyOptions): UseAblyReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const ablyServiceRef = useRef<AblyService | null>(null);

  useEffect(() => {
    if (!enabled || !apiKey || !userId) return;

    const service = new AblyService(apiKey, userId);
    ablyServiceRef.current = service;

    // Monitorar estado da conexão
    service.client.connection.on('connected', () => {
      setIsConnected(true);
      setConnectionState('connected');
    });

    service.client.connection.on('disconnected', () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    });

    service.client.connection.on('connecting', () => {
      setConnectionState('connecting');
    });

    service.client.connection.on('failed', () => {
      setIsConnected(false);
      setConnectionState('failed');
    });

    return () => {
      service.disconnect();
      ablyServiceRef.current = null;
    };
  }, [apiKey, userId, enabled]);

  const subscribeToChannel = (channelName: string, callback: (message: any) => void) => {
    return ablyServiceRef.current?.subscribeToChannel(channelName, callback) || (() => {});
  };

  const subscribeToUserNotifications = (callback: (notification: any) => void) => {
    return ablyServiceRef.current?.subscribeToUserNotifications(callback) || (() => {});
  };

  const subscribeToApprovalEvents = (callback: (event: any) => void) => {
    return ablyServiceRef.current?.subscribeToApprovalEvents(callback) || (() => {});
  };

  return {
    isConnected,
    connectionState,
    subscribeToChannel,
    subscribeToUserNotifications,
    subscribeToApprovalEvents
  };
}
```

### 2. Componente de Notificações

```typescript
// components/NotificationProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAbly } from '../hooks/useAbly';
import { useAuth } from '../hooks/useAuth';

interface NotificationContextType {
  notifications: any[];
  isConnected: boolean;
  connectionState: string;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  isConnected: false,
  connectionState: 'disconnected'
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const { isConnected, connectionState, subscribeToUserNotifications, subscribeToApprovalEvents } = useAbly({
    apiKey: process.env.REACT_APP_ABLY_API_KEY!,
    userId: user?.id || '',
    enabled: !!user && !!token
  });

  useEffect(() => {
    if (!isConnected) return;

    // Subscrever a notificações gerais
    const unsubscribeNotifications = subscribeToUserNotifications((notification) => {
      console.log('Nova notificação recebida:', notification);
      setNotifications(prev => [notification, ...prev]);
      
      // Mostrar notificação no sistema
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.titulo, {
          body: notification.mensagem,
          icon: '/favicon.ico'
        });
      }
    });

    // Subscrever a eventos de aprovação
    const unsubscribeApproval = subscribeToApprovalEvents((event) => {
      console.log('Evento de aprovação recebido:', event);
      
      // Processar diferentes tipos de eventos
      switch (event.tipo) {
        case 'solicitacao.criada':
          setNotifications(prev => [{
            id: Date.now(),
            tipo: 'info',
            titulo: 'Nova Solicitação',
            mensagem: 'Uma nova solicitação foi criada e aguarda aprovação.',
            timestamp: new Date()
          }, ...prev]);
          break;
          
        case 'solicitacao.aprovada':
          setNotifications(prev => [{
            id: Date.now(),
            tipo: 'success',
            titulo: 'Solicitação Aprovada',
            mensagem: 'Sua solicitação foi aprovada com sucesso.',
            timestamp: new Date()
          }, ...prev]);
          break;
          
        case 'solicitacao.rejeitada':
          setNotifications(prev => [{
            id: Date.now(),
            tipo: 'error',
            titulo: 'Solicitação Rejeitada',
            mensagem: 'Sua solicitação foi rejeitada.',
            timestamp: new Date()
          }, ...prev]);
          break;
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeApproval();
    };
  }, [isConnected, subscribeToUserNotifications, subscribeToApprovalEvents]);

  return (
    <NotificationContext.Provider value={{ notifications, isConnected, connectionState }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
```

### 3. Componente de Status da Conexão

```typescript
// components/ConnectionStatus.tsx
import React from 'react';
import { useNotifications } from './NotificationProvider';

export function ConnectionStatus() {
  const { isConnected, connectionState } = useNotifications();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'disconnected': return 'red';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'disconnected': return 'Desconectado';
      case 'failed': return 'Falha na conexão';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`w-3 h-3 rounded-full bg-${getStatusColor()}-500`}
        title={`Status: ${getStatusText()}`}
      />
      <span className="text-sm text-gray-600">
        {getStatusText()}
      </span>
    </div>
  );
}
```

## Configuração de Ambiente

### 1. Variáveis de Ambiente

```bash
# .env
REACT_APP_ABLY_API_KEY=your_ably_api_key_here
REACT_APP_ABLY_ENVIRONMENT=production # ou sandbox
```

### 2. Configuração do Ably no Backend

O backend já está configurado para usar o Ably. Certifique-se de que as seguintes variáveis estão definidas:

```bash
# Backend .env
ABLY_API_KEY=your_ably_api_key_here
ABLY_ENVIRONMENT=production
```

## Estrutura dos Eventos

### 1. Eventos de Aprovação

```typescript
interface ApprovalEvent {
  tipo: 'solicitacao.criada' | 'solicitacao.aprovada' | 'solicitacao.rejeitada' | 
        'solicitacao.executada' | 'solicitacao.erro_execucao' | 'solicitacao.cancelada';
  solicitacao: {
    id: string;
    tipo: string;
    status: string;
    // ... outros campos
  };
  solicitanteId: string;
  timestamp: string;
  // Campos específicos por tipo de evento
}
```

### 2. Notificações Gerais

```typescript
interface Notification {
  id: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  titulo: string;
  mensagem: string;
  timestamp: string;
  lida: boolean;
  // ... outros campos
}
```

## Exemplo de Uso Completo

```typescript
// App.tsx
import React from 'react';
import { NotificationProvider } from './components/NotificationProvider';
import { ConnectionStatus } from './components/ConnectionStatus';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <NotificationProvider>
      <div className="app">
        <header className="app-header">
          <h1>PGBEN</h1>
          <ConnectionStatus />
        </header>
        <main>
          <Dashboard />
        </main>
      </div>
    </NotificationProvider>
  );
}

export default App;
```

## Migração do SSE

### Principais Diferenças

| Aspecto | SSE (Anterior) | Ably (Atual) |
|---------|----------------|---------------|
| **Protocolo** | HTTP/1.1 Server-Sent Events | WebSocket + HTTP/2 |
| **Reconexão** | Manual | Automática |
| **Canais** | Endpoint único | Múltiplos canais |
| **Escalabilidade** | Limitada | Alta |
| **Confiabilidade** | Básica | Avançada |
| **Histórico** | Não | Sim |
| **Presença** | Não | Sim |

### Checklist de Migração

- [x] ✅ Backend configurado com Ably
- [x] ✅ Eventos de aprovação migrados
- [ ] 🔄 Frontend atualizado (este documento)
- [ ] ⏳ Testes de integração
- [ ] ⏳ Documentação atualizada
- [ ] ⏳ Remoção do código SSE legado

## Troubleshooting

### Problemas Comuns

1. **Conexão não estabelecida**
   - Verifique se a API key está correta
   - Confirme se o usuário está autenticado
   - Verifique logs do console

2. **Mensagens não recebidas**
   - Confirme se o canal está correto
   - Verifique se o backend está publicando no canal certo
   - Teste a conectividade de rede

3. **Reconexão frequente**
   - Verifique a estabilidade da conexão de rede
   - Ajuste os timeouts de reconexão
   - Monitore logs do Ably

### Debug

```typescript
// Habilitar logs detalhados do Ably
const client = new Ably.Realtime({
  key: apiKey,
  logLevel: 4, // 0=none, 1=errors, 2=warnings, 3=info, 4=debug
  logHandler: (msg) => console.log('Ably:', msg)
});
```

## Recursos Adicionais

- [Documentação oficial do Ably](https://ably.com/docs)
- [SDK JavaScript do Ably](https://github.com/ably/ably-js)
- [Exemplos de integração React](https://github.com/ably/ably-js/tree/main/examples)

---

> **Nota**: Este documento substitui completamente a documentação anterior de SSE. Para referência histórica, consulte os arquivos de backup na pasta `docs/legacy/`.