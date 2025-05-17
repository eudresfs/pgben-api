# Checklist de Implementação - Módulo de Usuário

## Relacionamentos entre Entidades

- [ ] Adicionar relacionamento ManyToOne com Unidade na entidade Usuario
  ```typescript
  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;
  ```
- [ ] Adicionar relacionamento ManyToOne com Setor na entidade Usuario
  ```typescript
  @ManyToOne(() => Setor)
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;
  ```
- [ ] Verificar e atualizar métodos que utilizam esses relacionamentos
- [ ] Criar migration para atualizar a estrutura do banco de dados, se necessário
- [ ] Implementar carregamento adequado de dados relacionados nas consultas

## Validações nos DTOs

- [ ] Implementar validação mais rigorosa para senha
  ```typescript
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(20, { message: 'A senha deve ter no máximo 20 caracteres' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
  })
  senha: string;
  ```
- [ ] Adicionar validação específica para CPF
  ```typescript
  @IsString()
  @IsOptional()
  @Validate(CpfValidator, { message: 'CPF inválido' })
  cpf: string;
  ```
- [ ] Adicionar validação específica para matrícula
  ```typescript
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9]{5,10}$/, { message: 'Matrícula deve conter entre 5 e 10 caracteres alfanuméricos' })
  matricula: string;
  ```
- [ ] Implementar validador customizado para CPF
  ```typescript
  @ValidatorConstraint({ name: 'cpf', async: false })
  export class CpfValidator implements ValidatorConstraintInterface {
    validate(cpf: string) {
      // Implementação da validação de CPF
      return isCpfValid(cpf);
    }
  }
  ```
- [ ] Melhorar validação de unidadeId e setorId
  ```typescript
  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsOptional()
  unidadeId?: string;

  @IsUUID(undefined, { message: 'ID do setor inválido' })
  @IsOptional()
  setorId?: string;
  ```

## Transações para Operações Complexas

- [ ] Identificar operações que afetam múltiplas entidades
- [ ] Implementar transações no método create do UsuarioService
  ```typescript
  async create(createUsuarioDto: CreateUsuarioDto) {
    return this.dataSource.transaction(async manager => {
      // Verificações de unicidade
      
      // Gerar hash da senha
      const senhaHash = await bcrypt.hash(createUsuarioDto.senha, 10);
      
      // Criar usuário
      const usuarioRepo = manager.getRepository(Usuario);
      const usuario = usuarioRepo.create({
        nome: createUsuarioDto.nome,
        email: createUsuarioDto.email,
        senhaHash,
        // Outros campos
      });
      
      const savedUsuario = await usuarioRepo.save(usuario);
      
      // Remover campos sensíveis
      const { senhaHash: _, ...usuarioSemSenha } = savedUsuario;
      return usuarioSemSenha;
    });
  }
  ```
- [ ] Implementar transações no método update do UsuarioService
- [ ] Implementar transações no método updateStatus do UsuarioService
- [ ] Garantir rollback em caso de falha em qualquer etapa da transação

## RBAC Consistente

- [ ] Revisar e refinar o enum Role
  ```typescript
  export enum Role {
    ADMIN = 'admin',
    GESTOR_SISTEMA = 'gestor_sistema',
    GESTOR_UNIDADE = 'gestor_unidade',
    TECNICO_UNIDADE = 'tecnico_unidade',
    ATENDENTE = 'atendente',
    AUDITOR = 'auditor',
  }
  ```
- [ ] Definir permissões granulares para cada operação
  ```typescript
  export enum Permission {
    USUARIO_CREATE = 'usuario:create',
    USUARIO_READ = 'usuario:read',
    USUARIO_UPDATE = 'usuario:update',
    USUARIO_DELETE = 'usuario:delete',
    // Outras permissões
  }
  ```
