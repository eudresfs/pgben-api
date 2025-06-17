# Estrutura de Canais Ably - Sistema SEMTAS

## 📋 Visão Geral

Este documento define a estrutura, convenções de nomenclatura e estratégias de roteamento para os canais Ably utilizados no Sistema SEMTAS. A organização adequada dos canais é fundamental para garantir escalabilidade, segurança e performance.

## 🎯 Princípios de Design

### 1. Hierarquia Clara
- Canais organizados por domínio e escopo
- Nomenclatura consistente e previsível
- Separação lógica por contexto de negócio

### 2. Segurança por Design
- Isolamento por tenant/usuário
- Controle granular de acesso
- Validação de permissões em tempo real

### 3. Escalabilidade
- Distribuição equilibrada de carga
- Canais específicos para evitar sobrecarga
- Cleanup automático de canais inativos

## 🏗️ Estrutura de Nomenclatura

### Padrão Geral
```
{domain}:{scope}:{identifier}[:{sub-identifier}]
```

**Componentes:**
- `domain`: Domínio do negócio (user, benefit, system, etc.)
- `scope`: Escopo da funcionalidade (notifications, status, chat, etc.)
- `identifier`: Identificador único (userId, benefitId, etc.)
- `sub-identifier`: Sub-identificador opcional para granularidade

### Exemplos
```
user:notifications:123456
benefit:status:789012
system:announcements
group:chat:assistentes-sociais
unit:updates:unidade-centro
```

## 📚 Catálogo de Canais

### 1. Canais de Usuário

#### 1.1 Notificações Pessoais
```typescript
// Padrão: user:notifications:{userId}
// Exemplo: user:notifications:123456
```

**Propósito:** Notificações específicas para um usuário

**Tipos de Mensagem:**
- Atualizações de solicitações
- Lembretes de prazos
- Mensagens do sistema
- Alertas de segurança

**Permissões:**
- `subscribe`: Apenas o próprio usuário
- `publish`: Sistema e administradores

**Exemplo de Uso:**
```typescript
const channel = 'user:notifications:123456';
const message = {
  type: 'SOLICITACAO_ATUALIZADA',
  solicitacaoId: '789012',
  novoStatus: 'EM_ANALISE',
  timestamp: new Date().toISOString(),
  message: 'Sua solicitação está sendo analisada'
};

await ablyService.publish(channel, message);
```

#### 1.2 Status de Presença
```typescript
// Padrão: user:presence:{userId}
// Exemplo: user:presence:123456
```

**Propósito:** Indicar status online/offline do usuário

**Dados de Presença:**
```typescript
interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  currentPage?: string;
  userAgent?: string;
}
```

### 2. Canais de Benefícios

#### 2.1 Status de Solicitação
```typescript
// Padrão: benefit:status:{benefitId}
// Exemplo: benefit:status:789012
```

**Propósito:** Atualizações de status de uma solicitação específica

**Tipos de Mensagem:**
- Mudanças de status
- Comentários de analistas
- Solicitações de documentos
- Aprovações/rejeições

**Permissões:**
- `subscribe`: Solicitante e analistas responsáveis
- `publish`: Sistema e analistas

**Exemplo de Mensagem:**
```typescript
interface BenefitStatusUpdate {
  type: 'STATUS_CHANGED' | 'COMMENT_ADDED' | 'DOCUMENT_REQUESTED';
  benefitId: string;
  previousStatus?: string;
  newStatus?: string;
  comment?: string;
  requiredDocuments?: string[];
  updatedBy: {
    userId: string;
    name: string;
    role: string;
  };
  timestamp: string;
}
```

#### 2.2 Workflow de Aprovação
```typescript
// Padrão: benefit:workflow:{benefitId}
// Exemplo: benefit:workflow:789012
```

**Propósito:** Notificações do fluxo de aprovação

**Etapas do Workflow:**
1. Recebimento da solicitação
2. Análise documental
3. Verificação de elegibilidade
4. Aprovação/rejeição
5. Liberação do benefício

