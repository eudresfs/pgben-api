import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../entities/usuario.entity';

/**
 * Guard para verificar se o usuário está em primeiro acesso
 * 
 * Este guard verifica se o usuário logado possui o campo `primeiro_acesso` como `true`.
 * Se sim, bloqueia o acesso a rotas que não sejam especificamente para alteração
 * de senha no primeiro acesso.
 * 
 * Para permitir acesso a uma rota mesmo em primeiro acesso, use o decorator
 * `@AllowPrimeiroAcesso()` na rota ou controller.
 */
@Injectable()
export class PrimeiroAcessoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Se não há usuário autenticado, deixar outros guards tratarem
    if (!user || !user.id) {
      return true;
    }

    // Verificar se a rota permite primeiro acesso
    const allowPrimeiroAcesso = this.reflector.get<boolean>(
      'allow-primeiro-acesso',
      context.getHandler(),
    ) || this.reflector.get<boolean>(
      'allow-primeiro-acesso',
      context.getClass(),
    );

    if (allowPrimeiroAcesso) {
      return true;
    }

    // Buscar dados completos do usuário para verificar primeiro_acesso
    try {
      const usuarioCompleto = await this.usuarioRepository.findOne({
        where: { id: user.id },
        select: ['id', 'primeiro_acesso', 'nome', 'email']
      });

      if (!usuarioCompleto) {
        throw new ForbiddenException('Usuário não encontrado');
      }

      // Se usuário está em primeiro acesso, bloquear
      if (usuarioCompleto?.primeiro_acesso) {
        throw new ForbiddenException({
          message: 'Primeiro acesso detectado. Alteração de senha obrigatória.',
          code: 'PRIMEIRO_ACESSO_OBRIGATORIO',
          redirect: '/auth/alterar-senha-primeiro-acesso'
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      // Em caso de erro na consulta, permitir acesso para não quebrar o sistema
      console.error('Erro ao verificar primeiro acesso:', error);
      return true;
    }
  }
}