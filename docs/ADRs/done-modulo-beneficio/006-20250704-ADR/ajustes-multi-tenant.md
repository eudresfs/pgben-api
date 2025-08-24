# 🏢 Ajustes para Contexto Multi-Tenant (Múltiplas Prefeituras)

## **🎯 Análise da Questão**

### **Contexto Multi-Prefeitura**
O sistema será distribuído para várias prefeituras, cada uma com:
- Critérios específicos de benefícios
- Fluxos de aprovação próprios
- Processos administrativos distintos
- Documentação obrigatória diferente
- Valores e periodicidades específicas

### **Adequação da Solução Simplificada**

**✅ A simplificação atual É ADEQUADA** para o contexto multi-tenant porque:

1. **JSON Schema Dinâmico**: Cada prefeitura pode definir seus próprios campos, validações e regras
2. **Flexibilidade Total**: Sem necessidade de alteração de código para diferentes critérios
3. **Isolamento Natural**: Com pequenos ajustes, garante separação completa entre prefeituras
4. **Simplicidade Mantida**: Não adiciona complexidade desnecessária

## **🔧 Ajustes Mínimos Necessários**

### **1. Isolamento por Município**

#### **Alteração na Tabela `beneficio_schemas`**
```sql
-- Adicionar campo para identificar o município
ALTER TABLE beneficio_schemas 
ADD COLUMN municipio_id UUID NOT NULL REFERENCES municipios(id);

-- Ajustar constraint única para incluir município
DROP CONSTRAINT beneficio_schemas_beneficio_id_versao_key;
ALTER TABLE beneficio_schemas 
ADD CONSTRAINT beneficio_schemas_beneficio_municipio_versao_key 
UNIQUE(beneficio_id, municipio_id, versao);
```

#### **Alterações em Outras Tabelas**
```sql
-- Critérios de elegibilidade por município
ALTER TABLE criterios_elegibilidade 
ADD COLUMN municipio_id UUID NOT NULL REFERENCES municipios(id);

-- Configurações de benefício por município
ALTER TABLE configuracao_beneficio 
ADD COLUMN municipio_id UUID NOT NULL REFERENCES municipios(id);

-- Workflow por município
ALTER TABLE workflow_configuracao 
ADD COLUMN municipio_id UUID NOT NULL REFERENCES municipios(id);
```

### **2. Adaptação do Serviço Principal**

```typescript
@Injectable()
export class DynamicBenefitService {
  constructor(
    private readonly beneficioRepository: BeneficioRepository,
    private readonly schemaRepository: BeneficioSchemaRepository,
    private readonly userContext: UserContextService // Para obter município do usuário
  ) {}

  async processarSolicitacao(tipoBeneficio: string, dados: any) {
    const municipioId = this.userContext.getMunicipioId();
    const beneficio = await this.beneficioRepository.findByTipo(tipoBeneficio);
    
    if (beneficio.is_dynamic) {
      // Busca schema específico do município
      const schema = await this.schemaRepository.findByBeneficioAndMunicipio(
        beneficio.id, 
        municipioId
      );
      
      if (!schema) {
        throw new Error(`Schema não configurado para este município`);
      }
      
      return this.validarComSchema(dados, schema.schema_json);
    }
    
    return this.dadosBeneficioFactory.criarDadosBeneficio(tipoBeneficio, dados);
  }

  // Método para listar schemas disponíveis por município
  async listarSchemasPorMunicipio(municipioId: string) {
    return this.schemaRepository.findByMunicipio(municipioId);
  }
}
```

### **3. Interface Admin com Isolamento**

```typescript
@Controller('admin/configuracao')
@UseGuards(AuthGuard, AdminGuard)
export class AdminConfiguracaoController {
  constructor(
    private readonly dynamicBenefitService: DynamicBenefitService,
    private readonly userContext: UserContextService
  ) {}

  @Get('schemas')
  async listarSchemas() {
    const municipioId = this.userContext.getMunicipioId();
    // Retorna apenas schemas do município do usuário
    return this.dynamicBenefitService.listarSchemasPorMunicipio(municipioId);
  }

  @Post('schema')
  async criarSchema(@Body() createSchemaDto: CreateSchemaDto) {
    const municipioId = this.userContext.getMunicipioId();
    // Força o município do usuário logado
    return this.dynamicBenefitService.criarSchema({
      ...createSchemaDto,
      municipio_id: municipioId
    });
  }
}
```

### **4. Contexto de Usuário**