### 3. Canais de Sistema

#### 3.1 Anúncios Gerais
```typescript
// Padrão: system:announcements
```

**Propósito:** Comunicados importantes para todos os usuários

**Tipos de Anúncio:**
- Manutenções programadas
- Novas funcionalidades
- Mudanças de política
- Alertas de segurança

**Permissões:**
- `subscribe`: Todos os usuários autenticados
- `publish`: Apenas administradores

#### 3.2 Métricas em Tempo Real
```typescript
// Padrão: system:metrics:{metric-type}
// Exemplo: system:metrics:dashboard
```

**Propósito:** Atualizações de métricas para dashboards

**Tipos de Métrica:**
- Contadores de solicitações
- Performance do sistema
- Estatísticas de uso
- Alertas de monitoramento

### 4. Canais de Grupo

#### 4.1 Equipes de Trabalho
```typescript
// Padrão: group:{group-type}:{group-id}
// Exemplo: group:assistentes-sociais:unidade-centro
```

**Propósito:** Comunicação entre membros de uma equipe

**Tipos de Grupo:**
- `assistentes-sociais`: Assistentes sociais
- `coordenadores`: Coordenadores de unidade
- `analistas`: Analistas de benefícios
- `administradores`: Administradores do sistema

#### 4.2 Unidades Organizacionais
```typescript
// Padrão: unit:updates:{unit-id}
// Exemplo: unit:updates:unidade-centro
```

**Propósito:** Atualizações específicas de uma unidade

**Tipos de Atualização:**
- Mudanças de horário
- Novos procedimentos
- Estatísticas da unidade
- Eventos locais

### 5. Canais de Chat (Futuro)

#### 5.1 Chat Direto
```typescript
// Padrão: chat:direct:{user1-id}:{user2-id}
// Exemplo: chat:direct:123456:789012
```

**Propósito:** Conversas privadas entre dois usuários

**Características:**
- IDs ordenados alfabeticamente para consistência
- Histórico persistente
- Indicadores de leitura
- Typing indicators

#### 5.2 Salas de Chat
```typescript
// Padrão: chat:room:{room-id}
// Exemplo: chat:room:suporte-tecnico
```

**Propósito:** Salas de chat temáticas

**Tipos de Sala:**
- `suporte-tecnico`: Suporte técnico
- `duvidas-gerais`: Dúvidas gerais
- `treinamento`: Sessões de treinamento
- `emergencia`: Comunicação de emergência

## 🔧 Implementação Técnica

### 1. Factory de Canais

```typescript
export class ChannelFactory {
  /**
   * Cria canal de notificações de usuário
   */
  static createUserNotificationChannel(userId: string): string {
    return `user:notifications:${userId}`;
  }

  /**
   * Cria canal de presença de usuário
   */
  static createUserPresenceChannel(userId: string): string {
    return `user:presence:${userId}`;
  }

  /**
   * Cria canal de status de benefício
   */
  static createBenefitStatusChannel(benefitId: string): string {
    return `benefit:status:${benefitId}`;
  }

  /**
   * Cria canal de workflow de benefício
   */
  static createBenefitWorkflowChannel(benefitId: string): string {
    return `benefit:workflow:${benefitId}`;
  }

  /**
   * Cria canal de anúncios do sistema
   */
  static createSystemAnnouncementsChannel(): string {
    return 'system:announcements';
  }

  /**
   * Cria canal de métricas
   */
  static createSystemMetricsChannel(metricType: string): string {
    return `system:metrics:${metricType}`;
  }

  /**
   * Cria canal de grupo
   */
  static createGroupChannel(groupType: string, groupId: string): string {
    return `group:${groupType}:${groupId}`;
  }

  /**
   * Cria canal de unidade
   */
  static createUnitChannel(unitId: string): string {
    return `unit:updates:${unitId}`;
  }

  /**
   * Cria canal de chat direto
   */
  static createDirectChatChannel(user1Id: string, user2Id: string): string {
    // Ordena IDs para garantir consistência
    const [firstId, secondId] = [user1Id, user2Id].sort();
    return `chat:direct:${firstId}:${secondId}`;
  }

  /**
   * Cria canal de sala de chat
   */
  static createChatRoomChannel(roomId: string): string {
    return `chat:room:${roomId}`;
  }

  /**
   * Valida formato de canal
   */
  static validateChannelName(channelName: string): boolean {
    const pattern = /^[a-z]+:[a-z-]+:[a-zA-Z0-9-_]+(?::[a-zA-Z0-9-_]+)?$/;
    return pattern.test(channelName);
  }

  /**
   * Extrai informações do canal
   */
  static parseChannelName(channelName: string): ChannelInfo {
    const parts = channelName.split(':');
    return {
      domain: parts[0],
      scope: parts[1],
      identifier: parts[2],
      subIdentifier: parts[3] || null,
    };
  }
}

interface ChannelInfo {
  domain: string;
  scope: string;
  identifier: string;
  subIdentifier: string | null;
}
```

