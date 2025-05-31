# Integração SSE (Server-Sent Events) - Frontend

## Visão Geral

Este documento descreve como integrar o sistema de notificações em tempo real via SSE (Server-Sent Events) no frontend da aplicação PGBEN.

## Endpoints Disponíveis

### 1. Conexão SSE

**Endpoint:** `GET /api/v1/notificacao/sse`

**Autenticação:** JWT Token (via query parameter, header Authorization ou cookie)

**Descrição:** Estabelece uma conexão SSE para receber notificações em tempo real.

### 2. Estatísticas SSE (Admin/Gestor)

**Endpoint:** `GET /api/v1/notificacao/sse/stats`

**Autenticação:** JWT Token + Role (admin ou gestor)

**Descrição:** Retorna estatísticas das conexões SSE ativas.

### 3. Status de Conexão de Usuário (Admin/Gestor)

**Endpoint:** `GET /api/v1/notificacao/sse/status/:userId`

**Autenticação:** JWT Token + Role (admin ou gestor)

**Descrição:** Verifica se um usuário específico está conectado via SSE.

## Implementação no Frontend

### 1. Conexão Básica com EventSource

```javascript
// Estabelecer conexão SSE
function connectToSSE(token) {
  const eventSource = new EventSource(
    `/api/v1/notificacao/sse?token=${token}`,
    {
      withCredentials: true
    }
  );

  // Evento de conexão estabelecida
  eventSource.onopen = function(event) {
    console.log('Conexão SSE estabelecida');
  };

  // Receber notificações
  eventSource.addEventListener('notification', function(event) {
    const notification = JSON.parse(event.data);
    handleNotification(notification);
  });

  // Receber heartbeat
  eventSource.addEventListener('heartbeat', function(event) {
    const heartbeat = JSON.parse(event.data);
    console.log('Heartbeat recebido:', heartbeat.timestamp);
  });

  // Tratar erros
  eventSource.onerror = function(event) {
    console.error('Erro na conexão SSE:', event);
    // Implementar lógica de reconexão
    setTimeout(() => {
      eventSource.close();
      connectToSSE(token);
    }, 5000);
  };

  return eventSource;
}

// Processar notificação recebida
function handleNotification(notification) {
  console.log('Nova notificação:', notification);
  
  // Atualizar UI
  updateNotificationBadge();
  showNotificationToast(notification);
  
  // Adicionar à lista de notificações
  addToNotificationList(notification);
}
```

### 2. Implementação com React Hook

```jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useSSENotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const connectSSE = () => {
      try {
        const eventSource = new EventSource(
          `/api/v1/notificacao/sse?token=${token}`,
          { withCredentials: true }
        );

        eventSource.onopen = () => {
          setIsConnected(true);
          console.log('SSE conectado');
        };

        eventSource.addEventListener('notification', (event) => {
          const notification = JSON.parse(event.data);
          setNotifications(prev => [notification, ...prev]);
        });

        eventSource.addEventListener('heartbeat', (event) => {
          const heartbeat = JSON.parse(event.data);
          console.log('Heartbeat:', heartbeat.timestamp);
        });

        eventSource.onerror = (error) => {
          console.error('Erro SSE:', error);
          setIsConnected(false);
          
          // Reconectar após 5 segundos
          setTimeout(() => {
            eventSource.close();
            connectSSE();
          }, 5000);
        };

        eventSourceRef.current = eventSource;
      } catch (error) {
        console.error('Erro ao conectar SSE:', error);
      }
    };

    connectSSE();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsConnected(false);
      }
    };
  }, [token]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsConnected(false);
    }
  };

  return {
    notifications,
    isConnected,
    disconnect
  };
};
```

### 3. Componente de Notificações

