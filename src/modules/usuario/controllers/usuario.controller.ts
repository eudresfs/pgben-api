import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsuarioService } from '../services/usuario.service';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { UpdateStatusUsuarioDto } from '../dto/update-status-usuario.dto';
import { UpdateSenhaDto } from '../dto/update-senha.dto';
import { AlterarSenhaPrimeiroAcessoDto } from '../dto/alterar-senha-primeiro-acesso.dto';
import { RecuperarSenhaDto } from '../dto/recuperar-senha.dto';
import { UsuarioFiltrosAvancadosDto, UsuarioFiltrosResponseDto } from '../dto/usuario-filtros-avancados.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { PrimeiroAcessoGuard } from '../../../auth/guards/primeiro-acesso.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { AllowPrimeiroAcesso } from '../../../auth/decorators/allow-primeiro-acesso.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../../shared/request-context/request-context.dto';
import {
  AuditEntity,
  AuditOperation,
  AuditRead,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditSensitiveAccess,
} from '../../auditoria';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { RiskLevel } from '../../auditoria/events/types/audit-event.types';

/**
 * Controlador de usuários
 *
 * Responsável por gerenciar as rotas relacionadas a usuários
 */
@ApiTags('Usuários')
@Controller('usuario')
@UseGuards(JwtAuthGuard, PrimeiroAcessoGuard, PermissionGuard)
@ApiBearerAuth()
@AuditEntity('Usuario', 'gestao_usuarios', {
    riskLevel: RiskLevel.HIGH,
    sensitiveFields: ['email', 'telefone', 'cpf', 'senhaHash']
  })
export class UsuarioController {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Lista todos os usuários com filtros dinâmicos e paginação
   * Aceita qualquer campo da entidade Usuario como filtro
   */
  @Get()
  @RequiresPermission({
    permissionName: 'usuario.listar',
    scopeType: ScopeType.UNIT,
  })
  @AuditRead('Usuario', 'Listagem de usuários')
  @ApiOperation({
    summary: 'Listar usuários com filtros dinâmicos',
    description: `Lista usuários com filtros flexíveis e paginação otimizada.
    
    **Filtros disponíveis:**
    - **Busca geral:** search (nome, email, CPF, matrícula)
    - **Dados pessoais:** nome, email, cpf, telefone, matricula
    - **Organizacionais:** role_id, unidade_id, setor_id
    - **Status:** status, primeiro_acesso, tentativas_login
    
    **Funcionalidades:**
    - Paginação configurável (page, limit)
    - Inclusão opcional de relações (includeRelations)
    - Busca parcial em campos de texto
    - Filtros exatos para IDs e status
    
    **Exemplo de uso:**
    \`GET /usuario?search=maria&status=ativo&unidade_id=123&page=1&limit=20\``,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de usuários com filtros aplicados',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            nome: 'Maria Santos',
            email: 'maria.santos@semtas.gov.br',
            cpf: '987.654.321-00',
            status: 'ativo',
            unidade: { nome: 'CRAS Centro' },
            setor: { nome: 'Atendimento' }
          }
        ],
        meta: {
          total: 150,
          page: 1,
          limit: 20,
          pages: 8
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de consulta inválidos'
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Incluir relações com outras entidades (padrão: false)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página atual (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Busca geral por nome, email, CPF ou matrícula',
  })
  @ApiQuery({
    name: 'nome',
    required: false,
    type: String,
    description: 'Filtro por nome (busca parcial)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filtro por email (busca parcial)',
  })
  @ApiQuery({
    name: 'cpf',
    required: false,
    type: String,
    description: 'Filtro por CPF (busca exata)',
  })
  @ApiQuery({
    name: 'telefone',
    required: false,
    type: String,
    description: 'Filtro por telefone (busca parcial)',
  })
  @ApiQuery({
    name: 'matricula',
    required: false,
    type: String,
    description: 'Filtro por matrícula (busca parcial)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtro por status (ativo/inativo)',
  })
  @ApiQuery({
    name: 'role_id',
    required: false,
    type: String,
    description: 'Filtro por ID do papel/role',
  })
  @ApiQuery({
    name: 'unidade_id',
    required: false,
    type: String,
    description: 'Filtro por ID da unidade',
  })
  @ApiQuery({
    name: 'setor_id',
    required: false,
    type: String,
    description: 'Filtro por ID do setor',
  })
  @ApiQuery({
    name: 'primeiro_acesso',
    required: false,
    type: Boolean,
    description: 'Filtro por primeiro acesso (true/false)',
  })
  @ApiQuery({
    name: 'tentativas_login',
    required: false,
    type: Number,
    description: 'Filtro por número de tentativas de login',
  })
  async findAll(@Query() query: any) {
    // Extrair page e limit, convertendo para números
    const { includeRelations, page, limit, ...filters } = query;

    return await this.usuarioService.findAll({
      relations: includeRelations ? +includeRelations : true,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      ...filters,
    });
  }

