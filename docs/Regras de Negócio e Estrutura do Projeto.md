# Regras de Negócio e Estrutura do Projeto

## 1. Regras de Negócio Essenciais

As regras de negócio devem ser implementadas principalmente na camada de serviço, mantendo-as isoladas da persistência de dados e da apresentação. Abaixo estão as principais regras para cada módulo:

### 1.1 Autenticação e Usuários

- **Senhas**: Armazenar apenas hashes com algoritmo bcrypt (fator 12+)
- **Primeiro acesso**: Usuários com primeiro_acesso=true devem completar cadastro e trocar senha
- **Inativação**: Usuários inativados não podem fazer login
- **Administração**: Apenas administradores podem criar usuários de nível administrador
- **Permissões**: Garantir que usuários de unidade só vejam dados de sua própria unidade

```typescript
// Exemplo de regra de negócio no service
async createUser(dto: CreateUserDto, creatorUser: User): Promise<User> {
  // Verificar se o criador tem permissão para criar usuários do perfil solicitado
  if (dto.role === Role.ADMIN && creatorUser.role !== Role.ADMIN) {
    throw new ForbiddenException('Apenas administradores podem criar usuários administradores');
  }
  
  // Verificar se o email já está em uso
  const existingUser = await this.usersRepository.findByEmail(dto.email);
  if (existingUser) {
    throw new ConflictException('Email já está em uso');
  }
  
  // Hash da senha temporária
  const senha_hash = await this.passwordService.hash(this.generateTempPassword());
  
  // Criar o usuário
  const user = await this.usersRepository.create({
    ...dto,
    senha_hash,
    primeiro_acesso: true,
    status: 'ativo'
  });
  
  // Enviar email com credenciais
  await this.notificationService.sendWelcomeEmail(user);
  
  return user;
}
```

### 1.2 Beneficiários

- **CPF único**: Não permitir duplicação de CPF no cadastro
- **Validação de CPF**: Implementar algoritmo de validação de dígitos verificadores
- **Idade mínima**: Para solicitante principal, verificar idade mínima conforme legislação
- **Residência**: Validar tempo mínimo de residência em Natal (2 anos para alguns benefícios)
- **Atualização de cadastro**: Garantir que dados críticos como CPF não sejam alterados após cadastro

```typescript
// Validação de CPF como um serviço de domínio
export class CpfValidationService {
  isValid(cpf: string): boolean {
    // Remover caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');
    
    // Verificações básicas
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }
}
```

### 1.3 Solicitações e Workflow

- **Fluxo de estados**: Implementar uma máquina de estados com transições permitidas
  - Estados: `rascunho → aberta → em_analise → aprovada/pendente → liberada → concluida`
- **Validação por tipo**: Cada tipo de benefício requer validações específicas:
  - **Auxílio Natalidade**: Verificar data de nascimento (0-3 meses) ou previsão do parto
  - **Aluguel Social**: Verificar motivo, valor solicitado, residência de 2+ anos
- **Documentos obrigatórios**: Verificar presença de todos os documentos obrigatórios antes de enviar para análise
- **Autorização de workflow**: Apenas perfis autorizados podem executar transições específicas
  - Técnicos Unidade: podem criar e enviar para análise
  - Técnicos/Gestores SEMTAS: podem analisar, aprovar ou pendenciar
  - Técnicos Unidade: podem liberar benefícios aprovados
- **Temporalidade**: Verificar prazos máximos por tipo de benefício (ex: 6 meses para aluguel social)
- **Renovação**: Verificar elegibilidade para renovação com base no histórico
- **Duplicidade**: Impedir solicitações simultâneas do mesmo tipo de benefício para um beneficiário

