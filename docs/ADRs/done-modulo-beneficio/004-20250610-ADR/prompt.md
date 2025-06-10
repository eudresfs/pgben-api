# Prompt para Refatoração do CRUD de Dados de Benefício

## Contexto Geral

Você está refatorando um sistema de benefícios sociais em NestJS/TypeScript que gerencia dados específicos de diferentes tipos de benefícios (Aluguel Social, Cesta Básica, Funeral, Natalidade). O código atual está funcional mas excessivamente complexo, com responsabilidades misturadas e múltiplas camadas de validação redundantes.

## Código Base Atual

O sistema atual possui:
- `DadosBeneficioFactoryService`: Factory que resolve serviços específicos mas está sobrecarregado
- `AbstractDadosBeneficioService`: Classe base com CRUD + cache + logging + validações
- Serviços específicos: `DadosCestaBasicaService`, `DadosFuneralService`, etc.
- DTOs com class-validator para cada tipo de benefício
- Entidades TypeORM com soft delete (`removed_at`)
- Controller centralizado `DadosBeneficioController`

## Objetivos da Refatoração

### 1. Simplificar o Factory Service
**DE:** Factory com validação de schema, verificação de duplicatas, controle de workflow, mapeamento complexo código→enum→ID→serviço
**PARA:** Roteador simples que apenas mapeia código diretamente para serviço específico

**Implementação:**
- Criar Map simples: `codigo string → serviço específico`
- Métodos do factory apenas: `getService(codigo) + service.method(...args)`
- Remover: schema validation, duplicate checking, workflow updates, tipo validation
- Manter: error handling básico para código não encontrado

### 2. Limpar Abstract Service
**DE:** Classe com cache manual, logging complexo, múltiplas validações, error context pesado
**PARA:** CRUD básico com try/catch simples

**Implementação:**
- Manter apenas: create, update, delete, findOne, findBySolicitacao, findAll
- Usar transações TypeORM simples
- Error handling: try/catch com conversão de constraint errors para ConflictException
- Remover: cache manual, logging detalhado, validações duplicadas
- Manter: validações específicas de negócio nos métodos abstratos

### 3. Validação Consolidada
**DE:** 3 camadas (class-validator + validações específicas + schema validation)
**PARA:** 2 camadas (class-validator nos DTOs + validações de negócio nos serviços)

**Implementação:**
- DTOs: Manter class-validator + adicionar custom decorator `@ValidateTipoBeneficio('codigo')`
- Serviços: Apenas regras de negócio específicas (ex: quantidade cestas vs tamanho família)
- Remover: schema validation do factory (mover para endpoint separado)

### 4. Mapeamento Simplificado
**DE:** `codigo → TipoDadosBeneficio enum → ID banco → serviço`
**PARA:** `codigo → serviço` direto

**Implementação:**
```typescript
private readonly serviceMap = new Map([
  ['aluguel-social', this.aluguelSocialService],
  ['cesta-basica', this.cestaBasicaService],
  ['funeral', this.funeralService],
  ['natalidade', this.natalidadeService],
]);
```

### 5. Cross-cutting Concerns via Decorators
**DE:** Lógica de cache, workflow, audit misturada nos serviços
**PARA:** Decorators/Interceptors para concerns transversais

**Implementação:**
- `@WorkflowTransition(StatusSolicitacao.AGUARDANDO_DOCUMENTOS)` nos serviços
- `@CacheResult()` para cache automático
- `@AuditLog()` para auditoria
- Workflow interceptor que atualiza status da solicitação após create

### 6. Error Context Funcional
**DE:** `BeneficioErrorContext` não capturando contexto corretamente
**PARA:** Interceptor que captura contexto automaticamente

**Implementação:**
- Error interceptor que captura: user, IP, timestamp, operation, entity data
- Padronização de mensagens de erro por tipo
- Context propagation automática

## Instruções Específicas de Implementação

### Factory Service Refatorado
```typescript
@Injectable()
export class DadosBeneficioFactoryService {
  private readonly serviceMap: Map<string, AbstractDadosBeneficioService<any, any, any>>;

  constructor(/* inject services */) {
    this.serviceMap = new Map([
      ['aluguel-social', this.aluguelSocialService],
      // ... outros
    ]);
  }

  async create(codigo: string, dto: any, userId: string) {
    const service = this.getService(codigo);
    return service.create(dto, userId);
  }

  // Métodos similares para update, delete, etc.
  
  private getService(codigo: string) {
    const service = this.serviceMap.get(codigo);
    if (!service) {
      throw new NotFoundException(`Tipo de benefício '${codigo}' não encontrado`);
    }
    return service;
  }
}
```

