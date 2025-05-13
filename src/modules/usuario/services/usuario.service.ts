import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

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
    unidadeId?: string;
  }) {
    const { page = 1, limit = 10, search, role, status, unidadeId } = options || {};
    
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
    
    if (unidadeId) {
      where.unidadeId = unidadeId;
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
    const usuariosSemSenha = usuarios.map(usuario => {
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
    // Verificar se email já existe
    const emailExistente = await this.usuarioRepository.findByEmail(createUsuarioDto.email);
    if (emailExistente) {
      throw new ConflictException('Email já está em uso');
    }
    
    // Verificar se CPF já existe (se fornecido)
    if (createUsuarioDto.cpf) {
      const cpfExistente = await this.usuarioRepository.findByCpf(createUsuarioDto.cpf);
      if (cpfExistente) {
        throw new ConflictException('CPF já está em uso');
      }
    }
    
    // Verificar se matrícula já existe (se fornecida)
    if (createUsuarioDto.matricula) {
      const matriculaExistente = await this.usuarioRepository.findByMatricula(createUsuarioDto.matricula);
      if (matriculaExistente) {
        throw new ConflictException('Matrícula já está em uso');
      }
    }
    
    // Gerar hash da senha
    const senhaHash = await bcrypt.hash(createUsuarioDto.senha, 10);
    
    // Criar usuário
    const usuario = await this.usuarioRepository.create({
      nome: createUsuarioDto.nome,
      email: createUsuarioDto.email,
      senhaHash,
      cpf: createUsuarioDto.cpf,
      telefone: createUsuarioDto.telefone,
      matricula: createUsuarioDto.matricula,
      role: createUsuarioDto.role,
      unidadeId: createUsuarioDto.unidadeId,
      setorId: createUsuarioDto.setorId,
      primeiroAcesso: true,
    });
    
    // Remover campos sensíveis
    const { senhaHash: _, ...usuarioSemSenha } = usuario;
    
    return usuarioSemSenha;
  }

  /**
   * Atualiza um usuário existente
   * @param id ID do usuário
   * @param updateUsuarioDto Dados a serem atualizados
   * @returns Usuário atualizado
   */
  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    // Verificar se usuário existe
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    
    // Verificar se email já existe (se fornecido)
    if (updateUsuarioDto.email && updateUsuarioDto.email !== usuario.email) {
      const emailExistente = await this.usuarioRepository.findByEmail(updateUsuarioDto.email);
      if (emailExistente) {
        throw new ConflictException('Email já está em uso');
      }
    }
    
    // Verificar se CPF já existe (se fornecido)
    if (updateUsuarioDto.cpf && updateUsuarioDto.cpf !== usuario.cpf) {
      const cpfExistente = await this.usuarioRepository.findByCpf(updateUsuarioDto.cpf);
      if (cpfExistente) {
        throw new ConflictException('CPF já está em uso');
      }
    }
    
    // Verificar se matrícula já existe (se fornecida)
    if (updateUsuarioDto.matricula && updateUsuarioDto.matricula !== usuario.matricula) {
      const matriculaExistente = await this.usuarioRepository.findByMatricula(updateUsuarioDto.matricula);
      if (matriculaExistente) {
        throw new ConflictException('Matrícula já está em uso');
      }
    }
    
    // Atualizar usuário
    const usuarioAtualizado = await this.usuarioRepository.update(id, updateUsuarioDto);
    
    // Remover campos sensíveis
    const { senhaHash, ...usuarioSemSenha } = usuarioAtualizado;
    
    return usuarioSemSenha;
  }

  /**
   * Atualiza o status de um usuário
   * @param id ID do usuário
   * @param updateStatusUsuarioDto Novo status
   * @returns Usuário atualizado
   */
  async updateStatus(id: string, updateStatusUsuarioDto: UpdateStatusUsuarioDto) {
    // Verificar se usuário existe
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    
    // Atualizar status
    const usuarioAtualizado = await this.usuarioRepository.updateStatus(id, updateStatusUsuarioDto.status);
    
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
    // Verificar se usuário existe
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    
    // Verificar se a senha atual está correta
    const senhaCorreta = await bcrypt.compare(updateSenhaDto.senhaAtual, usuario.senhaHash);
    if (!senhaCorreta) {
      throw new BadRequestException('Senha atual incorreta');
    }
    
    // Verificar se a nova senha e a confirmação coincidem
    if (updateSenhaDto.novaSenha !== updateSenhaDto.confirmacaoSenha) {
      throw new BadRequestException('Nova senha e confirmação não coincidem');
    }
    
    // Gerar hash da nova senha
    const senhaHash = await bcrypt.hash(updateSenhaDto.novaSenha, 10);
    
    // Atualizar senha
    await this.usuarioRepository.updateSenha(id, senhaHash);
    
    return { message: 'Senha atualizada com sucesso' };
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
    return this.usuarioRepository.findByEmail(email);
  }
}
