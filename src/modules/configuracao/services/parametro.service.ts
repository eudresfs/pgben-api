import { Injectable, Logger } from '@nestjs/common';
import { ParametroRepository } from '../repositories/parametro.repository';
import { Parametro } from '../entities/parametro.entity';
import { ParametroCreateDto } from '../dtos/parametro/parametro-create.dto';
import { ParametroUpdateDto } from '../dtos/parametro/parametro-update.dto';
import { ParametroResponseDto } from '../dtos/parametro/parametro-response.dto';
import { ParametroNaoEncontradoException } from '../exceptions/parametro-nao-encontrado.exception';
import { ParametroTipoInvalidoException } from '../exceptions/parametro-tipo-invalido.exception';
import { ParametroTipoEnum } from '../enums/parametro-tipo.enum';
import { ParametroConverter } from '../util/converters';

/**
 * Serviço para gerenciamento de parâmetros do sistema
 * 
 * Responsável por:
 * - Operações CRUD para parâmetros
 * - Sistema de cache para otimização
 * - Conversão de tipos dinâmica
 * - Validação de parâmetros
 */
@Injectable()
export class ParametroService {
  private readonly logger = new Logger(ParametroService.name);
  
  // Cache em memória para parâmetros (chave -> valor)
  private cache: Map<string, { valor: any; expiraEm: number }> = new Map();
  
  // Tempo padrão de expiração do cache em milissegundos (5 minutos)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(private readonly parametroRepository: ParametroRepository) {}

  /**
   * Limpa todo o cache de parâmetros
   */
  limparCache(): void {
    this.cache.clear();
    this.logger.log('Cache de parâmetros limpo');
  }

  /**
   * Remove um item específico do cache
   * @param chave Chave do parâmetro a ser removido do cache
   */
  invalidarCache(chave: string): void {
    this.cache.delete(chave);
    this.logger.debug(`Cache para parâmetro '${chave}' invalidado`);
  }

  /**
   * Busca todos os parâmetros, convertendo-os para DTOs de resposta
   * @param categoria Categoria opcional para filtrar
   * @returns Lista de DTOs de resposta de parâmetros
   */
  async buscarTodos(categoria?: string): Promise<ParametroResponseDto[]> {
    const parametros = await this.parametroRepository.findAll(categoria);
    return parametros.map(p => this.mapearParaDto(p));
  }

  /**
   * Busca um parâmetro por sua chave
   * @param chave Chave do parâmetro
   * @returns DTO de resposta do parâmetro
   * @throws ParametroNaoEncontradoException se o parâmetro não existir
   */
  async buscarPorChave(chave: string): Promise<ParametroResponseDto> {
    const parametro = await this.parametroRepository.findByChave(chave);
    if (!parametro) {
      throw new ParametroNaoEncontradoException(chave);
    }
    return this.mapearParaDto(parametro);
  }

  /**
   * Cria um novo parâmetro
   * @param dto DTO com dados para criação
   * @returns DTO de resposta do parâmetro criado
   */
  async criar(dto: ParametroCreateDto): Promise<ParametroResponseDto> {
    // Verificar se já existe parâmetro com mesma chave
    const existente = await this.parametroRepository.existsByChave(dto.chave);
    if (existente) {
      throw new Error(`Parâmetro com chave '${dto.chave}' já existe`);
    }

    // Converter valor para string antes de salvar
    const valorString = ParametroConverter.paraString(dto.valor, dto.tipo);

    const parametro = new Parametro();
    parametro.chave = dto.chave;
    parametro.descricao = dto.descricao;
    parametro.tipo = dto.tipo;
    parametro.valor = valorString;
    parametro.categoria = dto.categoria;
    // Escopo e editável não estão presentes na entidade Parametro ainda

    const salvo = await this.parametroRepository.save(parametro);
    return this.mapearParaDto(salvo);
  }

  /**
   * Atualiza um parâmetro existente
   * @param chave Chave do parâmetro
   * @param dto DTO com dados para atualização
   * @returns DTO de resposta do parâmetro atualizado
   * @throws ParametroNaoEncontradoException se o parâmetro não existir
   */
  async atualizar(chave: string, dto: ParametroUpdateDto): Promise<ParametroResponseDto> {
    const parametro = await this.parametroRepository.findByChave(chave);
    if (!parametro) {
      throw new ParametroNaoEncontradoException(chave);
    }

    // Verificar se o parâmetro é editável (implementação futura)
    const editavel = true; // Placeholder para implementação futura
    if (!editavel) {
      throw new Error(`Parâmetro '${chave}' não é editável`);
    }

    // Converter valor para string antes de salvar (se fornecido)
    if (dto.valor !== undefined) {
      parametro.valor = ParametroConverter.paraString(dto.valor, parametro.tipo);
    }

    if (dto.descricao !== undefined) {
      parametro.descricao = dto.descricao;
    }

    if (dto.categoria !== undefined) {
      parametro.categoria = dto.categoria;
    }

    // Escopo será implementado posteriormente
    // if (dto.escopo !== undefined) {
    //   parametro.escopo = dto.escopo;
    // }

    const salvo = await this.parametroRepository.save(parametro);
    
    // Invalidar cache para este parâmetro
    this.invalidarCache(chave);
    
    return this.mapearParaDto(salvo);
  }

