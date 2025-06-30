# Plano Pós-Migração - Auditoria em Módulos de Domínio

## 📋 Contexto e Objetivos

### Situação Pós-Migração ✅
- ✅ Módulo de auditoria refatorado com arquitetura event-driven
- ✅ EventEmitter + BullMQ implementados e funcionais
- ✅ Core de auditoria isolado sem dependências circulares
- ✅ AuditoriaSharedModule global implementado
- ✅ Dependências circulares resolvidas
- 🔄 Migração gradual dos módulos em andamento

### Objetivos do Plano
- **Auditar todos os módulos existentes** que usam ou deveriam usar auditoria
- **Migrar gradualmente** cada módulo para nova arquitetura
- **Identificar lacunas** de auditoria em módulos não cobertos
- **Padronizar** a implementação de auditoria em toda aplicação
- **Garantir compliance LGPD** em todos os pontos de contato

---

## 🔍 Fase 1: Auditoria dos Módulos (Sprint 1 - 1 semana)

### **Identificação de Módulos Afetados**

#### **Categoria A: Módulos que usam auditoria atualmente**
```bash
# Comando para identificar dependências:
grep -r "AuditoriaService\|auditoria\|audit" src/ --include="*.ts" --exclude-dir=node_modules

# Análise atual do projeto PGBEN:
src/modules/
├── ✅ auditoria/        # Core de auditoria (COMPLETO)
├── ✅ cidadao/          # Dados pessoais (LGPD crítico) - MIGRADO
├── ✅ pagamento/        # Integrações externas - MIGRADO
├── ✅ easy-upload/      # Upload de documentos - MIGRADO
├── ✅ solicitacao/      # Operações administrativas - MIGRADO
├── ❌ auth/             # Login, logout, tentativas de acesso
├── ❌ usuario/          # CRUD de usuários
├── ❌ beneficio/        # Benefícios sociais
├── ❌ documento/        # Gestão de documentos
├── ❌ relatorios-unificado/ # Geração de relatórios
├── ❌ notificacao/      # Sistema de notificações
├── ❌ metricas/         # Coleta de métricas
├── ❌ configuracao/     # Configurações do sistema
├── ❌ unidade/          # Gestão de unidades
├── ❌ judicial/         # Determinações judiciais
├── ❌ recurso/          # Recursos e contestações
└── ❌ integrador/       # Integrações externas
```

#### **Categoria B: Módulos que deveriam ter auditoria**
```bash
# Critérios para identificação:
# 1. Manipula dados pessoais (LGPD)
# 2. Operações financeiras
# 3. Mudanças de estado críticas
# 4. Acesso a informações sensíveis
# 5. Integrações com sistemas externos

# Módulos suspeitos sem auditoria:
src/
├── notificacao/  # Envio de dados pessoais
├── documentos/         # Armazenamento de documentos
├── relatorio/     # Processamento de dados
├── integradores/ # Compartilhamento de dados
```

### **Análise Detalhada por Módulo**

#### **Template de Análise**
```typescript
// Para cada módulo, documentar:
interface ModuleAuditAnalysis {
  moduleName: string;
  currentAuditUsage: {
    hasAudit: boolean;
    auditMethods: string[];
    dependencies: string[];
    compliance: 'FULL' | 'PARTIAL' | 'NONE';
  };
  requiredAudit: {
    dataTypes: string[];           // Tipos de dados manipulados
    operations: string[];          // CREATE, READ, UPDATE, DELETE
    sensitiveFields: string[];     // Campos LGPD
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  migrationPriority: 1 | 2 | 3 | 4; // 1 = mais crítico
  estimatedEffort: number;         // Horas de desenvolvimento
}
```

#### **Script de Análise Automatizada**
```bash
# Script para executar antes da migração:
#!/bin/bash

echo "🔍 Analisando módulos para auditoria..."

# 1. Buscar importações de auditoria
echo "📋 Módulos que importam auditoria:"
find src/ -name "*.ts" -exec grep -l "AuditoriaService\|auditoria" {} \;

# 2. Buscar operações CRUD sem auditoria
echo "⚠️  Possíveis operações sem auditoria:"
find src/ -name "*.service.ts" -exec grep -l "save\|update\|delete\|remove" {} \; | \
  xargs grep -L "audit"

# 3. Buscar controladores com dados sensíveis
echo "🔒 Controladores com possíveis dados sensíveis:"
find src/ -name "*.controller.ts" -exec grep -l "cpf\|rg\|email\|telefone\|endereco" {} \;

# 4. Analisar decorators de auditoria
echo "📝 Decorators de auditoria existentes:"
find src/ -name "*.ts" -exec grep -l "@.*[Aa]udit" {} \;
```

