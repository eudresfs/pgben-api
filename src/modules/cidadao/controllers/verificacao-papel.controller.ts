import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse, 
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { VerificacaoPapelService } from '../services/verificacao-papel.service';
import { CidadaoService } from '../services/cidadao.service';
import { 
  VerificacaoConflitoPapelDto, 
  VerificacaoConflitoPapelResponseDto 
} from '../dto/verificacao-conflito-papel.dto';
import { 
  ConversaoParaBeneficiarioDto, 
  ConversaoParaComposicaoFamiliarDto, 
  ConversaoPapelResponseDto 
} from '../dto/conversao-papel.dto';
import { TipoEscopo } from '../../../auth/entities/user-permission.entity';
import { Sexo } from '../entities/cidadao.entity';
import { EnderecoDto } from '../dto/create-cidadao.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  // Adicione outras propriedades conforme necessário
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Controller de Verificação de Papel
 *
 * Responsável por expor os endpoints de verificação e conversão de papéis
 * dos cidadãos no sistema.
 */
@ApiTags('Verificação de Papel')
@Controller('cidadao/verificacao-papel')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class VerificacaoPapelController {
  private readonly logger = new Logger(VerificacaoPapelController.name);

  constructor(
    private readonly verificacaoPapelService: VerificacaoPapelService,
    private readonly cidadaoService: CidadaoService,
  ) {}

  /**
   * Verifica se um cidadão possui conflito de papéis
   * @param verificacaoDto Dados para verificação
   * @returns Resultado da verificação
   */
  @Post('verificar-conflito')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission({
    permissionName: 'cidadao.verificar-conflito-papel',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.unidadeId'
  })
  @ApiOperation({ 
    summary: 'Verifica se um cidadão possui conflito de papéis',
    description: 'Endpoint para verificar se um cidadão possui conflitos de papéis no sistema'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificação realizada com sucesso',
    type: VerificacaoConflitoPapelResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados de entrada inválidos'
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou ausente'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para esta operação'
  })
  async verificarConflito(
    @Body(ValidationPipe) verificacaoDto: VerificacaoConflitoPapelDto,
  ): Promise<VerificacaoConflitoPapelResponseDto> {
    this.logger.log(`Iniciando verificação de conflito para CPF: ${this.maskCpf(verificacaoDto.cpf)}`);
    
    try {
      const resultado = await this.verificacaoPapelService.verificarConflitoPapeis(
        verificacaoDto.cpf,
      );
      
      this.logger.log(`Verificação de conflito concluída para CPF: ${this.maskCpf(verificacaoDto.cpf)}`);
      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar conflito para CPF: ${this.maskCpf(verificacaoDto.cpf)}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Converte um membro de composição familiar para cidadão beneficiário
   * @param conversaoDto Dados para conversão
   * @param req Requisição autenticada
   * @returns Resultado da conversão
   */
  @Post('converter-para-beneficiario')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission({
    permissionName: 'cidadao.converter-papel',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.unidadeId'
  })
  @ApiOperation({
    summary: 'Converte um membro de composição familiar para cidadão beneficiário',
    description: 'Endpoint para converter um membro de composição familiar em cidadão beneficiário'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversão realizada com sucesso',
    type: ConversaoPapelResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados de entrada inválidos ou incompletos'
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou ausente'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para esta operação'
  })
  async converterParaBeneficiario(
    @Body(ValidationPipe) conversaoDto: ConversaoParaBeneficiarioDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversaoPapelResponseDto> {
    const usuarioId = req.user.id;
    const cpfMasked = this.maskCpf(conversaoDto.cpf);
    
    this.logger.log(`Iniciando conversão para beneficiário - CPF: ${cpfMasked}, Usuário: ${usuarioId}`);

    try {
      this.validateConversaoParaBeneficiario(conversaoDto);
      
      const dadosCidadao = this.buildDadosCidadao(conversaoDto);
      
      // Buscar cidadão pelo CPF para obter o ID
      const cidadao = await this.cidadaoService.findByCpf(conversaoDto.cpf);
      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }
      
      const resultado = await this.verificacaoPapelService.converterParaBeneficiario(
        cidadao.id,
        conversaoDto.justificativa,
      );
      
      this.logger.log(`Conversão para beneficiário concluída - CPF: ${cpfMasked}`);
      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro na conversão para beneficiário - CPF: ${cpfMasked}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Converte um cidadão beneficiário para membro de composição familiar
   * @param conversaoDto Dados para conversão
   * @param req Requisição autenticada
   * @returns Resultado da conversão
   */
  @Post('converter-para-composicao-familiar')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission({
    permissionName: 'cidadao.converter-papel',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'params.unidadeId'
  })
  @ApiOperation({
    summary: 'Converte um cidadão beneficiário para membro de composição familiar',
    description: 'Endpoint para converter um cidadão beneficiário em membro de composição familiar'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversão realizada com sucesso',
    type: ConversaoPapelResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados de entrada inválidos ou incompletos'
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou ausente'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para esta operação'
  })
  async converterParaComposicaoFamiliar(
    @Body(ValidationPipe) conversaoDto: ConversaoParaComposicaoFamiliarDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversaoPapelResponseDto> {
    const usuarioId = req.user.id;
    const cpfMasked = this.maskCpf(conversaoDto.cpf);
    
    this.logger.log(`Iniciando conversão para composição familiar - CPF: ${cpfMasked}, Usuário: ${usuarioId}`);

    try {
      const resultado = await this.verificacaoPapelService.converterParaComposicaoFamiliar(
        conversaoDto.cpf,
        conversaoDto.cidadao_alvo_id,
        conversaoDto.dados_composicao,
        conversaoDto.justificativa,
        usuarioId,
      );
      
      this.logger.log(`Conversão para composição familiar concluída - CPF: ${cpfMasked}`);
      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro na conversão para composição familiar - CPF: ${cpfMasked}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Valida os dados necessários para conversão para beneficiário
   * @private
   */
  private validateConversaoParaBeneficiario(conversaoDto: ConversaoParaBeneficiarioDto): void {
    if (!conversaoDto.dados_cidadao) {
      throw new BadRequestException('Dados do cidadão são obrigatórios para a conversão');
    }

    const { dados_cidadao } = conversaoDto;

    if (!dados_cidadao.data_nascimento) {
      throw new BadRequestException('Data de nascimento é obrigatória');
    }

    if (!dados_cidadao.nome?.trim()) {
      throw new BadRequestException('Nome do cidadão é obrigatório');
    }

    if (!dados_cidadao.sexo || !Object.values(Sexo).includes(dados_cidadao.sexo as Sexo)) {
      throw new BadRequestException('Sexo do cidadão é obrigatório e deve ser válido');
    }

    // Validação adicional da data de nascimento
    const dataNascimento = new Date(dados_cidadao.data_nascimento);
    if (isNaN(dataNascimento.getTime())) {
      throw new BadRequestException('Data de nascimento deve ser uma data válida');
    }

    const hoje = new Date();
    if (dataNascimento > hoje) {
      throw new BadRequestException('Data de nascimento não pode ser futura');
    }

    // Validação de idade mínima/máxima razoável (ex: entre 0 e 150 anos)
    const idade = hoje.getFullYear() - dataNascimento.getFullYear();
    if (idade > 150) {
      throw new BadRequestException('Data de nascimento inválida - idade muito avançada');
    }
  }

  /**
   * Constrói o objeto de dados do cidadão com validações
   * @private
   */
  private buildDadosCidadao(conversaoDto: ConversaoParaBeneficiarioDto) {
    const { dados_cidadao } = conversaoDto;
    
    // A validação já garante que data_nascimento existe
    if (!dados_cidadao.data_nascimento) {
      throw new BadRequestException('Data de nascimento é obrigatória');
    }
    
    return {
      nome: dados_cidadao.nome.trim(),
      cpf: conversaoDto.cpf,
      rg: dados_cidadao.rg?.trim() || '',
      nis: dados_cidadao.nis?.trim() || undefined,
      email: dados_cidadao.email?.trim() || undefined,
      telefone: dados_cidadao.telefone?.trim() || undefined,
      data_nascimento: new Date(dados_cidadao.data_nascimento),
      sexo: dados_cidadao.sexo as Sexo,
      endereco: dados_cidadao.endereco as unknown as EnderecoDto
    };
  }

  /**
   * Mascara o CPF para logs (mantém apenas os 3 primeiros e 2 últimos dígitos)
   * @private
   */
  private maskCpf(cpf: string): string {
    if (!cpf || cpf.length < 11) return '***';
    
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return '***';
    
    return `${cleanCpf.substring(0, 3)}*****${cleanCpf.substring(9)}`;
  }
}
