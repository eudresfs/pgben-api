import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ScreenType } from '../enums/screen-type.enum';
import { ActionType } from '../enums/action-type.enum';
import {
  WhatsAppFlowRequestDto,
  WhatsAppFlowDataDto,
} from '../dto/whatsapp-flow-request.dto';
import {
  WhatsAppFlowResponseDto,
  // FlowDataResponseDto,
} from '../dto/whatsapp-flow-response.dto';
import { AuditEventEmitter, AuditEventType } from '../../auditoria';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

/**
 * Serviço responsável por gerenciar as diferentes telas do WhatsApp Flows
 *
 * Implementa os handlers para as 3 telas principais:
 * - INICIO: Tela de login com CPF e senha
 * - ESQUECEU_SENHA: Tela de recuperação de senha
 * - BUSCAR_CIDADAO: Tela de busca de cidadão por CPF
 */
import { IScreenHandlerService } from '../interfaces';

@Injectable()
export class ScreenHandlerService implements IScreenHandlerService {
  private readonly logger = new Logger(ScreenHandlerService.name);

  constructor(
    private readonly cidadaoService: CidadaoService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly auditEmitter: AuditEventEmitter,
  ) {
    this.logger.log('ScreenHandlerService inicializado');
  }

  /**
   * Processa a requisição baseada na tela atual
   * @param request Dados da requisição do WhatsApp Flow
   * @returns Resposta formatada para o WhatsApp
   */
  async handleScreenRequest(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto> {
    try {
      this.logger.debug(
        `Processando requisição para tela: ${request.decrypted_data?.screen}`,
      );

      // Validar dados da requisição
      this.validateRequest(request);

      // Processar baseado no tipo de tela
      switch (request.decrypted_data?.screen) {
        case ScreenType.INICIO:
          return await this.handleInicioScreen(request);

        case ScreenType.ESQUECEU_SENHA:
          return await this.handleEsqueceuSenhaScreen(request);

        case ScreenType.BUSCAR_CIDADAO:
          return await this.handleBuscarCidadaoScreen(request);

        default:
          throw new BadRequestException(
            `Tela não suportada: ${request.decrypted_data?.screen}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar tela ${request.decrypted_data?.screen}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handler para a tela de INICIO (login)
   * Processa autenticação com CPF e senha
   */
  private async handleInicioScreen(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto> {
    this.logger.debug('Processando tela de INICIO');

    const { action, data } = request.decrypted_data;

    switch (action) {
      case ActionType.INIT:
        // Inicializar tela de login
        return this.createInitResponse(ScreenType.INICIO, {
          title: 'Login PGBen',
          subtitle: 'Digite seus dados para acessar',
          fields: [
            {
              name: 'cpf',
              label: 'CPF',
              type: 'text',
              required: true,
              placeholder: '000.000.000-00',
            },
            {
              name: 'senha',
              label: 'Senha',
              type: 'password',
              required: true,
              placeholder: 'Digite sua senha',
            },
          ],
          buttons: [
            {
              text: 'Entrar',
              action: 'submit',
            },
            {
              text: 'Esqueci minha senha',
              action: 'navigate',
              target: ScreenType.ESQUECEU_SENHA,
            },
          ],
        });

      case ActionType.DATA_EXCHANGE:
        // Processar dados de login
        return await this.processLogin(request.decrypted_data);

      default:
        throw new BadRequestException(
          `Ação não suportada para tela INICIO: ${action}`,
        );
    }
  }

  /**
   * Handler para a tela de ESQUECEU_SENHA
   * Processa recuperação de senha por CPF
   */
  private async handleEsqueceuSenhaScreen(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto> {
    this.logger.debug('Processando tela de ESQUECEU_SENHA');

    const { action, data } = request.decrypted_data;

    switch (action) {
      case ActionType.INIT:
        // Inicializar tela de recuperação
        return this.createInitResponse(ScreenType.ESQUECEU_SENHA, {
          title: 'Recuperar Senha',
          subtitle: 'Digite seu email para recuperar a senha',
          fields: [
            {
              name: 'email',
              label: 'Email',
              type: 'email',
              required: true,
              placeholder: 'seu@email.com',
            },
          ],
          buttons: [
            {
              text: 'Recuperar Senha',
              action: 'submit',
            },
            {
              text: 'Voltar ao Login',
              action: 'navigate',
              target: ScreenType.INICIO,
            },
          ],
        });

      case ActionType.DATA_EXCHANGE:
        // Processar recuperação de senha
        return await this.processPasswordRecovery(request.decrypted_data);

      default:
        throw new BadRequestException(
          `Ação não suportada para tela ESQUECEU_SENHA: ${action}`,
        );
    }
  }

  /**
   * Handler para a tela de BUSCAR_CIDADAO
   * Processa busca de cidadão por CPF
   */
  private async handleBuscarCidadaoScreen(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto> {
    this.logger.debug('Processando tela de BUSCAR_CIDADAO');

    const { action, data } = request.decrypted_data;

    switch (action) {
      case ActionType.INIT:
        // Inicializar tela de busca
        return this.createInitResponse(ScreenType.BUSCAR_CIDADAO, {
          title: 'Buscar Cidadão',
          subtitle: 'Digite o CPF para buscar informações',
          fields: [
            {
              name: 'cpf',
              label: 'CPF do Cidadão',
              type: 'text',
              required: true,
              placeholder: '000.000.000-00',
            },
          ],
          buttons: [
            {
              text: 'Buscar',
              action: 'submit',
            },
            {
              text: 'Voltar',
              action: 'navigate',
              target: ScreenType.INICIO,
            },
          ],
          dynamic_data: {
            cpf: request.decrypted_data?.data?.cpf || '',
          },
        });

      case ActionType.DATA_EXCHANGE:
        // Processar busca de cidadão
        return await this.processCidadaoSearch(request.decrypted_data);

      default:
        throw new BadRequestException(
          `Ação não suportada para tela BUSCAR_CIDADAO: ${action}`,
        );
    }
  }

  /**
   * Processa o login do usuário
   * @param data Dados do formulário de login
   * @returns Resposta com resultado da autenticação
   */
  private async processLogin(
    data: WhatsAppFlowDataDto,
  ): Promise<WhatsAppFlowResponseDto> {
    try {
      const username = data?.data?.username || data?.data?.email;
      const password = data?.data?.password || data?.data?.senha;

      if (!username || !password) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            usernameError: !username ? 'Email é obrigatório' : undefined,
            passwordError: !password ? 'Senha é obrigatória' : undefined,
          },
        };
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            usernameError: 'Formato de email inválido',
          },
        };
      }

      // Registrar tentativa de login
      await this.auditEmitter.emitSensitiveDataEvent(
        AuditEventType.SENSITIVE_DATA_ACCESSED,
        'WhatsAppFlow',
        'login_attempt',
        SYSTEM_USER_UUID,
        ['email'],
        `Tentativa de login via WhatsApp Flow - Email: ${username.substring(0, 3)}***`,
      );

      // Validar credenciais
      const authResult = await this.authService.validateUser(username, password, SYSTEM_USER_UUID);

      if (!authResult) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            loginError: 'Email ou senha inválidos. Verifique suas credenciais.',
          },
        };
      }

      // Login bem-sucedido
      this.logger.log(
        `Login bem-sucedido via WhatsApp Flow - Email: ${username.substring(0, 3)}***`,
      );

      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          success: true,
          message: 'Login realizado com sucesso!',
          user: {
            id: authResult.id,
            nome: authResult.username,
            email: username,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Erro no login: ${error.message}`);

      // Sempre retornar 200 com erro no data
      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          systemError: 'Erro interno do sistema. Tente novamente em alguns instantes.',
        },
      };
    }
  }