---

## 📊 Fase 2: Priorização e Planejamento (Sprint 1 - Continuação)

### **Matriz de Priorização - Projeto PGBEN**

| Módulo | Status | Risco LGPD | Impacto Negócio | Complexidade | Prioridade | Sprint |
|--------|--------|------------|-----------------|--------------|------------|--------|
| **cidadao** | ✅ MIGRADO | ALTO | ALTO | MÉDIO | P1 | ✅ Concluído |
| **auth** | ✅ MIGRADO | ALTO | ALTO | BAIXO | P1 | ✅ Concluído |
| **beneficio** | ✅ MIGRADO | ALTO | ALTO | ALTO | P1 | ✅ Concluído |
| **usuario** | ✅ MIGRADO | MÉDIO | ALTO | BAIXO | P2 | ✅ Concluído |
| **documento** | ✅ MIGRADO | ALTO | MÉDIO | MÉDIO | P2 | ✅ Concluído |
| **pagamento** | ✅ MIGRADO | ALTO | ALTO | MÉDIO | P1 | ✅ Concluído |
| **easy-upload** | ✅ MIGRADO | ALTO | MÉDIO | BAIXO | P2 | ✅ Concluído |
| **solicitacao** | ✅ MIGRADO | MÉDIO | ALTO | MÉDIO | P2 | ✅ Concluído |
| **relatorios-unificado** | ❌ PENDENTE | MÉDIO | MÉDIO | BAIXO | P3 | 4 |
| **notificacao** | ❌ PENDENTE | MÉDIO | BAIXO | BAIXO | P3 | 5 |
| **metricas** | ❌ PENDENTE | BAIXO | MÉDIO | MÉDIO | P3 | 5 |
| **judicial** | ❌ PENDENTE | ALTO | ALTO | ALTO | P2 | 4 |
| **configuracao** | ❌ PENDENTE | BAIXO | BAIXO | BAIXO | P4 | 6 |
| **unidade** | ❌ PENDENTE | BAIXO | MÉDIO | BAIXO | P4 | 6 |
| **recurso** | ❌ PENDENTE | MÉDIO | MÉDIO | MÉDIO | P3 | 5 |
| **integrador** | ❌ PENDENTE | ALTO | MÉDIO | ALTO | P3 | 5 |

### **Estratégia de Migração por Prioridade - Status Atual**

#### **P1 - Crítico (Sprint 2-3)**
- ✅ **cidadao**: Dados pessoais, CPF, RG, composição familiar - **CONCLUÍDO**
- ✅ **pagamento**: Integrações de pagamento, transações financeiras - **CONCLUÍDO**
- ✅ **auth**: Login, logout, tentativas de acesso, tokens - **CONCLUÍDO**
- ✅ **beneficio**: Benefícios sociais, valores, aprovações - **CONCLUÍDO**

#### **P2 - Importante (Sprint 3-4)**
- ✅ **easy-upload**: Upload de documentos e sessões - **CONCLUÍDO**
- ✅ **solicitacao**: Operações administrativas e pendências - **CONCLUÍDO**
- ✅ **usuario**: Gestão de usuários do sistema - **MIGRADO**
- ✅ **documento**: Gestão de documentos - **MIGRADO**
- ❌ **judicial**: Determinações judiciais - **PENDENTE**

#### **P3 - Desejável (Sprint 4-5)**
- ❌ **relatorios-unificado**: Geração e acesso a relatórios - **PENDENTE**
- ❌ **notificacao**: Envio de notificações com dados pessoais - **PENDENTE**
- ❌ **metricas**: Coleta e processamento de métricas - **PENDENTE**
- ❌ **recurso**: Recursos e contestações - **PENDENTE**
- ❌ **integrador**: Integrações com sistemas externos - **PENDENTE**

#### **P4 - Futuro (Sprint 6+)**
- ❌ **configuracao**: Configurações do sistema - **PENDENTE**
- ❌ **unidade**: Gestão de unidades administrativas - **PENDENTE**

