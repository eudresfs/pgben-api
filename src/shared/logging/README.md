# Sistema de Logging Unificado - NestJS

Um sistema completo e profissional de logging para aplicações NestJS, oferecendo logging estruturado, correlação de requisições, métricas de performance e auditoria de segurança.

## 🚀 Características

- **Logging Estruturado**: Logs em formato JSON com metadados consistentes
- **Correlação de Requisições**: Rastreamento único por requisição com Request ID
- **Múltiplos Transportes**: Console, arquivos rotativos, logs específicos por tipo
- **Logging Especializado**: Métodos específicos para HTTP, Database, Auth, Business, Security
- **Decorators Automáticos**: Logging automático de métodos com `@LogMethod`, `@LogAudit`, etc.
- **Performance Monitoring**: Detecção automática de operações lentas
- **Sanitização de Dados**: Remoção automática de informações sensíveis
- **Configuração por Ambiente**: Diferentes configurações para dev/test/prod

## 📁 Estrutura dos Arquivos

```
src/
├── logging/
│   ├── types/
│   │   └── logging.types.ts           # Tipos e interfaces
│   ├── config/
│   │   └── logger.config.ts           # Configurações e utilitários
│   ├── decorators/
│   │   └── logger.decorator.ts        # Decorators para logging automático
│   ├── middleware/
│   │   └── logging.middleware.ts      # Middleware para contexto de requisição
│   ├── interceptors/
│   │   └── database-logger.interceptor.ts  # Interceptor para operações de DB
│   ├── filters/
│   │   └── error-logger.filter.ts     # Filter para captura de erros
│   ├── examples/
│   │   └── usage-examples.ts          # Exemplos de uso
│   ├── winston.config.ts              # Configuração do Winston
│   ├── logging.service.ts             # Serviço principal de logging
│   ├── logging.interceptor.ts         # Interceptor HTTP principal
│   ├── logging.module.ts              # Módulo de logging
│   └── README.md                      # Este arquivo
```

## 🛠️ Instalação

### 1. Instalar Dependências

```bash
npm install winston nest-winston winston-daily-rotate-file uuid
npm install --save-dev @types/uuid
```

### 2. Configurar Variáveis de Ambiente

```env
# .env
NODE_ENV=development
LOG_LEVEL=debug
LOG_DIR=logs
LOG_MAX_FILE_SIZE=50m
LOG_MAX_FILES=30d
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_ENABLE_HTTP=true
LOG_ENABLE_DATABASE=true
LOG_ENABLE_AUDIT=true
LOG_SENSITIVE_FIELDS=password,token,secret,key,authorization
LOG_SLOW_QUERY_THRESHOLD=1000
LOG_SLOW_REQUEST_THRESHOLD=2000
SILENT_LOGS=false
```

### 3. Configurar no App Module

```typescript
// app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggingModule } from './logging/logging.module';
import { LoggingInterceptor } from './logging/logging.interceptor';
import { LoggingMiddleware } from './logging/middleware/logging.middleware';
import { ErrorLoggerFilter } from './logging/filters/error-logger.filter';
import { DatabaseLoggerInterceptor } from './logging/interceptors/database-logger.interceptor';

@Module({
  imports: [
    LoggingModule,
    // outros módulos...
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DatabaseLoggerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ErrorLoggerFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*');
  }
}
```

## 📖 Guia de Uso

### 1. Uso Básico do LoggingService

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggingService) {
    this.logger.setContext('UserService');
  }

  async findUser(id: string) {
    this.logger.info(`Searching for user: ${id}`);
    
    try {
      const user = await this.repository.findOne(id);
      this.logger.info(`User found: ${id}`, undefined, { userId: id });
      return user;
    } catch (error) {
      this.logger.error(`Failed to find user: ${id}`, error, undefined, { userId: id });
      throw error;
    }
  }
}
```

### 2. Logging Automático com Decorators

```typescript
@Injectable()
export class OrderService {
  // Logging completo do método
  @LogMethod({
    context: 'OrderService',
    logParams: true,
    logResult: false,
    logPerformance: true,
  })
  async createOrder(orderData: any) {
    // Sua lógica aqui
    return { id: '123', status: 'created' };
  }

  // Logging de auditoria
  @LogAudit('Order')
  async deleteOrder(orderId: string, userId: string) {
    // Sua lógica aqui
    return { deleted: true };
  }

  // Logging apenas de performance
  @LogPerformance('OrderService', 200) // threshold 200ms
  async calculateTotal(items: any[]) {
    // Cálculo complexo
    return total;
  }
}
```

### 3. Logging de Operações de Banco de Dados

```typescript
@Injectable()
export class ProductRepository {
  constructor(private readonly logger: LoggingService) {}

  @DatabaseOperation('Product', 'findAll')
  async findAll(): Promise<Product[]> {
    const startTime = Date.now();
    
    try {
      const products = await this.repository.find();
      const duration = Date.now() - startTime;
      
      this.logger.logDatabase({
        operation: 'SELECT',
        entity: 'Product',
        duration,
        query: 'SELECT * FROM products',
        userId: 'system',
      });
      
      return products;
    } catch (error) {
      this.logger.error('Database query failed', error, 'Database');
      throw error;
    }
  }
}
```

### 4. Logging de Autenticação

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly logger: LoggingService) {}

  async login(email: string, password: string, ip: string, userAgent: string) {
    try {
      const user = await this.validateCredentials(email, password);
      
      // Log de sucesso
      this.logger.logAuth({
        operation: 'LOGIN',
        userId: user.id,
        success: true,
        ip,
        userAgent,
      });

      return { token: 'jwt-token', user };
    } catch (error) {
      // Log de falha + evento de segurança
      this.logger.logAuth({
        operation: 'LOGIN',
        userId: email,
        success: false,
        reason: 'invalid_credentials',
        ip,
        userAgent,
      });

      this.logger.logSecurity(
        `Failed login attempt for ${email}`,
        'medium',
        { email, ip, userAgent }
      );

      throw error;
    }
  }
}
```