  /**
   * Processa a recuperação de senha
   * @param data Dados do formulário de recuperação
   * @returns Resposta com resultado da recuperação
   */
  private async processPasswordRecovery(
    data: WhatsAppFlowDataDto,
  ): Promise<WhatsAppFlowResponseDto> {
    try {
      const email = data?.data?.data?.email || data?.data?.email || data?.data?.username;

      if (!email) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            emailError: 'Email é obrigatório para recuperação de senha',
          },
        };
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            emailError: 'Formato de email inválido',
          },
        };
      }

      // Registrar tentativa de recuperação
      await this.auditEmitter.emitSensitiveDataEvent(
        AuditEventType.SENSITIVE_DATA_ACCESSED,
        'WhatsAppFlow',
        'password_recovery_attempt',
        SYSTEM_USER_UUID,
        ['email'],
        `Tentativa de recuperação de senha via WhatsApp Flow - Email: ${email.substring(0, 3)}***`,
      );

      // Buscar usuário por email
      // TODO: Implementar busca de usuário por email no authService
      // Por enquanto, simular o processo

      this.logger.log(
        `Recuperação de senha solicitada via WhatsApp Flow - Email: ${email.substring(0, 3)}***`,
      );

      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          success: true,
          message:
            'Se o email estiver cadastrado, você receberá instruções para recuperação de senha.',
        },
      };
    } catch (error) {
      this.logger.error(`Erro na recuperação de senha: ${error.message}`);

      // Sempre retornar 200 com erro no data
      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          systemError: 'Erro interno do sistema. Tente novamente em alguns instantes.',
        },
      };
    }
  }

  /**
   * Processa a busca de cidadão
   * @param data Dados do formulário de busca
   * @returns Resposta com dados do cidadão encontrado
   */
  private async processCidadaoSearch(
    data: WhatsAppFlowDataDto,
  ): Promise<WhatsAppFlowResponseDto> {
    try {
      const cpf = data?.data?.cpf;

      if (!cpf) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpfError: 'CPF é obrigatório para busca',
          },
        };
      }

      // Limpar CPF
      const cpfClean = cpf.replace(/\D/g, '');

      // Validar CPF
      if (cpfClean.length !== 11) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpfError: 'CPF deve conter 11 dígitos',
          },
        };
      }

      // Registrar busca
      await this.auditEmitter.emitSensitiveDataEvent(
        AuditEventType.SENSITIVE_DATA_ACCESSED,
        'WhatsAppFlow',
        'cidadao_search',
        SYSTEM_USER_UUID,
        ['cpf'],
        `Busca de cidadão via WhatsApp Flow - CPF: ${cpfClean.substring(0, 3)}***`,
      );

      // Buscar cidadão
      const cidadao = await this.cidadaoService.findByCpf(
        cpfClean,
        true, // incluir relações
        SYSTEM_USER_UUID,
      );

      if (!cidadao) {
        return {
          version: '3.0',
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpfError: 'Cidadão não encontrado com o CPF informado',
          },
        };
      }

      this.logger.log(
        `Cidadão encontrado via WhatsApp Flow - CPF: ${cpfClean.substring(0, 3)}***`,
      );

      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          success: true,
          message: 'Cidadão encontrado com sucesso!',
          cidadao: {
            id: 'id' in cidadao ? cidadao.id : null,
            nome: cidadao.nome,
            cpf: cpfClean,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Erro na busca de cidadão: ${error.message}`);

      // Sempre retornar 200 com erro no data
      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          systemError: 'Erro interno do sistema. Tente novamente em alguns instantes.',
        },
      };
    }
  }

  /**
   * Cria uma resposta de inicialização para uma tela
   * @param screen Tipo da tela
   * @param screenData Dados da tela
   * @returns Resposta formatada
   */
  private createInitResponse(
    screen: ScreenType,
    screenData: any,
  ): WhatsAppFlowResponseDto {
    return {
      version: '3.0',
      action: ActionType.DATA_EXCHANGE,
      data: {
        screen,
        ...screenData,
      },
    };
  }

  /**
   * Valida os dados da requisição
   * @param request Dados da requisição
   */
  private validateRequest(request: WhatsAppFlowRequestDto): void {
    if (!request.decrypted_data?.screen && 
      request.decrypted_data?.action != ActionType.PING ) {
      throw new BadRequestException('Tela é obrigatória');
    }

    if (!request.decrypted_data?.action) {
      throw new BadRequestException('Ação é obrigatória');
    }

    if (!Object.values(ScreenType).includes(request.decrypted_data.screen as ScreenType)) {
      throw new BadRequestException(`Tela inválida: ${request.decrypted_data.screen}`);
    }

    if (!Object.values(ActionType).includes(request.decrypted_data.action as ActionType)) {
      throw new BadRequestException(`Ação inválida: ${request.decrypted_data.action}`);
    }
  }
}