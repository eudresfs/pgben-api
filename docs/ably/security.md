# Segurança da Integração Ably - Sistema SEMTAS

## 🔒 Visão Geral

Este documento detalha as práticas de segurança implementadas na integração Ably do Sistema SEMTAS, garantindo proteção de dados sensíveis, controle de acesso granular e conformidade com a LGPD.

## 🎯 Princípios de Segurança

### 1. Defesa em Profundidade
- Múltiplas camadas de segurança
- Validação em todos os pontos de entrada
- Princípio do menor privilégio
- Segregação de responsabilidades

### 2. Segurança por Design
- Autenticação obrigatória
- Autorização granular
- Criptografia de dados em trânsito
- Auditoria completa de ações

### 3. Conformidade LGPD
- Minimização de dados
- Consentimento explícito
- Direito ao esquecimento
- Transparência no processamento

## 🔐 Autenticação

### 1. Token JWT

```typescript
interface JWTPayload {
  sub: string;           // User ID
  email: string;         // Email do usuário
  roles: string[];       // Roles do usuário
  permissions: string[]; // Permissões específicas
  iat: number;          // Issued at
  exp: number;          // Expiration
  iss: string;          // Issuer (SEMTAS)
  aud: string;          // Audience (ably-integration)
}
```

### 2. Validação de Token

```typescript
@Injectable()
export class AblyAuthService {
  /**
   * Valida token JWT e extrai informações do usuário
   */
  async validateToken(token: string): Promise<UserContext> {
    try {
      // Verificar assinatura e validade
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Verificar se token não está na blacklist
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revogado');
      }
      
      // Verificar se usuário ainda está ativo
      const user = await this.userService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuário inativo');
      }
      
      return {
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions,
      };
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Token inválido');
    }
  }
  
  /**
   * Gera token de autenticação Ably
   */
  async generateAblyToken(userContext: UserContext): Promise<string> {
    const tokenRequest = {
      clientId: userContext.userId,
      capability: this.buildCapability(userContext),
      timestamp: Date.now(),
      ttl: 3600000, // 1 hora
    };
    
    // Assinar token request com chave Ably
    const token = await this.ablyRest.auth.createTokenRequest(tokenRequest);
    
    // Log da geração do token
    this.auditService.log({
      action: 'ABLY_TOKEN_GENERATED',
      userId: userContext.userId,
      metadata: {
        ttl: tokenRequest.ttl,
        capabilities: Object.keys(tokenRequest.capability),
      },
    });
    
    return token;
  }
  
  /**
   * Constrói capabilities baseado no contexto do usuário
   */
  private buildCapability(userContext: UserContext): Record<string, string[]> {
    const capability: Record<string, string[]> = {};
    
    // Canais de notificação pessoal
    const userNotificationChannel = `user:notifications:${userContext.userId}`;
    capability[userNotificationChannel] = ['subscribe'];
    
    // Canais de presença pessoal
    const userPresenceChannel = `user:presence:${userContext.userId}`;
    capability[userPresenceChannel] = ['subscribe', 'presence'];
    
    // Canais baseado em roles
    if (userContext.roles.includes('ANALISTA')) {
      capability['benefit:status:*'] = ['subscribe', 'publish'];
      capability['benefit:workflow:*'] = ['subscribe', 'publish'];
    }
    
    if (userContext.roles.includes('COORDENADOR')) {
      capability['unit:updates:*'] = ['subscribe', 'publish'];
      capability['group:coordenadores:*'] = ['subscribe', 'publish'];
    }
    
    if (userContext.roles.includes('ADMINISTRADOR')) {
      capability['system:announcements'] = ['subscribe', 'publish'];
      capability['system:metrics:*'] = ['subscribe'];
    }
    
    // Canais públicos para todos os usuários autenticados
    capability['system:announcements'] = ['subscribe'];
    
    return capability;
  }
}

interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}
```

### 3. Refresh Token