```typescript
// Exemplo de regra de workflow em um serviço
async enviarParaAnalise(id: string, usuarioId: string): Promise<Solicitacao> {
  const solicitacao = await this.solicitacoesRepository.findById(id);
  
  if (!solicitacao) {
    throw new NotFoundException('Solicitação não encontrada');
  }
  
  // Verificação de estado atual
  if (solicitacao.status !== StatusSolicitacao.ABERTA) {
    throw new BadRequestException('Solicitação não está no estado correto para envio');
  }
  
  // Verificar permissão do usuário
  const usuario = await this.usuariosRepository.findById(usuarioId);
  if (!this.podeEnviarParaAnalise(usuario, solicitacao)) {
    throw new ForbiddenException('Usuário não tem permissão para enviar esta solicitação');
  }
  
  // Verificar documentos obrigatórios
  const documentosPendentes = await this.verificarDocumentosObrigatorios(id);
  if (documentosPendentes.length > 0) {
    throw new BadRequestException(`Documentos obrigatórios pendentes: ${documentosPendentes.join(', ')}`);
  }
  
  // Validações específicas por tipo de benefício
  await this.validarPorTipoBeneficio(solicitacao);
  
  // Atualizar estado e registrar histórico
  solicitacao.status = StatusSolicitacao.EM_ANALISE;
  const solicitacaoAtualizada = await this.solicitacoesRepository.save(solicitacao);
  
  await this.historicoService.registrarMudancaStatus(
    id,
    StatusSolicitacao.ABERTA,
    StatusSolicitacao.EM_ANALISE,
    usuarioId,
    'Enviado para análise'
  );
  
  // Notificar SEMTAS
  await this.notificacaoService.notificarNovaSolicitacao(solicitacao);
  
  return solicitacaoAtualizada;
}
```

### 1.4 Documentos

- **Tamanho máximo**: Limitar uploads a 5MB por arquivo
- **Tipos permitidos**: Aceitar apenas formatos seguros (PDF, JPEG, PNG)
- **Versionamento**: Manter histórico de versões de documentos
- **Segurança**: Validar MIME type real (não apenas extensão)
- **Armazenamento**: Armazenar metadados no banco e conteúdo no MinIO/S3

```typescript
// Validação de documento
async validateDocument(file: Express.Multer.File): Promise<void> {
  // Validar tamanho (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new BadRequestException('Arquivo excede o tamanho máximo de 5MB');
  }
  
  // Validar tipo MIME
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException('Formato de arquivo não permitido. Apenas PDF, JPEG e PNG são aceitos.');
  }
  
  // Verificação adicional de tipo real do arquivo (magic numbers)
  const fileTypeResult = await fileType.fromBuffer(file.buffer);
  if (!fileTypeResult || !allowedMimeTypes.includes(fileTypeResult.mime)) {
    throw new BadRequestException('Conteúdo do arquivo não corresponde ao tipo declarado');
  }
}
```

### 1.5 Benefícios

- **Configuração dinâmica**: Permitir configuração de requisitos documentais por tipo de benefício
- **Temporalidade**: Configurar duração e renovação por tipo (6 meses para aluguel social)
- **Valores máximos**: Validar valores dentro do limite configurado
- **Fluxo de aprovação**: Configurar quais setor participam do workflow por tipo

```typescript
// Validação de valor solicitado para aluguel social
async validarValorAluguelSocial(valor: number, tipoBeneficioId: string): Promise<void> {
  const tipoBeneficio = await this.tiposBeneficioRepository.findById(tipoBeneficioId);
  
  if (!tipoBeneficio) {
    throw new NotFoundException('Tipo de benefício não encontrado');
  }
  
  if (valor > tipoBeneficio.valor_maximo) {
    throw new BadRequestException(`Valor solicitado excede o máximo permitido de R$ ${tipoBeneficio.valor_maximo}`);
  }
}
```

## 2. Estrutura de Diretórios Detalhada

A seguir, apresento uma estrutura de diretórios mais detalhada, seguindo o padrão de módulos do NestJS com clara separação de preocupações:

