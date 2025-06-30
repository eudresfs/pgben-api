# Plano Pós-Migração - Auditoria em Módulos de Domínio

## 📋 Contexto e Objetivos

### Situação Pós-Migração
- Módulo de auditoria refatorado com arquitetura event-driven
- EventEmitter + BullMQ implementados e funcionais
- Core de auditoria isolado sem dependências circulares
- Necessidade de migrar todos os módulos que interagem com auditoria

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

# Análise esperada:
src/
├── auth/           # Login, logout, tentativas de acesso
├── users/          # CRUD de usuários
├── citizens/       # Dados pessoais (LGPD crítico)
├── benefits/       # Benefícios sociais
├── documents/      # Upload/download de documentos
├── reports/        # Geração de relatórios
├── admin/          # Operações administrativas
└── integrations/   # Integrações externas
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
├── notifications/  # Envio de dados pessoais
├── files/         # Armazenamento de documentos
├── analytics/     # Processamento de dados
├── external-apis/ # Compartilhamento de dados
└── workflows/     # Aprovações e processos
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

### **Matriz de Priorização**

| Módulo | Risco LGPD | Impacto Negócio | Complexidade | Prioridade | Sprint |
|--------|------------|-----------------|--------------|------------|--------|
| **citizens** | ALTO | ALTO | MÉDIO | P1 | 2 |
| **auth** | ALTO | ALTO | BAIXO | P1 | 2 |
| **benefits** | ALTO | ALTO | ALTO | P1 | 3 |
| **users** | MÉDIO | ALTO | BAIXO | P2 | 3 |
| **documents** | ALTO | MÉDIO | MÉDIO | P2 | 4 |
| **reports** | MÉDIO | MÉDIO | BAIXO | P3 | 4 |
| **notifications** | MÉDIO | BAIXO | BAIXO | P3 | 5 |
| **analytics** | BAIXO | BAIXO | ALTO | P4 | 6 |

### **Estratégia de Migração por Prioridade**

#### **P1 - Crítico (Sprint 2-3)**
- **citizens**: Dados pessoais, CPF, RG, composição familiar
- **auth**: Login, logout, tentativas de acesso, tokens
- **benefits**: Benefícios sociais, valores, aprovações

#### **P2 - Importante (Sprint 3-4)**
- **users**: Gestão de usuários do sistema
- **documents**: Upload, download, visualização de documentos

#### **P3 - Desejável (Sprint 4-5)**
- **reports**: Geração e acesso a relatórios
- **notifications**: Envio de notificações com dados pessoais

#### **P4 - Futuro (Sprint 6+)**
- **analytics**: Processamento de dados estatísticos
- **integrations**: Integrações com sistemas externos

---

## 🚀 Fase 3: Migração Gradual (Sprints 2-6)

### **Sprint 2: Módulos P1 - Parte 1 (Citizens + Auth)**

#### **Semana 1: Citizens Module**

**Dia 1-2: Análise e Preparação**
```typescript
// Identificar operações críticas:
interface CitizenAuditRequirements {
  sensitiveOperations: [
    'create_citizen',        // Cadastro inicial
    'update_personal_data',  // Alteração de dados pessoais
    'update_family_data',    // Composição familiar
    'access_sensitive_data', // Visualização de CPF, RG, etc.
    'delete_citizen',        // Exclusão (LGPD)
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

**Dia 3-4: Implementação**
```typescript
// citizens/citizens.service.ts
@Injectable()
export class CitizensService {
  constructor(
    @InjectRepository(Citizen)
    private citizenRepository: Repository<Citizen>,
    private auditEmitter: AuditEventEmitter, // ✅ Nova dependência
  ) {}

  async create(citizenData: CreateCitizenDto, userId: string): Promise<Citizen> {
    const citizen = await this.citizenRepository.save(citizenData);
    
    // ✅ Emitir evento de criação
    await this.auditEmitter.emitEntityCreated({
      eventType: AuditEventType.ENTITY_CREATED,
      entityName: 'Citizen',
      entityId: citizen.id,
      userId,
      timestamp: new Date(),
      newData: this.sanitizeSensitiveData(citizen),
      metadata: {
        operation: 'citizen_registration',
        riskLevel: 'HIGH',
        lgpdRelevant: true,
      },
    });

    return citizen;
  }

