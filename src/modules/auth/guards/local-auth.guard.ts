import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para autenticação local (email/senha)
 * 
 * Utilizado no endpoint de login para validar as credenciais do usuário
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