```typescript
@Injectable()
export class TokenRefreshService {
  /**
   * Atualiza token Ably antes da expiração
   */
  async refreshAblyToken(userId: string): Promise<string> {
    // Verificar se usuário ainda está autenticado
    const userContext = await this.getCurrentUserContext(userId);
    if (!userContext) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    
    // Gerar novo token
    const newToken = await this.ablyAuthService.generateAblyToken(userContext);
    
    // Notificar cliente sobre novo token
    await this.notificationService.sendTokenRefresh(userId, newToken);
    
    return newToken;
  }
  
  /**
   * Agenda refresh automático de tokens
   */
  @Cron('*/30 * * * *') // A cada 30 minutos
  async scheduleTokenRefresh(): Promise<void> {
    const activeUsers = await this.getActiveAblyUsers();
    
    for (const userId of activeUsers) {
      try {
        await this.refreshAblyToken(userId);
      } catch (error) {
        this.logger.error(`Failed to refresh token for user ${userId}`, error);
      }
    }
  }
}
```

## 🛡️ Autorização

### 1. Controle de Acesso Baseado em Roles (RBAC)

```typescript
// Definição de roles e permissões
export const ROLES = {
  CIDADAO: {
    name: 'CIDADAO',
    permissions: [
      'READ_OWN_BENEFITS',
      'CREATE_BENEFIT_REQUEST',
      'UPLOAD_DOCUMENTS',
      'RECEIVE_NOTIFICATIONS',
    ],
  },
  ANALISTA: {
    name: 'ANALISTA',
    permissions: [
      'READ_ASSIGNED_BENEFITS',
      'UPDATE_BENEFIT_STATUS',
      'REQUEST_DOCUMENTS',
      'ADD_COMMENTS',
      'SEND_NOTIFICATIONS',
    ],
  },
  COORDENADOR: {
    name: 'COORDENADOR',
    permissions: [
      'READ_UNIT_BENEFITS',
      'APPROVE_BENEFITS',
      'MANAGE_ANALYSTS',
      'VIEW_UNIT_METRICS',
      'SEND_UNIT_ANNOUNCEMENTS',
    ],
  },
  ADMINISTRADOR: {
    name: 'ADMINISTRADOR',
    permissions: [
      'READ_ALL_BENEFITS',
      'MANAGE_USERS',
      'MANAGE_SYSTEM',
      'VIEW_ALL_METRICS',
      'SEND_SYSTEM_ANNOUNCEMENTS',
    ],
  },
};
```

### 2. Middleware de Autorização

```typescript
@Injectable()
export class AblyAuthorizationGuard implements CanActivate {
  constructor(
    private readonly ablyAuthService: AblyAuthService,
    private readonly reflector: Reflector,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    
    // Extrair token do header
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }
    
    // Validar token e obter contexto do usuário
    const userContext = await this.ablyAuthService.validateToken(token);
    
    // Verificar permissões se especificadas
    if (requiredPermissions) {
      const hasPermission = requiredPermissions.every(permission =>
        userContext.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        throw new ForbiddenException('Permissões insuficientes');
      }
    }
    
    // Adicionar contexto do usuário à request
    request.user = userContext;
    
    return true;
  }
  
  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### 3. Decorators de Permissão

```typescript
// Decorator para especificar permissões necessárias
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Decorator para especificar roles necessárias
export const RequireRoles = (...roles: string[]) =>
  SetMetadata('roles', roles);

// Uso nos controladores
@Controller('ably')
export class AblyController {
  @Post('token')
  @RequirePermissions('RECEIVE_NOTIFICATIONS')
  async getToken(@Request() req): Promise<{ token: string }> {
    const token = await this.ablyAuthService.generateAblyToken(req.user);
    return { token };
  }
  
  @Post('publish')
  @RequireRoles('ANALISTA', 'COORDENADOR', 'ADMINISTRADOR')
  async publishMessage(
    @Body() publishDto: PublishMessageDto,
    @Request() req,
  ): Promise<void> {
    await this.ablyService.publish(
      publishDto.channel,
      publishDto.message,
      req.user,
    );
  }
}
```

## 🔍 Validação de Canais

### 1. Validação de Acesso a Canais

```typescript
@Injectable()
export class ChannelAccessValidator {
  /**
   * Valida se usuário pode acessar canal específico
   */
  async validateChannelAccess(
    userContext: UserContext,
    channelName: string,
    operation: 'subscribe' | 'publish' | 'presence',
  ): Promise<boolean> {
    const channelInfo = this.parseChannelName(channelName);
    
    switch (channelInfo.domain) {
      case 'user':
        return this.validateUserChannelAccess(userContext, channelInfo, operation);
      
      case 'benefit':
        return this.validateBenefitChannelAccess(userContext, channelInfo, operation);
      
      case 'system':
        return this.validateSystemChannelAccess(userContext, channelInfo, operation);
      
      case 'group':
        return this.validateGroupChannelAccess(userContext, channelInfo, operation);
      
      case 'unit':
        return this.validateUnitChannelAccess(userContext, channelInfo, operation);
      
      default:
        return false;
    }
  }
  
