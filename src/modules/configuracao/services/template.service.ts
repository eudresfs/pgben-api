import { Injectable, Logger } from '@nestjs/common';
import { TemplateRepository } from '../repositories/template.repository';
import { Template } from '../../../entities/template.entity';
import { TemplateCreateDto } from '../dtos/template/template-create.dto';
import { TemplateUpdateDto } from '../dtos/template/template-update.dto';
import { TemplateResponseDto } from '../dtos/template/template-response.dto';
import { TemplateTestDto } from '../dtos/template/template-test.dto';
import { TemplateInvalidoException } from '../exceptions/template-invalido.exception';
import { TemplateEngine } from '../util/template-engine';
import { TemplateTipoEnum } from '../../../enums/template-tipo.enum';

/**
 * Serviço para gerenciamento de templates do sistema
 *
 * Responsável por:
 * - Operações CRUD para templates
 * - Renderização de templates
 * - Sanitização de dados
 * - Validação de templates
 */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateEngine: TemplateEngine;

  constructor(private readonly templateRepository: TemplateRepository) {
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Busca todos os templates, convertendo-os para DTOs de resposta
   * @param tipo Tipo opcional para filtrar
   * @returns Lista de DTOs de resposta de templates
   */
  async buscarTodos(tipo?: TemplateTipoEnum): Promise<TemplateResponseDto[]> {
    const templates = await this.templateRepository.findAll(tipo);
    return templates.map((t) => this.mapearParaDto(t));
  }

  /**
   * Busca um template por seu código
   * @param codigo Código do template
   * @returns DTO de resposta do template
   * @throws Error se o template não existir
   */
  async buscarPorCodigo(codigo: string): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findByCodigo(codigo);
    if (!template) {
      throw new Error(`Template com código '${codigo}' não encontrado`);
    }
    return this.mapearParaDto(template);
  }

  /**
   * Cria um novo template
   * @param dto DTO com dados para criação
   * @returns DTO de resposta do template criado
   */
  async criar(dto: TemplateCreateDto): Promise<TemplateResponseDto> {
    // Verificar se já existe template com mesmo código
    const existente = await this.templateRepository.existsByCodigo(dto.codigo);
    if (existente) {
      throw new Error(`Template com código '${dto.codigo}' já existe`);
    }

    // Validar se o conteúdo do template é válido
    try {
      this.templateEngine.compile(dto.conteudo);
    } catch (error) {
      throw new TemplateInvalidoException(
        dto.codigo,
        `Template inválido: ${error.message}`,
      );
    }

    const template = new Template();
    template.codigo = dto.codigo;
    template.nome = dto.nome;
    // A propriedade descricao não existe na entidade Template
    template.tipo = dto.tipo;
    template.conteudo = dto.conteudo;
    template.ativo = true;

    const salvo = await this.templateRepository.save(template);
    return this.mapearParaDto(salvo);
  }

  /**
   * Atualiza um template existente
   * @param codigo Código do template
   * @param dto DTO com dados para atualização
   * @returns DTO de resposta do template atualizado
   * @throws Error se o template não existir
   */
  async atualizar(
    codigo: string,
    dto: TemplateUpdateDto,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findByCodigo(codigo);
    if (!template) {
      throw new Error(`Template com código '${codigo}' não encontrado`);
    }

    // Validar se o conteúdo do template é válido (se fornecido)
    if (dto.conteudo) {
      try {
        this.templateEngine.compile(dto.conteudo);
      } catch (error) {
        throw new TemplateInvalidoException(
          codigo,
          `Template inválido: ${error.message}`,
        );
      }
      template.conteudo = dto.conteudo;
    }

    if (dto.nome !== undefined) {
      template.nome = dto.nome;
    }

    // A propriedade descricao não existe no DTO nem na entidade Template

    if (dto.ativo !== undefined) {
      template.ativo = dto.ativo;
    }

    const salvo = await this.templateRepository.save(template);
    return this.mapearParaDto(salvo);
  }

  /**
   * Remove um template
   * @param codigo Código do template
   * @throws Error se o template não existir
   */
  async remover(codigo: string): Promise<void> {
    const template = await this.templateRepository.findByCodigo(codigo);
    if (!template) {
      throw new Error(`Template com código '${codigo}' não encontrado`);
    }

    await this.templateRepository.remove(template.id as unknown as number);
    this.logger.log(`Template '${codigo}' removido`);
  }

  /**
   * Testa a renderização de um template com dados de exemplo
   * @param dto DTO com dados para teste
   * @returns String renderizada
   * @throws TemplateInvalidoException se ocorrer erro na renderização
   */
  async testar(dto: TemplateTestDto): Promise<{ conteudo: string }> {
    let template: Template | null = null;

    // Se for um código, busca o template existente
    if (dto.codigo) {
      template = await this.templateRepository.findByCodigo(dto.codigo);
      if (!template && !dto.conteudo) {
        throw new Error(`Template com código '${dto.codigo}' não encontrado`);
      }
    }

    // Se não encontrou o template pelo código ou não foi fornecido código, usa o conteúdo direto
    if (!template && dto.conteudo) {
      const tempTemplate = new Template();
      tempTemplate.conteudo = dto.conteudo;
      tempTemplate.tipo = dto.tipo || TemplateTipoEnum.EMAIL;
      tempTemplate.codigo = 'temp-' + Date.now();
      tempTemplate.nome = 'Template Temporário';
      tempTemplate.ativo = true;
      template = tempTemplate;
    }

    if (!template) {
      throw new Error(
        'É necessário fornecer o código ou o conteúdo do template',
      );
    }

    try {
      const conteudoRenderizado = await this.templateEngine.render(
        template.conteudo,
        dto.dados || {},
        { sanitize: true },
      );

      return { conteudo: conteudoRenderizado };
    } catch (error) {
      throw new TemplateInvalidoException(
        dto.codigo || 'unknown',
        `Erro ao renderizar template: ${error.message}`,
      );
    }
  }

  /**
   * Renderiza um template com dados reais
   * @param codigo Código do template
   * @param dados Dados para renderização
   * @param opcoes Opções adicionais de renderização
   * @returns String renderizada
   * @throws Error se o template não existir
   * @throws TemplateInvalidoException se ocorrer erro na renderização
   */
  async renderizar(
    codigo: string,
    dados: Record<string, any>,
    opcoes: { sanitize?: boolean } = { sanitize: true },
  ): Promise<string> {
    const template = await this.templateRepository.findByCodigo(codigo);
    if (!template) {
      throw new Error(`Template com código '${codigo}' não encontrado`);
    }

    if (!template.ativo) {
      throw new Error(`Template com código '${codigo}' está inativo`);
    }

    try {
      return await this.templateEngine.render(template.conteudo, dados, opcoes);
    } catch (error) {
      throw new TemplateInvalidoException(
        codigo,
        `Erro ao renderizar template: ${error.message}`,
      );
    }
  }

  /**
   * Busca templates por tipo
   * @param tipo Tipo dos templates
   * @returns Lista de DTOs de resposta de templates
   */
  async buscarPorTipo(tipo: TemplateTipoEnum): Promise<TemplateResponseDto[]> {
    const templates = await this.templateRepository.findByTipo(tipo);
    return templates.map((t) => this.mapearParaDto(t));
  }

  /**
   * Ativa ou desativa um template
   * @param codigo Código do template
   * @param ativo Status de ativação
   * @returns DTO de resposta do template atualizado
   * @throws Error se o template não existir
   */
  async alterarStatus(
    codigo: string,
    ativo: boolean,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateRepository.findByCodigo(codigo);
    if (!template) {
      throw new Error(`Template com código '${codigo}' não encontrado`);
    }

    template.ativo = ativo;
    const salvo = await this.templateRepository.save(template);

    this.logger.log(`Template '${codigo}' ${ativo ? 'ativado' : 'desativado'}`);
    return this.mapearParaDto(salvo);
  }

  /**
   * Converte uma entidade Template para um DTO de resposta
   * @param template Entidade a ser convertida
   * @returns DTO de resposta
   */
  private mapearParaDto(template: Template): TemplateResponseDto {
    const dto = new TemplateResponseDto();
    dto.codigo = template.codigo;
    dto.nome = template.nome;
    // Não existe a propriedade descricao
    dto.tipo = template.tipo;
    dto.conteudo = template.conteudo;
    dto.ativo = template.ativo;
    dto.created_at = template.created_at;
    dto.updated_at = template.updated_at;
    return dto;
  }
}
