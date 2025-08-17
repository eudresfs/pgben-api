import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UsePipes,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';

// Decorators de aprovação
import {
  RequerAprovacao,
  AcaoCritica,
  AcaoCriticaComAutoAprovacao,
} from '../decorators/requer-aprovacao.decorator';

// Guards de aprovação
import {
  AprovacaoGuard,
  PermissaoAcaoCriticaGuard,
} from '../guards/aprovacao.guard';

// Interceptors de aprovação
import { AprovacaoInterceptor } from '../interceptors/aprovacao.interceptor';

// Pipes de validação
import { AprovacaoValidationPipe } from '../pipes/aprovacao-validation.pipe';

// Enums
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

// DTOs de exemplo
interface CancelarBeneficioDto {
  motivo: string;
  justificativa: string;
  dataEfetivacao?: Date;
}

interface ExcluirCidadaoDto {
  justificativa: string;
  confirmarExclusao: boolean;
}

interface AlterarDadosCriticosDto {
  campo: string;
  valorAnterior: any;
  valorNovo: any;
  justificativa: string;
}

/**
 * Controller de exemplo demonstrando o uso do sistema de aprovação
 * 
 * Este controller mostra diferentes cenários de uso:
 * 1. Ações que sempre requerem aprovação
 * 2. Ações com auto-aprovação para administradores
 * 3. Ações com condições customizadas de aprovação
 * 4. Uso de guards e interceptors
 */
@ApiTags('Exemplo - Sistema de Aprovação')
@ApiBearerAuth()
@Controller('exemplo-aprovacao')
@UseGuards(JwtAuthGuard, PermissaoAcaoCriticaGuard)
@UseInterceptors(AprovacaoInterceptor)
export class ExemploUsoAprovacaoController {
  private readonly logger = new Logger(ExemploUsoAprovacaoController.name);

  /**
   * Exemplo 1: Ação crítica que sempre requer aprovação
   * 
   * Características:
   * - Sempre cria solicitação de aprovação
   * - Não permite auto-aprovação
   * - Registra na auditoria
   */
  @Post('beneficio/:id/cancelar')
  @ApiOperation({ 
    summary: 'Cancelar benefício (requer aprovação)',
    description: 'Cancela um benefício. Esta ação sempre requer aprovação de um supervisor.'
  })
  @ApiResponse({ status: 201, description: 'Solicitação de aprovação criada' })
  @ApiResponse({ status: 403, description: 'Ação requer aprovação' })
  @AcaoCritica(TipoAcaoCritica.CANCELAR_SOLICITACAO, 'Beneficio')
  @UsePipes(new AprovacaoValidationPipe(null)) // Injeta o serviço via DI
  async cancelarBeneficio(
    @Param('id') beneficioId: string,
    @Body() dados: CancelarBeneficioDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(`Cancelando benefício ${beneficioId} por usuário ${usuario.id}`);
    
    // Lógica de cancelamento do benefício
    // Esta lógica só será executada após aprovação
    return {
      success: true,
      message: 'Benefício cancelado com sucesso',
      beneficioId,
      canceladoPor: usuario.id,
      motivo: dados.motivo,
      dataEfetivacao: dados.dataEfetivacao || new Date(),
    };
  }

  /**
   * Exemplo 2: Ação com auto-aprovação para administradores
   * 
   * Características:
   * - Administradores podem auto-aprovar
   * - Outros usuários precisam de aprovação
   * - Sempre registra na auditoria
   */
  @Put('beneficio/:id/suspender')
  @ApiOperation({ 
    summary: 'Suspender benefício (auto-aprovação para admins)',
    description: 'Suspende um benefício. Administradores podem executar imediatamente.'
  })
  @ApiResponse({ status: 200, description: 'Benefício suspenso' })
  @ApiResponse({ status: 403, description: 'Ação requer aprovação' })
  @AcaoCriticaComAutoAprovacao(TipoAcaoCritica.SUSPENDER_BENEFICIO, 'Beneficio')
  async suspenderBeneficio(
    @Param('id') beneficioId: string,
    @Body() dados: { motivo: string; prazoSuspensao?: number },
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(`Suspendendo benefício ${beneficioId} por usuário ${usuario.id}`);
    
    // Lógica de suspensão
    return {
      success: true,
      message: 'Benefício suspenso com sucesso',
      beneficioId,
      suspensoPor: usuario.id,
      motivo: dados.motivo,
      prazoSuspensao: dados.prazoSuspensao || 30,
      dataSuspensao: new Date(),
    };
  }

  /**
   * Exemplo 3: Ação com condições customizadas de aprovação
   * 
   * Características:
   * - Lógica customizada para determinar se precisa aprovação
   * - Baseada no valor, perfil do usuário, horário, etc.
   * - Flexibilidade máxima
   */
  @Delete('cidadao/:id')
  @ApiOperation({ 
    summary: 'Excluir cidadão (condições customizadas)',
    description: 'Exclui um cidadão. Aprovação baseada em condições específicas.'
  })
  @ApiResponse({ status: 200, description: 'Cidadão excluído' })
  @ApiResponse({ status: 403, description: 'Ação requer aprovação' })
  @RequerAprovacao({
    acao: TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
    entidadeAlvo: 'Cidadao',
    permitirAutoAprovacao: true,
    condicoesAutoAprovacao: (context) => {
      const usuario = context.usuario;
      const agora = new Date();
      const horarioComercial = agora.getHours() >= 8 && agora.getHours() <= 18;
      
      // Auto-aprovação apenas para admins em horário comercial
      return usuario.role === 'ADMIN' && horarioComercial;
    },
    descricaoAcao: 'Exclusão de registro de cidadão',
    sempreAuditar: true,
  })
  @UseGuards(AprovacaoGuard) // Guard adicional para verificação prévia
  async excluirCidadao(
    @Param('id') cidadaoId: string,
    @Body() dados: ExcluirCidadaoDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(`Excluindo cidadão ${cidadaoId} por usuário ${usuario.id}`);
    
    // Validação adicional
    if (!dados.confirmarExclusao) {
      throw new Error('Confirmação de exclusão é obrigatória');
    }
    
    // Lógica de exclusão
    return {
      success: true,
      message: 'Cidadão excluído com sucesso',
      cidadaoId,
      excluidoPor: usuario.id,
      justificativa: dados.justificativa,
      dataExclusao: new Date(),
    };
  }

