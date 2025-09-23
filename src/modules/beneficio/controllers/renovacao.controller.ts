import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RenovacaoService } from '../services/renovacao.service';
import { IniciarRenovacaoDto } from '../dto/renovacao/iniciar-renovacao.dto';
import { RenovacaoResponseDto } from '../dto/renovacao/renovacao-response.dto';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

/**
 * Controller responsável pelos endpoints de renovação de benefício.
 * Gerencia a validação de elegibilidade e criação de solicitações de renovação.
 */
@Controller('concessoes')
@ApiTags('Renovação de Benefício')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RenovacaoController {
  constructor(private readonly renovacaoService: RenovacaoService) {}

  /**
   * Verifica se uma concessão pode ser renovada.
   * Valida todos os critérios necessários para renovação.
   */
  @Get(':id/pode-renovar')
  @ApiOperation({
    summary: 'Verificar se concessão pode ser renovada',
    description: `
      Valida se uma concessão atende aos critérios para renovação:
      - Concessão deve estar com status CESSADO
      - Deve existir resultado de cessação registrado
      - Não pode já ter sido renovada
      - Não pode ter renovação em andamento
      - Deve respeitar período mínimo entre renovações
      - Tipo de benefício deve permitir renovação
      - Renovação pode ser solicitada por qualquer usuário autorizado
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID da concessão a ser verificada',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado da validação de elegibilidade',
    type: RenovacaoResponseDto,
    example: {
      podeRenovar: true,
      motivos: [],
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Concessão não encontrada',
    example: {
      statusCode: 404,
      message: 'Concessão não encontrada',
      error: 'Not Found',
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID da concessão inválido',
    example: {
      statusCode: 400,
      message: 'Validation failed (uuid is expected)',
      error: 'Bad Request',
    },
  })
  async podeRenovar(
    @Param('id', ParseUUIDPipe) concessaoId: string,
    @GetUser() usuario: Usuario,
  ): Promise<RenovacaoResponseDto> {
    if (!usuario || !usuario.id) {
      throw new Error('Usuário não autenticado ou ID não disponível');
    }
    return await this.renovacaoService.validarRenovacao({ concessaoId }, usuario.id);
  }

  /**
   * Inicia o processo de renovação de uma concessão.
   * Cria nova solicitação baseada na concessão cessada.
   */
  @Post(':id/renovar')
  @ApiOperation({
    summary: 'Iniciar renovação de concessão',
    description: `
      Cria nova solicitação de renovação baseada na concessão cessada:
      - Valida elegibilidade para renovação
      - Duplica dados da solicitação original
      - Reutiliza documentos requisitais (exceto parecer técnico)
      - Define status inicial como EM_ANALISE
      - Gera novo protocolo
      - Mantém rastreabilidade com solicitação original
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID da concessão a ser renovada',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    type: IniciarRenovacaoDto,
    description: 'Dados para iniciar a renovação',
    examples: {
      exemplo1: {
        summary: 'Renovação simples',
        value: {
          concessaoId: '123e4567-e89b-12d3-a456-426614174000',
          observacao: 'Renovação solicitada pelo beneficiário',
        },
      },
      exemplo2: {
        summary: 'Renovação sem observação',
        value: {
          concessaoId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Solicitação de renovação criada com sucesso',
    example: {
      solicitacao: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        protocolo: 'SOL-2024-000123',
        status: 'EM_ANALISE',
        tipo: 'renovacao',
      },
      message: 'Solicitação de renovação criada com sucesso',
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Concessão não encontrada',
    example: {
      statusCode: 404,
      message: 'Concessão não encontrada',
      error: 'Not Found',
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Concessão não pode ser renovada',
    example: {
      statusCode: 400,
      message: 'Não é possível renovar: Concessão deve estar com status CESSADO',
      error: 'Bad Request',
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuário não autenticado',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  async renovar(
    @Param('id', ParseUUIDPipe) concessaoId: string,
    @Body() dadosRenovacao: any,
    @GetUser() usuario: Usuario,
  ): Promise<{ solicitacao: any; message: string }> {
    const solicitacao = await this.renovacaoService.iniciarRenovacao(
      { ...dadosRenovacao, concessaoId },
      usuario.id,
    );

    return {
      solicitacao: {
        id: solicitacao.id,
        protocolo: solicitacao.protocolo,
        status: solicitacao.status,
        tipo: solicitacao.tipo,
      },
      message: 'Solicitação de renovação criada com sucesso',
    };
  }
}