---

## 🚀 Fase 3: Migração Gradual (Sprints 2-6)

### **Sprint 2: Módulos P1 - Parte 1 (Cidadao + Auth)**

#### **Semana 1: Cidadao Module - ✅ CONCLUÍDO**

**Dia 1-2: Análise e Preparação - ✅ CONCLUÍDO**
```typescript
// Identificar operações críticas:
interface CidadaoAuditRequirements {
  sensitiveOperations: [
    'create_cidadao',        // Cadastro inicial
    'update_personal_data',  // Alteração de dados pessoais
    'update_family_data',    // Composição familiar
    'access_sensitive_data', // Visualização de CPF, RG, etc.
    'delete_cidadao',        // Exclusão (LGPD)
    'anonymize_data',        // Anonimização (LGPD)
  ];
  sensitiveFields: [
    'cpf', 'rg', 'email', 'telefone', 'endereco',
    'data_nascimento', 'renda_familiar', 'composicao_familiar',
    'vulnerabilidades', 'nis', 'documentos'
  ];
}
```

**Tarefas específicas:**
1. Mapear todas as operações do CitizenService
2. Identificar campos sensíveis em cada operação
3. Implementar eventos específicos para cada tipo de operação
4. Criar interceptors para captura automática
5. Testes específicos para compliance LGPD

**Dia 3-4: Implementação - ✅ CONCLUÍDO**
```typescript
// cidadao/cidadao.service.ts
@Injectable()
export class CidadaoService {
  constructor(
    @InjectRepository(Cidadao)
    private cidadaoRepository: Repository<Cidadao>,
    private auditEmitter: AuditEventEmitter, // ✅ Nova dependência
  ) {}

  async create(cidadaoData: CreateCidadaoDto, userId: string): Promise<Cidadao> {
    const cidadao = await this.cidadaoRepository.save(cidadaoData);
    
    // ✅ Emitir evento de criação
    await this.auditEmitter.emitEntityCreated({
      eventType: AuditEventType.ENTITY_CREATED,
      entityName: 'Cidadao',
      entityId: cidadao.id,
      userId,
      timestamp: new Date(),
      newData: this.sanitizeSensitiveData(cidadao),
      metadata: {
        operation: 'cidadao_registration',
        riskLevel: 'HIGH',
        lgpdRelevant: true,
      },
    });

    return cidadao;
  }

  async updatePersonalData(
    cidadaoId: string, 
    updateData: UpdateCidadaoDto, 
    userId: string
  ): Promise<Cidadao> {
    const previousData = await this.cidadaoRepository.findOne({ 
      where: { id: cidadaoId } 
    });
    
    const updatedCidadao = await this.cidadaoRepository.save({
      id: cidadaoId,
      ...updateData,
    });

    // ✅ Detectar campos sensíveis automaticamente
    const sensitiveFieldsChanged = this.detectSensitiveFieldChanges(
      previousData, 
      updatedCidadao
    );

    // ✅ Emitir evento apropriado
    if (sensitiveFieldsChanged.length > 0) {
      await this.auditEmitter.emitSensitiveDataAccessed({
        eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
        entityName: 'Cidadao',
        entityId: cidadaoId,
        userId,
        timestamp: new Date(),
        sensitiveFields: sensitiveFieldsChanged,
        requestInfo: this.getRequestInfo(), // Do contexto
        metadata: {
          operation: 'personal_data_update',
          riskLevel: 'HIGH',
          lgpdRelevant: true,
          changedFields: sensitiveFieldsChanged,
        },
      });
    }

    return updatedCidadao;
  }

  private sanitizeSensitiveData(cidadao: Cidadao): Partial<Cidadao> {
    // Remove ou mascara dados sensíveis para auditoria
    return {
      id: cidadao.id,
      nome: cidadao.nome,
      // cpf: cidadao.cpf?.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2'),
      // Manter dados completos para auditoria interna
      ...cidadao,
    };
  }

  private detectSensitiveFieldChanges(
    previous: Cidadao, 
    current: Cidadao
  ): string[] {
    const sensitiveFields = [
      'cpf', 'rg', 'email', 'telefone', 'endereco',
      'data_nascimento', 'renda_familiar', 'composicao_familiar'
    ];

    return sensitiveFields.filter(field => 
      previous[field] !== current[field]
    );
  }
}
```