### 2. Configuração de Canais

```typescript
export interface ChannelConfig {
  // Configurações de presença
  presence?: {
    enabled: boolean;
    enterOnSubscribe?: boolean;
    leaveOnUnsubscribe?: boolean;
  };

  // Configurações de persistência
  persistence?: {
    enabled: boolean;
    ttl?: number; // TTL em segundos
  };

  // Configurações de rate limiting
  rateLimit?: {
    maxMessages: number;
    windowMs: number;
  };

  // Configurações de segurança
  security?: {
    requireAuth: boolean;
    allowedRoles?: string[];
    customValidator?: (userId: string, channelName: string) => boolean;
  };
}

// Configurações padrão por tipo de canal
export const DEFAULT_CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  'user:notifications': {
    presence: { enabled: false },
    persistence: { enabled: true, ttl: 86400 }, // 24 horas
    rateLimit: { maxMessages: 100, windowMs: 60000 }, // 100 msg/min
    security: { requireAuth: true },
  },
  
  'user:presence': {
    presence: { enabled: true, enterOnSubscribe: true, leaveOnUnsubscribe: true },
    persistence: { enabled: false },
    rateLimit: { maxMessages: 10, windowMs: 60000 }, // 10 msg/min
    security: { requireAuth: true },
  },
  
  'benefit:status': {
    presence: { enabled: false },
    persistence: { enabled: true, ttl: 2592000 }, // 30 dias
    rateLimit: { maxMessages: 50, windowMs: 60000 }, // 50 msg/min
    security: { requireAuth: true, allowedRoles: ['ANALISTA', 'COORDENADOR'] },
  },
  
  'system:announcements': {
    presence: { enabled: false },
    persistence: { enabled: true, ttl: 604800 }, // 7 dias
    rateLimit: { maxMessages: 5, windowMs: 60000 }, // 5 msg/min
    security: { requireAuth: true, allowedRoles: ['ADMINISTRADOR'] },
  },
};
```

### 3. Gerenciamento de Subscrições

