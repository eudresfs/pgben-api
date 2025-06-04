import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegradorTokenService } from './integrador-token.service';
import { TokenRevogado } from '../../../entities/token-revogado.entity';

/**
 * Serviço responsável pela autenticação e autorização de integradores.
 * Valida tokens, verifica permissões e registra acessos.
 */
@Injectable()
export class IntegradorAuthService {
  private readonly logger = new Logger(IntegradorAuthService.name);

  constructor(
    private readonly tokenService: IntegradorTokenService,
    @InjectRepository(TokenRevogado)
    private tokenRevogadoRepository: Repository<TokenRevogado>,
  ) {}

  /**
   * Extrai o token de autorização do cabeçalho da requisição.
   * @param request Objeto de requisição HTTP
   * @returns Token extraído ou null se não encontrado
   */
  extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Obtém o endereço IP real da requisição.
   * @param request Objeto de requisição HTTP
   * @returns Endereço IP
   */
  getIpFromRequest(request: Request): string {
    // Considera cabeçalhos como X-Forwarded-For para ambientes com proxy
    const xForwardedFor = request.headers['x-forwarded-for'] as string;
    if (xForwardedFor) {
      const ips = xForwardedFor.split(',');
      return ips[0].trim();
    }

    return request.ip || request.socket.remoteAddress || '0.0.0.0';
  }

  /**
   * Valida a autenticação de uma requisição.
   * @param request Objeto de requisição HTTP
   * @returns Payload do token validado
   * @throws UnauthorizedException se a autenticação falhar
   */
  async validateRequest(request: Request): Promise<any> {
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token de autorização não fornecido');
    }

    try {
      // Validar o token e obter o payload
      const payload = await this.tokenService.validateToken(token);

      // Verificar restrições de IP
      const ipAddress = this.getIpFromRequest(request);
      if (!this.tokenService.isIpAllowed(payload.integrador, ipAddress)) {
        this.logger.warn(
          `Tentativa de acesso de IP não autorizado: ${ipAddress} para integrador ${payload.integrador.id}`,
        );
        throw new UnauthorizedException(
          `Acesso não permitido do IP ${ipAddress}`,
        );
      }

      // Adicionar informações à requisição para uso posterior
      request['integrador'] = payload.integrador;
      request['integradorTokenPayload'] = payload;

      return payload;
    } catch (error) {
      // Registrar tentativa de acesso inválida
      this.logger.warn(`Falha na autenticação de integrador: ${error.message}`);

      // Propaga a exceção original
      throw error;
    }
  }

  /**
   * Verifica se a requisição tem as permissões necessárias.
   * @param request Objeto de requisição HTTP
   * @param requiredScopes Escopos necessários para a operação
   * @returns true se autorizado, false caso contrário
   */
  checkPermissions(request: Request, requiredScopes: string[]): boolean {
    const payload = request['integradorTokenPayload'];
    if (!payload) {
      return false;
    }

    return this.tokenService.hasRequiredScopes(payload, requiredScopes);
  }

  /**
   * Registra uma tentativa de acesso (sucesso ou falha).
   * Este método pode ser expandido para incluir mais informações de auditoria.
   * @param tokenId ID do token (se identificado)
   * @param integradorId ID do integrador (se identificado)
   * @param success Indica se o acesso foi bem-sucedido
   * @param ipAddress Endereço IP da requisição
   * @param resource Recurso que estava sendo acessado
   * @param message Mensagem adicional
   */
  async registrarTentativaAcesso(
    tokenId: string | null,
    integradorId: string | null,
    success: boolean,
    ipAddress: string,
    resource: string,
    message: string,
  ): Promise<void> {
    // Aqui poderia ser implementada a lógica para registrar em um banco ou
    // sistema de monitoramento. Por ora, apenas logamos.
    if (success) {
      this.logger.log(
        `Acesso autorizado: integrador=${integradorId}, token=${tokenId}, ip=${ipAddress}, recurso=${resource}`,
      );
    } else {
      this.logger.warn(
        `Acesso negado: integrador=${integradorId}, ip=${ipAddress}, recurso=${resource}, motivo=${message}`,
      );
    }
  }

  /**
   * Busca na cache local se um token está revogado.
   * Este método pode ser otimizado com Redis ou outro mecanismo de cache.
   * @param tokenHash Hash do token a ser verificado
   * @returns true se o token estiver revogado, false caso contrário
   */
  async isTokenRevogado(tokenHash: string): Promise<boolean> {
    const revogado = await this.tokenRevogadoRepository.findOne({
      where: { tokenHash },
    });

    return !!revogado;
  }
}
