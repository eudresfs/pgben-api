import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { IntegradorToken, TokenRevogado } from '../../../entities';
import { CreateTokenDto } from '../dto/create-token.dto';
import { TokenResponseDto } from '../dto/token-response.dto';
import { IntegradorService } from './integrador.service';

/**
 * Serviço responsável pelo gerenciamento de tokens de acesso para integradores.
 * Implementa funcionalidades de geração, validação, revogação e consulta de tokens.
 */
@Injectable()
export class IntegradorTokenService {
  constructor(
    @InjectRepository(IntegradorToken)
    private tokenRepository: Repository<IntegradorToken>,
    
    @InjectRepository(TokenRevogado)
    private tokenRevogadoRepository: Repository<TokenRevogado>,
    
    private integradorService: IntegradorService,
    private jwtService: JwtService,
  ) {}

  /**
   * Gera um hash seguro de um token.
   * @param token Token a ser convertido em hash
   * @returns Hash do token
   */
  private generateTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cria um novo token para um integrador.
   * @param integradorId ID do integrador
   * @param createTokenDto Dados para criação do token
   * @returns Token gerado e informações associadas
   */
  async createToken(
    integradorId: string, 
    createTokenDto: CreateTokenDto
  ): Promise<{ token: string; tokenInfo: TokenResponseDto }> {
    // Verificar se o integrador existe e está ativo
    const integrador = await this.integradorService.findById(integradorId);
    
    if (!integrador.ativo) {
      throw new BadRequestException('Não é possível criar token para um integrador inativo');
    }

    // Validar escopos solicitados
    if (createTokenDto.escopos && createTokenDto.escopos.length > 0) {
      // Se o integrador tem permissões definidas, verificar se todos os escopos solicitados são permitidos
      if (integrador.permissoesEscopo && integrador.permissoesEscopo.length > 0) {
        const escoposNaoPermitidos = createTokenDto.escopos.filter(
          escopo => !integrador.permissoesEscopo.includes(escopo)
        );
        
        if (escoposNaoPermitidos.length > 0) {
          throw new BadRequestException(
            `Escopos não permitidos para este integrador: ${escoposNaoPermitidos.join(', ')}`
          );
        }
      }
    }

    // Configurar expiração (se aplicável)
    let dataExpiracao: Date | null = null;
    let expiresIn: string | undefined = undefined;
    
    if (!createTokenDto.semExpiracao && createTokenDto.diasValidade) {
      dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + createTokenDto.diasValidade);
      expiresIn = `${createTokenDto.diasValidade}d`;
    }

    // Criar payload do JWT
    const payload = {
      sub: `integrador:${integradorId}`,
      name: integrador.nome,
      type: 'api_token',
      scopes: createTokenDto.escopos || [],
    };

    // Gerar o token JWT
    const tokenOptions: any = {};
    if (expiresIn) {
      tokenOptions.expiresIn = expiresIn;
    }
    
    const token = this.jwtService.sign(payload, tokenOptions);
    const tokenHash = this.generateTokenHash(token);

    // Criar registro do token no banco
    const tokenEntity = this.tokenRepository.create({
      integrador: { id: integradorId }, // Usando o relacionamento
      nome: createTokenDto.nome,
      descricao: createTokenDto.descricao,
      tokenHash,
      escopos: createTokenDto.escopos,
      dataExpiracao: dataExpiracao || undefined // Garante que seja undefined se for null
    });

    const savedToken = await this.tokenRepository.save(tokenEntity);
    
