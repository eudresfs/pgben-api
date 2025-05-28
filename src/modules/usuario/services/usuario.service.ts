import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { UpdateStatusUsuarioDto } from '../dto/update-status-usuario.dto';
import { UpdateSenhaDto } from '../dto/update-senha.dto';
import { Usuario } from '../entities/usuario.entity';

/**
 * Serviço de usuários
 *
 * Responsável pela lógica de negócio relacionada a usuários
 */
@Injectable()
export class UsuarioService {
  private readonly logger = new Logger(UsuarioService.name);
  private readonly SALT_ROUNDS = 12; // Aumentando a segurança do hash
  private readonly MAX_LOGIN_ATTEMPTS = 5; // Máximo de tentativas de login
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos em ms

  constructor(
    private readonly dataSource: DataSource,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  /**
   * Busca todos os usuários com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de usuários paginada
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    unidade_id?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      unidade_id,
    } = options || {};

    // Construir filtros
    const where: any = {};

    if (search) {
      where.nome = { $iLike: `%${search}%` };
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (unidade_id) {
      where.unidade_id = unidade_id;
    }

    // Calcular skip para paginação
    const skip = (page - 1) * limit;

    // Buscar usuários
    const [usuarios, total] = await this.usuarioRepository.findAll({
      skip,
      take: limit,
      where,
    });

    // Remover campos sensíveis
    const usuariosSemSenha = usuarios.map((usuario) => {
      const { senhaHash, ...usuarioSemSenha } = usuario;
      return usuarioSemSenha;
    });

    return {
      items: usuariosSemSenha,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca um usuário pelo ID
   * @param id ID do usuário
   * @returns Usuário encontrado
   */
  async findById(id: string) {
    const usuario = await this.usuarioRepository.findById(id);

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remover campos sensíveis
    const { senhaHash, ...usuarioSemSenha } = usuario;

    return usuarioSemSenha;
  }

  /**
   * Cria um novo usuário
   * @param createUsuarioDto Dados do usuário
   * @returns Usuário criado
   */
  async create(createUsuarioDto: CreateUsuarioDto) {
    this.logger.log(`Iniciando criação de usuário: ${createUsuarioDto.email}`);

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository('usuario');
        const unidadeRepo = manager.getRepository('unidade');
        const setorRepo = manager.getRepository('setor');

        // Verificar se email já existe
        const emailExistente = await usuarioRepo.findOne({
          where: { email: createUsuarioDto.email },
        });
        if (emailExistente) {
          this.logger.warn(`Email já está em uso: ${createUsuarioDto.email}`);
          throw new ConflictException('Email já está em uso');
        }

        // Verificar se CPF já existe
        const cpfExistente = await usuarioRepo.findOne({
          where: { cpf: createUsuarioDto.cpf },
        });
        if (cpfExistente) {
          this.logger.warn(`CPF já está em uso: ${createUsuarioDto.cpf}`);
          throw new ConflictException('CPF já está em uso');
        }

        // Verificar se matrícula já existe
        const matriculaExistente = await usuarioRepo.findOne({
          where: { matricula: createUsuarioDto.matricula },
        });
        if (matriculaExistente) {
          this.logger.warn(
            `Matrícula já está em uso: ${createUsuarioDto.matricula}`,
          );
          throw new ConflictException('Matrícula já está em uso');
        }

        // Verificar se a unidade existe
        if (createUsuarioDto.unidade_id) {
          const unidade = await unidadeRepo.findOne({
            where: { id: createUsuarioDto.unidade_id },
          });
          if (!unidade) {
            this.logger.warn(`Unidade não encontrada: ${createUsuarioDto.unidade_id}`);
            throw new BadRequestException('Unidade não encontrada');
          }

          // Verificar se o setor existe e pertence à unidade
          if (createUsuarioDto.setor_id) {
            const setor = await setorRepo.findOne({
              where: { 
                id: createUsuarioDto.setor_id,
                unidade_id: createUsuarioDto.unidade_id 
              },
            });
            if (!setor) {
              this.logger.warn(`Setor não encontrado para a unidade: ${createUsuarioDto.setor_id}`);
              throw new BadRequestException('Setor não encontrado para a unidade');
            }
          }
        }

        // Gerar hash da senha com maior segurança
        const senhaHash = await bcrypt.hash(
          createUsuarioDto.senha,
          this.SALT_ROUNDS,
        );

        // Criar usuário
        const novoUsuario = usuarioRepo.create({
          nome: createUsuarioDto.nome,
          email: createUsuarioDto.email.toLowerCase(), // Normalizar email para minúsculas
          senhaHash,
          cpf: createUsuarioDto.cpf,
          telefone: createUsuarioDto.telefone,
          matricula: createUsuarioDto.matricula,
          role_id: createUsuarioDto.role_id,
          unidade_id: createUsuarioDto.unidade_id,
          setor_id: createUsuarioDto.setor_id,
          primeiro_acesso: true,
          ultimo_login: null,
          tentativas_login: 0,
        });

        const usuarioSalvo = await usuarioRepo.save(novoUsuario);
        this.logger.log(`Usuário criado com sucesso: ${usuarioSalvo.id}`);

        // Remover campos sensíveis
        const { senhaHash: _, ...usuarioSemSenha } = usuarioSalvo;

        return {
          data: usuarioSemSenha,
          meta: null,
          message: null
        };
      });
    } catch (error) {
      this.logger.error(`Erro ao criar usuário: ${error.message}`, error.stack);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao criar usuário. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Atualiza um usuário existente
   * @param id ID do usuário
   * @param updateUsuarioDto Dados a serem atualizados
   * @returns Usuário atualizado
   */
  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    this.logger.log(`Iniciando atualização do usuário ${id}`);

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository('usuario');

        // Verificar se usuário existe
        const usuario = await usuarioRepo.findOne({ where: { id } });
        if (!usuario) {
          this.logger.warn(`Usuário não encontrado: ${id}`);
          throw new NotFoundException('Usuário não encontrado');
        }

        // Verificar se email já existe (se fornecido)
        if (
          updateUsuarioDto.email &&
          updateUsuarioDto.email.toLowerCase() !== usuario.email.toLowerCase()
        ) {
          const emailExistente = await usuarioRepo.findOne({
            where: { email: updateUsuarioDto.email.toLowerCase() },
          });
          if (emailExistente) {
            this.logger.warn(`Email já está em uso: ${updateUsuarioDto.email}`);
            throw new ConflictException('Email já está em uso');
          }
          // Normalizar email para minúsculas
          updateUsuarioDto.email = updateUsuarioDto.email.toLowerCase();
        }

        // Verificar se CPF já existe (se fornecido)
        if (updateUsuarioDto.cpf && updateUsuarioDto.cpf !== usuario.cpf) {
          const cpfExistente = await usuarioRepo.findOne({
            where: { cpf: updateUsuarioDto.cpf },
          });
          if (cpfExistente) {
            this.logger.warn(`CPF já está em uso: ${updateUsuarioDto.cpf}`);
            throw new ConflictException('CPF já está em uso');
          }
        }

        // Verificar se matrícula já existe (se fornecida)
        if (
          updateUsuarioDto.matricula &&
          updateUsuarioDto.matricula !== usuario.matricula
        ) {
          const matriculaExistente = await usuarioRepo.findOne({
            where: { matricula: updateUsuarioDto.matricula },
          });
          if (matriculaExistente) {
            this.logger.warn(
              `Matrícula já está em uso: ${updateUsuarioDto.matricula}`,
            );
            throw new ConflictException('Matrícula já está em uso');
          }
        }

        // Atualizar usuário
        await usuarioRepo.update(id, updateUsuarioDto);

        // Buscar usuário atualizado
        const usuarioAtualizado = await usuarioRepo.findOne({ where: { id } });
        if (!usuarioAtualizado) {
          throw new NotFoundException(
            'Usuário não encontrado após atualização',
          );
        }

        this.logger.log(`Usuário ${id} atualizado com sucesso`);

        // Remover campos sensíveis
        const { senhaHash, ...usuarioSemSenha } = usuarioAtualizado;

        return usuarioSemSenha;
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar usuário ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao atualizar usuário. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Atualiza o status de um usuário
   * @param id ID do usuário
   * @param updateStatusUsuarioDto Novo status
   * @returns Usuário atualizado
   */
  async updateStatus(
    id: string,
    updateStatusUsuarioDto: UpdateStatusUsuarioDto,
  ) {
    // Verificar se usuário existe
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Atualizar status
    const usuarioAtualizado = await this.usuarioRepository.updateStatus(
      id,
      updateStatusUsuarioDto.status,
    );

    // Remover campos sensíveis
    const { senhaHash, ...usuarioSemSenha } = usuarioAtualizado;

    return usuarioSemSenha;
  }

  /**
   * Atualiza a senha de um usuário
   * @param id ID do usuário
   * @param updateSenhaDto Dados da nova senha
   * @returns Mensagem de sucesso
   */
  async updateSenha(id: string, updateSenhaDto: UpdateSenhaDto) {
    this.logger.log(`Iniciando atualização de senha do usuário ${id}`);

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository('usuario');

        // Verificar se usuário existe
        const usuario = await usuarioRepo.findOne({ where: { id } });
        if (!usuario) {
          this.logger.warn(`Usuário não encontrado: ${id}`);
          throw new NotFoundException('Usuário não encontrado');
        }

        // Verificar se a senha atual está correta
        const senhaCorreta = await bcrypt.compare(
          updateSenhaDto.senhaAtual,
          usuario.senhaHash,
        );
        if (!senhaCorreta) {
          this.logger.warn(
            `Tentativa de alteração de senha com senha atual incorreta: ${id}`,
          );
          // Incrementar contador de tentativas falhas para prevenção de ataques de força bruta
          await usuarioRepo.update(id, {
            tentativas_login: () => '"tentativas_login" + 1',
          });
          throw new UnauthorizedException('Senha atual incorreta');
        }

        // Verificar se a nova senha e a confirmação coincidem
        if (updateSenhaDto.novaSenha !== updateSenhaDto.confirmacaoSenha) {
          this.logger.warn(`Nova senha e confirmação não coincidem: ${id}`);
          throw new BadRequestException(
            'Nova senha e confirmação não coincidem',
          );
        }

        // Verificar se a nova senha é diferente da atual
        if (updateSenhaDto.novaSenha === updateSenhaDto.senhaAtual) {
          throw new BadRequestException(
            'A nova senha deve ser diferente da senha atual',
          );
        }

        // Gerar hash da nova senha com maior segurança
        const senhaHash = await bcrypt.hash(
          updateSenhaDto.novaSenha,
          this.SALT_ROUNDS,
        );

        // Atualizar senha e resetar contador de tentativas
        await usuarioRepo.update(id, {
          senhaHash,
          tentativas_login: 0,
          primeiro_acesso: false,
          ultimo_login: new Date(),
        });

        this.logger.log(`Senha do usuário ${id} atualizada com sucesso`);

        return { message: 'Senha atualizada com sucesso' };
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar senha do usuário ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao atualizar senha. Por favor, tente novamente.',
      );
    }
  }

  /**
   * Obtém o perfil do usuário atual
   * @param userId ID do usuário atual
   * @returns Perfil do usuário
   */
  async getProfile(userId: string) {
    return this.findById(userId);
  }

  /**
   * Busca um usuário pelo email (para autenticação)
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<Usuario | null> {
    this.logger.log(`Buscando usuário por email: ${email}`);

    try {
      // Normalizar email para minúsculas para evitar problemas de case sensitivity
      const normalizedEmail = email.toLowerCase();
      const usuario = await this.usuarioRepository.findByEmail(normalizedEmail);

      if (!usuario) {
        this.logger.warn(
          `Tentativa de login com email inexistente: ${normalizedEmail}`,
          { context: 'SECURITY_LOGIN_ATTEMPT', email: normalizedEmail }
        );
      }

      return usuario;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar usuário por email: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Verifica se o usuário está bloqueado por excesso de tentativas
   * @param usuario Usuário a ser verificado
   * @returns true se estiver bloqueado
   */
  private isUserLocked(usuario: Usuario): boolean {
    if (!usuario.tentativas_login || usuario.tentativas_login < this.MAX_LOGIN_ATTEMPTS) {
      return false;
    }

    const lastAttempt = usuario.ultimo_login || new Date(0);
    const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
    
    return timeSinceLastAttempt < this.LOCKOUT_DURATION;
  }

  /**
   * Incrementa o contador de tentativas de login
   * @param userId ID do usuário
   */
  private async incrementLoginAttempts(userId: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);
        await usuarioRepo.increment(
          { id: userId },
          'tentativas_login',
          1
        );
        await usuarioRepo.update(userId, {
          ultimo_login: new Date()
        } as DeepPartial<Usuario>);
      });

      this.logger.warn(
        `Tentativa de login falhada incrementada para usuário: ${userId}`,
        { context: 'SECURITY_LOGIN_FAILED', userId }
      );
    } catch (error) {
      this.logger.error(
        `Erro ao incrementar tentativas de login: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Reseta o contador de tentativas de login
   * @param userId ID do usuário
   */
  private async resetLoginAttempts(userId: string): Promise<void> {
    try {
      await this.usuarioRepository.updateStatus(userId, 'ativo');
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);
        await usuarioRepo.update(userId, {
          tentativas_login: 0,
          ultimo_login: new Date()
        } as DeepPartial<Usuario>);
      });

      this.logger.log(
        `Login bem-sucedido - tentativas resetadas para usuário: ${userId}`,
        { context: 'SECURITY_LOGIN_SUCCESS', userId }
      );
    } catch (error) {
      this.logger.error(
        `Erro ao resetar tentativas de login: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Valida credenciais de login com controle de tentativas
   * @param email Email do usuário
   * @param senha Senha do usuário
   * @returns Usuário se credenciais válidas, null caso contrário
   */
  async validateUserCredentials(email: string, senha: string): Promise<Usuario | null> {
    const usuario = await this.findByEmail(email);
    
    if (!usuario) {
      return null;
    }

    // Verificar se usuário está bloqueado
    if (this.isUserLocked(usuario)) {
      this.logger.warn(
        `Tentativa de login em conta bloqueada: ${usuario.id}`,
        { 
          context: 'SECURITY_BLOCKED_LOGIN_ATTEMPT', 
          userId: usuario.id, 
          email: usuario.email,
          attempts: usuario.tentativas_login
        }
      );
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada devido a muitas tentativas de login. Tente novamente em ${Math.ceil(this.LOCKOUT_DURATION / 60000)} minutos.`
      );
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    
    if (!senhaValida) {
      await this.incrementLoginAttempts(usuario.id);
      
      this.logger.warn(
        `Tentativa de login com senha incorreta: ${usuario.id}`,
        { 
          context: 'SECURITY_INVALID_PASSWORD', 
          userId: usuario.id, 
          email: usuario.email,
          attempts: (usuario.tentativas_login || 0) + 1
        }
      );
      
      return null;
    }

    // Login bem-sucedido - resetar tentativas
    await this.resetLoginAttempts(usuario.id);
    
    return usuario;
  }

  /**
   * Remove um usuário (soft delete)
   * @param id - ID do usuário a ser removido
   * @returns Promise<void>
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Iniciando remoção do usuário: ${id}`);

    try {
      // Verifica se o usuário existe
      const usuario = await this.usuarioRepository.findById(id);
      if (!usuario) {
        this.logger.warn(`Usuário não encontrado para remoção: ${id}`);
        throw new NotFoundException('Usuário não encontrado');
      }

      // Realiza o soft delete
      await this.usuarioRepository.remove(id);

      this.logger.log(`Usuário removido com sucesso: ${id}`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover usuário ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
