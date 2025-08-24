# 📋 Plano de Ação Detalhado - Benefícios Dinâmicos

## 🎯 Visão Geral do Projeto

**Objetivo**: Implementar sistema de benefícios dinâmicos multi-tenant para múltiplas prefeituras
**Duração Total**: 5-6 semanas
**Equipe**: 2-3 desenvolvedores + 1 analista de negócio
**Arquitetura**: Schema-driven com JSON Schema + Factory Pattern existente

---

## 📅 Cronograma Executivo

| Fase | Duração | Período | Entregáveis |
|------|---------|---------|-------------|
| **Fase 1** | 3-4 semanas | Semanas 1-4 | Core Dinâmico + Testes |
| **Fase 2** | 1 semana | Semana 5 | Multi-tenant + Interface Admin |
| **Fase 3** | 1 semana | Semana 6 | Piloto + Migração Gradual |

---

# 🚀 FASE 1: CORE DINÂMICO (3-4 semanas)

## **Objetivo**: Implementar funcionalidade básica de benefícios dinâmicos

### **Semana 1: Estrutura de Dados e Migração**

#### **📊 1.1 Modelagem de Banco de Dados**
**Responsável**: Desenvolvedor Backend Senior  
**Duração**: 2-3 dias

**Checklist**:
- [ ] **Criar migration para campo `is_dynamic`**
  ```sql
  ALTER TABLE beneficios ADD COLUMN is_dynamic BOOLEAN DEFAULT FALSE;
  ```