- [ ] Implementar guard para verificação de permissões
  ```typescript
  @Injectable()
  export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}
    
    canActivate(context: ExecutionContext): boolean {
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
        context.getHandler(),
        context.getClass(),
      ]);
      
      if (!requiredPermissions) {
        return true;
      }
      
      const { user } = context.switchToHttp().getRequest();
      return requiredPermissions.some(permission => this.hasPermission(user, permission));
    }
    
    private hasPermission(user: any, permission: string): boolean {
      // Implementação da verificação de permissão
    }
  }
  ```
- [ ] Adicionar decoradores de roles e permissões em todos os endpoints
  ```typescript
  @Get()
  @Roles(Role.ADMIN, Role.GESTOR_SISTEMA)
  @RequirePermissions(Permission.USUARIO_READ)
  findAll() {
    // Implementação
  }
  ```
- [ ] Implementar mapeamento de roles para permissões
  ```typescript
  export const ROLE_PERMISSIONS = {
    [Role.ADMIN]: [
      Permission.USUARIO_CREATE,
      Permission.USUARIO_READ,
      Permission.USUARIO_UPDATE,
      Permission.USUARIO_DELETE,
      // Todas as permissões
    ],
    [Role.GESTOR_SISTEMA]: [
      Permission.USUARIO_READ,
      Permission.USUARIO_UPDATE,
      // Permissões específicas
    ],
    // Outras roles
  };
  ```

## Segurança Adicional

- [ ] Implementar serviço de senha para centralizar lógica de senha
  ```typescript
  @Injectable()
  export class PasswordService {
    async hash(password: string): Promise<string> {
      return bcrypt.hash(password, 10);
    }
    
    async validate(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    }
    
    generateTemporaryPassword(): string {
      // Implementação da geração de senha temporária
    }
    
    validatePasswordStrength(password: string): boolean {
      // Implementação da validação de força da senha
    }
  }
  ```
- [ ] Implementar rate limiting para prevenção de ataques de força bruta
  ```typescript
  // Em main.ts
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5, // limite de 5 tentativas por IP
      message: 'Muitas tentativas de login. Tente novamente mais tarde.',
    }),
  );
  ```
- [ ] Implementar logs de auditoria para ações sensíveis
  ```typescript
  @Injectable()
  export class AuditService {
    constructor(private readonly logger: Logger) {}
    
    logAction(userId: string, action: string, details: any): void {
      this.logger.log({
        userId,
        action,
        details,
        timestamp: new Date(),
        ip: /* obter IP */,
      });
    }
  }
  ```
- [ ] Implementar mecanismo de bloqueio de conta após múltiplas tentativas falhas
  ```typescript
  @Injectable()
  export class AuthService {
    private readonly failedLoginAttempts = new Map<string, number>();
    
    async validateUser(email: string, password: string): Promise<any> {
      // Verificar se a conta está bloqueada
      if (this.isAccountLocked(email)) {
        throw new UnauthorizedException('Conta bloqueada. Tente novamente mais tarde.');
      }
      
      // Validar usuário
      // ...
      
      // Se falhar, incrementar contador de tentativas
      this.incrementFailedLoginAttempts(email);
      
      // Se sucesso, resetar contador
      this.resetFailedLoginAttempts(email);
    }
    
    private isAccountLocked(email: string): boolean {
      return (this.failedLoginAttempts.get(email) || 0) >= 5;
    }
    
    private incrementFailedLoginAttempts(email: string): void {
      const attempts = (this.failedLoginAttempts.get(email) || 0) + 1;
      this.failedLoginAttempts.set(email, attempts);
    }
    
    private resetFailedLoginAttempts(email: string): void {
      this.failedLoginAttempts.delete(email);
    }
  }
  ```
- [ ] Implementar mecanismo de redefinição de senha seguro
  ```typescript
  @Injectable()
  export class PasswordResetService {
    async generateResetToken(email: string): Promise<string> {
      // Implementação da geração de token de redefinição
    }
    
    async validateResetToken(token: string): Promise<boolean> {
      // Implementação da validação de token de redefinição
    }
    
    async resetPassword(token: string, newPassword: string): Promise<void> {
      // Implementação da redefinição de senha
    }
  }
  ```

