import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import { IntegradorService } from '../services/integrador.service';
import { IntegradorTokenService } from '../services/integrador-token.service';
import { CreateIntegradorDto } from '../dto/create-integrador.dto';
import { UpdateIntegradorDto } from '../dto/update-integrador.dto';
import { CreateTokenDto } from '../dto/create-token.dto';
import { RevokeTokenDto } from '../dto/revoke-token.dto';
import { IntegradorResponseDto } from '../dto/integrador-response.dto';
import { TokenResponseDto } from '../dto/token-response.dto';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../auth/enums/role.enum';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

/**
 * Controller para gerenciamento de integradores e seus tokens.
 * Requer autenticação administrativa e papel de ADMIN para acesso.
 */
@ApiTags('Integradores')
@Controller('integradores')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegradorController {
  constructor(
    private readonly integradorService: IntegradorService,
    private readonly tokenService: IntegradorTokenService,
  ) {}

  /**
   * Cria um novo integrador.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria um novo integrador' })
  @ApiResponse({ 
    status: 201, 
    description: 'Integrador criado com sucesso', 
    type: IntegradorResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Já existe um integrador com este nome' })
  create(@Body() createIntegradorDto: CreateIntegradorDto): Promise<IntegradorResponseDto> {
    return this.integradorService.create(createIntegradorDto);
  }

  /**
   * Lista todos os integradores cadastrados.
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista todos os integradores' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de integradores retornada com sucesso',
    type: [IntegradorResponseDto] 
  })
  findAll(): Promise<IntegradorResponseDto[]> {
    return this.integradorService.findAll();
  }

  /**
   * Obtém detalhes de um integrador específico.
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtém um integrador pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Integrador encontrado',
    type: IntegradorResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IntegradorResponseDto> {
    return this.integradorService.findOne(id);
  }

  /**
   * Atualiza dados de um integrador.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um integrador' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Integrador atualizado com sucesso',
    type: IntegradorResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateIntegradorDto: UpdateIntegradorDto
  ): Promise<IntegradorResponseDto> {
    return this.integradorService.update(id, updateIntegradorDto);
  }

  /**
   * Remove um integrador do sistema.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um integrador' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiResponse({ status: 204, description: 'Integrador removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.integradorService.remove(id);
  }

  /**
   * Ativa ou desativa um integrador.
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ativa ou desativa um integrador' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Status do integrador atualizado com sucesso',
    type: IntegradorResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  toggleStatus(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body('ativo') ativo: boolean
  ): Promise<IntegradorResponseDto> {
    return this.integradorService.toggleAtivo(id, ativo);
  }

  /**
   * Lista todos os tokens de um integrador.
   */
  @Get(':id/tokens')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista todos os tokens de um integrador' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de tokens retornada com sucesso',
    type: [TokenResponseDto] 
  })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  findAllTokens(@Param('id', ParseUUIDPipe) id: string): Promise<TokenResponseDto[]> {
    return this.tokenService.findAllByIntegrador(id);
  }

  /**
   * Cria um novo token para um integrador.
   */
  @Post(':id/tokens')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria um novo token para um integrador' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiResponse({ 
    status: 201, 
    description: 'Token criado com sucesso',
    schema: {
      properties: {
        token: {
          type: 'string',
          description: 'Token JWT gerado (exibido apenas uma vez)',
          example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        tokenInfo: {
          $ref: '#/components/schemas/TokenResponseDto'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou integrador inativo' })
  @ApiResponse({ status: 404, description: 'Integrador não encontrado' })
  async createToken(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() createTokenDto: CreateTokenDto
  ) {
    const result = await this.tokenService.createToken(id, createTokenDto);
    
    return {
      token: result.token,
      tokenInfo: result.tokenInfo
    };
  }

  /**
   * Revoga um token existente.
   */
  @Patch(':id/tokens/:tokenId/revogar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revoga um token' })
  @ApiParam({ name: 'id', description: 'ID do integrador', type: 'string' })
  @ApiParam({ name: 'tokenId', description: 'ID do token', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token revogado com sucesso',
    type: TokenResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Token já revogado' })
  @ApiResponse({ status: 404, description: 'Token não encontrado' })
  revogarToken(
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
    @Body() revokeTokenDto: RevokeTokenDto
  ): Promise<TokenResponseDto> {
    return this.tokenService.revogarToken(tokenId, revokeTokenDto.motivo);
  }
}