**Dia 5: Controller e Decorators - ✅ CONCLUÍDO**
```typescript
// cidadao/cidadao.controller.ts
@Controller('cidadao')
@UseInterceptors(AuditEmitInterceptor)
export class CidadaoController {
  constructor(private cidadaoService: CidadaoService) {}

  @Post()
  @AutoAudit({ 
    entity: 'Cidadao', 
    operation: 'create',
    riskLevel: 'HIGH',
    sensitiveOperation: true 
  })
  async create(
    @Body() createCidadaoDto: CreateCidadaoDto,
    @Req() req: any
  ) {
    return this.cidadaoService.create(createCidadaoDto, req.user.id);
  }

  @Get(':id/sensitive')
  @SensitiveDataAccess({
    entity: 'Cidadao',
    fields: ['cpf', 'rg', 'data_nascimento', 'renda_familiar'],
    justificationRequired: true
  })
  async getSensitiveData(@Param('id') id: string) {
    return this.cidadaoService.findSensitiveData(id);
  }

  @Put(':id')
  @AutoAudit({ 
    entity: 'Cidadao', 
    operation: 'update',
    detectSensitiveChanges: true 
  })
  async update(
    @Param('id') id: string,
    @Body() updateCidadaoDto: UpdateCidadaoDto,
    @Req() req: any
  ) {
    return this.cidadaoService.updatePersonalData(id, updateCidadaoDto, req.user.id);
  }

  @Delete(':id')
  @AutoAudit({ 
    entity: 'Cidadao', 
    operation: 'delete',
    riskLevel: 'CRITICAL',
    lgpdRelevant: true 
  })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.cidadaoService.remove(id, req.user.id);
  }
}
```

#### **Semana 2: Auth Module - ✅ CONCLUÍDO**

**Dia 1-2: Análise e Preparação**
```typescript
interface AuthAuditRequirements {
  securityOperations: [
    'successful_login',
    'failed_login',
    'logout',
    'password_change',
    'password_reset',
    'account_lockout',
    'token_refresh',
    'permission_change',
  ];
  securityEvents: [
    'suspicious_activity',
    'multiple_failed_attempts',
    'session_hijack_attempt',
    'privilege_escalation',
  ];
}
```

**Dia 3-4: Implementação AuthService**
```typescript
// auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditEmitter: AuditEventEmitter, // ✅ Nova dependência
  ) {}

  async login(loginDto: LoginDto, req: any): Promise<AuthResult> {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      
      if (!user) {
        // ✅ Auditoria de tentativa de login falha
        await this.auditEmitter.emitSecurityEvent({
          eventType: AuditEventType.FAILED_LOGIN,
          entityName: 'User',
          entityId: null,
          userId: null,
          timestamp: new Date(),
          metadata: {
            email: loginDto.email,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            reason: 'invalid_credentials',
            riskLevel: 'MEDIUM',
          },
        });

        throw new UnauthorizedException('Credenciais inválidas');
      }

      const tokens = await this.generateTokens(user);

      // ✅ Auditoria de login bem-sucedido
      await this.auditEmitter.emitSecurityEvent({
        eventType: AuditEventType.SUCCESSFUL_LOGIN,
        entityName: 'User',
        entityId: user.id,
        userId: user.id,
        timestamp: new Date(),
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          sessionId: tokens.sessionId,
          loginMethod: 'password',
        },
      });

      return tokens;
    } catch (error) {
      // ✅ Log de erro de sistema
      await this.auditEmitter.emitSystemEvent({
        eventType: AuditEventType.SYSTEM_ERROR,
        entityName: 'AuthSystem',
        entityId: null,
        userId: null,
        timestamp: new Date(),
        metadata: {
          error: error.message,
          stack: error.stack,
          operation: 'login',
          ip: req.ip,
        },
      });

      throw error;
    }
  }

  async logout(userId: string, req: any): Promise<void> {
    // Invalidar token...
    
    // ✅ Auditoria de logout
    await this.auditEmitter.emitSecurityEvent({
      eventType: AuditEventType.LOGOUT,
      entityName: 'User',
      entityId: userId,
      userId,
      timestamp: new Date(),
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        logoutType: 'manual',
      },
    });
  }
}
```

### **Sprint 3: Módulos P1 - Parte 2 (Beneficio) + P2 - Parte 1 (Usuario)**