  /**
   * Exemplo 4: Alteração de dados críticos com validação complexa
   * 
   * Características:
   * - Aprovação baseada no tipo de campo alterado
   * - Validação de dados antes da aprovação
   * - Metadados detalhados para auditoria
   */
  @Put('cidadao/:id/dados-criticos')
  @ApiOperation({ 
    summary: 'Alterar dados críticos (validação complexa)',
    description: 'Altera dados críticos de um cidadão com validação e aprovação.'
  })
  @ApiResponse({ status: 200, description: 'Dados alterados' })
  @ApiResponse({ status: 403, description: 'Ação requer aprovação' })
  @RequerAprovacao({
    acao: TipoAcaoCritica.ALTERACAO_DADOS_BANCARIOS,
    entidadeAlvo: 'Cidadao',
    permitirAutoAprovacao: true,
    condicoesAutoAprovacao: (context) => {
      const usuario = context.usuario;
      const dados = context.body as AlterarDadosCriticosDto;
      
      // Campos que sempre requerem aprovação
      const camposCriticos = ['cpf', 'rg', 'dataNascimento', 'nomeMae'];
      
      // Auto-aprovação apenas para gestores em campos não críticos
      return usuario.role === 'GESTOR' && !camposCriticos.includes(dados.campo);
    },
    descricaoAcao: 'Alteração de dados pessoais críticos',
    sempreAuditar: true,
  })
  async alterarDadosCriticos(
    @Param('id') cidadaoId: string,
    @Body() dados: AlterarDadosCriticosDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(
      `Alterando campo ${dados.campo} do cidadão ${cidadaoId} por usuário ${usuario.id}`,
    );
    
    // Lógica de alteração
    return {
      success: true,
      message: 'Dados alterados com sucesso',
      cidadaoId,
      alteradoPor: usuario.id,
      campo: dados.campo,
      valorAnterior: dados.valorAnterior,
      valorNovo: dados.valorNovo,
      justificativa: dados.justificativa,
      dataAlteracao: new Date(),
    };
  }

  /**
   * Exemplo 5: Ação sem aprovação (para comparação)
   * 
   * Esta ação não possui decorators de aprovação,
   * portanto será executada normalmente.
   */
  @Post('beneficio/:id/consultar')
  @ApiOperation({ 
    summary: 'Consultar benefício (sem aprovação)',
    description: 'Consulta dados de um benefício. Não requer aprovação.'
  })
  @ApiResponse({ status: 200, description: 'Dados do benefício' })
  async consultarBeneficio(
    @Param('id') beneficioId: string,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(`Consultando benefício ${beneficioId} por usuário ${usuario.id}`);
    
    // Esta ação será executada imediatamente
    return {
      success: true,
      beneficioId,
      consultadoPor: usuario.id,
      dataConsulta: new Date(),
      dados: {
        status: 'ATIVO',
        valor: 1200.00,
        dataInicio: '2024-01-01',
        proximoPagamento: '2024-02-01',
      },
    };
  }
}

/**
 * Exemplo de uso em um serviço (sem decorators HTTP)
 * 
 * Demonstra como usar o sistema de aprovação em métodos de serviço
 */
export class ExemploServicoComAprovacao {
  private readonly logger = new Logger(ExemploServicoComAprovacao.name);

  /**
   * Método de serviço que requer aprovação
   * 
   * Pode ser usado em outros contextos além de controllers HTTP
   */
  @AcaoCritica(TipoAcaoCritica.PROCESSAMENTO_LOTE, 'ProcessamentoLote')
  async processarLoteBeneficios(loteId: string, usuarioId: string) {
    this.logger.log(`Processando lote ${loteId} por usuário ${usuarioId}`);
    
    // Lógica de processamento do lote
    return {
      success: true,
      loteId,
      processadoPor: usuarioId,
      dataProcessamento: new Date(),
      totalProcessado: 150,
    };
  }

  /**
   * Método com aprovação condicional baseada em valor
   */
  @RequerAprovacao({
    acao: TipoAcaoCritica.APROVACAO_PAGAMENTO,
    entidadeAlvo: 'Pagamento',
    permitirAutoAprovacao: true,
    condicoesAutoAprovacao: (context) => {
      const valor = context.body?.valor || 0;
      const usuario = context.usuario;
      
      // Auto-aprovação para valores até R$ 5.000 para gestores
      if (usuario.role === 'GESTOR' && valor <= 5000) {
        return true;
      }
      
      // Auto-aprovação para valores até R$ 50.000 para admins
      if (usuario.role === 'ADMIN' && valor <= 50000) {
        return true;
      }
      
      return false;
    },
    sempreAuditar: true,
  })
  async aprovarPagamento(pagamentoId: string, valor: number, usuarioId: string) {
    this.logger.log(
      `Aprovando pagamento ${pagamentoId} no valor de R$ ${valor} por usuário ${usuarioId}`,
    );
    
    // Lógica de aprovação do pagamento
    return {
      success: true,
      pagamentoId,
      valor,
      aprovadoPor: usuarioId,
      dataAprovacao: new Date(),
    };
  }
}