```
src/
├── main.ts                     # Ponto de entrada da aplicação
├── app.module.ts               # Módulo principal
│
├── config/                     # Configurações
│   ├── configuration.ts        # Configurações por ambiente
│   ├── validation.schema.ts    # Esquema de validação de env vars
│   └── index.ts                # Export de configurações
│
├── common/                     # Código compartilhado entre módulos
│   ├── constants/              # Constantes da aplicação
│   ├── decorators/             # Decorators personalizados
│   ├── dto/                    # DTOs compartilhados
│   │   └── pagination.dto.ts   # DTOs para paginação
│   ├── enums/                  # Enumerações globais
│   │   └── roles.enum.ts       # Enum de perfis
│   ├── exceptions/             # Exceções personalizadas
│   ├── filters/                # Filtros de exceção
│   │   └── http-exception.filter.ts
│   ├── guards/                 # Guards de autenticação/autorização
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/           # Interceptors
│   │   ├── response.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── interfaces/             # Interfaces compartilhadas
│   ├── middleware/             # Middlewares
│   ├── pipes/                  # Pipes personalizados
│   └── utils/                  # Funções utilitárias
│       ├── cpf.validator.ts
│       └── date.utils.ts
│
├── database/                   # Configuração de banco de dados
│   ├── migrations/             # Migrations TypeORM
│   ├── seeds/                  # Seeds para testes/inicial
│   └── database.module.ts      # Módulo de banco de dados
│
├── auth/                       # Módulo de autenticação
│   ├── auth.module.ts          # Definição do módulo
│   ├── auth.controller.ts      # Controller de autenticação
│   ├── auth.service.ts         # Serviço de autenticação
│   ├── strategies/             # Estratégias Passport
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── guards/                 # Guards específicos de auth
│   └── dto/                    # DTOs de auth
│       ├── login.dto.ts
│       └── register.dto.ts
│
├── usuario/                   # Módulo de usuários
│   ├── usuario.module.ts
│   ├── usuario.controller.ts
│   ├── usuario.service.ts     # Lógica de negócio
│   ├── usuario.repository.ts  # Acesso a dados
│   ├── entities/               # Entidades TypeORM
│   │   └── usuario.entity.ts
│   ├── dto/                    # DTOs específicos do módulo
│   │   ├── create-usuario.dto.ts
│   │   └── update-usuario.dto.ts
│   └── interfaces/             # Interfaces do módulo
│
├── unidade/                   # Módulo de unidade
│   ├── unidade.module.ts
│   ├── unidade.controller.ts
│   ├── unidade.service.ts
│   ├── unidade.repository.ts
│   ├── entities/
│   │   ├── unidade.entity.ts
│   │   └── setor.entity.ts
│   └── dto/
│
├── beneficiarios/              # Módulo de beneficiários
│   ├── beneficiarios.module.ts
│   ├── beneficiarios.controller.ts
│   ├── beneficiarios.service.ts
│   ├── beneficiarios.repository.ts
│   ├── entities/
│   │   ├── beneficiario.entity.ts
│   │   └── composicao-familiar.entity.ts
│   ├── dto/
│   └── validators/             # Validadores específicos
│       └── cpf.validator.ts
│
├── beneficio/                 # Módulo de tipos de benefícios
│   ├── beneficio.module.ts
│   ├── beneficio.controller.ts
│   ├── beneficio.service.ts
│   ├── beneficio.repository.ts
│   ├── entities/
│   │   ├── tipo-beneficio.entity.ts
│   │   └── requisito-documento.entity.ts
│   └── dto/
│
├── solicitacao/               # Módulo de solicitações (core)
│   ├── solicitacao.module.ts
│   ├── solicitacao.controller.ts
│   ├── solicitacao.service.ts
│   ├── solicitacao.repository.ts
│   ├── entities/
│   │   ├── solicitacao.entity.ts
│   │   ├── dados-beneficios.entity.ts
│   │   ├── pendencia.entity.ts
│   │   └── historico-solicitacao.entity.ts
│   ├── dto/
│   │   ├── create-solicitacao.dto.ts
│   │   ├── update-solicitacao.dto.ts
│   │   ├── pendenciar-solicitacao.dto.ts
│   │   └── aprovar-solicitacao.dto.ts
│   ├── workflow/               # Máquina de estados para workflow
│   │   ├── solicitacao-state.machine.ts
│   │   └── states/
│   │       ├── em-analise.state.ts
│   │       ├── aprovada.state.ts
│   │       └── ...outros estados
│   └── validators/             # Validadores específicos
│       ├── aluguel-social.validator.ts
│       └── auxilio-natalidade.validator.ts
│
├── documento/                 # Módulo de documentos
│   ├── documento.module.ts
│   ├── documento.controller.ts
│   ├── documento.service.ts
│   ├── documento.repository.ts
│   ├── entities/
│   │   ├── documento.entity.ts
│   │   └── documento-enviado.entity.ts
│   ├── dto/
│   └── storage/                # Integração com MinIO/S3
│       └── storage.service.ts
│
├── relatorios/                 # Módulo de relatórios
│   ├── relatorios.module.ts
│   ├── relatorios.controller.ts
│   ├── relatorios.service.ts
│   ├── dto/
│   └── exporters/              # Exportadores (PDF, CSV)
│       ├── pdf.exporter.ts
│       └── csv.exporter.ts
│
├── notificacao/               # Módulo de notificações
│   ├── notificacao.module.ts
│   ├── notificacao.controller.ts
│   ├── notificacao.service.ts
│   ├── notificacao.repository.ts
│   ├── entities/
│   │   └── notificacao.entity.ts
│   ├── dto/
│   └── providers/              # Provedores de notificação
│       ├── email.provider.ts
│       └── in-app.provider.ts
│
└── auditoria/                  # Módulo de auditoria
    ├── auditoria.module.ts
    ├── auditoria.controller.ts
    ├── auditoria.service.ts
    ├── auditoria.repository.ts
    ├── entities/
    │   └── log-auditoria.entity.ts
    └── interceptors/
        └── audit-log.interceptor.ts
```