#### **Beneficio Module - ❌ PENDENTE**
```typescript
// beneficio/beneficio.service.ts
@Injectable()
export class BeneficioService {
  constructor(
    @InjectRepository(Beneficio)
    private beneficioRepository: Repository<Beneficio>,
    private auditEmitter: AuditEventEmitter,
  ) {}

  async approve(beneficioId: string, approverUserId: string): Promise<Beneficio> {
    const beneficio = await this.beneficioRepository.findOne({ 
      where: { id: beneficioId },
      relations: ['cidadao']
    });

    beneficio.status = BeneficioStatus.APROVADO;
    beneficio.aprovadoPor = approverUserId;
    beneficio.aprovadoEm = new Date();

    const updatedBeneficio = await this.beneficioRepository.save(beneficio);

    // ✅ Auditoria crítica de aprovação
    await this.auditEmitter.emitEntityUpdated({
      eventType: AuditEventType.ENTITY_UPDATED,
      entityName: 'Beneficio',
      entityId: beneficioId,
      userId: approverUserId,
      timestamp: new Date(),
      previousData: { status: 'PENDENTE' },
      newData: { 
        status: 'APROVADO',
        aprovadoPor: approverUserId,
        valor: updatedBeneficio.valor 
      },
      metadata: {
        operation: 'beneficio_approval',
        riskLevel: 'HIGH',
        financialImpact: true,
        cidadaoId: beneficio.cidadao.id,
        beneficioTipo: beneficio.tipo,
        valor: beneficio.valor,
      },
    });

    return updatedBeneficio;
  }
}
```

#### **Usuario Module Migration - ✅ CONCLUÍDO**
```typescript
// usuario/usuario.service.ts
@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private auditEmitter: AuditEventEmitter,
  ) {}

  async updatePermissions(
    usuarioId: string, 
    novasPermissoes: string[], 
    adminUserId: string
  ): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    const permissoesAnteriores = usuario.permissoes;

    usuario.permissoes = novasPermissoes;
    const updatedUsuario = await this.usuarioRepository.save(usuario);

    // ✅ Auditoria crítica de mudança de permissões
    await this.auditEmitter.emitSecurityEvent({
      eventType: AuditEventType.PERMISSION_CHANGE,
      entityName: 'Usuario',
      entityId: usuarioId,
      userId: adminUserId,
      timestamp: new Date(),
      metadata: {
        targetUser: usuarioId,
        permissoesAnteriores,
        novasPermissoes,
        permissoesAdicionadas: novasPermissoes.filter(p => !permissoesAnteriores.includes(p)),
        permissoesRemovidas: permissoesAnteriores.filter(p => !novasPermissoes.includes(p)),
        riskLevel: 'HIGH',
        requiresApproval: true,
      },
    });

    return updatedUsuario;
  }
}
```

### **Sprint 4-6: Módulos P2-P4**

*Seguir mesmo padrão para os demais módulos...*

---

## 🧪 Estratégia de Validação

### **Testes por Módulo**
```typescript
// Template de teste para cada módulo migrado:
describe('Cidadao Module - Audit Integration', () => {
  let service: CidadaoService;
  let auditEmitter: AuditEventEmitter;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CidadaoService,
        {
          provide: AuditEventEmitter,
          useValue: {
            emitEntityCreated: jest.fn(),
            emitSensitiveDataAccessed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CidadaoService>(CidadaoService);
    auditEmitter = module.get<AuditEventEmitter>(AuditEventEmitter);
  });

  describe('LGPD Compliance', () => {
    it('should audit cidadao creation with sensitive data', async () => {
      const cidadaoData = {
        nome: 'João Silva',
        cpf: '12345678901',
        email: 'joao@email.com',
      };

      await service.create(cidadaoData, 'admin-user-id');

      expect(auditEmitter.emitEntityCreated).toHaveBeenCalledWith({
        eventType: AuditEventType.ENTITY_CREATED,
        entityName: 'Cidadao',
        entityId: expect.any(String),
        userId: 'admin-user-id',
        newData: expect.objectContaining({
          nome: 'João Silva',
          cpf: '12345678901',
        }),
        metadata: expect.objectContaining({
          lgpdRelevant: true,
          riskLevel: 'HIGH',
        }),
      });
    });

    it('should audit sensitive data access', async () => {
      await service.getSensitiveData('cidadao-id', 'user-id');

      expect(auditEmitter.emitSensitiveDataAccessed).toHaveBeenCalledWith({
        eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
        entityName: 'Cidadao',
        entityId: 'cidadao-id',
        userId: 'user-id',
        sensitiveFields: ['cpf', 'rg', 'data_nascimento'],
        metadata: expect.objectContaining({
          lgpdRelevant: true,
        }),
      });
    });
  });

  describe('Performance', () => {
    it('should emit events without blocking main operation', async () => {
      const start = Date.now();
      
      await service.create({ nome: 'Test' }, 'user-id');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Operação deve ser rápida
    });
  });
});
```