## Documentação Swagger

- [ ] Adicionar descrições detalhadas para cada endpoint
  ```typescript
  @ApiOperation({ summary: 'Listar todos os usuários', description: 'Retorna uma lista paginada de usuários com opções de filtro' })
  ```
- [ ] Documentar parâmetros, corpo da requisição e respostas
  ```typescript
  @ApiQuery({ name: 'page', required: false, description: 'Número da página', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso', type: UsuarioPaginatedResponseDto })
  ```
- [ ] Incluir exemplos de uso
  ```typescript
  @ApiBody({ type: CreateUsuarioDto, examples: { 
    example1: { 
      summary: 'Exemplo de criação de usuário técnico', 
      value: { nome: 'João Silva', email: 'joao.silva@semtas.gov.br', senha: 'Senha@123', role: 'tecnico_unidade' } 
    } 
  }})
  ```
- [ ] Documentar possíveis erros e códigos de status
  ```typescript
  @ApiResponse({ status: 400, description: 'Dados inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autorizado', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado', type: ErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Conflito - Email já em uso', type: ErrorResponseDto })
  ```
- [ ] Documentar aspectos de segurança
  ```typescript
  @ApiSecurity('bearer')
  @ApiTags('Usuários')
  @Controller('usuarios')
  export class UsuarioController {
    // Implementação
  }
  ```

## Otimização de Consultas e Cache

- [ ] Otimizar consultas com seleção específica de campos
  ```typescript
  const usuarios = await this.repository.createQueryBuilder('usuario')
    .select(['usuario.id', 'usuario.nome', 'usuario.email', 'usuario.role'])
    .leftJoinAndSelect('usuario.unidade', 'unidade')
    .leftJoinAndSelect('usuario.setor', 'setor')
    .where(/* condições */)
    .getMany();
  ```
- [ ] Implementar índices para campos frequentemente consultados
  ```typescript
  @Entity('usuario')
  @Index(['email'], { unique: true })
  @Index(['cpf'], { unique: true })
  @Index(['matricula'], { unique: true })
  @Index(['unidadeId'])
  @Index(['setorId'])
  export class Usuario {
    // Implementação
  }
  ```
- [ ] Configurar cache para consultas frequentes
  ```typescript
  @Injectable()
  export class UsuarioService {
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      // Outras dependências
    ) {}
    
    async findById(id: string) {
      const cacheKey = `usuario_${id}`;
      let usuario = await this.cacheManager.get(cacheKey);
      
      if (!usuario) {
        usuario = await this.usuarioRepository.findById(id);
        if (usuario) {
          // Remover campos sensíveis
          const { senhaHash, ...usuarioSemSenha } = usuario;
          await this.cacheManager.set(cacheKey, usuarioSemSenha, { ttl: 3600 });
          return usuarioSemSenha;
        }
        return null;
      }
      
      return usuario;
    }
  }
  ```
- [ ] Medir e comparar performance antes e depois das otimizações

## Testes

- [ ] Implementar testes unitários para o UsuarioService
  ```typescript
  describe('UsuarioService', () => {
    // Implementação dos testes
  });
  ```
- [ ] Implementar testes de integração para o UsuarioController
  ```typescript
  describe('UsuarioController (e2e)', () => {
    // Implementação dos testes
  });
  ```
- [ ] Implementar testes para cenários de erro
  ```typescript
  it('should throw UnauthorizedException when password is incorrect', async () => {
    // Implementação do teste
  });
  ```
- [ ] Implementar testes específicos para aspectos de segurança
  ```typescript
  it('should block account after 5 failed login attempts', async () => {
    // Implementação do teste
  });
  ```
- [ ] Verificar cobertura de testes

## Refatoração e Limpeza de Código

- [ ] Padronizar nomenclatura de variáveis e métodos
- [ ] Remover código morto ou comentado
- [ ] Aplicar princípios SOLID
- [ ] Verificar e corrigir problemas de linting
- [ ] Extrair lógica complexa para métodos privados testáveis