## 3. Separação de Responsabilidades por Camada

Cada módulo segue uma estrutura em camadas para garantir clara separação de responsabilidades:

### 3.1 Controllers (Camada de Apresentação)

- **Responsabilidades**: 
  - Receber requisições HTTP
  - Validar formato de entrada (via Pipes)
  - Controlar autenticação/autorização (via Guards)
  - Delegar processamento para Services
  - Formatar respostas
- **O que evitar**: 
  - Lógica de negócio
  - Acesso direto a repositórios
  - Manipulação de dados complexa

```typescript
@Controller('solicitacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @Post()
  @Roles(Role.TECNICO_UNIDADE, Role.ADMIN)
  @ApiOperation({ summary: 'Criar nova solicitação' })
  @ApiCreatedResponse({ type: SolicitacaoResponseDto })
  async create(
    @Body() createSolicitacaoDto: CreateSolicitacaoDto,
    @CurrentUser() user: UserDto
  ): Promise<SolicitacaoResponseDto> {
    return this.solicitacoesService.create(createSolicitacaoDto, user);
  }

  @Put(':id/enviar')
  @Roles(Role.TECNICO_UNIDADE, Role.ADMIN)
  @ApiOperation({ summary: 'Enviar solicitação para análise' })
  @ApiOkResponse({ type: SolicitacaoResponseDto })
  async enviarParaAnalise(
    @Param('id') id: string,
    @CurrentUser() user: UserDto
  ): Promise<SolicitacaoResponseDto> {
    return this.solicitacoesService.enviarParaAnalise(id, user.id);
  }
}
```

### 3.2 Services (Camada de Negócio)

- **Responsabilidades**:
  - Implementar toda a lógica de negócio
  - Aplicar regras e validações
  - Orquestrar operações
  - Gerenciar transações
  - Coordenar múltiplos repositórios quando necessário
- **O que evitar**:
  - Acesso direto a objetos de requisição/resposta HTTP
  - Preocupações de apresentação
  - Comunicação direta com banco de dados (usar repositórios)