```typescript
@Injectable()
export class UserContextService {
  constructor(@Inject(REQUEST) private request: Request) {}

  getMunicipioId(): string {
    // Obtém município do usuário logado
    const user = this.request.user as any;
    return user.municipio_id;
  }

  getUnidadeId(): string {
    const user = this.request.user as any;
    return user.unidade_id;
  }

  getTipoUsuario(): string {
    const user = this.request.user as any;
    return user.tipo_usuario;
  }
}
```

## **🏗️ Vantagens da Abordagem Multi-Tenant**

### **1. Flexibilidade Total por Município**
- **Campos Específicos**: Cada prefeitura define seus próprios campos obrigatórios
- **Validações Customizadas**: Regras de negócio específicas via JSON Schema
- **Fluxos Próprios**: Workflows adaptados à realidade local
- **Documentação Específica**: Lista de documentos obrigatórios por município

### **2. Exemplos Práticos de Diferenciação**

#### **Município A - Aluguel Social**
```json
{
  "tipo": "object",
  "properties": {
    "valor_aluguel": { "type": "number", "maximum": 800 },
    "renda_familiar": { "type": "number", "maximum": 2000 },
    "comprovante_despejo": { "type": "boolean", "const": true },
    "tempo_residencia_minimo": { "type": "number", "minimum": 24 }
  },
  "required": ["valor_aluguel", "renda_familiar", "comprovante_despejo"]
}
```

#### **Município B - Aluguel Social**
```json
{
  "tipo": "object",
  "properties": {
    "valor_aluguel": { "type": "number", "maximum": 1200 },
    "renda_per_capita": { "type": "number", "maximum": 500 },
    "situacao_moradia": { 
      "type": "string", 
      "enum": ["despejo", "coabitacao", "risco_estrutural"] 
    },
    "cadastro_unico": { "type": "boolean", "const": true }
  },
  "required": ["valor_aluguel", "renda_per_capita", "situacao_moradia"]
}
```

### **3. Isolamento Completo**
- **Dados**: Cada município vê apenas seus próprios schemas e configurações
- **Usuários**: Administradores limitados ao seu município
- **Configurações**: Independência total entre prefeituras
- **Auditoria**: Logs separados por município

## **📊 Impacto na Implementação**

### **Alterações Mínimas Necessárias**

1. **Banco de Dados**: Adicionar `municipio_id` em 4 tabelas
2. **Serviços**: Filtrar por município em consultas
3. **Controllers**: Aplicar contexto de usuário
4. **Interface**: Mostrar apenas dados do município

### **Tempo Estimado dos Ajustes**
- **Alterações de Banco**: 1 dia
- **Adaptação de Serviços**: 2-3 dias
- **Ajustes de Interface**: 1-2 dias
- **Testes**: 2 dias

**Total**: +1 semana ao cronograma original

## **🔒 Segurança Multi-Tenant**

### **Princípios de Isolamento**

1. **Row-Level Security (RLS)**
```sql
-- Política de segurança para schemas
CREATE POLICY municipio_isolation_schemas ON beneficio_schemas
  USING (municipio_id = current_setting('app.current_municipio_id')::uuid);

ALTER TABLE beneficio_schemas ENABLE ROW LEVEL SECURITY;
```

2. **Validação em Tempo de Execução**
```typescript
// Guard para verificar acesso ao município
@Injectable()
export class MunicipioGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const municipioParam = request.params.municipioId;
    
    // Usuário só pode acessar dados do seu município
    return !municipioParam || user.municipio_id === municipioParam;
  }
}
```

## **✅ Conclusão**

### **Resposta à Questão Original**

**SIM, a simplificação atende perfeitamente ao contexto multi-prefeitura** com ajustes mínimos:

1. **Flexibilidade**: JSON Schema permite total customização por município
2. **Isolamento**: Pequenos ajustes garantem separação completa
3. **Simplicidade**: Mantém a abordagem enxuta sem overengineering
4. **Escalabilidade**: Suporta N prefeituras sem alteração de código

### **Benefícios da Abordagem**

- **Implementação Rápida**: +1 semana apenas
- **Manutenção Simples**: Um código para todas as prefeituras
- **Customização Total**: Cada município define suas regras
- **Evolução Independente**: Prefeituras evoluem em ritmos próprios

### **Próximos Passos**

1. Implementar core simplificado (3-4 semanas)
2. Adicionar ajustes multi-tenant (+1 semana)
3. Testar com 2-3 municípios piloto
4. Distribuir para demais prefeituras

**A solução é robusta, simples e perfeitamente adequada ao contexto multi-tenant.**