  /**
   * Lista usuários com filtros avançados
   * Endpoint otimizado para consultas complexas com múltiplos filtros
   */
  @Post('filtros-avancados')
  @RequiresPermission({
    permissionName: 'usuario.listar',
    scopeType: ScopeType.UNIT,
  })
  @AuditRead('Usuario', 'Listagem de usuários com filtros avançados')
  @ApiOperation({ 
    summary: 'Listar usuários com filtros avançados',
    description: `Endpoint otimizado para consultas complexas de usuários com múltiplos critérios de filtro.
    
    **Funcionalidades principais:**
    - Filtros por múltiplas unidades, setores e roles
    - Filtros por status de usuário (ativo, inativo, bloqueado)
    - Busca textual em nome, email e CPF
    - Paginação otimizada com cache
    - Ordenação por múltiplos campos
    
    **Casos de uso comuns:**
    - Listar usuários de unidades específicas
    - Buscar usuários por roles/permissões
    - Filtrar por status para auditoria
    - Relatórios de usuários ativos/inativos
    - Gestão de acessos por setor`
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de usuários com filtros aplicados',
    type: UsuarioFiltrosResponseDto,
    schema: {
      example: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            nome: 'Maria Santos',
            email: 'maria.santos@semtas.gov.br',
            cpf: '987.654.321-00',
            status: 'ATIVO',
            ultimo_acesso: '2024-01-15T14:30:00Z',
            unidade: {
              nome: 'CRAS Centro'
            },
            setor: {
              nome: 'Atendimento'
            },
            roles: [
              {
                nome: 'Técnico Social'
              }
            ]
          }
        ],
        total: 85,
        filtros_aplicados: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          status: ['ativo'],
          roles: ['tecnico-social']
        },
        meta: {
          page: 1,
          limit: 10,
          pages: 9,
          hasNext: true,
          hasPrev: false
        },
        tempo_execucao: 95
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['unidades deve ser um array de UUIDs válidos'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes para visualizar usuários'
  })
  async aplicarFiltrosAvancados(
    @Body() filtrosDto: UsuarioFiltrosAvancadosDto,
    @ReqContext() context: RequestContext,
  ): Promise<UsuarioFiltrosResponseDto> {
    return await this.usuarioService.aplicarFiltrosAvancados(filtrosDto);
  }

  /**
   * Retorna todas as roles (papéis) disponíveis no sistema baseado na hierarquia do usuário
   * Cada usuário só pode ver as roles abaixo da sua na hierarquia:
   * SUPER_ADMIN > ADMIN > GESTOR > COORDENADOR
   */
  @Get('roles')
  @RequiresPermission({
    permissionName: 'usuario.listar'
  })
  @AuditRead('Role', 'Consulta de roles disponíveis')
  @ApiOperation({ 
    summary: 'Listar roles disponíveis baseado na hierarquia do usuário',
    description: 'Retorna apenas as roles que o usuário atual pode atribuir a outros usuários, baseado na hierarquia: SUPER_ADMIN > ADMIN > GESTOR > COORDENADOR'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles retornada com sucesso baseada na hierarquia',
  })
  async findAllRoles(@Request() req) {
    const usuarioAtual = req.user;
    return await this.usuarioService.findAllRoles(usuarioAtual);
  }

  /**
   * Obtém o perfil do usuário atual
   */
  @Get('me')
  @AuditSensitiveAccess('Usuario', 'Acesso ao perfil do usuário')
  @ApiOperation({ 
    summary: 'Obter perfil do usuário autenticado',
    description: `Retorna informações completas do perfil do usuário atual.
    
    **Dados retornados:**
    - Informações pessoais (nome, email, telefone)
    - Dados organizacionais (unidade, setor, role)
    - Status da conta e último acesso
    - Permissões e configurações do usuário`
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Perfil do usuário retornado com sucesso',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nome: 'João Silva',
        email: 'joao.silva@semtas.gov.br',
        cpf: '123.456.789-00',
        telefone: '(85) 99999-9999',
        matricula: 'SEMTAS2024001',
        status: 'ATIVO',
        primeiro_acesso: false,
        ultimo_acesso: '2024-01-15T14:30:00Z',
        unidade: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          nome: 'CRAS Centro'
        },
        setor: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          nome: 'Coordenação'
        },
        role: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          nome: 'Coordenador',
          nivel_hierarquico: 3
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Token de autenticação inválido ou expirado' 
  })
  async getProfile(@Request() req) {
    return await this.usuarioService.getProfile(req.user.id);
  }

  /**
   * Obtém detalhes de um usuário específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'usuario.visualizar'
  })
  @AuditSensitiveAccess('Usuario', 'Acesso a dados específicos de usuário')
  @ApiOperation({ summary: 'Obter detalhes de um usuário' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.usuarioService.findById(id);
  }

  /**
   * Cria um novo usuário
   */
  @Post()
  @RequiresPermission({
    permissionName: 'usuario.criar'
  })
  @AuditCreate('Usuario', 'Criação de novo usuário')
  @ApiOperation({ 
    summary: 'Criar novo usuário no sistema',
    description: `Cria um novo usuário com validações completas e envio automático de credenciais.
    
    **Processo de criação:**
    1. Validação de dados únicos (email, CPF, matrícula)
    2. Verificação de permissões hierárquicas
    3. Geração de senha temporária
    4. Envio de credenciais por email
    5. Registro de auditoria
    
    **Validações aplicadas:**
    - Email único no sistema
    - CPF válido e único
    - Matrícula única na unidade
    - Role compatível com hierarquia do criador
    - Unidade e setor válidos e ativos`
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuário criado com sucesso e credenciais enviadas',
    schema: {
      example: {
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          nome: 'Maria Santos',
          email: 'maria.santos@semtas.gov.br',
          cpf: '987.654.321-00',
          matricula: 'SEMTAS2024002',
          status: 'ATIVO',
          primeiro_acesso: true,
          unidade_id: '550e8400-e29b-41d4-a716-446655440001',
          setor_id: '550e8400-e29b-41d4-a716-446655440002',
          role_id: '550e8400-e29b-41d4-a716-446655440003',
          created_at: '2024-01-15T14:30:00Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados de entrada inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'email deve ser um email válido',
          'cpf deve ter formato válido',
          'nome deve ter pelo menos 2 caracteres'
        ],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito - Email, CPF ou matrícula já cadastrados',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email já está em uso por outro usuário',
        error: 'Conflict'
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Permissões insuficientes para criar usuário com esta role'
  })
  async create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @ReqContext() context: RequestContext,
  ) {
    const result = await this.usuarioService.create(createUsuarioDto);

    // Auditoria da criação de usuário
    await this.auditEventEmitter.emitEntityCreated(
      'Usuario',
      result.data.id,
      result.data,
      context.user?.id?.toString(),
      {
        synchronous: false,
      },
    );

    return result;
  }

  /**
   * Atualiza um usuário existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'usuario.editar'
  })
  @AuditUpdate('Usuario', 'Atualização de dados de usuário')
  @ApiOperation({ summary: 'Atualizar usuário existente' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Email, CPF ou matrícula já em uso',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @ReqContext() context: RequestContext,
  ) {
    // Buscar dados anteriores para auditoria
    const previousData = await this.usuarioService.findById(id);

    const result = await this.usuarioService.update(id, updateUsuarioDto);

    // Auditoria da atualização de usuário
    await this.auditEventEmitter.emitEntityUpdated(
      'Usuario',
      id,
      previousData,
      result.data,
      context.user?.id?.toString(),
      {
        synchronous: false,
      },
    );

    return result;
  }

  /**
   * Atualiza o status de um usuário
   */
  @Patch(':id/status')
  @RequiresPermission({
    permissionName: 'usuario.status.alterar'
  })
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Usuario',
    descricao: 'Alteração de status do usuário',
    riskLevel: RiskLevel.HIGH,
    sensitiveFields: ['status']
  })
  @ApiOperation({ summary: 'Ativar/inativar usuário' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusUsuarioDto: UpdateStatusUsuarioDto,
    @ReqContext() context: RequestContext,
  ) {
    // Buscar dados anteriores para auditoria
    const previousData = await this.usuarioService.findById(id);

    const result = await this.usuarioService.updateStatus(
      id,
      updateStatusUsuarioDto,
    );

    // Auditoria da alteração de status
    await this.auditEventEmitter.emitEntityUpdated(
      'Usuario',
      id,
      previousData,
      result,
      context.user?.id?.toString(),
      {
        synchronous: false,
      },
    );

    return result;
  }

  /**
   * Altera a senha do usuário
   */
  @Put(':id/senha')
  @AllowPrimeiroAcesso()
  @RequiresPermission({
    permissionName: 'usuario.senha.alterar'
  })
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Usuario',
    descricao: 'Alteração de senha do usuário',
    riskLevel: RiskLevel.HIGH,
    sensitiveFields: ['senhaHash', 'senha_anterior']
  })
  @ApiOperation({ summary: 'Alterar senha' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou senha atual incorreta',
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateSenha(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSenhaDto: UpdateSenhaDto,
    @Request() req,
    @ReqContext() context: RequestContext,
  ) {
    // A verificação agora é feita pelo sistema de permissões granulares
    const userData = await this.usuarioService.findById(id);

    const result = await this.usuarioService.updateSenha(id, updateSenhaDto);

    // Auditoria da alteração de senha (dados sensíveis não são logados)
    await this.auditEventEmitter.emitEntityUpdated(
      'Usuario',
      id,
      {
        nome: userData.nome,
        email: userData.email,
        passwordChanged: false,
      },
      {
        nome: userData.nome,
        email: userData.email,
        passwordChanged: true,
      },
      context.user.id?.toString(),
      {
        synchronous: true,
      },
    );

    return result;
  }

  /**
   * Altera a senha no primeiro acesso
   */
  @Put('/primeiro-acesso/alterar-senha')
  @AllowPrimeiroAcesso()
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Usuario',
    descricao: 'Alteração de senha no primeiro acesso',
    riskLevel: RiskLevel.HIGH,
    sensitiveFields: ['senhaHash', 'primeiro_acesso']
  })
  @ApiOperation({ summary: 'Alterar senha no primeiro acesso' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou usuário não está em primeiro acesso',
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async alterarSenhaPrimeiroAcesso(
    @Body() alterarSenhaDto: AlterarSenhaPrimeiroAcessoDto,
    @Request() req,
    @ReqContext() context: RequestContext,
  ) {
    const userId = req.user.id;
    const userData = await this.usuarioService.findById(userId);

    const result = await this.usuarioService.alterarSenhaPrimeiroAcesso(
      userId,
      alterarSenhaDto,
    );

    // Auditoria da alteração de senha no primeiro acesso
    await this.auditEventEmitter.emitEntityUpdated(
      'Usuario',
      userId,
      {
        nome: userData.nome,
        email: userData.email,
        primeiro_acesso: true,
      },
      {
        nome: userData.nome,
        email: userData.email,
        primeiro_acesso: false,
      },
      context.user?.id?.toString(),
      {
        synchronous: true,
      },
    );

    return result;
  }

  /**
   * Reenvia credenciais de acesso para um usuário
   */
  @Post(':usuario_id/reenviar-credenciais')
  @RequiresPermission({
    permissionName: 'usuario.credenciais.reenviar'
  })
  @AuditOperation({
    tipo: TipoOperacao.ACCESS,
    entidade: 'Usuario',
    descricao: 'Reenvio de credenciais do usuário',
    riskLevel: RiskLevel.HIGH,
    sensitiveFields: ['email', 'senhaHash']
  })
  @ApiOperation({
    summary: 'Reenviar credenciais de acesso',
    description:
      'Gera nova senha, atualiza no banco de dados e envia por email',
  })
  @ApiResponse({
    status: 200,
    description: 'Credenciais reenviadas com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async reenviarCredenciais(
    @Param('usuario_id', ParseUUIDPipe) id: string,
    @ReqContext() context: RequestContext,
  ) {
    // Buscar dados do usuário para auditoria
    const userData = await this.usuarioService.findById(id);

    const result = await this.usuarioService.reenviarCredenciais(id);

    // Auditoria do reenvio de credenciais
    await this.auditEventEmitter.emitEntityUpdated(
      'Usuario',
      id,
      {
        nome: userData.nome,
        email: userData.email,
        credenciaisReenviadas: false,
      },
      {
        nome: userData.nome,
        email: userData.email,
        credenciaisReenviadas: true,
      },
      context.user?.id?.toString(),
      {
        synchronous: true,
      },
    );

    return result;
  }

  /**
   * Solicita recuperação de senha
   */
  @Post('/recuperar-senha')
  @UseGuards() // Remove guards de autenticação para endpoint público
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Usuario',
    descricao: 'Solicitação de recuperação de senha',
    riskLevel: RiskLevel.HIGH,
    sensitiveFields: ['email']
  })
  @ApiOperation({
    summary: 'Solicitar recuperação de senha',
    description: `Processa solicitação de recuperação de senha com segurança aprimorada.
    
    **Processo de recuperação:**
    1. Validação do email fornecido
    2. Verificação se usuário existe e está ativo
    3. Geração de nova senha temporária
    4. Envio seguro por email
    5. Marcação para alteração obrigatória no próximo login
    
    **Segurança:**
    - Resposta padronizada independente do email existir
    - Rate limiting para prevenir ataques
    - Auditoria de todas as tentativas
    - Senha temporária com expiração
    
    **Nota:** Por segurança, sempre retorna sucesso, mesmo para emails não cadastrados.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação processada com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Se o email estiver cadastrado, as instruções de recuperação foram enviadas.',
        timestamp: '2024-01-15T14:30:00Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Email com formato inválido',
    schema: {
      example: {
        statusCode: 400,
        message: ['email deve ser um endereço de email válido'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - Aguarde antes de tentar novamente'
  })
  async recuperarSenha(@Body() recuperarSenhaDto: RecuperarSenhaDto) {
    return await this.usuarioService.solicitarRecuperacaoSenha(
      recuperarSenhaDto.email,
    );
  }

  /**
   * Remove um usuário (soft delete)
   */
  @Delete(':id')
  @RequiresPermission({
    permissionName: 'usuario.remover'
  })
  @AuditDelete('Usuario', 'Remoção de usuário do sistema')
  @ApiOperation({ 
    summary: 'Remover usuário do sistema (soft delete)',
    description: `Remove usuário do sistema mantendo histórico para auditoria.
    
    **Processo de remoção:**
    1. Verificação de permissões hierárquicas
    2. Validação de dependências (solicitações ativas, etc.)
    3. Desativação da conta (soft delete)
    4. Revogação de todas as sessões ativas
    5. Registro completo de auditoria
    
    **Importante:**
    - Remoção é reversível (soft delete)
    - Histórico de ações é preservado
    - Dados pessoais são mantidos para auditoria
    - Usuário não poderá mais fazer login`
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário removido com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Usuário removido com sucesso',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          nome: 'Maria Santos',
          email: 'maria.santos@semtas.gov.br',
          status: 'REMOVIDO',
          removed_at: '2024-01-15T14:30:00Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Usuário não encontrado ou já removido',
    schema: {
      example: {
        statusCode: 404,
        message: 'Usuário não encontrado',
        error: 'Not Found'
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Permissões insuficientes para remover este usuário'
  })
  @ApiResponse({
    status: 409,
    description: 'Usuário possui dependências ativas que impedem a remoção'
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @ReqContext() context: RequestContext,
  ) {
    // Buscar dados do usuário antes da remoção
    const userData = await this.usuarioService.findById(id);

    const result = await this.usuarioService.remove(id);

    // Auditoria da remoção de usuário
    await this.auditEventEmitter.emitEntityDeleted(
      'Usuario',
      id,
      {
        nome: userData.nome,
        email: userData.email,
        cpf: userData.cpf,
        matricula: userData.matricula,
        role_id: userData.role_id,
        unidade_id: userData.unidade_id,
        setor_id: userData.setor_id,
        status: userData.status,
      },
      context.user?.id?.toString(),
      {
        synchronous: true,
      },
    );

    return result;
  }
}