```typescript
@Injectable()
export class SolicitacoesService {
  constructor(
    private readonly solicitacoesRepository: SolicitacoesRepository,
    private readonly beneficiariosRepository: BeneficiariosRepository,
    private readonly tiposBeneficioRepository: TiposBeneficioRepository,
    private readonly historicoService: HistoricoSolicitacaoService,
    private readonly notificacaoService: NotificacaoService,
    private readonly workflowService: WorkflowService
  ) {}

  async create(dto: CreateSolicitacaoDto, user: UserDto): Promise<SolicitacaoResponseDto> {
    // Validar beneficiário
    const beneficiario = await this.beneficiariosRepository.findById(dto.solicitante_id);
    if (!beneficiario) {
      throw new NotFoundException('Beneficiário não encontrado');
    }

    // Validar tipo de benefício
    const tipoBeneficio = await this.tiposBeneficioRepository.findById(dto.tipo_beneficio_id);
    if (!tipoBeneficio) {
      throw new NotFoundException('Tipo de benefício não encontrado');
    }
    
    // Verificar se já existe solicitação ativa para este beneficiário/tipo
    const solicitacaoAtiva = await this.solicitacoesRepository.findActiveBySolicitanteAndTipo(
      dto.solicitante_id,
      dto.tipo_beneficio_id
    );
    
    if (solicitacaoAtiva) {
      throw new ConflictException(
        `Já existe uma solicitação ${solicitacaoAtiva.status} para este beneficiário e tipo de benefício`
      );
    }
    
    // Validações específicas por tipo de benefício
    await this.validateByBenefitType(dto);
    
    // Gerar protocolo único
    const protocolo = await this.generateProtocolo();
    
    // Criar solicitação
    const novaSolicitacao = await this.solicitacoesRepository.create({
      protocolo,
      solicitante_id: dto.solicitante_id,
      tipo_beneficio_id: dto.tipo_beneficio_id,
      unidade_id: user.unidade_id,
      tecnico_id: user.id,
      tipo_solicitacao: dto.tipo_solicitacao,
      data_abertura: new Date(),
      status: 'rascunho',
      origem: dto.origem,
      parecer_tecnico: dto.parecer_tecnico
    });
    
    // Registrar dados específicos do benefício
    await this.saveBenefitData(novaSolicitacao.id, dto.dados_beneficio);
    
    // Registrar no histórico
    await this.historicoService.register(
      novaSolicitacao.id,
      null,
      'rascunho',
      user.id,
      'Solicitação criada'
    );
    
    return this.mapToResponseDto(novaSolicitacao);
  }
}
```

### 3.3 Repositories (Camada de Dados)

- **Responsabilidades**:
  - Abstrair acesso ao banco de dados
  - Executar operações CRUD
  - Implementar queries complexas
  - Gerenciar relacionamentos entre entidades
- **O que evitar**:
  - Lógica de negócio
  - Validações de negócio
  - Dependências de serviços

```typescript
@Injectable()
export class SolicitacoesRepository {
  constructor(
    @InjectRepository(SolicitacaoEntity)
    private readonly repository: Repository<SolicitacaoEntity>
  ) {}

  async findById(id: string, relations: string[] = []): Promise<SolicitacaoEntity> {
    return this.repository.findOne({ 
      where: { id },
      relations
    });
  }

  async findActiveBySolicitanteAndTipo(
    solicitanteId: string,
    tipoBeneficioId: string
  ): Promise<SolicitacaoEntity> {
    return this.repository.findOne({
      where: {
        solicitante: { id: solicitanteId },
        tipo_beneficio: { id: tipoBeneficioId },
        status: In(['rascunho', 'aberta', 'em_analise', 'aprovada']),
        removed_at: IsNull()
      }
    });
  }

  async findPendingByUnidade(unidadeId: string, page = 1, limit = 10): Promise<[SolicitacaoEntity[], number]> {
    return this.repository.findAndCount({
      where: {
        unidade: { id: unidadeId },
        status: 'pendente',
        removed_at: IsNull()
      },
      relations: ['solicitante', 'tipo_beneficio'],
      skip: (page - 1) * limit,
      take: limit,
      order: { data_abertura: 'DESC' }
    });
  }
  
  async create(data: Partial<SolicitacaoEntity>): Promise<SolicitacaoEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
  
  async update(id: string, data: Partial<SolicitacaoEntity>): Promise<SolicitacaoEntity> {
    await this.repository.update(id, data);
    return this.findById(id);
  }
  
  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, {
      removed_at: new Date()
    });
  }
}
```

### 3.4 Entities (Camada de Domínio)