### Abstract Service Simplificado
```typescript
export abstract class AbstractDadosBeneficioService<TEntity, TCreateDto, TUpdateDto> {
  constructor(
    protected readonly repository: Repository<TEntity>,
    protected readonly entityName: string,
  ) {}

  async create(createDto: TCreateDto): Promise<TEntity> {
    // Validação específica de negócio
    await this.validateCreateData(createDto);
    
    try {
      const entity = this.repository.create(createDto as any);
      return await this.repository.save(entity);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Já existem dados para esta solicitação');
      }
      throw error;
    }
  }

  // Outros métodos CRUD básicos
  
  protected abstract validateCreateData(data: TCreateDto): Promise<void>;
  protected abstract validateUpdateData(data: TUpdateDto, entity: TEntity): Promise<void>;
}
```

### Custom Validator para Tipo de Benefício
```typescript
@ValidatorConstraint({ name: 'tipoBeneficio', async: true })
export class TipoBeneficioValidator implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(Solicitacao) private solicitacaoRepo: Repository<Solicitacao>,
    @InjectRepository(TipoBeneficio) private tipoBeneficioRepo: Repository<TipoBeneficio>,
  ) {}

  async validate(solicitacaoId: string, args: ValidationArguments) {
    const codigoEsperado = args.constraints[0];
    
    const solicitacao = await this.solicitacaoRepo.findOne({
      where: { id: solicitacaoId },
      relations: ['tipo_beneficio'],
    });

    return solicitacao?.tipo_beneficio?.codigo === codigoEsperado;
  }

  defaultMessage(args: ValidationArguments) {
    return `Tipo de benefício da solicitação não corresponde a ${args.constraints[0]}`;
  }
}

export function ValidateTipoBeneficio(codigo: string) {
  return ValidateBy({
    name: 'tipoBeneficio',
    constraints: [codigo],
    validator: TipoBeneficioValidator,
  });
}
```

### Schema Validation Endpoint
```typescript
@Post(':codigo/validate')
@ApiOperation({ summary: 'Validar dados antes de enviar' })
async validateSchema(
  @Param('codigo') codigo: string, 
  @Body() dto: any
) {
  return this.schemaValidationService.validate(codigo, dto);
}
```

### Workflow Interceptor
```typescript
@Injectable()
export class WorkflowInterceptor implements NestInterceptor {
  constructor(private workflowService: WorkflowSolicitacaoService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (result) => {
        if (context.getHandler().name === 'create' && result?.solicitacao_id) {
          await this.workflowService.atualizarStatus(
            result.solicitacao_id,
            StatusSolicitacao.AGUARDANDO_DOCUMENTOS,
            'Sistema'
          );
        }
      })
    );
  }
}
```

## Arquivos que Precisam ser Modificados

1. **dados-beneficio-factory.service.ts** - Simplificação total
2. **abstract-dados-beneficio.service.ts** - Remover complexidade, manter CRUD básico
3. **dados-*.service.ts** (todos) - Adicionar decorators, remover lógica desnecessária
4. **create-dados-*.dto.ts** - Adicionar @ValidateTipoBeneficio
5. **dados-beneficio.controller.ts** - Limpar, adicionar endpoint de validação
6. **Novos arquivos:**
   - `tipo-beneficio.validator.ts`
   - `workflow.interceptor.ts` 
   - `cache.interceptor.ts`
   - `error-context.interceptor.ts`
   - `schema-validation.service.ts`

## Critérios de Aceitação

- [ ] Factory tem apenas mapeamento código→serviço e delegação
- [ ] Abstract service tem apenas CRUD básico + validações de negócio
- [ ] DTOs validam tipo de benefício automaticamente
- [ ] Cache é gerenciado por interceptor, não manual
- [ ] Workflow é atualizado por interceptor após create
- [ ] Error context é capturado automaticamente
- [ ] Schema validation é endpoint separado
- [ ] Todos os testes passam
- [ ] Endpoints funcionam igual ao comportamento atual
- [ ] Performance mantida ou melhorada

## Observações Importantes

- Manter compatibilidade com endpoints existentes
- Preservar soft delete (removed_at)
- Manter relações TypeORM existentes
- Não quebrar integrações existentes
- Manter estrutura de DTOs atual
- Preservar validações de negócio específicas
- Error messages devem continuar user-friendly