- [ ] **Criar tabela `beneficio_schemas`**
  ```sql
  CREATE TABLE beneficio_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficio_id UUID NOT NULL REFERENCES beneficios(id),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    schema_json JSONB NOT NULL,
    versao VARCHAR(10) NOT NULL DEFAULT '1.0',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] **Criar índices de performance**
  ```sql
  CREATE INDEX idx_beneficio_schemas_beneficio_municipio ON beneficio_schemas(beneficio_id, municipio_id);
  CREATE INDEX idx_beneficio_schemas_schema_json ON beneficio_schemas USING GIN(schema_json);
  ```
- [ ] **Criar tabelas auxiliares multi-tenant**
  - [ ] `criterios_elegibilidade` com `municipio_id`
  - [ ] `configuracao_beneficio` com `municipio_id`
  - [ ] `workflow_configuracao` com `municipio_id`
- [ ] **Executar migrations em ambiente de desenvolvimento**
- [ ] **Validar integridade referencial**
- [ ] **Criar seeds básicos para teste**

**Critérios de Aceitação**:
- ✅ Migrations executam sem erro
- ✅ Índices criados corretamente
- ✅ Constraints de integridade funcionando
- ✅ Seeds carregam dados de teste

---

#### **📦 1.2 Entidades e DTOs**
**Responsável**: Desenvolvedor Backend  
**Duração**: 1-2 dias

**Checklist**:
- [ ] **Atualizar entidade `Beneficio`**
  ```typescript
  @Column({ name: 'is_dynamic', default: false })
  isDynamic: boolean;
  ```
- [ ] **Criar entidade `BeneficioSchema`**
  ```typescript
  @Entity('beneficio_schemas')
  export class BeneficioSchema {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column({ name: 'beneficio_id' })
    beneficioId: string;
    
    @Column({ name: 'municipio_id' })
    municipioId: string;
    
    @Column({ name: 'schema_json', type: 'jsonb' })
    schemaJson: any;
    
    @Column({ name: 'versao', default: '1.0' })
    versao: string;
    
    @Column({ name: 'ativo', default: true })
    ativo: boolean;
  }
  ```
- [ ] **Criar DTOs de criação e atualização**
  - [ ] `CreateBeneficioSchemaDto`
  - [ ] `UpdateBeneficioSchemaDto`
  - [ ] `BeneficioSchemaResponseDto`
- [ ] **Adicionar validações com class-validator**
- [ ] **Criar interfaces TypeScript**
  - [ ] `IBeneficioSchema`
  - [ ] `IDynamicBenefitService`

**Critérios de Aceitação**:
- ✅ Entidades mapeiam corretamente para o banco
- ✅ DTOs validam dados de entrada
- ✅ Interfaces definem contratos claros
- ✅ TypeScript compila sem erros

---

### **Semana 2: Serviços Core**

#### **⚙️ 2.1 DynamicBenefitService**
**Responsável**: Desenvolvedor Backend Senior  
**Duração**: 3-4 dias

**Checklist**:
- [ ] **Criar `DynamicBenefitService`**
  ```typescript
  @Injectable()
  export class DynamicBenefitService {
    async createSchema(dto: CreateBeneficioSchemaDto): Promise<BeneficioSchema>
    async updateSchema(id: string, dto: UpdateBeneficioSchemaDto): Promise<BeneficioSchema>
    async getSchemaByBeneficio(beneficioId: string, municipioId: string): Promise<BeneficioSchema>
    async validateDynamicData(schemaId: string, data: any): Promise<ValidationResult>
    async activateDynamicBenefit(beneficioId: string): Promise<void>
    async rollbackBenefit(beneficioId: string): Promise<void>
  }
  ```
- [ ] **Implementar validação JSON Schema**
  ```typescript
  private async validateJsonSchema(schema: any, data: any): Promise<ValidationResult> {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(data);
    return {
      valid,
      errors: validate.errors || []
    };
  }
  ```
- [ ] **Implementar filtragem por município**
  ```typescript
  async getSchemasByMunicipio(municipioId: string): Promise<BeneficioSchema[]> {
    return this.beneficioSchemaRepository.find({
      where: { municipioId, ativo: true }
    });
  }
  ```
- [ ] **Implementar versionamento básico**
- [ ] **Implementar backup antes de ativação**
- [ ] **Adicionar logs de auditoria**
- [ ] **Implementar tratamento de erros**

**Critérios de Aceitação**:
- ✅ Serviço cria e atualiza schemas
- ✅ Validação JSON Schema funciona
- ✅ Filtragem por município funciona
- ✅ Rollback de emergência funciona
- ✅ Logs de auditoria são gerados

---

#### **🔄 2.2 Adaptação do Factory Pattern Existente**
**Responsável**: Desenvolvedor Backend  
**Duração**: 2-3 dias

**Checklist**:
- [ ] **Analisar `DadosBeneficioFactoryService` existente**
- [ ] **Adicionar suporte a benefícios dinâmicos**
  ```typescript
  async processarDados(beneficioId: string, dadosEntrada: any): Promise<any> {
    const beneficio = await this.beneficioService.findById(beneficioId);
    
    if (beneficio.isDynamic) {
      return this.processarDadosDinamicos(beneficioId, dadosEntrada);
    }
    
    return this.processarDadosEstaticos(beneficioId, dadosEntrada);
  }
  ```
- [ ] **Implementar `processarDadosDinamicos`**
- [ ] **Manter compatibilidade com benefícios estáticos**
- [ ] **Adicionar testes unitários**
- [ ] **Documentar mudanças**

**Critérios de Aceitação**:
- ✅ Factory processa benefícios dinâmicos
- ✅ Benefícios estáticos continuam funcionando
- ✅ Testes unitários passam
- ✅ Performance mantida

---

### **Semana 3: Controladores e Validação**

#### **🎮 3.1 Controllers REST**
**Responsável**: Desenvolvedor Backend  
**Duração**: 2-3 dias

**Checklist**:
- [ ] **Criar `BeneficioSchemaController`**
  ```typescript
  @Controller('v1/beneficio-schemas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  export class BeneficioSchemaController {
    @Post()
    @RequirePermissions('beneficio:create')
    async create(@Body() dto: CreateBeneficioSchemaDto)
    
    @Put(':id')
    @RequirePermissions('beneficio:update')
    async update(@Param('id') id: string, @Body() dto: UpdateBeneficioSchemaDto)
    
    @Get('beneficio/:beneficioId')
    @RequirePermissions('beneficio:read')
    async getByBeneficio(@Param('beneficioId') beneficioId: string)
    
    @Post(':id/activate')
    @RequirePermissions('beneficio:activate')
    async activate(@Param('id') id: string)
    
    @Post(':id/rollback')
    @RequirePermissions('beneficio:rollback')
    async rollback(@Param('id') id: string)
  }
  ```
- [ ] **Implementar validação de entrada**
- [ ] **Adicionar documentação Swagger**
- [ ] **Implementar tratamento de erros**
- [ ] **Adicionar logs de requisição**

**Critérios de Aceitação**:
- ✅ Endpoints respondem corretamente
- ✅ Validação de dados funciona
- ✅ Documentação Swagger gerada
- ✅ Permissões aplicadas corretamente

---

#### **✅ 3.2 Sistema de Validação**
**Responsável**: Desenvolvedor Backend  
**Duração**: 2 dias

**Checklist**:
- [ ] **Implementar `ValidationService`**
  ```typescript
  @Injectable()
  export class ValidationService {
    async validateBeneficioData(beneficioId: string, data: any): Promise<ValidationResult>
    async validateSchema(schema: any): Promise<SchemaValidationResult>
    async validateMunicipioAccess(userId: string, municipioId: string): Promise<boolean>
  }
  ```
- [ ] **Criar validadores customizados**
- [ ] **Implementar cache de schemas**
- [ ] **Adicionar métricas de validação**
- [ ] **Criar testes de validação**

**Critérios de Aceitação**:
- ✅ Validação de dados funciona
- ✅ Cache melhora performance
- ✅ Métricas são coletadas
- ✅ Testes cobrem cenários principais

---

### **Semana 4: Testes e Refinamentos**

#### **🧪 4.1 Testes Unitários e Integração**
**Responsável**: Desenvolvedor Backend + QA  
**Duração**: 3-4 dias

**Checklist**:
- [ ] **Testes unitários `DynamicBenefitService`**
  - [ ] Criação de schema
  - [ ] Validação de dados
  - [ ] Ativação/rollback
  - [ ] Filtragem por município
- [ ] **Testes unitários `ValidationService`**
- [ ] **Testes de integração controllers**
- [ ] **Testes de migração de banco**
- [ ] **Testes de performance básicos**
- [ ] **Cobertura de código > 80%**

**Critérios de Aceitação**:
- ✅ Todos os testes passam
- ✅ Cobertura adequada
- ✅ Performance aceitável
- ✅ Sem vazamentos de memória

---

#### **🔧 4.2 Refinamentos e Otimizações**
**Responsável**: Desenvolvedor Backend Senior  
**Duração**: 1-2 dias

**Checklist**:
- [ ] **Otimizar consultas JSONB**
- [ ] **Implementar cache Redis**
- [ ] **Adicionar rate limiting**
- [ ] **Melhorar logs e monitoramento**
- [ ] **Documentar APIs**
- [ ] **Code review completo**

**Critérios de Aceitação**:
- ✅ Performance otimizada
- ✅ Cache funcionando
- ✅ Documentação completa
- ✅ Code review aprovado

---

# 🏢 FASE 2: MULTI-TENANT + INTERFACE ADMIN (1 semana)

## **Objetivo**: Implementar isolamento multi-tenant e interface administrativa

### **Semana 5: Multi-tenant e Interface**

#### **🔐 5.1 Implementação Multi-tenant**
**Responsável**: Desenvolvedor Backend Senior  
**Duração**: 2-3 dias

**Checklist**:
- [ ] **Criar `UserContextService`**
  ```typescript
  @Injectable()
  export class UserContextService {
    async getMunicipioIdFromUser(userId: string): Promise<string>
    async validateMunicipioAccess(userId: string, municipioId: string): Promise<boolean>
    async getCurrentUserContext(request: Request): Promise<UserContext>
  }
  ```
- [ ] **Implementar filtros automáticos por município**
- [ ] **Adicionar middleware de contexto**
- [ ] **Implementar Row-Level Security (RLS)**
  ```sql
  ALTER TABLE beneficio_schemas ENABLE ROW LEVEL SECURITY;
  CREATE POLICY beneficio_schemas_municipio_policy ON beneficio_schemas
    FOR ALL TO authenticated
    USING (municipio_id = current_setting('app.current_municipio_id')::uuid);
  ```
- [ ] **Atualizar todos os serviços para filtrar por município**
- [ ] **Testes de isolamento entre municípios**

**Critérios de Aceitação**:
- ✅ Dados isolados por município
- ✅ RLS funcionando corretamente
- ✅ Contexto de usuário aplicado
- ✅ Testes de isolamento passam

---

#### **🖥️ 5.2 Interface Administrativa**
**Responsável**: Desenvolvedor Frontend  
**Duração**: 2-3 dias

**Checklist**:
- [ ] **Criar página de gestão de schemas**
  - [ ] Lista de benefícios dinâmicos
  - [ ] Formulário de criação/edição
  - [ ] Preview do schema JSON
  - [ ] Ativação/desativação
- [ ] **Implementar editor JSON Schema**
  - [ ] Syntax highlighting
  - [ ] Validação em tempo real
  - [ ] Templates pré-definidos
- [ ] **Criar dashboard de monitoramento**
  - [ ] Status dos benefícios dinâmicos
  - [ ] Métricas de uso
  - [ ] Logs de atividade
- [ ] **Implementar permissões granulares**
- [ ] **Testes de interface**

**Critérios de Aceitação**:
- ✅ Interface funcional e intuitiva
- ✅ Editor JSON Schema funciona
- ✅ Permissões aplicadas
- ✅ Responsivo e acessível

---

# 🚀 FASE 3: PILOTO + MIGRAÇÃO GRADUAL (1 semana)

## **Objetivo**: Validar solução em produção e migrar gradualmente

### **Semana 6: Piloto e Migração**

#### **🧪 6.1 Implementação Piloto**
**Responsável**: Equipe Completa  
**Duração**: 3-4 dias

**Checklist**:
- [ ] **Selecionar 1-2 municípios piloto**
- [ ] **Configurar ambiente de staging**
- [ ] **Migrar dados do piloto**
  ```typescript
  async migrarMunicipioPiloto(municipioId: string) {
    // 1. Backup dos dados atuais
    await this.backupService.backupMunicipio(municipioId);
    
    // 2. Criar schemas para benefícios existentes
    const beneficios = await this.getBeneficiosByMunicipio(municipioId);
    for (const beneficio of beneficios) {
      await this.createSchemaFromExisting(beneficio);
    }
    
    // 3. Validar migração
    await this.validateMigration(municipioId);
  }
  ```
- [ ] **Criar benefício dinâmico de teste**
- [ ] **Validar fluxo completo**
  - [ ] Criação de schema
  - [ ] Solicitação de benefício
  - [ ] Validação de dados
  - [ ] Aprovação/rejeição
- [ ] **Monitorar performance**
- [ ] **Coletar feedback dos usuários**

**Critérios de Aceitação**:
- ✅ Piloto funciona sem erros
- ✅ Performance mantida
- ✅ Feedback positivo dos usuários
- ✅ Dados migrados corretamente

---

#### **📈 6.2 Migração Gradual**
**Responsável**: DevOps + Backend Senior  
**Duração**: 2-3 dias

**Checklist**:
- [ ] **Criar script de migração automática**
  ```bash
  #!/bin/bash
  # Script de migração gradual
  
  echo "Iniciando migração do município $1"
  
  # 1. Backup
  npm run migration:backup -- --municipio=$1
  
  # 2. Migração
  npm run migration:run -- --municipio=$1
  
  # 3. Validação
  npm run migration:validate -- --municipio=$1
  
  echo "Migração concluída para município $1"
  ```
- [ ] **Implementar rollback automático**
- [ ] **Configurar monitoramento**
  - [ ] Alertas de erro
  - [ ] Métricas de performance
  - [ ] Logs de migração
- [ ] **Documentar processo de migração**
- [ ] **Treinar equipe de suporte**

**Critérios de Aceitação**:
- ✅ Script de migração funciona
- ✅ Rollback automático funciona
- ✅ Monitoramento ativo
- ✅ Equipe treinada

---

# 📊 MÉTRICAS E MONITORAMENTO

## **KPIs Técnicos**

| Métrica | Meta | Ferramenta |
|---------|------|------------|
| **Tempo de Resposta API** | < 500ms | Grafana |
| **Disponibilidade** | > 99.9% | Prometheus |
| **Cobertura de Testes** | > 80% | Jest |
| **Tempo de Validação Schema** | < 1s | Custom Metrics |
| **Uso de Memória** | < 512MB | Docker Stats |

## **KPIs de Negócio**

| Métrica | Meta | Responsável |
|---------|------|-------------|
| **Tempo de Criação de Benefício** | < 30min | Analista |
| **Satisfação do Usuário** | > 4.5/5 | Product Owner |
| **Redução de Tickets de Suporte** | > 50% | Suporte |
| **Adoção por Municípios** | > 80% | Comercial |

---

# 🚨 PLANO DE CONTINGÊNCIA

## **Cenários de Risco**

### **🔴 Risco Alto: Performance Degradada**
**Sintomas**: Tempo de resposta > 2s, CPU > 80%

**Ações Imediatas**:
1. [ ] Ativar cache Redis agressivo
2. [ ] Desabilitar benefícios dinâmicos temporariamente
3. [ ] Escalar horizontalmente
4. [ ] Investigar queries lentas

**Rollback**:
```sql
-- Desabilitar todos os benefícios dinâmicos
UPDATE beneficios SET is_dynamic = FALSE WHERE is_dynamic = TRUE;
```

### **🟡 Risco Médio: Erro de Validação**
**Sintomas**: Validações falhando, dados inconsistentes

**Ações Imediatas**:
1. [ ] Verificar schemas JSON
2. [ ] Validar dados de entrada
3. [ ] Rollback para versão anterior do schema
4. [ ] Notificar administradores

### **🟢 Risco Baixo: Problema de Interface**
**Sintomas**: Interface admin não carrega

**Ações Imediatas**:
1. [ ] Verificar logs do frontend
2. [ ] Usar interface de backup
3. [ ] Reiniciar serviços

---

# 📚 DOCUMENTAÇÃO E TREINAMENTO

## **Documentação Técnica**

### **Para Desenvolvedores**
- [ ] **API Documentation** (Swagger)
- [ ] **Database Schema** (ERD)
- [ ] **Architecture Decision Records** (ADRs)
- [ ] **Code Examples** (GitHub)
- [ ] **Testing Guide** (Jest)

### **Para Administradores**
- [ ] **User Manual** (Interface Admin)
- [ ] **Schema Creation Guide** (JSON Schema)
- [ ] **Troubleshooting Guide** (Problemas Comuns)
- [ ] **Migration Guide** (Processo de Migração)

## **Treinamento**

### **Equipe Técnica (4h)**
- [ ] Arquitetura da solução
- [ ] JSON Schema fundamentals
- [ ] Debugging e troubleshooting
- [ ] Processo de deploy

### **Administradores (2h)**
- [ ] Como criar benefícios dinâmicos
- [ ] Interface administrativa
- [ ] Validação e testes
- [ ] Suporte aos usuários

### **Usuários Finais (1h)**
- [ ] Novos fluxos de solicitação
- [ ] Diferenças visuais
- [ ] Onde buscar ajuda

---

# ✅ CRITÉRIOS DE SUCESSO FINAL

## **Técnicos**
- [ ] ✅ **Performance**: API responde em < 500ms
- [ ] ✅ **Disponibilidade**: Sistema disponível > 99.9%
- [ ] ✅ **Segurança**: Isolamento perfeito entre municípios
- [ ] ✅ **Escalabilidade**: Suporta 100+ municípios
- [ ] ✅ **Manutenibilidade**: Código limpo e documentado

## **Funcionais**
- [ ] ✅ **Criação**: Admin cria benefício sem código
- [ ] ✅ **Validação**: Dados validados automaticamente
- [ ] ✅ **Flexibilidade**: Diferentes critérios por município
- [ ] ✅ **Migração**: Zero downtime na migração
- [ ] ✅ **Rollback**: Rollback funciona em < 5min

## **Negócio**
- [ ] ✅ **Produtividade**: 80% redução no tempo de criação
- [ ] ✅ **Satisfação**: > 4.5/5 satisfação dos usuários
- [ ] ✅ **Adoção**: > 80% dos municípios migrados
- [ ] ✅ **Suporte**: 50% redução em tickets
- [ ] ✅ **ROI**: Payback em 6 meses

---

# 🎯 PRÓXIMOS PASSOS IMEDIATOS

## **Esta Semana**
1. [ ] **Aprovação final** do plano pela liderança
2. [ ] **Alocação da equipe** (2-3 devs + 1 analista)
3. [ ] **Setup do ambiente** de desenvolvimento
4. [ ] **Criação do projeto** no Jira/Azure DevOps
5. [ ] **Início da Fase 1** - Estrutura de Dados

## **Próxima Semana**
1. [ ] **Conclusão** da modelagem de banco
2. [ ] **Início** da implementação dos serviços
3. [ ] **Setup** do ambiente de testes
4. [ ] **Primeira demo** para stakeholders

---

**🚀 O projeto está pronto para iniciar! Vamos transformar a gestão de benefícios sociais! 🚀**