```jsx
import React from 'react';
import { useSSENotifications } from '../hooks/useSSENotifications';
import { toast } from 'react-toastify';

export const NotificationComponent = () => {
  const { notifications, isConnected } = useSSENotifications();

  // Mostrar toast para novas notificações
  React.useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      
      toast.info(latestNotification.titulo, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [notifications]);

  return (
    <div className="notification-container">
      <div className="connection-status">
        Status: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>
      
      <div className="notification-list">
        {notifications.map((notification) => (
          <div key={notification.id} className="notification-item">
            <h4>{notification.titulo}</h4>
            <p>{notification.conteudo}</p>
            <small>{new Date(notification.data_criacao).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 4. Implementação com Vue.js

```vue
<template>
  <div class="notification-container">
    <div class="connection-status">
      Status: {{ isConnected ? '🟢 Conectado' : '🔴 Desconectado' }}
    </div>
    
    <div class="notification-list">
      <div 
        v-for="notification in notifications" 
        :key="notification.id" 
        class="notification-item"
      >
        <h4>{{ notification.titulo }}</h4>
        <p>{{ notification.conteudo }}</p>
        <small>{{ formatDate(notification.data_criacao) }}</small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'NotificationComponent',
  setup() {
    const notifications = ref([]);
    const isConnected = ref(false);
    const eventSource = ref(null);
    const authStore = useAuthStore();

    const connectSSE = () => {
      if (!authStore.token) return;

      try {
        eventSource.value = new EventSource(
          `/api/v1/notificacao/sse?token=${authStore.token}`,
          { withCredentials: true }
        );

        eventSource.value.onopen = () => {
          isConnected.value = true;
          console.log('SSE conectado');
        };

        eventSource.value.addEventListener('notification', (event) => {
          const notification = JSON.parse(event.data);
          notifications.value.unshift(notification);
          
          // Mostrar notificação toast
          this.$toast.info(notification.titulo);
        });

        eventSource.value.addEventListener('heartbeat', (event) => {
          const heartbeat = JSON.parse(event.data);
          console.log('Heartbeat:', heartbeat.timestamp);
        });

        eventSource.value.onerror = (error) => {
          console.error('Erro SSE:', error);
          isConnected.value = false;
          
          // Reconectar após 5 segundos
          setTimeout(() => {
            eventSource.value?.close();
            connectSSE();
          }, 5000);
        };
      } catch (error) {
        console.error('Erro ao conectar SSE:', error);
      }
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('pt-BR');
    };

    onMounted(() => {
      connectSSE();
    });

    onUnmounted(() => {
      if (eventSource.value) {
        eventSource.value.close();
      }
    });

    return {
      notifications,
      isConnected,
      formatDate
    };
  }
};
</script>
```

## Estrutura das Notificações SSE

### Evento de Notificação

```typescript
interface SseNotification {
  id: string;
  type: 'notification';
  data: {
    id: string;
    titulo: string;
    conteudo: string;
    tipo: 'info' | 'warning' | 'error' | 'success';
    prioridade: 'baixa' | 'media' | 'alta' | 'critica';
    data_criacao: string;
    lida: boolean;
    metadata?: Record<string, any>;
  };
}
```

### Evento de Heartbeat

```typescript
interface HeartbeatEvent {
  id: string;
  type: 'heartbeat';
  data: {
    timestamp: string;
    server_time: string;
  };
}
```

## Boas Práticas

### 1. Gerenciamento de Conexão

- **Reconexão Automática**: Implemente lógica de reconexão em caso de falha
- **Heartbeat**: Use os eventos de heartbeat para verificar a saúde da conexão
- **Cleanup**: Sempre feche a conexão quando o componente for desmontado

### 2. Tratamento de Erros

```javascript
// Implementar retry com backoff exponencial
function connectWithRetry(token, maxRetries = 5) {
  let retryCount = 0;
  
  function connect() {
    const eventSource = new EventSource(`/api/v1/notificacao/sse?token=${token}`);
    
    eventSource.onerror = (error) => {
      console.error('Erro SSE:', error);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
        retryCount++;
        
        setTimeout(() => {
          eventSource.close();
          connect();
        }, delay);
      } else {
        console.error('Máximo de tentativas de reconexão atingido');
      }
    };
    
    return eventSource;
  }
  
  return connect();
}
```

### 3. Performance

- **Throttling**: Limite a frequência de atualizações da UI
- **Batch Updates**: Agrupe múltiplas notificações quando possível
- **Memory Management**: Limite o número de notificações mantidas em memória

```javascript
// Exemplo de throttling
const throttledUpdateUI = throttle((notifications) => {
  updateNotificationList(notifications);
}, 100);
```

### 4. Segurança

- **Token Validation**: Sempre valide o token antes de estabelecer conexão
- **HTTPS**: Use sempre HTTPS em produção
- **CORS**: Configure adequadamente as políticas CORS

## Troubleshooting

### Problemas Comuns

1. **Conexão não estabelecida**
   - Verificar se o token JWT é válido
   - Confirmar se o endpoint está acessível
   - Verificar configurações de CORS

2. **Reconexão constante**
   - Verificar logs do servidor
   - Confirmar se o token não expirou
   - Verificar configurações de proxy/load balancer

3. **Notificações não chegam**
   - Verificar se o usuário está autenticado
   - Confirmar se há notificações sendo enviadas pelo backend
   - Verificar logs de erro no console

### Debug

```javascript
// Habilitar logs detalhados
const DEBUG_SSE = true;

function debugLog(message, data) {
  if (DEBUG_SSE) {
    console.log(`[SSE Debug] ${message}`, data);
  }
}

// Usar nos event listeners
eventSource.addEventListener('notification', (event) => {
  debugLog('Notificação recebida', event.data);
  // ... resto da lógica
});
```

## Considerações de Produção

1. **Load Balancing**: Configure sticky sessions se usar múltiplos servidores
2. **Monitoring**: Monitore o número de conexões ativas
3. **Rate Limiting**: Implemente rate limiting para evitar abuso
4. **Graceful Shutdown**: Implemente fechamento gracioso das conexões

## Exemplo de Integração Completa

Veja o arquivo `examples/sse-integration-example.html` para um exemplo completo de integração.