  /**
   * Valida acesso a canais de usuário
   */
  private async validateUserChannelAccess(
    userContext: UserContext,
    channelInfo: ChannelInfo,
    operation: string,
  ): Promise<boolean> {
    const targetUserId = channelInfo.identifier;
    
    // Usuário só pode acessar seus próprios canais
    if (userContext.userId !== targetUserId) {
      // Exceção para administradores
      if (!userContext.roles.includes('ADMINISTRADOR')) {
        return false;
      }
    }
    
    // Validações específicas por escopo
    switch (channelInfo.scope) {
      case 'notifications':
        return operation === 'subscribe' || 
               userContext.permissions.includes('SEND_NOTIFICATIONS');
      
      case 'presence':
        return operation === 'subscribe' || operation === 'presence';
      
      default:
        return false;
    }
  }
  
  /**
   * Valida acesso a canais de benefício
   */
  private async validateBenefitChannelAccess(
    userContext: UserContext,
    channelInfo: ChannelInfo,
    operation: string,
  ): Promise<boolean> {
    const benefitId = channelInfo.identifier;
    
    // Verificar se usuário tem acesso ao benefício
    const hasAccess = await this.benefitAccessService.hasAccess(
      userContext.userId,
      benefitId,
    );
    
    if (!hasAccess) {
      return false;
    }
    
    // Validações específicas por escopo e operação
    switch (channelInfo.scope) {
      case 'status':
        if (operation === 'subscribe') {
          return true; // Qualquer pessoa com acesso pode subscrever
        }
        if (operation === 'publish') {
          return userContext.permissions.includes('UPDATE_BENEFIT_STATUS');
        }
        return false;
      
      case 'workflow':
        return userContext.roles.some(role => 
          ['ANALISTA', 'COORDENADOR', 'ADMINISTRADOR'].includes(role)
        );
      
      default:
        return false;
    }
  }
  
  /**
   * Valida acesso a canais do sistema
   */
  private validateSystemChannelAccess(
    userContext: UserContext,
    channelInfo: ChannelInfo,
    operation: string,
  ): Promise<boolean> {
    switch (channelInfo.scope) {
      case 'announcements':
        if (operation === 'subscribe') {
          return true; // Todos podem subscrever a anúncios
        }
        if (operation === 'publish') {
          return userContext.roles.includes('ADMINISTRADOR');
        }
        return false;
      
      case 'metrics':
        return userContext.permissions.includes('VIEW_METRICS');
      
      default:
        return false;
    }
  }
}
```

### 2. Sanitização de Dados

```typescript
@Injectable()
export class MessageSanitizer {
  /**
   * Sanitiza mensagem antes de publicar
   */
  sanitizeMessage(message: any, userContext: UserContext): any {
    // Remover campos sensíveis
    const sanitized = { ...message };
    
    // Remover informações pessoais se não autorizado
    if (!userContext.permissions.includes('VIEW_PERSONAL_DATA')) {
      delete sanitized.cpf;
      delete sanitized.rg;
      delete sanitized.telefone;
      delete sanitized.endereco;
    }
    
    // Escapar HTML para prevenir XSS
    if (sanitized.content) {
      sanitized.content = this.escapeHtml(sanitized.content);
    }
    
    // Validar tamanho da mensagem
    const messageSize = JSON.stringify(sanitized).length;
    if (messageSize > 64 * 1024) { // 64KB
      throw new BadRequestException('Mensagem muito grande');
    }
    
    // Adicionar metadados de auditoria
    sanitized._metadata = {
      sentBy: userContext.userId,
      sentAt: new Date().toISOString(),
      sanitized: true,
    };
    
    return sanitized;
  }
  
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
```

## 📊 Auditoria e Monitoramento

### 1. Log de Auditoria

```typescript
@Injectable()
export class AblyAuditService {
  /**
   * Registra evento de auditoria
   */
  async logEvent(event: AuditEvent): Promise<void> {
    const auditRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      details: event.details,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      errorMessage: event.errorMessage,
    };
    
    // Salvar no banco de dados
    await this.auditRepository.save(auditRecord);
    