  async updatePersonalData(
    citizenId: string, 
    updateData: UpdateCitizenDto, 
    userId: string
  ): Promise<Citizen> {
    const previousData = await this.citizenRepository.findOne({ 
      where: { id: citizenId } 
    });
    
    const updatedCitizen = await this.citizenRepository.save({
      id: citizenId,
      ...updateData,
    });

    // ✅ Detectar campos sensíveis automaticamente
    const sensitiveFieldsChanged = this.detectSensitiveFieldChanges(
      previousData, 
      updatedCitizen
    );

    // ✅ Emitir evento apropriado
    if (sensitiveFieldsChanged.length > 0) {
      await this.auditEmitter.emitSensitiveDataAccessed({
        eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
        entityName: 'Citizen',
        entityId: citizenId,
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

    return updatedCitizen;
  }

  private sanitizeSensitiveData(citizen: Citizen): Partial<Citizen> {
    // Remove ou mascara dados sensíveis para auditoria
    return {
      id: citizen.id,
      nome: citizen.nome,
      // cpf: citizen.cpf?.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2'),
      // Manter dados completos para auditoria interna
      ...citizen,
    };
  }

  private detectSensitiveFieldChanges(
    previous: Citizen, 
    current: Citizen
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

**Dia 5: Controller e Decorators**
```typescript
// citizens/citizens.controller.ts
@Controller('citizens')
@UseInterceptors(AuditEmitInterceptor)
export class CitizensController {
  constructor(private citizensService: CitizensService) {}

  @Post()
  @AutoAudit({ 
    entity: 'Citizen', 
    operation: 'create',
    riskLevel: 'HIGH',
    sensitiveOperation: true 
  })
  async create(
    @Body() createCitizenDto: CreateCitizenDto,
    @Req() req: any
  ) {
    return this.citizensService.create(createCitizenDto, req.user.id);
  }

  @Get(':id/sensitive')
  @SensitiveDataAccess({
    entity: 'Citizen',
    fields: ['cpf', 'rg', 'data_nascimento', 'renda_familiar'],
    justificationRequired: true
  })
  async getSensitiveData(@Param('id') id: string) {
    return this.citizensService.findSensitiveData(id);
  }

  @Put(':id')
  @AutoAudit({ 
    entity: 'Citizen', 
    operation: 'update',
    detectSensitiveChanges: true 
  })
  async update(
    @Param('id') id: string,
    @Body() updateCitizenDto: UpdateCitizenDto,
    @Req() req: any
  ) {
    return this.citizensService.updatePersonalData(id, updateCitizenDto, req.user.id);
  }

  @Delete(':id')
  @AutoAudit({ 
    entity: 'Citizen', 
    operation: 'delete',
    riskLevel: 'CRITICAL',
    lgpdRelevant: true 
  })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.citizensService.remove(id, req.user.id);
  }
}
```

#### **Semana 2: Auth Module**

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

### **Sprint 3: Módulos P1 - Parte 2 (Benefits) + P2 - Parte 1 (Users)**

#### **Benefits Module**
```typescript
// benefits/benefits.service.ts
@Injectable()
export class BenefitsService {
  constructor(
    @InjectRepository(Benefit)
    private benefitRepository: Repository<Benefit>,
    private auditEmitter: AuditEventEmitter,
  ) {}

  async approve(benefitId: string, approverUserId: string): Promise<Benefit> {
    const benefit = await this.benefitRepository.findOne({ 
      where: { id: benefitId },
      relations: ['citizen']
    });

    benefit.status = BenefitStatus.APPROVED;
    benefit.approvedBy = approverUserId;
    benefit.approvedAt = new Date();

    const updatedBenefit = await this.benefitRepository.save(benefit);

    // ✅ Auditoria crítica de aprovação
    await this.auditEmitter.emitEntityUpdated({
      eventType: AuditEventType.ENTITY_UPDATED,
      entityName: 'Benefit',
      entityId: benefitId,
      userId: approverUserId,
      timestamp: new Date(),
      previousData: { status: 'PENDING' },
      newData: { 
        status: 'APPROVED',
        approvedBy: approverUserId,
        value: updatedBenefit.value 
      },
      metadata: {
        operation: 'benefit_approval',
        riskLevel: 'HIGH',
        financialImpact: true,
        citizenId: benefit.citizen.id,
        benefitType: benefit.type,
        value: benefit.value,
      },
    });

    return updatedBenefit;
  }
}
```

#### **Users Module Migration**
```typescript
// users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditEmitter: AuditEventEmitter,
  ) {}

  async updatePermissions(
    userId: string, 
    newPermissions: string[], 
    adminUserId: string
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const previousPermissions = user.permissions;

    user.permissions = newPermissions;
    const updatedUser = await this.userRepository.save(user);

    // ✅ Auditoria crítica de mudança de permissões
    await this.auditEmitter.emitSecurityEvent({
      eventType: AuditEventType.PERMISSION_CHANGE,
      entityName: 'User',
      entityId: userId,
      userId: adminUserId,
      timestamp: new Date(),
      metadata: {
        targetUser: userId,
        previousPermissions,
        newPermissions,
        permissionsAdded: newPermissions.filter(p => !previousPermissions.includes(p)),
        permissionsRemoved: previousPermissions.filter(p => !newPermissions.includes(p)),
        riskLevel: 'HIGH',
        requiresApproval: true,
      },
    });

    return updatedUser;
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
describe('Citizens Module - Audit Integration', () => {
  let service: CitizensService;
  let auditEmitter: AuditEventEmitter;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CitizensService,
        {
          provide: AuditEventEmitter,
          useValue: {
            emitEntityCreated: jest.fn(),
            emitSensitiveDataAccessed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CitizensService>(CitizensService);
    auditEmitter = module.get<AuditEventEmitter>(AuditEventEmitter);
  });

  describe('LGPD Compliance', () => {
    it('should audit citizen creation with sensitive data', async () => {
      const citizenData = {
        nome: 'João Silva',
        cpf: '12345678901',
        email: 'joao@email.com',
      };

      await service.create(citizenData, 'admin-user-id');

      expect(auditEmitter.emitEntityCreated).toHaveBeenCalledWith({
        eventType: AuditEventType.ENTITY_CREATED,
        entityName: 'Citizen',
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
      await service.getSensitiveData('citizen-id', 'user-id');

      expect(auditEmitter.emitSensitiveDataAccessed).toHaveBeenCalledWith({
        eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
        entityName: 'Citizen',
        entityId: 'citizen-id',
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
  it('should create complete audit trail for citizen lifecycle', async () => {
    // 1. Create citizen
    const createResponse = await request(app.getHttpServer())
      .post('/citizens')
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
        entidade_afetada: 'Citizen',
        entidade_id: createResponse.body.id,
        tipo_operacao: 'CREATE',
      },
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].dados_sensiveis_acessados).toContain('cpf');

    // 3. Update citizen
    await request(app.getHttpServer())
      .put(`/citizens/${createResponse.body.id}`)
      .send({ renda_familiar: 2000 })
      .expect(200);

    // 4. Verify update audit
    await waitForQueueProcessing();
    
    const updateAuditLogs = await auditRepository.find({
      where: {
        entidade_afetada: 'Citizen',
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