    return {
      token, // O token JWT completo - só será exposto uma vez
      tokenInfo: new TokenResponseDto(savedToken)
    };
  }

  /**
   * Obtém todos os tokens associados a um integrador.
   * @param integradorId ID do integrador
   * @returns Lista de tokens
   */
  async findAllByIntegrador(integradorId: string): Promise<TokenResponseDto[]> {
    // Verificar se o integrador existe
    await this.integradorService.findById(integradorId);
    
    const tokens = await this.tokenRepository.find({ 
      where: { integradorId },
      order: { dataCriacao: 'DESC' }
    });
    
    return tokens.map(token => new TokenResponseDto(token));
  }

  /**
   * Obtém informações de um token específico.
   * @param id ID do token
   * @returns Informações do token
   */
  async findOne(id: string): Promise<TokenResponseDto> {
    const token = await this.tokenRepository.findOne({ where: { id } });
    
    if (!token) {
      throw new NotFoundException(`Token com ID ${id} não encontrado`);
    }
    
    return new TokenResponseDto(token);
  }

  /**
   * Revoga um token.
   * @param id ID do token
   * @param motivo Motivo da revogação
   * @returns Informações do token revogado
   */
  async revogarToken(id: string, motivo: string): Promise<TokenResponseDto> {
    const token = await this.tokenRepository.findOne({ where: { id } });
    
    if (!token) {
      throw new NotFoundException(`Token com ID ${id} não encontrado`);
    }
    
    if (token.revogado) {
      throw new BadRequestException('Token já está revogado');
    }

    // Atualizar o registro do token
    token.revogado = true;
    token.dataRevogacao = new Date();
    token.motivoRevogacao = motivo;
    
    const updatedToken = await this.tokenRepository.save(token);

    // Adicionar à lista de tokens revogados para validação rápida
    const tokenRevogado = this.tokenRevogadoRepository.create({
      tokenHash: token.tokenHash,
      integradorId: token.integradorId,
      motivoRevogacao: motivo,
      dataExpiracao: token.dataExpiracao,
      // Configura a data para remoção do registro da lista de revogados
      // (para depois da expiração natural, ou um período padrão se não expirar)
      dataLimpeza: token.dataExpiracao || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90) // 90 dias se não tiver expiração
    });
    
    await this.tokenRevogadoRepository.save(tokenRevogado);
    
    return new TokenResponseDto(updatedToken);
  }

  /**
   * Valida um token e retorna suas informações.
   * @param token Token JWT a ser validado
   * @returns Payload decodificado se válido
   * @throws UnauthorizedException se o token for inválido
   */
  async validateToken(token: string): Promise<any> {
    try {
      // Verificar assinatura do token
      const payload = this.jwtService.verify(token);
      
      // Verificar tipo de token
      if (payload.type !== 'api_token') {
        throw new UnauthorizedException('Tipo de token inválido');
      }
      
      // Extrair ID do integrador do subject
      const subParts = payload.sub.split(':');
      if (subParts.length !== 2 || subParts[0] !== 'integrador') {
        throw new UnauthorizedException('Formato de token inválido');
      }
      
      const integradorId = subParts[1];
      
      // Verificar se o token foi revogado
      const tokenHash = this.generateTokenHash(token);
      const tokenRevogado = await this.tokenRevogadoRepository.findOne({
        where: { tokenHash }
      });
      
      if (tokenRevogado) {
        throw new UnauthorizedException('Token revogado');
      }
      
      // Verificar se o integrador existe e está ativo
      const integrador = await this.integradorService.findById(integradorId);
      if (!integrador.ativo) {
        throw new UnauthorizedException('Integrador desativado');
      }
      
      // Registrar o último acesso
      await this.integradorService.registrarAcesso(integradorId);
      
      // Buscar o token no banco para atualizar último uso
      const tokenInfo = await this.tokenRepository.findOne({
        where: { tokenHash }
      });
      
      if (tokenInfo) {
        tokenInfo.ultimoUso = new Date();
        await this.tokenRepository.save(tokenInfo);
      }
      
      // Adicionar integrador ao payload para uso posterior
      return {
        ...payload,
        integrador
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido: ' + (error.message || 'erro desconhecido'));
    }
  }

  /**
   * Verifica se um token tem as permissões necessárias.
   * @param payload Payload do token já validado
   * @param requiredScopes Escopos requeridos
   * @returns True se o token tiver todos os escopos necessários
   */
  hasRequiredScopes(payload: any, requiredScopes: string[]): boolean {
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }
    
    if (!payload.scopes || payload.scopes.length === 0) {
      return false;
    }
    
    // Verificar se o token possui todos os escopos necessários
    return requiredScopes.every(requiredScope => 
      payload.scopes.includes(requiredScope)
    );
  }

  /**
   * Verifica se um acesso está permitido por restrição de IP.
   * @param integrador Objeto do integrador
   * @param ipAddress Endereço IP de origem da requisição
   * @returns True se o acesso for permitido
   */
  isIpAllowed(integrador: any, ipAddress: string): boolean {
    // Se não houver restrições de IP, permitir acesso
    if (!integrador.ipPermitidos || integrador.ipPermitidos.length === 0) {
      return true;
    }
    
    // Verificar se o IP está na lista de permitidos
    return integrador.ipPermitidos.includes(ipAddress);
  }

  /**
   * Limpa tokens revogados antigos da lista de revogação.
   * Esta função pode ser executada periodicamente para manter a tabela otimizada.
   */
  async limparTokensRevogadosExpirados(): Promise<number> {
    const result = await this.tokenRevogadoRepository
      .createQueryBuilder()
      .delete()
      .from(TokenRevogado)
      .where('dataLimpeza < :now', { now: new Date() })
      .execute();
      
    return result.affected || 0;
  }
}