```typescript
@Injectable()
export class ChannelSubscriptionService {
  private subscriptions = new Map<string, Set<string>>();

  /**
   * Subscreve usuário a um canal
   */
  async subscribe(
    userId: string,
    channelName: string,
    callback?: Function
  ): Promise<void> {
    // Validar permissões
    await this.validateChannelAccess(userId, channelName);

    // Adicionar à lista de subscrições
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(userId);

    // Subscrever no Ably
    await this.ablyChannelService.subscribe(channelName, callback);

    // Log da subscrição
    this.logger.log(`User ${userId} subscribed to channel ${channelName}`);
  }

  /**
   * Remove subscrição de usuário
   */
  async unsubscribe(userId: string, channelName: string): Promise<void> {
    // Remover da lista de subscrições
    const subscribers = this.subscriptions.get(channelName);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(channelName);
        // Cleanup do canal se não há mais subscribers
        await this.ablyChannelService.cleanup(channelName);
      }
    }

    // Desinscrever no Ably
    await this.ablyChannelService.unsubscribe(channelName);

    // Log da desinscrição
    this.logger.log(`User ${userId} unsubscribed from channel ${channelName}`);
  }

  /**
   * Obtém lista de canais de um usuário
   */
  getUserChannels(userId: string): string[] {
    const channels: string[] = [];
    for (const [channelName, subscribers] of this.subscriptions) {
      if (subscribers.has(userId)) {
        channels.push(channelName);
      }
    }
    return channels;
  }

  /**
   * Obtém estatísticas de canais
   */
  getChannelStats(): ChannelStats[] {
    return Array.from(this.subscriptions.entries()).map(([channelName, subscribers]) => ({
      channelName,
      subscriberCount: subscribers.size,
      lastActivity: new Date(), // Implementar tracking real
    }));
  }

  /**
   * Valida acesso do usuário ao canal
   */
  private async validateChannelAccess(
    userId: string,
    channelName: string
  ): Promise<void> {
    const channelInfo = ChannelFactory.parseChannelName(channelName);
    const config = this.getChannelConfig(channelInfo.domain, channelInfo.scope);

    if (config.security?.requireAuth) {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verificar roles se especificado
      if (config.security.allowedRoles) {
        const hasRole = config.security.allowedRoles.some(role => 
          user.roles.includes(role)
        );
        if (!hasRole) {
          throw new ForbiddenException('Insufficient permissions for channel');
        }
      }

      // Validação customizada
      if (config.security.customValidator) {
        const isValid = config.security.customValidator(userId, channelName);
        if (!isValid) {
          throw new ForbiddenException('Custom validation failed');
        }
      }
    }
  }

  /**
   * Obtém configuração do canal
   */
  private getChannelConfig(domain: string, scope: string): ChannelConfig {
    const key = `${domain}:${scope}`;
    return DEFAULT_CHANNEL_CONFIGS[key] || DEFAULT_CHANNEL_CONFIGS.default;
  }
}

interface ChannelStats {
  channelName: string;
  subscriberCount: number;
  lastActivity: Date;
}
```

## 📊 Monitoramento de Canais

### 1. Métricas por Canal

```typescript
interface ChannelMetrics {
  channelName: string;
  subscriberCount: number;
  messageCount: number;
  lastActivity: Date;
  averageLatency: number;
  errorRate: number;
}
```

### 2. Alertas Automáticos

- **Alto número de subscribers**: > 1000 por canal
- **Taxa de erro elevada**: > 5% de mensagens falhando
- **Latência alta**: > 500ms de latência média
- **Canais órfãos**: Sem atividade por > 24h

## 🔄 Lifecycle de Canais

### 1. Criação Automática
- Canais criados sob demanda na primeira subscrição
- Configuração aplicada automaticamente
- Log de criação para auditoria

### 2. Cleanup Automático
- Canais sem subscribers por > 1h são marcados para cleanup
- Cleanup executado a cada 6 horas
- Preservação de canais críticos (system:*)

### 3. Migração de Canais
- Suporte a renomeação de canais
- Migração transparente de subscribers
- Histórico preservado quando possível

## 🚀 Próximas Evoluções

### Fase 2 - Funcionalidades Avançadas

1. **Canais Hierárquicos**
   - Subscrição a wildcards (user:notifications:*)
   - Herança de permissões
   - Propagação de mensagens

2. **Canais Temporários**
   - TTL automático
   - Cleanup baseado em tempo
   - Uso para sessões específicas

3. **Canais Geográficos**
   - Baseados em localização
   - Notificações regionais
   - Otimização de latência

### Fase 3 - Chat Avançado

1. **Threads de Conversa**
   - Respostas aninhadas
   - Organização de discussões
   - Notificações contextuais

2. **Canais Privados**
   - Criptografia end-to-end
   - Acesso por convite
   - Auditoria completa

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0  
**Status:** Implementação concluída