- **Responsabilidades**:
  - Representar o modelo de dados
  - Definir relacionamentos
  - Fornecer decoradores para ORM
  - Validações a nível de dados
- **O que evitar**:
  - Lógica de negócio complexa
  - Acesso a serviços ou repositórios

```typescript
@Entity('solicitacao')
export class SolicitacaoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  protocolo: string;

  @ManyToOne(() => BeneficiarioEntity)
  @JoinColumn({ name: 'solicitante_id' })
  solicitante: BeneficiarioEntity;

  @Column({ name: 'solicitante_id' })
  solicitante_id: string;

  @ManyToOne(() => TipoBeneficioEntity)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficioEntity;

  @Column({ name: 'tipo_beneficio_id' })
  tipo_beneficio_id: string;

  @ManyToOne(() => UnidadeEntity)
  @JoinColumn({ name: 'unidade_id' })
  unidade: UnidadeEntity;

  @Column({ name: 'unidade_id' })
  unidade_id: string;

  @ManyToOne(() => UsuarioEntity)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico: UsuarioEntity;

  @Column({ name: 'tecnico_id' })
  tecnico_id: string;

  @Column({
    type: 'enum',
    enum: TipoSolicitacao,
    default: TipoSolicitacao.NOVO
  })
  tipo_solicitacao: TipoSolicitacao;

  @CreateDateColumn({ name: 'data_abertura' })
  data_abertura: Date;

  @Column({
    type: 'enum',
    enum: StatusSolicitacao,
    default: StatusSolicitacao.RASCUNHO
  })
  status: StatusSolicitacao;

  @Column({
    type: 'enum',
    enum: OrigemSolicitacao,
    default: OrigemSolicitacao.PRESENCIAL
  })
  origem: OrigemSolicitacao;

  @Column({ type: 'text', nullable: true })
  parecer_tecnico: string;

  @Column({ type: 'text', nullable: true })
  parecer_semtas: string;

  @ManyToOne(() => UsuarioEntity, { nullable: true })
  @JoinColumn({ name: 'aprovador_id' })
  aprovador: UsuarioEntity;

  @Column({ name: 'aprovador_id', nullable: true })
  aprovador_id: string;

  @Column({ nullable: true })
  data_aprovacao: Date;

  @Column({ nullable: true })
  data_liberacao: Date;

  @ManyToOne(() => UsuarioEntity, { nullable: true })
  @JoinColumn({ name: 'liberador_id' })
  liberador: UsuarioEntity;

  @Column({ name: 'liberador_id', nullable: true })
  liberador_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valor_pago: number;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ nullable: true })
  removed_at: Date;

  @OneToMany(() => PendenciaEntity, pendencia => pendencia.solicitacao)
  pendencias: PendenciaEntity[];

  @OneToMany(() => HistoricoSolicitacaoEntity, historico => historico.solicitacao)
  historico: HistoricoSolicitacaoEntity[];

  @OneToMany(() => DocumentoEnviadoEntity, documento => documento.solicitacao)
  documento: DocumentoEnviadoEntity[];

  @OneToOne(() => DadosBeneficioEntity, dados => dados.solicitacao)
  dados_beneficio: DadosBeneficioEntity;
}
```

### 3.5 DTOs (Objetos de Transferência de Dados)

- **Responsabilidades**:
  - Definir estrutura de dados para API
  - Validar entrada de dados
  - Documentar a API
- **O que evitar**:
  - Lógica de negócio
  - Acesso a banco de dados