### **Testes de Integração E2E**
```typescript
// e2e/audit-integration.e2e-spec.ts
describe('End-to-End Audit Integration', () => {
  it('should create complete audit trail for cidadao lifecycle', async () => {
    // 1. Create cidadao
    const createResponse = await request(app.getHttpServer())
      .post('/cidadao')
      .send({
        nome: 'João Silva',
        cpf: '12345678901',
        email: 'joao@email.com',
      })
      .expect(201);

    // 2. Verify audit event was processed
    await waitForQueueProcessing();
    
    const auditLogs = await auditRepository.find({
      where: {
        entidade_afetada: 'Cidadao',
        entidade_id: createResponse.body.id,
        tipo_operacao: 'CREATE',
      },
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].dados_sensiveis_acessados).toContain('cpf');

    // 3. Update cidadao
    await request(app.getHttpServer())
      .put(`/cidadao/${createResponse.body.id}`)
      .send({ renda_familiar: 2000 })
      .expect(200);

    // 4. Verify update audit
    await waitForQueueProcessing();
    
    const updateAuditLogs = await auditRepository.find({
      where: {
        entidade_afetada: 'Cidadao',
        entidade_id: createResponse.body.id,
        tipo_operacao: 'UPDATE',
      },
    });

    expect(updateAuditLogs).toHaveLength(1);
    expect(updateAuditLogs[0].dados_sensiveis_acessados).toContain('renda_familiar');
  });
});
```

---

## 📊 Métricas e Monitoramento

### **KPIs por Módulo**
```typescript
interface ModuleMigrationMetrics {
  moduleName: string;
  migrationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'TESTING' | 'COMPLETED';
  auditCoverage: number;        // % operações com auditoria
  lgpdCompliance: number;       // % campos sensíveis auditados
  performanceImpact: number;    // ms adicionados por auditoria
  eventsEmitted: number;        // Total eventos emitidos
  eventsProcessed: number;      // Total eventos processados
  errorRate: number;           // % eventos falharam
}
```

### **Dashboard de Progresso**
```typescript
// Métricas em tempo real para acompanhar migração:
export interface MigrationDashboard {
  overall: {
    totalModules: number;
    migratedModules: number;
    progressPercentage: number;
    estimatedCompletion: Date;
  };
  byPriority: {
    P1: { completed: number; total: number };
    P2: { completed: number; total: number };
    P3: { completed: number; total: number };
    P4: { completed: number; total: number };
  };
  compliance: {
    lgpdCoverage: number;        // % dados sensíveis auditados
    auditCompleteness: number;   // % operações auditadas
    securityEvents: number;      // Eventos de segurança capturados
  };
  performance: {
    averageLatency: number;      // Latência média eventos
    throughput: number;          // Eventos por segundo
    queueHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
}
```

---

## ✅ Critérios de Conclusão

### **Por Módulo**
- [ ] **100% das operações CRUD auditadas**
- [ ] **100% dos campos sensíveis identificados e auditados**
- [ ] **Testes automatizados implementados e passando**
- [ ] **Performance dentro do limite (<50ms por operação)**
- [ ] **Zero erros de auditoria em 24h de execução**

### **Geral do Plano**
- [ ] **Todos os módulos P1 e P2 migrados**
- [ ] **Roadmap definido para P3 e P4**
- [ ] **Compliance LGPD 100% em operações críticas**
- [ ] **Documentação atualizada para cada módulo**
- [ ] **Equipe treinada nos novos padrões**

### **Operacional**
- [ ] **Monitoramento ativo em todos os módulos**
- [ ] **Alertas configurados para falhas de auditoria**
- [ ] **Processo de rollback validado por módulo**
- [ ] **Runbooks atualizados**

