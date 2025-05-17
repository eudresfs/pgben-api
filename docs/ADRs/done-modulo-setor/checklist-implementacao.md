# Checklist de Implementação - Módulo de Setor

## Relacionamentos entre Entidades

- [ ] Adicionar relacionamento OneToMany com Usuario na entidade Setor
  ```typescript
  @OneToMany(() => Usuario, usuario => usuario.setor)
  usuarios: Usuario[];
  ```
- [ ] Verificar e atualizar métodos que utilizam esse relacionamento
- [ ] Garantir que a entidade Usuario tenha o relacionamento ManyToOne com Setor
  ```typescript
  @ManyToOne(() => Setor)
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;
  ```
- [ ] Criar migration para atualizar a estrutura do banco de dados, se necessário

## Validações nos DTOs

- [ ] Melhorar validação de sigla no DTO de Setor
  ```typescript
  @IsString()
  @IsNotEmpty({ message: 'Sigla é obrigatória' })
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'Sigla deve conter entre 2 e 10 caracteres alfanuméricos maiúsculos' })
  sigla: string;
  ```
- [ ] Adicionar validação de nome no DTO de Setor
  ```typescript
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;
  ```
- [ ] Melhorar validação de unidadeId no DTO de Setor
  ```typescript
  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsNotEmpty({ message: 'ID da unidade é obrigatório' })
  unidadeId: string;
  ```
- [ ] Implementar validação customizada para regras de negócio específicas

## Transações para Operações Complexas

- [ ] Identificar operações que afetam múltiplas entidades
- [ ] Implementar transações no método create do SetorService
  ```typescript
  async create(createSetorDto: CreateSetorDto) {
    return this.dataSource.transaction(async manager => {
      // Implementação
    });
  }
  ```
- [ ] Implementar transações no método update do SetorService
- [ ] Garantir rollback em caso de falha em qualquer etapa da transação
- [ ] Testar cenários de sucesso e falha

## RBAC nos Endpoints

- [ ] Definir roles e permissões para cada operação do módulo
  ```typescript
  export enum Permission {
    SETOR_CREATE = 'setor:create',
    SETOR_READ = 'setor:read',
    SETOR_UPDATE = 'setor:update',
    SETOR_DELETE = 'setor:delete',
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
  @RequirePermissions(Permission.SETOR_READ)
  findAll() {
    // Implementação
  }
  ```
- [ ] Testar diferentes cenários de acesso
- [ ] Garantir que apenas usuários autorizados possam gerenciar setores

## Documentação Swagger

- [ ] Adicionar descrições detalhadas para cada endpoint
  ```typescript
  @ApiOperation({ summary: 'Listar todos os setores', description: 'Retorna uma lista paginada de setores com opções de filtro' })
  ```
- [ ] Documentar parâmetros, corpo da requisição e respostas
  ```typescript
  @ApiQuery({ name: 'unidadeId', required: false, description: 'ID da unidade para filtrar setores', type: String })
  @ApiResponse({ status: 200, description: 'Lista de setores retornada com sucesso', type: SetorPaginatedResponseDto })
  ```
- [ ] Incluir exemplos de uso
  ```typescript
  @ApiBody({ type: CreateSetorDto, examples: { 
    example1: { 
      summary: 'Exemplo de criação de setor', 
      value: { nome: 'Atendimento', sigla: 'ATD', unidadeId: '550e8400-e29b-41d4-a716-446655440000' } 
    } 
  }})
  ```
- [ ] Documentar possíveis erros e códigos de status
  ```typescript
  @ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Setor não encontrado', type: ErrorResponseDto })
  ```

## Otimização de Consultas e Cache

- [ ] Otimizar consultas com seleção específica de campos
  ```typescript
  const setores = await this.repository.createQueryBuilder('setor')
    .select(['setor.id', 'setor.nome', 'setor.sigla'])
    .leftJoinAndSelect('setor.unidade', 'unidade', 'unidade.id = :unidadeId', { unidadeId })
    .where(/* condições */)
    .getMany();
  ```
- [ ] Implementar índices para campos frequentemente consultados
  ```typescript
  @Entity('setor')
  @Index(['nome'])
  @Index(['unidade_id'])
  export class Setor {
    // Implementação
  }
  ```
- [ ] Configurar cache para consultas frequentes
  ```typescript
  @Injectable()
  export class SetorService {
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      // Outras dependências
    ) {}
    
    async findByUnidadeId(unidadeId: string) {
      const cacheKey = `setores_unidade_${unidadeId}`;
      let setores = await this.cacheManager.get(cacheKey);
      
      if (!setores) {
        setores = await this.setorRepository.findByUnidadeId(unidadeId);
        if (setores) {
          await this.cacheManager.set(cacheKey, setores, { ttl: 3600 });
        }
      }
      
      return setores;
    }
  }
  ```
- [ ] Medir e comparar performance antes e depois das otimizações

## Testes

- [ ] Implementar testes unitários para o SetorService
  ```typescript
  describe('SetorService', () => {
    // Implementação dos testes
  });
  ```
- [ ] Implementar testes de integração para o SetorController
  ```typescript
  describe('SetorController (e2e)', () => {
    // Implementação dos testes
  });
  ```
- [ ] Implementar testes para cenários de erro
  ```typescript
  it('should throw NotFoundException when setor not found', async () => {
    // Implementação do teste
  });
  ```
- [ ] Verificar cobertura de testes

## Refatoração e Limpeza de Código

- [ ] Padronizar nomenclatura de variáveis e métodos
- [ ] Remover código morto ou comentado
- [ ] Aplicar princípios SOLID
- [ ] Verificar e corrigir problemas de linting
- [ ] Melhorar mensagens de log para facilitar depuração
