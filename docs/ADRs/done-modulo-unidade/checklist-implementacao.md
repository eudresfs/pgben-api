# Checklist de Implementação - Módulo de Unidade

## Relacionamentos entre Entidades

- [ ] Adicionar relacionamento OneToMany com Setor na entidade Unidade
  ```typescript
  @OneToMany(() => Setor, setor => setor.unidade)
  setores: Setor[];
  ```
- [ ] Adicionar relacionamento OneToMany com Usuario na entidade Unidade
  ```typescript
  @OneToMany(() => Usuario, usuario => usuario.unidade)
  usuarios: Usuario[];
  ```
- [ ] Verificar e atualizar métodos que utilizam esses relacionamentos
- [ ] Criar migration para atualizar a estrutura do banco de dados, se necessário

## Validações nos DTOs

- [ ] Melhorar validação de email no DTO de Unidade
  ```typescript
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email: string;
  ```
- [ ] Adicionar validação de telefone no DTO de Unidade
  ```typescript
  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, { message: 'Formato de telefone inválido. Use (XX) XXXXX-XXXX' })
  @IsOptional()
  telefone: string;
  ```
- [ ] Adicionar validação de código no DTO de Unidade
  ```typescript
  @IsString()
  @IsNotEmpty({ message: 'Código é obrigatório' })
  @Matches(/^[A-Z0-9]{3,10}$/, { message: 'Código deve conter entre 3 e 10 caracteres alfanuméricos maiúsculos' })
  codigo: string;
  ```
- [ ] Implementar validação customizada para regras de negócio específicas

## Transações para Operações Complexas

- [ ] Identificar operações que afetam múltiplas entidades
- [ ] Implementar transações no método create do UnidadeService
  ```typescript
  async create(createUnidadeDto: CreateUnidadeDto) {
    return this.dataSource.transaction(async manager => {
      // Implementação
    });
  }
  ```
- [ ] Implementar transações no método update do UnidadeService
- [ ] Implementar transações no método updateStatus do UnidadeService
- [ ] Garantir rollback em caso de falha em qualquer etapa da transação

## RBAC nos Endpoints

- [ ] Definir roles e permissões para cada operação do módulo
  ```typescript
  export enum Permission {
    UNIDADE_CREATE = 'unidade:create',
    UNIDADE_READ = 'unidade:read',
    UNIDADE_UPDATE = 'unidade:update',
    UNIDADE_DELETE = 'unidade:delete',
  }
  ```
- [ ] Implementar guard para verificação de permissões
  ```typescript
  @Injectable()
  export class PermissionsGuard implements CanActivate {
    // Implementação
  }
  ```
- [ ] Adicionar decoradores de roles nos endpoints do controller
  ```typescript
  @Get()
  @Roles(Role.ADMIN, Role.GESTOR)
  @RequirePermissions(Permission.UNIDADE_READ)
  findAll() {
    // Implementação
  }
  ```
- [ ] Testar diferentes cenários de acesso

## Documentação Swagger

- [ ] Adicionar descrições detalhadas para cada endpoint
  ```typescript
  @ApiOperation({ summary: 'Listar todas as unidades', description: 'Retorna uma lista paginada de unidades com opções de filtro' })
  ```
- [ ] Documentar parâmetros, corpo da requisição e respostas
  ```typescript
  @ApiQuery({ name: 'page', required: false, description: 'Número da página', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de unidades retornada com sucesso', type: UnidadePaginatedResponseDto })
  ```
- [ ] Incluir exemplos de uso
  ```typescript
  @ApiBody({ type: CreateUnidadeDto, examples: { 
    example1: { 
      summary: 'Exemplo de criação de CRAS', 
      value: { nome: 'CRAS Centro', codigo: 'CRAS01', tipo: 'cras' } 
    } 
  }})
  ```
- [ ] Documentar possíveis erros e códigos de status
  ```typescript
  @ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada', type: ErrorResponseDto })
  ```

## Otimização de Consultas e Cache

- [ ] Otimizar consultas com seleção específica de campos
  ```typescript
  const unidades = await this.repository.createQueryBuilder('unidade')
    .select(['unidade.id', 'unidade.nome', 'unidade.codigo', 'unidade.tipo'])
    .where(/* condições */)
    .getMany();
  ```
- [ ] Implementar índices para campos frequentemente consultados
  ```typescript
  @Entity('unidade')
  @Index(['nome'])
  @Index(['codigo'], { unique: true })
  export class Unidade {
    // Implementação
  }
  ```
- [ ] Configurar cache para consultas frequentes
  ```typescript
  @Injectable()
  export class UnidadeService {
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      // Outras dependências
    ) {}
    
    async findById(id: string) {
      const cacheKey = `unidade_${id}`;
      let unidade = await this.cacheManager.get(cacheKey);
      
      if (!unidade) {
        unidade = await this.unidadeRepository.findById(id);
        if (unidade) {
          await this.cacheManager.set(cacheKey, unidade, { ttl: 3600 });
        }
      }
      
      return unidade;
    }
  }
  ```
- [ ] Medir e comparar performance antes e depois das otimizações

## Testes

- [ ] Implementar testes unitários para o UnidadeService
  ```typescript
  describe('UnidadeService', () => {
    // Implementação dos testes
  });
  ```
- [ ] Implementar testes de integração para o UnidadeController
  ```typescript
  describe('UnidadeController (e2e)', () => {
    // Implementação dos testes
  });
  ```
- [ ] Implementar testes para cenários de erro
- [ ] Verificar cobertura de testes

## Refatoração e Limpeza de Código

- [ ] Padronizar nomenclatura de variáveis e métodos
- [ ] Remover código morto ou comentado
- [ ] Aplicar princípios SOLID
- [ ] Verificar e corrigir problemas de linting