    // Enviar para sistema de monitoramento
    await this.monitoringService.sendAuditEvent(auditRecord);
    
    // Log crítico para eventos de segurança
    if (this.isCriticalEvent(event.action)) {
      this.logger.warn('Critical security event', auditRecord);
      await this.alertService.sendSecurityAlert(auditRecord);
    }
  }
  
  /**
   * Verifica se é evento crítico de segurança
   */
  private isCriticalEvent(action: string): boolean {
    const criticalActions = [
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'TOKEN_VALIDATION_FAILED',
      'PERMISSION_DENIED',
      'SUSPICIOUS_ACTIVITY',
      'MULTIPLE_FAILED_LOGINS',
    ];
    
    return criticalActions.includes(action);
  }
}

interface AuditEvent {
  userId?: string;
  action: string;
  resource?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}
```

### 2. Monitoramento de Segurança

```typescript
@Injectable()
export class SecurityMonitoringService {
  private readonly suspiciousActivityThreshold = 10;
  private readonly timeWindowMs = 5 * 60 * 1000; // 5 minutos
  
  /**
   * Monitora atividade suspeita
   */
  async monitorSuspiciousActivity(userId: string, action: string): Promise<void> {
    const key = `suspicious_activity:${userId}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, this.timeWindowMs / 1000);
    }
    
    if (count > this.suspiciousActivityThreshold) {
      await this.handleSuspiciousActivity(userId, count);
    }
  }
  
  /**
   * Trata atividade suspeita
   */
  private async handleSuspiciousActivity(
    userId: string,
    activityCount: number,
  ): Promise<void> {
    // Log do evento
    await this.auditService.logEvent({
      userId,
      action: 'SUSPICIOUS_ACTIVITY',
      details: { activityCount },
      success: false,
    });
    
    // Bloquear temporariamente o usuário
    await this.userService.temporaryBlock(userId, '15 minutes');
    
    // Revogar tokens ativos
    await this.tokenService.revokeAllTokens(userId);
    
    // Notificar administradores
    await this.notificationService.sendSecurityAlert({
      type: 'SUSPICIOUS_ACTIVITY',
      userId,
      activityCount,
      timestamp: new Date(),
    });
  }
  
  /**
   * Monitora tentativas de acesso não autorizado
   */
  async monitorUnauthorizedAccess(
    userId: string,
    channelName: string,
    ipAddress: string,
  ): Promise<void> {
    await this.auditService.logEvent({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      resource: channelName,
      ipAddress,
      success: false,
    });
    
    // Incrementar contador de tentativas
    await this.monitorSuspiciousActivity(userId, 'UNAUTHORIZED_ACCESS');
  }
}
```

## 🔒 Criptografia e Proteção de Dados

### 1. Criptografia de Dados Sensíveis

```typescript
@Injectable()
export class DataEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  
  /**
   * Criptografa dados sensíveis antes de enviar
   */
  encryptSensitiveData(data: any): EncryptedData {
    const key = crypto.randomBytes(this.keyLength);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('SEMTAS-ABLY', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      data: encrypted,
      key: key.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }
  
  /**
   * Descriptografa dados sensíveis
   */
  decryptSensitiveData(encryptedData: EncryptedData): any {
    const key = Buffer.from(encryptedData.key, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('SEMTAS-ABLY', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}

interface EncryptedData {
  data: string;
  key: string;
  iv: string;
  authTag: string;
}
```

### 2. Proteção contra Ataques

```typescript
@Injectable()
export class SecurityMiddleware {
  /**
   * Rate limiting por usuário
   */
  @UseGuards(ThrottlerGuard)
  @Throttle(100, 60) // 100 requests por minuto
  async handleRequest(req: any, res: any, next: any): Promise<void> {
    // Validar origem da requisição
    const origin = req.headers.origin;
    if (!this.isAllowedOrigin(origin)) {
      throw new ForbiddenException('Origem não autorizada');
    }
    
    // Validar User-Agent
    const userAgent = req.headers['user-agent'];
    if (this.isSuspiciousUserAgent(userAgent)) {
      await this.securityMonitoringService.monitorSuspiciousActivity(
        req.user?.userId,
        'SUSPICIOUS_USER_AGENT',
      );
    }
    
    next();
  }
  
  /**
   * Verifica se origem é permitida
   */
  private isAllowedOrigin(origin: string): boolean {
    const allowedOrigins = [
      'https://semtas.gov.br',
      'https://app.semtas.gov.br',
      'https://staging.semtas.gov.br',
    ];
    
    return allowedOrigins.includes(origin);
  }
  
  /**
   * Detecta User-Agent suspeito
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}
```

## 🛡️ Conformidade LGPD

### 1. Minimização de Dados

```typescript
@Injectable()
export class LGPDComplianceService {
  /**
   * Remove dados pessoais desnecessários
   */
  minimizePersonalData(data: any, purpose: string): any {
    const minimized = { ...data };
    
    // Definir campos necessários por propósito
    const requiredFields = this.getRequiredFieldsByPurpose(purpose);
    
    // Remover campos não necessários
    Object.keys(minimized).forEach(key => {
      if (!requiredFields.includes(key) && this.isPersonalData(key)) {
        delete minimized[key];
      }
    });
    
    return minimized;
  }
  
  /**
   * Anonimiza dados pessoais
   */
  anonymizePersonalData(data: any): any {
    const anonymized = { ...data };
    
    // Anonimizar CPF
    if (anonymized.cpf) {
      anonymized.cpf = this.maskCPF(anonymized.cpf);
    }
    
    // Anonimizar email
    if (anonymized.email) {
      anonymized.email = this.maskEmail(anonymized.email);
    }
    
    // Anonimizar telefone
    if (anonymized.telefone) {
      anonymized.telefone = this.maskPhone(anonymized.telefone);
    }
    
    return anonymized;
  }
  
  /**
   * Registra consentimento para processamento
   */
  async recordConsent(
    userId: string,
    purpose: string,
    dataTypes: string[],
  ): Promise<void> {
    const consent = {
      userId,
      purpose,
      dataTypes,
      timestamp: new Date(),
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
    };
    
    await this.consentRepository.save(consent);
  }
  
  /**
   * Implementa direito ao esquecimento
   */
  async forgetUser(userId: string): Promise<void> {
    // Remover dados pessoais de mensagens Ably
    await this.anonymizeAblyMessages(userId);
    
    // Revogar todos os tokens
    await this.tokenService.revokeAllTokens(userId);
    
    // Remover subscrições
    await this.channelSubscriptionService.removeAllSubscriptions(userId);
    
    // Log da operação
    await this.auditService.logEvent({
      userId,
      action: 'USER_FORGOTTEN',
      success: true,
    });
  }
}
```

## 📋 Checklist de Segurança

### ✅ Implementado

- [x] Autenticação JWT obrigatória
- [x] Autorização baseada em roles (RBAC)
- [x] Validação de acesso a canais
- [x] Sanitização de mensagens
- [x] Rate limiting
- [x] Auditoria completa
- [x] Monitoramento de segurança
- [x] Proteção contra ataques comuns
- [x] Conformidade LGPD básica
- [x] Criptografia de dados sensíveis

### 🔄 Em Desenvolvimento

- [ ] Criptografia end-to-end para chat
- [ ] Detecção avançada de anomalias
- [ ] Integração com WAF
- [ ] Backup seguro de logs de auditoria

### 📅 Planejado

- [ ] Certificação ISO 27001
- [ ] Penetration testing automatizado
- [ ] Análise de vulnerabilidades contínua
- [ ] Treinamento de segurança para desenvolvedores

## 🚨 Procedimentos de Incidente

### 1. Detecção de Incidente

1. **Alertas Automáticos**
   - Monitoramento 24/7
   - Notificação imediata da equipe
   - Escalação automática

2. **Classificação de Severidade**
   - **Crítico**: Vazamento de dados, acesso não autorizado
   - **Alto**: Tentativas de ataque, falhas de autenticação
   - **Médio**: Atividade suspeita, violações de política
   - **Baixo**: Alertas informativos

### 2. Resposta a Incidentes

1. **Contenção Imediata**
   - Bloquear usuários suspeitos
   - Revogar tokens comprometidos
   - Isolar sistemas afetados

2. **Investigação**
   - Análise de logs de auditoria
   - Identificação da causa raiz
   - Avaliação do impacto

3. **Recuperação**
   - Restaurar serviços
   - Aplicar correções
   - Validar segurança

4. **Lições Aprendidas**
   - Documentar incidente
   - Atualizar procedimentos
   - Melhorar monitoramento

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0  
**Status:** Implementação concluída