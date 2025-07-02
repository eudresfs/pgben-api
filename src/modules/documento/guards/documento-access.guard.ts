import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentoService } from '../services/documento.service';
import { LoggingService } from '../../../shared/logging/logging.service';

/**
 * Guard para controle de acesso granular a documentos
 *
 * Este guard verifica se o usuário tem permissão para acessar
 * um documento específico baseado em regras de negócio
 */
@Injectable()
export class DocumentoAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly documentoService: DocumentoService,
    private readonly logger: LoggingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const documentoId = request.params?.id;

    // Se não há ID do documento na rota, permitir (será validado por outros guards)
    if (!documentoId) {
      return true;
    }

    // Se não há usuário autenticado, negar acesso
    if (!user || !user.id) {
      this.logger.warn(
        `Tentativa de acesso a documento sem autenticação: ${documentoId}`,
        DocumentoAccessGuard.name,
        { documentoId },
      );
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Validar formato do UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentoId)) {
      this.logger.warn(
        `Tentativa de acesso com ID inválido: ${documentoId}`,
        DocumentoAccessGuard.name,
        { documentoId, userId: user.id },
      );
      throw new BadRequestException('ID do documento inválido');
    }

    try {
      // Extrair roles do usuário
      const userRoles = user.roles || [];

      // Verificar acesso usando o serviço
      const hasAccess = await this.documentoService.checkUserDocumentAccess(
        documentoId,
        user.id,
        userRoles,
      );

      if (!hasAccess) {
        this.logger.warn(
          `Acesso negado pelo DocumentoAccessGuard: ${documentoId}`,
          DocumentoAccessGuard.name,
          { documentoId, userId: user.id, userRoles },
        );
        throw new ForbiddenException('Acesso negado ao documento');
      }

      this.logger.debug(
        `Acesso concedido pelo DocumentoAccessGuard: ${documentoId}`,
        DocumentoAccessGuard.name,
        { documentoId, userId: user.id },
      );

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Erro no DocumentoAccessGuard para documento ${documentoId}`,
        error,
        DocumentoAccessGuard.name,
        { documentoId, userId: user.id },
      );

      // Em caso de erro interno, negar acesso por segurança
      throw new ForbiddenException('Erro interno na verificação de acesso');
    }
  }
}
