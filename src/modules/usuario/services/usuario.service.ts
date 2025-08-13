import {
  Injectable,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { LoggingService } from '../../../shared/logging/logging.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, DeepPartial, ILike, Not, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../../../entities/usuario.entity';
import { Role } from '../../../entities/role.entity';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { UpdateStatusUsuarioDto } from '../dto/update-status-usuario.dto';
import { UpdateSenhaDto } from '../dto/update-senha.dto';
import { AlterarSenhaPrimeiroAcessoDto } from '../dto/alterar-senha-primeiro-acesso.dto';
import { Status } from '../../../enums/status.enum';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import {
  throwUserNotFound,
  throwDuplicateEmail,
  throwDuplicateMatricula,
  throwInvalidCredentials,
  throwPasswordMismatch,
  throwWeakPassword,
  throwAccountBlocked,
  throwNotInFirstAccess,
} from '../../../shared/exceptions/error-catalog/domains/usuario.errors';
import { throwDuplicateCpf } from '../../../shared/exceptions/error-catalog/domains/cidadao.errors';
import { EmailService } from '../../../common/services/email.service';
import {
  INotificationManagerService,
  NOTIFICATION_MANAGER_SERVICE,
} from '../../notificacao/interfaces/notification-manager.interface';

/**
 * Serviço de usuários
 *
 * Responsável pela lógica de negócio relacionada a usuários
 */
@Injectable()
export class UsuarioService {
  // Usando o LoggingService estruturado em vez do Logger padrão do NestJS
  private readonly SALT_ROUNDS = 12; // Aumentando a segurança do hash
  private readonly MAX_LOGIN_ATTEMPTS = 5; // Máximo de tentativas de login
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos em ms

  constructor(
    private readonly dataSource: DataSource,
    private readonly usuarioRepository: UsuarioRepository,
    @Optional()
    @Inject(NOTIFICATION_MANAGER_SERVICE)
    private readonly notificationManager: INotificationManagerService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly emailService: EmailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggingService,
  ) {
    // Definir o contexto do logger para este serviço
    this.logger.setContext(UsuarioService.name);
  }

  /**
   * Gera uma senha aleatória segura que atende aos critérios de validação
   * @returns Senha aleatória de 12 caracteres
   */
  private generateRandomPassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '@$!%*?&#';

    // Garantir pelo menos um caractere de cada tipo obrigatório
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Completar com caracteres aleatórios até 12 caracteres
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Embaralhar a senha para evitar padrões previsíveis
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Envia credenciais por email para usuário recém-criado
   * @param usuario Usuário criado
   * @param senha Senha em texto plano
   */
  private async enviarCredenciaisPorEmail(
    usuario: Usuario,
    senha: string,
  ): Promise<void> {
    try {
      // Enviar email direto usando o serviço de email
      await this.emailService.sendEmail({
        to: usuario.email,
        template: 'usuario-credenciais-acesso',
        context: {
          nome: usuario.nome.split(' ')[0],
          email: usuario.email,
          senha: senha,
          matricula: usuario.matricula,
          sistema_url:
            process.env.FRONTEND_URL || 'https://pgben-front.kemosoft.com.br',
          data_criacao: new Date().toLocaleDateString('pt-BR'),
        },
      });

      this.logger.info(`Credenciais enviadas por email para: ${usuario.email}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar credenciais por email: ${error.message}`,
      );
    }
  }

  /**
   * Busca todos os usuários com filtros dinâmicos e paginação
   * @param options Opções de filtro e paginação (aceita qualquer campo da entidade)
   * @returns Lista de usuários paginada
   */
  async findAll(options?: {
    relations?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    [key: string]: any; // Permite qualquer campo da entidade como filtro
  }) {
    const {
      relations = true,
      page = 1,
      limit = 10,
      search,
      ...filters
    } = options || {};

    // Construir filtros dinâmicos
    const where: any = {};

    // Campos permitidos para filtro (baseados na entidade Usuario)
    const allowedFields = [
      'nome',
      'email',
      'cpf',
      'telefone',
      'matricula',
      'role_id',
      'unidade_id',
      'setor_id',
      'status',
      'primeiro_acesso',
      'tentativas_login',
    ];

    // Aplicar filtros dinâmicos para campos permitidos
    Object.keys(filters).forEach((key) => {
      if (
        allowedFields.includes(key) &&
        filters[key] !== undefined &&
        filters[key] !== null &&
        filters[key] !== ''
      ) {
        const value = filters[key];

        // Para campos de texto, usar busca parcial (ILIKE)
        if (['nome', 'email', 'telefone', 'matricula'].includes(key)) {
          where[key] = ILike(`%${value}%`);
        }
        // Para campos exatos (IDs, status, etc.), usar igualdade
        else {
          where[key] = value;
        }
      }
    });

    // Aplicar filtro de busca geral (nome, email, CPF ou matrícula)
    if (search) {
      const searchTerm = search.trim();
      const numericSearch = searchTerm.replace(/\D/g, '');

      // Remover filtros individuais se houver busca geral
      delete where.nome;
      delete where.email;
      delete where.cpf;
      delete where.matricula;

      // Criar condições OR para busca geral
      const searchConditions = [
        { ...where, nome: ILike(`%${searchTerm}%`) },
        { ...where, email: ILike(`%${searchTerm}%`) },
        { ...where, matricula: ILike(`%${searchTerm}%`) },
      ];

      // Adicionar busca por CPF se houver números
      if (numericSearch) {
        searchConditions.push({ ...where, cpf: ILike(`%${numericSearch}%`) });
      }

      // Usar array de condições OR
      const finalWhere = searchConditions;

      // Calcular skip para paginação
      const skip = (page - 1) * limit;

      // Buscar usuários com condições OR
      const [usuarios, total] = await this.usuarioRepository.findAll({
        relations,
        skip,
        take: limit,
        where: finalWhere,
        order: { nome: 'ASC' },
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

    // Calcular skip para paginação
    const skip = (page - 1) * limit;

    // Buscar usuários com filtros simples
    const [usuarios, total] = await this.usuarioRepository.findAll({
      relations,
      skip,
      take: limit,
      where,
      order: { nome: 'ASC' },
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
      throwUserNotFound(id);
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
    this.logger.info(`Iniciando criação de usuário: ${createUsuarioDto.email}`);

    try {
      // ------------ Validações e leituras fora da transação ------------
      const usuarioRepo = this.usuarioRepository;
      const unidadeRepo = this.dataSource.getRepository('unidade');
      const setorRepo = this.dataSource.getRepository('setor');
      const roleRepo = this.dataSource.getRepository('role');

      // Role obrigatória
      if (!createUsuarioDto.role_id) {
        this.logger.warn('Role é obrigatório para criação de usuário');
        throw new BadRequestException('Role é obrigatório');
      }

      const role = await roleRepo.findOne({
        where: { id: createUsuarioDto.role_id },
      });
      if (!role) {
        this.logger.warn(`Role não encontrada: ${createUsuarioDto.role_id}`);
        throw new BadRequestException(
          `Role com ID ${createUsuarioDto.role_id} não encontrada`,
        );
      }

      // Duplicidades
      const emailLower = createUsuarioDto.email.toLowerCase();
      const [emailExists, cpfExists, matriculaExists] = await Promise.all([
        usuarioRepo.findByEmail(emailLower),
        usuarioRepo.findByCpf(createUsuarioDto.cpf),
        usuarioRepo.findByMatricula(createUsuarioDto.matricula),
      ]);

      if (emailExists) throwDuplicateEmail(createUsuarioDto.email);
      if (cpfExists) throwDuplicateCpf(createUsuarioDto.cpf);
      if (matriculaExists) throwDuplicateMatricula(createUsuarioDto.matricula);

      // Verificar unidade
      if (createUsuarioDto.unidade_id) {
        const unidade = await unidadeRepo.findOne({
          where: { id: createUsuarioDto.unidade_id },
        });
        if (!unidade) {
          this.logger.warn(
            `Unidade não encontrada: ${createUsuarioDto.unidade_id}`,
          );
          throw new BadRequestException(
            `Unidade com ID ${createUsuarioDto.unidade_id} não encontrada`,
          );
        }
      }

      // Verificar setor (e se pertence à unidade)
      if (createUsuarioDto.setor_id) {
        if (!createUsuarioDto.unidade_id) {
          this.logger.warn('Setor informado sem unidade correspondente');
          throw new BadRequestException(
            'Quando setor é informado, a unidade também deve ser informada',
          );
        }
        const setor = await setorRepo.findOne({
          where: {
            id: createUsuarioDto.setor_id,
            unidade_id: createUsuarioDto.unidade_id,
          },
        });
        if (!setor) {
          this.logger.warn(
            `Setor não encontrado para a unidade: ${createUsuarioDto.setor_id}`,
          );
          throw new BadRequestException(
            `Setor com ID ${createUsuarioDto.setor_id} não encontrado para a unidade ${createUsuarioDto.unidade_id}`,
          );
        }
      }

      // Geração/validação de senha
      let senhaParaUso = createUsuarioDto.senha;
      let senhaGerada = false;
      if (!senhaParaUso) {
        senhaParaUso = this.generateRandomPassword();
        senhaGerada = true;
        this.logger.info(
          `Senha gerada automaticamente para usuário: ${createUsuarioDto.email}`,
        );
      }

      const senhaHash = await bcrypt.hash(senhaParaUso, this.SALT_ROUNDS);

      const normalizedData = normalizeEnumFields({
        nome: createUsuarioDto.nome,
        email: emailLower,
        senhaHash,
        cpf: createUsuarioDto.cpf,
        telefone: createUsuarioDto.telefone,
        matricula: createUsuarioDto.matricula,
        role_id: createUsuarioDto.role_id,
        unidade_id: createUsuarioDto.unidade_id,
        setor_id: createUsuarioDto.setor_id,
        primeiro_acesso: true,

        tentativas_login: 0,
      });

      // ------------ Transação mínima (apenas INSERT) ------------
      const usuarioSalvo = await this.dataSource.transaction(
        async (manager) => {
          const repo = manager.getRepository(Usuario);
          const novoUsuario = repo.create(
            normalizedData as DeepPartial<Usuario>,
          );
          return repo.save<Usuario>(novoUsuario);
        },
      );

      this.logger.info(`Usuário criado com sucesso: ${usuarioSalvo.id}`);

      const { senhaHash: _ignored, ...usuarioSemSenha } = usuarioSalvo;

      // ------------ Pós-transação: eventos e e-mail ------------
      if (senhaGerada) {
        await this.enviarCredenciaisPorEmail(usuarioSalvo, senhaParaUso);
      } else {
        this.eventEmitter.emit('user.created.email-validation', {
          userId: usuarioSalvo.id,
          email: usuarioSalvo.email,
          nome: usuarioSalvo.nome,
          timestamp: new Date(),
        });
      }

      return {
        data: usuarioSemSenha,
        meta: null,
        message: senhaGerada
          ? 'Usuário criado com sucesso. Credenciais enviadas por email.'
          : 'Usuário criado com sucesso.',
      };
    } catch (error) {
      this.logger.error(`Erro ao criar usuário: ${error.message}`, error.stack);
      if (error instanceof Error) {
        throw error;
      }
    }
  }

  /**
   * Atualiza um usuário existente
   * @param id ID do usuário
   * @param updateUsuarioDto Dados a serem atualizados
   * @returns Usuário atualizado
   */
  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    this.logger.info(`Iniciando atualização do usuário ${id}`);
    const startTime = Date.now();

    try {
      // ------------ Validações e leituras fora da transação ------------
      const usuarioRepo = this.usuarioRepository;

      // Verificar se usuário existe
      const usuario = await usuarioRepo.findById(id);
      if (!usuario) {
        this.logger.warn(`Usuário não encontrado: ${id}`);
        throwUserNotFound(id);
      }

      // Preparar validações em paralelo
      interface ValidacaoItem {
        tipo: 'email' | 'cpf' | 'matricula';
        valor: string;
        promessa: Promise<Usuario | null>;
      }

      const validacoes: ValidacaoItem[] = [];

      // Verificar se email já existe (se fornecido)
      if (
        updateUsuarioDto.email &&
        updateUsuarioDto.email.toLowerCase() !== usuario.email.toLowerCase()
      ) {
        const emailLower = updateUsuarioDto.email.toLowerCase();
        validacoes.push({
          tipo: 'email',
          valor: emailLower,
          promessa: usuarioRepo.findByEmail(emailLower),
        });
        // Normalizar email para minúsculas imediatamente
        updateUsuarioDto.email = emailLower;
      }

      // Verificar se CPF já existe (se fornecido)
      if (updateUsuarioDto.cpf && updateUsuarioDto.cpf !== usuario.cpf) {
        validacoes.push({
          tipo: 'cpf',
          valor: updateUsuarioDto.cpf,
          promessa: usuarioRepo.findByCpf(updateUsuarioDto.cpf),
        });
      }

      // Verificar se matrícula já existe (se fornecida)
      if (
        updateUsuarioDto.matricula &&
        updateUsuarioDto.matricula !== usuario.matricula
      ) {
        validacoes.push({
          tipo: 'matricula',
          valor: updateUsuarioDto.matricula,
          promessa: usuarioRepo.findByMatricula(updateUsuarioDto.matricula),
        });
      }

      // Executar todas as validações em paralelo
      if (validacoes.length > 0) {
        const resultados = await Promise.all(validacoes.map((v) => v.promessa));

        // Verificar resultados das validações
        for (let i = 0; i < validacoes.length; i++) {
          const { tipo, valor } = validacoes[i];
          const resultado = resultados[i];

          if (resultado) {
            switch (tipo) {
              case 'email':
                this.logger.warn(`Email já está em uso: ${valor}`);
                throwDuplicateEmail(valor);
                break;
              case 'cpf':
                this.logger.warn(`CPF já está em uso: ${valor}`);
                throwDuplicateCpf(valor);
                break;
              case 'matricula':
                this.logger.warn(`Matrícula já está em uso: ${valor}`);
                throwDuplicateMatricula(valor);
                break;
            }
          }
        }
      }

      // Normalizar campos de enum antes de atualizar
      const normalizedData = normalizeEnumFields(updateUsuarioDto);

      // ------------ Transação mínima (apenas UPDATE) ------------
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);
        await usuarioRepo.update(id, normalizedData);
      });

      // ------------ Pós-transação: buscar dados atualizados ------------
      const usuarioAtualizado = await usuarioRepo.findById(id);
      if (!usuarioAtualizado) {
        throwUserNotFound(id);
      }

      this.logger.info(`Usuário ${id} atualizado com sucesso`);

      // Remover campos sensíveis
      const { senhaHash, ...usuarioSemSenha } = usuarioAtualizado;

      return {
        data: usuarioSemSenha,
        meta: null,
        message: 'Usuário atualizado com sucesso.',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar usuário ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof Error) {
        throw error;
      }
      // Re-throw para garantir que o erro seja tratado adequadamente
      throw new BadRequestException('Erro ao atualizar usuário');
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
      throwUserNotFound(id);
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
    this.logger.info(`Iniciando atualização de senha do usuário ${id}`);
    const startTime = Date.now();

    try {
      // ------------ Validações e leituras fora da transação ------------
      const usuarioRepo = this.usuarioRepository;

      // Verificar se usuário existe
      const usuario = await usuarioRepo.findById(id);
      if (!usuario) {
        this.logger.warn(`Usuário não encontrado: ${id}`);
        throwUserNotFound(id);
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
        await this.incrementLoginAttempts(id);
        throwInvalidCredentials(usuario.email);
      }

      // Verificar se a nova senha e a confirmação coincidem
      if (updateSenhaDto.novaSenha !== updateSenhaDto.confirmacaoSenha) {
        this.logger.warn(`Nova senha e confirmação não coincidem: ${id}`);
        throwPasswordMismatch();
      }

      // Verificar se a nova senha é diferente da atual
      if (updateSenhaDto.novaSenha === updateSenhaDto.senhaAtual) {
        this.logger.warn(`Nova senha igual à senha atual: ${id}`);
        throwWeakPassword(); // Note: Same password logic needs review
      }

      // Gerar hash da nova senha com maior segurança
      const senhaHash = await bcrypt.hash(
        updateSenhaDto.novaSenha,
        this.SALT_ROUNDS,
      );

      // ------------ Transação mínima (apenas UPDATE) ------------
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Usuario);
        await repo.update(id, {
          senhaHash,
          tentativas_login: 0,
          primeiro_acesso: false,
          ultimo_login: new Date(),
        });
      });

      const executionTime = Date.now() - startTime;
      if (executionTime > 1000) {
        // Alerta para operações que levam mais de 1 segundo
        this.logger.warn(
          `Atualização de senha do usuário ${id} levou ${executionTime}ms`,
        );
      }

      this.logger.info(`Senha do usuário ${id} atualizada com sucesso`);

      return {
        data: null,
        meta: null,
        message: 'Senha atualizada com sucesso',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar senha do usuário ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof Error) {
        throw error;
      }
      // Re-throw para garantir que o erro seja tratado adequadamente
      throw new BadRequestException('Erro ao atualizar senha do usuário');
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
    this.logger.info(`Buscando usuário por email: ${email}`);

    try {
      // Normalizar email para minúsculas para evitar problemas de case sensitivity
      const normalizedEmail = email.toLowerCase();
      const usuario = await this.usuarioRepository.findByEmail(normalizedEmail);

      if (!usuario) {
        this.logger.info(
          `Tentativa de login para: ${normalizedEmail}`,
          'SECURITY_LOGIN_ATTEMPT',
        );
        return null;
      }

      return usuario;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar usuário por email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca usuário por email SEM aplicar escopo (para autenticação)
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmailForAuth(email: string): Promise<Usuario | null> {
    this.logger.info(`Buscando usuário por email para autenticação: ${email}`);

    try {
      // Normalizar email para minúsculas para evitar problemas de case sensitivity
      const normalizedEmail = email.toLowerCase();
      const usuario = await this.usuarioRepository.findByEmailGlobal(normalizedEmail);

      if (!usuario) {
        this.logger.info(
          `Tentativa de login para: ${normalizedEmail}`,
          'SECURITY_LOGIN_ATTEMPT',
          { email: normalizedEmail },
        );
        return null;
      }

      return usuario;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar usuário por email para autenticação: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifica se o usuário está bloqueado por excesso de tentativas
   * @param usuario Usuário a ser verificado
   * @returns true se estiver bloqueado
   */
  private isUserLocked(usuario: Usuario): boolean {
    if (
      !usuario.tentativas_login ||
      usuario.tentativas_login < this.MAX_LOGIN_ATTEMPTS
    ) {
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
  async incrementLoginAttempts(userId: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);
        await usuarioRepo.increment({ id: userId }, 'tentativas_login', 1);
        await usuarioRepo.update(userId, {
          ultimo_login: new Date(),
        } as DeepPartial<Usuario>);
      });

      this.logger.warn(
        `Tentativa de login falhada incrementada para usuário: ${userId}`,
        'SECURITY_LOGIN_FAILED',
        { userId },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao incrementar tentativas de login: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Reseta o contador de tentativas de login
   * @param userId ID do usuário
   */
  async resetLoginAttempts(userId: string): Promise<void> {
    try {
      await this.usuarioRepository.updateStatus(userId, Status.ATIVO);
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);
        await usuarioRepo.update(userId, {
          tentativas_login: 0,
          ultimo_login: new Date(),
        } as DeepPartial<Usuario>);
      });

      this.logger.info(
        `Login bem-sucedido - tentativas resetadas para usuário: ${userId}`,
        'SECURITY_LOGIN_SUCCESS',
        { userId },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao resetar tentativas de login: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Valida credenciais de login com controle de tentativas
   * @param email Email do usuário
   * @param senha Senha do usuário
   * @returns Usuário se credenciais válidas, null caso contrário
   */
  async validateUserCredentials(
    email: string,
    senha: string,
  ): Promise<Usuario | null> {
    const usuario = await this.findByEmailForAuth(email);

    if (!usuario) {
      return null;
    }

    // Verificar se usuário está bloqueado
    if (this.isUserLocked(usuario)) {
      this.logger.warn(
        `Tentativa de login em conta bloqueada: ${usuario.id}`,
        'SECURITY_BLOCKED_LOGIN_ATTEMPT',
        {
          userId: usuario.id,
          email: usuario.email,
          attempts: usuario.tentativas_login,
        },
      );
      throwAccountBlocked(usuario.id); // Note: Using userId instead of email
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

    if (!senhaValida) {
      await this.incrementLoginAttempts(usuario.id);

      this.logger.warn(
        `Tentativa de login com senha incorreta: ${usuario.id}`,
        'SECURITY_INVALID_PASSWORD',
        {
          userId: usuario.id,
          email: usuario.email,
          attempts: (usuario.tentativas_login || 0) + 1,
        },
      );

      throwInvalidCredentials(email);
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
    this.logger.info(`Iniciando remoção do usuário: ${id}`);

    try {
      // Verifica se o usuário existe
      const usuario = await this.usuarioRepository.findById(id);
      if (!usuario) {
        this.logger.warn(`Usuário não encontrado para remoção: ${id}`);
        throwUserNotFound(id);
      }

      // Realiza o soft delete
      await this.usuarioRepository.remove(id);

      this.logger.info(`Usuário removido com sucesso: ${id}`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover usuário ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca todas as roles ativas disponíveis no sistema baseado na hierarquia do usuário
   * Cada usuário só pode ver as roles abaixo da sua na hierarquia:
   * SUPER_ADMIN > ADMIN > GESTOR > COORDENADOR
   * @param usuarioAtualClaims - Claims do usuário autenticado (do JWT)
   * @returns Lista de roles ativas filtradas pela hierarquia
   */
  async findAllRoles(usuarioAtualClaims?: any) {
    this.logger.info('Buscando todas as roles ativas com filtro de hierarquia');

    try {
      // Definir hierarquia de roles (do maior para o menor privilégio)
      const HIERARQUIA_ROLES = {
        'SUPER_ADMIN': 4,
        'ADMIN': 3,
        'GESTOR': 2,
        'COORDENADOR': 1,
        'TECNICO_SEMTAS': 1,
      };

      const ROLES_IGNORADAS = ['SUPER_ADMIN', 'AUDITOR', 'CIDADAO'];
      // Buscar todas as roles ativas
      const todasRoles = await this.roleRepository.find({
        where: { status: Status.ATIVO, nome: Not(In(ROLES_IGNORADAS)) },
        order: { nome: 'ASC' },
      });

      // Determinar o nível de hierarquia do usuário atual
      const nivelUsuario = await this.obterNivelUsuario(usuarioAtualClaims, HIERARQUIA_ROLES);

      // Filtrar roles baseado na hierarquia
      const rolesPermitidas = todasRoles.filter(role => {
        const nivelRole = HIERARQUIA_ROLES[role.nome];

        // Se a role não está na hierarquia, todos podem vê-la
        if (!nivelRole) {
          return true;
        }

        // Se o usuário não tem nível definido, pode ver apenas roles não hierárquicas
        if (nivelUsuario === null) {
          return false;
        }

        // Usuário pode ver roles abaixo da sua na hierarquia
        return nivelRole < nivelUsuario;
      });

      this.logger.info(`Encontradas ${rolesPermitidas.length} roles ativas para o usuário`);
      return rolesPermitidas;

    } catch (error) {
      this.logger.error(`Erro ao buscar roles: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Obtém o nível de hierarquia do usuário atual
   * @param usuarioAtualClaims - Claims do usuário
   * @param hierarquiaRoles - Mapa de hierarquia das roles
   * @returns Nível do usuário ou null se não aplicável
   */
  private async obterNivelUsuario(usuarioAtualClaims: any, hierarquiaRoles: Record<string, number>): Promise<number | null> {
    // Se não há usuário autenticado, retorna null
    if (!usuarioAtualClaims?.id) {
      this.logger.warn('Usuário não autenticado');
      return null;
    }

    // Buscar o usuário completo com a role
    const usuarioCompleto = await this.usuarioRepository.findByIdGlobal(usuarioAtualClaims.id);

    if (!usuarioCompleto?.role?.nome) {
      this.logger.warn(`Usuário ${usuarioAtualClaims.id} não encontrado ou sem role`);
      return null;
    }

    const roleUsuario = usuarioCompleto.role.nome;
    const nivelUsuario = hierarquiaRoles[roleUsuario];

    this.logger.info(`Usuário ${usuarioCompleto.nome} tem role: ${roleUsuario} (nível: ${nivelUsuario || 'não hierárquica'})`);

    return nivelUsuario || null;
  }

  /**
   * Altera a senha no primeiro acesso do usuário
   * @param userId ID do usuário
   * @param alterarSenhaDto Dados da nova senha
   * @returns Mensagem de sucesso
   */
  async alterarSenhaPrimeiroAcesso(
    userId: string,
    alterarSenhaDto: AlterarSenhaPrimeiroAcessoDto,
  ) {
    this.logger.info(
      `Iniciando alteração de senha no primeiro acesso para usuário ${userId}`,
    );
    const startTime = Date.now();

    try {
      // ------------ Validações e leituras fora da transação ------------
      // Verificar se as senhas coincidem (validação adicional no backend)
      if (alterarSenhaDto.nova_senha !== alterarSenhaDto.confirmar_senha) {
        this.logger.warn(`Nova senha e confirmação não coincidem: ${userId}`);
        throwPasswordMismatch();
      }

      const usuarioRepo = this.usuarioRepository;

      // Buscar usuário
      const usuario = await usuarioRepo.findById(userId);
      if (!usuario) {
        this.logger.warn(`Usuário não encontrado: ${userId}`);
        throwUserNotFound(userId);
      }

      // Verificar se está em primeiro acesso
      if (!usuario.primeiro_acesso) {
        this.logger.warn(`Usuário ${userId} não está em primeiro acesso`);
        throwNotInFirstAccess(userId);
      }

      // Gerar hash da nova senha
      const novoHash = await bcrypt.hash(
        alterarSenhaDto.nova_senha,
        this.SALT_ROUNDS,
      );

      // ------------ Transação mínima (apenas UPDATE) ------------
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Usuario);

        // Atualizar senha e marcar como não sendo mais primeiro acesso
        await repo.update(userId, {
          senhaHash: novoHash,
          primeiro_acesso: false,
          updated_at: new Date(),
        });
      });

      const executionTime = Date.now() - startTime;
      if (executionTime > 1000) {
        // Alerta para operações que levam mais de 1 segundo
        this.logger.warn(
          `Alteração de senha no primeiro acesso para usuário ${userId} levou ${executionTime}ms`,
        );
      }

      this.logger.info(
        `Senha alterada com sucesso no primeiro acesso para usuário ${userId}`,
      );

      return {
        data: null,
        meta: null,
        message:
          'Senha alterada com sucesso. Você pode agora acessar o sistema normalmente.',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao alterar senha no primeiro acesso para usuário ${userId}: ${error.message}`,
        error.stack,
      );
      if (error instanceof Error) {
        throw error;
      }
      // Re-throw para garantir que o erro seja tratado adequadamente
      throw new BadRequestException('Erro ao alterar senha no primeiro acesso');
    }
  }

  /**
   * Reenvia credenciais de acesso para um usuário
   * Gera nova senha, atualiza no banco e envia por email
   * @param userId ID do usuário
   * @returns Resultado da operação
   */
  async reenviarCredenciais(userId: string) {
    this.logger.info(
      `Iniciando reenvio de credenciais para usuário: ${userId}`,
    );
    const startTime = Date.now();

    try {
      // ------------ Validações e leituras fora da transação ------------
      // Buscar usuário pelo ID (versão completa para uso interno)
      const usuario = await this.usuarioRepository.findById(userId);

      if (!usuario) {
        this.logger.warn(`Usuário não encontrado: ${userId}`);
        throwUserNotFound(userId);
      }

      // Verificar se usuário está ativo
      if (usuario.status !== Status.ATIVO) {
        this.logger.warn(
          `Tentativa de reenvio de credenciais para usuário inativo: ${userId}`,
        );
        throw new BadRequestException(
          'Usuário deve estar ativo para reenvio de credenciais',
        );
      }

      // Gerar nova senha
      const novaSenha = this.generateRandomPassword();
      const senhaHash = await bcrypt.hash(novaSenha, this.SALT_ROUNDS);

      // ------------ Transação mínima (apenas UPDATE) ------------
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);

        // Atualizar senha e marcar como primeiro acesso
        await usuarioRepo.update(userId, {
          senhaHash,
          primeiro_acesso: true,
          tentativas_login: 0,
          updated_at: new Date(),
        });
      });

      // ------------ Pós-transação: envio de email ------------
      // Enviar credenciais por email
      await this.enviarCredenciaisPorEmail(usuario, novaSenha);

      const executionTime = Date.now() - startTime;
      if (executionTime > 1000) {
        // Alerta para operações que levam mais de 1 segundo
        this.logger.warn(
          `Reenvio de credenciais para usuário ${userId} levou ${executionTime}ms`,
        );
      }

      this.logger.info(
        `Credenciais reenviadas com sucesso para usuário: ${userId}`,
      );

      return {
        data: null,
        meta: null,
        message:
          'Credenciais reenviadas com sucesso. O usuário receberá um email com as novas credenciais.',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao reenviar credenciais para usuário ${userId}: ${error.message}`,
        error.stack,
      );
      if (error instanceof Error) {
        throw error;
      }
      // Re-throw para garantir que o erro seja tratado adequadamente
      throw new BadRequestException('Erro ao reenviar credenciais');
    }
  }

  /**
   * Solicita recuperação de senha
   * @param email Email do usuário
   * @returns Resultado da operação
   */
  async solicitarRecuperacaoSenha(email: string) {
    this.logger.info(`Iniciando recuperação de senha para email: ${email}`);
    const startTime = Date.now();

    try {
      // ------------ Validações e leituras fora da transação ------------
      // Normalizar email
      const normalizedEmail = email.toLowerCase();

      // Buscar usuário pelo email - usando método sem escopo para recuperação de senha
      const usuario = await this.findByEmailForAuth(normalizedEmail);

      if (!usuario) {
        // Por segurança, não revelar se o email existe ou não
        this.logger.warn(
          `Tentativa de recuperação de senha para email inexistente: ${normalizedEmail}`,
        );
        return {
          data: null,
          meta: null,
          message:
            'Se o email estiver cadastrado, você receberá instruções para recuperação de senha.',
        };
      }

      // Verificar se usuário está ativo
      if (usuario.status !== Status.ATIVO) {
        this.logger.warn(
          `Tentativa de recuperação de senha para usuário inativo: ${usuario.id}`,
        );
        return {
          data: null,
          meta: null,
          message:
            'Se o email estiver cadastrado, você receberá instruções para recuperação de senha.',
        };
      }

      // Gerar nova senha temporária
      const senhaTemporaria = this.generateRandomPassword();
      const senhaHash = await bcrypt.hash(senhaTemporaria, this.SALT_ROUNDS);

      // ------------ Transação mínima (apenas UPDATE) ------------
      await this.dataSource.transaction(async (manager) => {
        const usuarioRepo = manager.getRepository(Usuario);

        // Atualizar senha e marcar como primeiro acesso
        await usuarioRepo.update(usuario.id, {
          senhaHash,
          primeiro_acesso: true,
          tentativas_login: 0,
          updated_at: new Date(),
        });
      });

      // ------------ Pós-transação: eventos e notificações ------------
      // Situação 3: Recuperação de senha
      this.eventEmitter.emit('user.password.reset', {
        userId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        senhaTemporaria,
        timestamp: new Date(),
      });

      const executionTime = Date.now() - startTime;
      if (executionTime > 1000) {
        // Alerta para operações que levam mais de 1 segundo
        this.logger.warn(
          `Recuperação de senha para usuário ${usuario.id} levou ${executionTime}ms`,
        );
      }

      this.logger.info(
        `Recuperação de senha processada com sucesso para usuário: ${usuario.id}`,
      );

      return {
        data: null,
        meta: null,
        message:
          'Se o email estiver cadastrado, você receberá instruções para recuperação de senha.',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao processar recuperação de senha: ${error.message}`,
        error.stack,
      );

      // Por segurança, retornar sempre a mesma mensagem
      return {
        data: null,
        meta: null,
        message:
          'Se o email estiver cadastrado, você receberá instruções para recuperação de senha.',
      };
    }
  }

  /**
   * Busca usuários por permissões específicas
   * @param permissoes Lista de permissões para filtrar
   * @returns Lista de usuários com as permissões especificadas
   */
  async buscarPorPermissao(
    permissoes: string[],
  ): Promise<Array<{ id: string; nome: string; email: string }>> {
    try {
      const usuarios = await this.dataSource
        .createQueryBuilder(Usuario, 'usuario')
        .innerJoin('usuario.role', 'role')
        .innerJoin('role.permissoes', 'permissao')
        .where('permissao.nome IN (:...permissoes)', { permissoes })
        .andWhere('usuario.status = :status', { status: Status.ATIVO })
        .select(['usuario.id', 'usuario.nome', 'usuario.email'])
        .getMany();

      return usuarios.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar usuários por permissão', error.stack);
      return [];
    }
  }

  /**
   * Busca usuários por setores específicos
   * @param setores Lista de setores para filtrar
   * @returns Lista de usuários dos setores especificados
   */
  async buscarPorSetor(
    setores: string[],
  ): Promise<Array<{ id: string; nome: string; email: string }>> {
    try {
      const usuarios = await this.dataSource
        .createQueryBuilder(Usuario, 'usuario')
        .innerJoin('usuario.setor', 'setor')
        .where('setor.nome IN (:...setores)', { setores })
        .andWhere('usuario.status = :status', { status: Status.ATIVO })
        .select(['usuario.id', 'usuario.nome', 'usuario.email'])
        .getMany();

      return usuarios.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar usuários por setor', error.stack);
      return [];
    }
  }

  /**
   * Busca todos os usuários ativos do sistema
   * @returns Lista de todos os usuários ativos
   */
  async buscarTodosAtivos(): Promise<
    Array<{ id: string; nome: string; email: string }>
  > {
    try {
      const usuarios = await this.dataSource
        .createQueryBuilder(Usuario, 'usuario')
        .where('usuario.status = :status', { status: Status.ATIVO })
        .select(['usuario.id', 'usuario.nome', 'usuario.email'])
        .getMany();

      return usuarios.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar todos os usuários ativos', error.stack);
      return [];
    }
  }
}