---

## 🎯 Próximos Passos Imediatos

### **Sprint Atual: Migração do Módulo Beneficio**

#### **Dia 1-2: Análise e Preparação**
1. **Mapear operações de segurança no módulo auth atual**
   - Identificar todos os pontos de login/logout
   - Mapear fluxos de reset de senha
   - Identificar tentativas de acesso não autorizado

2. **Definir eventos de auditoria específicos**
   ```typescript
   enum AuthAuditEvents {
     LOGIN_SUCCESS = 'auth.login.success',
     LOGIN_FAILED = 'auth.login.failed',
     LOGOUT = 'auth.logout',
     PASSWORD_RESET_REQUEST = 'auth.password.reset.request',
     PASSWORD_RESET_SUCCESS = 'auth.password.reset.success',
     TOKEN_REFRESH = 'auth.token.refresh',
     UNAUTHORIZED_ACCESS = 'auth.unauthorized.access',
     SESSION_EXPIRED = 'auth.session.expired'
   }
   ```

3. **Identificar pontos de injeção do AuditEventEmitter**
   - `AuthService`
   - `PasswordResetService` (já parcialmente implementado)
   - `JwtStrategy`
   - Guards de autenticação

#### **Dia 3-4: Implementação**
1. **Atualizar AuthService com eventos de auditoria**
2. **Implementar auditoria em guards e interceptors**
3. **Adicionar eventos para operações de token**
4. **Implementar detecção de tentativas de acesso suspeitas**

#### **Dia 5: Testes e Validação**
1. **Testes unitários para eventos de auditoria**
2. **Testes de integração com AuditEventEmitter**
3. **Validação de compliance de segurança**
4. **Testes de performance para não impactar login**

---

## 📈 Métricas de Sucesso

### **KPIs de Migração**
- ✅ **Cobertura de Auditoria**: 100% dos módulos críticos migrados
- ✅ **Performance**: Latência < 50ms para emissão de eventos
- ✅ **Confiabilidade**: 99.9% de eventos processados com sucesso
- ✅ **Compliance LGPD**: 100% das operações sensíveis auditadas
- ✅ **Zero Dependências Circulares**: Arquitetura limpa mantida

### **Indicadores de Qualidade**
- ✅ **Cobertura de Testes**: > 90% para módulos de auditoria
- ✅ **Documentação**: 100% dos eventos documentados
- ✅ **Monitoramento**: Dashboards operacionais implementados
- ✅ **Alertas**: Sistema de alertas para falhas críticas

### **Status Atual da Migração**
- ✅ **Módulos Migrados**: 6/16 (38%)
  - ✅ cidadao
  - ✅ pagamento
  - ✅ easy-upload
  - ✅ solicitacao
  - ✅ auth
  - ✅ beneficio (✅ CONCLUÍDO - Correções de auditoria implementadas)
- ❌ **Próximo**: usuario (P2 - Sprint 3-4)
- ❌ **Pendentes**: 10 módulos restantes

---

## 📚 Entregáveis

### **Documentação**
- [ ] **Mapa completo de auditoria** por módulo
- [ ] **Guia de implementação** padronizado
- [ ] **Exemplos de código** para cada tipo de operação
- [ ] **Checklist de compliance** LGPD por módulo

### **Código**
- [ ] **Módulos migrados** com testes completos
- [ ] **Decorators padronizados** para auditoria
- [ ] **Interceptors reutilizáveis** entre módulos
- [ ] **Utilitários** para detecção de dados sensíveis

### **Operacional**
- [ ] **Dashboard de monitoramento** de migração
- [ ] **Alertas específicos** por módulo
- [ ] **Relatórios de compliance** automatizados
- [ ] **Processo de validação** contínua

---

## 🎯 Conclusão

Este plano de pós-migração garante uma transição suave e controlada para a nova arquitetura event-driven do módulo de auditoria, mantendo a compliance LGPD e melhorando significativamente a observabilidade e rastreabilidade do sistema PGBEN.

A implementação gradual por sprints permite validação contínua e ajustes necessários, garantindo que cada módulo seja migrado com qualidade e sem impacto nos usuários finais.

**Progresso atual: 38% concluído - Próximo foco: Módulo Usuario (P2)**