```typescript
export class CreateSolicitacaoDto {
  @IsUUID()
  @ApiProperty({ description: 'ID do beneficiário solicitante' })
  solicitante_id: string;

  @IsUUID()
  @ApiProperty({ description: 'ID do tipo de benefício' })
  tipo_beneficio_id: string;

  @IsEnum(TipoSolicitacao)
  @ApiProperty({ 
    enum: TipoSolicitacao, 
    default: TipoSolicitacao.NOVO,
    description: 'Tipo da solicitação (novo, renovação ou prorrogação)' 
  })
  tipo_solicitacao: TipoSolicitacao = TipoSolicitacao.NOVO;

  @IsEnum(OrigemSolicitacao)
  @ApiProperty({ 
    enum: OrigemSolicitacao, 
    default: OrigemSolicitacao.PRESENCIAL,
    description: 'Origem da solicitação (presencial ou whatsapp)' 
  })
  origem: OrigemSolicitacao = OrigemSolicitacao.PRESENCIAL;

  @IsString()
  @IsOptional()
  @ApiProperty({ 
    required: false,
    description: 'Parecer técnico inicial' 
  })
  parecer_tecnico?: string;

  @ValidateNested()
  @Type(() => DadosBeneficioDto)
  @ApiProperty({ 
    type: DadosBeneficioDto,
    description: 'Dados específicos do benefício solicitado' 
  })
  dados_beneficio: DadosBeneficioDto;
}

// Exemplo de DTO para Aluguel Social
export class AluguelSocialDto {
  @IsEnum(MotivoAluguelSocial)
  @ApiProperty({ 
    enum: MotivoAluguelSocial,
    description: 'Motivo da solicitação de aluguel social' 
  })
  motivo: MotivoAluguelSocial;

  @IsNumber()
  @Min(0)
  @Max(5000) // Exemplo de valor máximo configurável
  @ApiProperty({ 
    description: 'Valor solicitado para o aluguel', 
    minimum: 0,
    maximum: 5000
  })
  valor_solicitado: number;

  @IsInt()
  @Min(1)
  @Max(6)
  @ApiProperty({ 
    description: 'Período solicitado em meses', 
    minimum: 1,
    maximum: 6
  })
  periodo_meses: number;

  @IsString()
  @ApiProperty({ description: 'Detalhes do motivo da solicitação' })
  detalhes_motivo: string;
}
```

## 4. Comunicação entre Camadas

Para manter baixo acoplamento, usamos:

1. **Injeção de Dependência**: Abstrações são injetadas, não implementações concretas
2. **Interfaces**: Controllers e Services dependem de interfaces, não de classes concretas
3. **Padrão Repository**: Abstrai o acesso a dados para fácil troca de ORM/BD
4. **Eventos**: Comunicação assíncrona entre módulos via eventos/mensagens

```typescript
// Exemplo de interfaces para baixo acoplamento
export interface ISolicitacoesRepository {
  findById(id: string, relations?: string[]): Promise<SolicitacaoEntity>;
  findActiveBySolicitanteAndTipo(solicitanteId: string, tipoBeneficioId: string): Promise<SolicitacaoEntity>;
  findPendingByUnidade(unidadeId: string, page?: number, limit?: number): Promise<[SolicitacaoEntity[], number]>;
  create(data: Partial<SolicitacaoEntity>): Promise<SolicitacaoEntity>;
  update(id: string, data: Partial<SolicitacaoEntity>): Promise<SolicitacaoEntity>;
  softDelete(id: string): Promise<void>;
}

// Implementação concreta
@Injectable()
export class SolicitacoesRepository implements ISolicitacoesRepository {
  // Implementação concreta dos métodos...
}

// Service dependendo da interface
@Injectable()
export class SolicitacoesService {
  constructor(
    @Inject('SOLICITACOES_REPOSITORY')
    private readonly solicitacoesRepository: ISolicitacoesRepository,
    // Outras dependências...
  ) {}
  
  // Implementação do serviço...
}

// Provider no módulo
@Module({
  providers: [
    SolicitacoesService,
    {
      provide: 'SOLICITACOES_REPOSITORY',
      useClass: SolicitacoesRepository
    }
  ]
})
export class SolicitacoesModule {}
```

Esta abordagem de separação de responsabilidades e estruturação do projeto fornece:

1. **Testabilidade**: Cada camada pode ser testada isoladamente
2. **Manutenibilidade**: Alterações em uma camada têm impacto mínimo nas outras
3. **Escalabilidade**: Novos recursos podem ser adicionados como módulos independentes
4. **Clareza**: O código é organizado de forma lógica e previsível
5. **Reusabilidade**: Componentes podem ser reutilizados em diferentes partes do sistema