  /**
   * Remove um parâmetro
   * @param chave Chave do parâmetro
   * @throws ParametroNaoEncontradoException se o parâmetro não existir
   */
  async remover(chave: string): Promise<void> {
    const parametro = await this.parametroRepository.findByChave(chave);
    if (!parametro) {
      throw new ParametroNaoEncontradoException(chave);
    }

    // Verificar se o parâmetro é editável (implementação futura)
    const editavel = true; // Placeholder para implementação futura
    if (!editavel) {
      throw new Error(`Parâmetro '${chave}' não pode ser removido pois não é editável`);
    }

    await this.parametroRepository.remove(parametro.id as unknown as number);
    
    // Invalidar cache para este parâmetro
    this.invalidarCache(chave);
    
    this.logger.log(`Parâmetro '${chave}' removido`);
  }

  /**
   * Busca o valor tipado de um parâmetro
   * @param chave Chave do parâmetro
   * @param padrao Valor padrão opcional caso o parâmetro não exista
   * @returns Valor do parâmetro com tipo correto
   */
  async obterValor<T>(chave: string, padrao?: T): Promise<T> {
    try {
      // Verificar se está no cache
      const cacheItem = this.cache.get(chave);
      if (cacheItem && cacheItem.expiraEm > Date.now()) {
        return cacheItem.valor as T;
      }

      const parametro = await this.parametroRepository.findByChave(chave);
      if (!parametro) {
        if (padrao !== undefined) {
          return padrao;
        }
        throw new ParametroNaoEncontradoException(chave);
      }

      // Converter para o tipo correto
      const valorConvertido = ParametroConverter.paraValorTipado(chave, parametro.valor, parametro.tipo);
      
      // Armazenar no cache
      this.cache.set(chave, {
        valor: valorConvertido,
        expiraEm: Date.now() + this.CACHE_TTL
      });
      
      return valorConvertido as T;
    } catch (error) {
      if (error instanceof ParametroNaoEncontradoException && padrao !== undefined) {
        return padrao;
      }
      throw error;
    }
  }

  /**
   * Busca um valor booleano
   * @param chave Chave do parâmetro
   * @param padrao Valor padrão opcional
   * @returns Valor booleano
   */
  async obterBooleano(chave: string, padrao?: boolean): Promise<boolean> {
    const valor = await this.obterValor<any>(chave, padrao);
    if (typeof valor === 'boolean') {
      return valor;
    }
    throw new ParametroTipoInvalidoException(chave, valor, ParametroTipoEnum.BOOLEAN);
  }

  /**
   * Busca um valor numérico
   * @param chave Chave do parâmetro
   * @param padrao Valor padrão opcional
   * @returns Valor numérico
   */
  async obterNumero(chave: string, padrao?: number): Promise<number> {
    const valor = await this.obterValor<any>(chave, padrao);
    if (typeof valor === 'number') {
      return valor;
    }
    throw new ParametroTipoInvalidoException(chave, valor, ParametroTipoEnum.NUMBER);
  }

  /**
   * Busca um valor string
   * @param chave Chave do parâmetro
   * @param padrao Valor padrão opcional
   * @returns Valor string
   */
  async obterTexto(chave: string, padrao?: string): Promise<string> {
    const valor = await this.obterValor<any>(chave, padrao);
    if (typeof valor === 'string') {
      return valor;
    }
    throw new ParametroTipoInvalidoException(chave, valor, ParametroTipoEnum.STRING);
  }

  /**
   * Busca um valor data
   * @param chave Chave do parâmetro
   * @param padrao Valor padrão opcional
   * @returns Valor data
   */
  async obterData(chave: string, padrao?: Date): Promise<Date> {
    const valor = await this.obterValor<any>(chave, padrao);
    if (valor instanceof Date) {
      return valor;
    }
    throw new ParametroTipoInvalidoException(chave, valor, ParametroTipoEnum.DATE);
  }

  /**
   * Busca um valor JSON
   * @param chave Chave do parâmetro
   * @param padrao Valor padrão opcional
   * @returns Valor JSON (objeto ou array)
   */
  async obterJson<T = any>(chave: string, padrao?: T): Promise<T> {
    const valor = await this.obterValor<any>(chave, padrao);
    if (typeof valor === 'object') {
      return valor as T;
    }
    throw new ParametroTipoInvalidoException(chave, valor, ParametroTipoEnum.JSON);
  }

  /**
   * Define um tempo personalizado para expiração do cache
   * @param ttlMs Tempo de vida em milissegundos
   */
  definirTempoCacheMs(ttlMs: number): void {
    if (ttlMs <= 0) {
      throw new Error('Tempo de cache deve ser maior que zero');
    }
    this.logger.log(`Tempo de cache alterado para ${ttlMs}ms`);
  }

  /**
   * Converte uma entidade Parametro para um DTO de resposta
   * @param parametro Entidade a ser convertida
   * @returns DTO de resposta
   */
  private mapearParaDto(parametro: Parametro): ParametroResponseDto {
    const dto = new ParametroResponseDto();
    dto.chave = parametro.chave;
    dto.descricao = parametro.descricao;
    dto.tipo = parametro.tipo;
    dto.valor = ParametroConverter.paraValorTipado(parametro.chave, parametro.valor, parametro.tipo);
    dto.valor_formatado = ParametroConverter.formatarParaExibicao(dto.valor, parametro.tipo);
    dto.categoria = parametro.categoria;
    // Escopo e editável serão implementados posteriormente
    // dto.escopo = parametro.escopo;
    // dto.editavel = parametro.editavel;
    dto.created_at = parametro.created_at;
    dto.updated_at = parametro.updated_at;
    return dto;
  }
}