### 5. Logging de Operações de Negócio

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggingService) {}

  async processPayment(paymentData: any, userId: string) {
    const { amount, orderId, method } = paymentData;
    
    // Log de início
    this.logger.logBusiness({
      operation: 'PAYMENT_PROCESS',
      entity: 'Payment',
      entityId: orderId,
      userId,
      details: { amount, method },
    });

    try {
      const result = await this.processPaymentLogic(paymentData);
      
      // Log de sucesso
      this.logger.logBusiness({
        operation: 'PAYMENT_SUCCESS',
        entity: 'Payment',
        entityId: result.id,
        userId,
        details: { amount, orderId, method, status: 'approved' },
      });

      return result;
    } catch (error) {
      // Log de falha
      this.logger.logBusiness({
        operation: 'PAYMENT_FAILURE',
        entity: 'Payment',
        entityId: orderId,
        userId,
        details: { amount, method, error: error.message },
      });

      throw error;
    }
  }
}
```

### 6. Uso no Controller com Contexto

```typescript
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('UserController');
  }

  @Get(':id')
  async getUser(@Param('id') id: string, @LogContext() logContext: any) {
    this.logger.info(`Getting user ${id}`, undefined, {
      requestId: logContext.requestId,
      userId: logContext.userId,
    });

    return this.userService.findUser(id);
  }
}
```

## 📊 Tipos de Log e Estrutura

### Logs HTTP
```json
{
  "message": "HTTP: GET /api/users/123 - 200 - 150ms",
  "level": "info",
  "context": "HTTP",
  "timestamp": "2025-06-23T10:30:00.000Z",
  "method": "GET",
  "url": "/api/users/123",
  "statusCode": 200,
  "duration": 150,
  "requestId": "req_abc123",
  "userId": "user_456"
}
```

### Logs de Banco de Dados
```json
{
  "message": "DB: SELECT User - 85ms",
  "level": "info",
  "context": "Database",
  "timestamp": "2025-06-23T10:30:00.000Z",
  "operation": "SELECT",
  "entity": "User",
  "duration": 85,
  "query": "SELECT * FROM users WHERE id = ?",
  "requestId": "req_abc123"
}
```

### Logs de Autenticação
```json
{
  "message": "Auth: LOGIN - User: user123 - SUCCESS",
  "level": "info",
  "context": "Authentication",
  "timestamp": "2025-06-23T10:30:00.000Z",
  "operation": "LOGIN",
  "userId": "user123",
  "success": true,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Logs de Segurança
```json
{
  "message": "Security: Failed login attempt for admin@test.com",
  "level": "warn",
  "context": "Security",
  "timestamp": "2025-06-23T10:30:00.000Z",
  "securityEvent": true,
  "severity": "medium",
  "email": "admin@test.com",
  "ip": "192.168.1.100"
}
```

## 🎯 Configuração Avançada

### Personalizar Campos Sensíveis
```typescript
// winston.config.ts
const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'ssn'];
```

### Ajustar Thresholds de Performance
```typescript
// .env
LOG_SLOW_QUERY_THRESHOLD=500    # Queries > 500ms são marcadas como lentas
LOG_SLOW_REQUEST_THRESHOLD=1000 # Requests > 1s são marcadas como lentos
```

### Configurar Rotação de Logs
```typescript
// winston.config.ts
new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',        // Tamanho máximo por arquivo
  maxFiles: '30d',       // Manter logs por 30 dias
})
```

## 🔍 Monitoramento e Alertas

### Estrutura dos Logs para Monitoramento
- **Performance Flags**: `FAST`, `MODERATE`, `SLOW`, `CRITICAL_SLOW`
- **Security Events**: Campo `securityEvent: true` para eventos de segurança
- **Audit Trail**: Campo `auditEvent: true` para operações críticas
- **Error Classification**: Diferentes níveis baseados no tipo de erro

### Integração com Ferramentas de Monitoramento
Os logs estruturados podem ser facilmente integrados com:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana + Loki**
- **Datadog**
- **New Relic**
- **CloudWatch**

## 🚨 Troubleshooting

### Problema: Logs não aparecem
1. Verificar variável `SILENT_LOGS`
2. Verificar nível de log configurado
3. Verificar permissões da pasta de logs

### Problema: Performance degradada
1. Reduzir nível de log em produção
2. Ajustar thresholds de performance
3. Verificar rotação de arquivos

### Problema: Logs muito verbosos
1. Ajustar `LOG_LEVEL` para `warn` ou `error`
2. Desabilitar logs de desenvolvimento
3. Filtrar logs por contexto

## 📝 Boas Práticas

1. **Sempre definir contexto** nos serviços usando `setContext()`
2. **Não logar informações sensíveis** - use a sanitização automática
3. **Use níveis apropriados**: `error` para erros, `warn` para alertas, `info` para operações importantes
4. **Inclua Request ID** sempre que possível para correlação
5. **Use logging estruturado** com metadados em vez de strings
6. **Configure rotação adequada** para evitar enchimento de disco
7. **Monitore performance** dos próprios logs em produção

## 🤝 Contribuição

Para contribuir com melhorias:
1. Mantenha compatibilidade com versões anteriores
2. Adicione testes para novas funcionalidades
3. Documente mudanças no README
4. Siga as convenções de naming estabelecidas

## 📄 Licença

Este sistema de logging é fornecido como exemplo e pode ser adaptado conforme necessário para seu projeto.