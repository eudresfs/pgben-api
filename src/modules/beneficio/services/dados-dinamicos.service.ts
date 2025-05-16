import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ValidacaoDinamicaService } from './validacao-dinamica.service';
import { CampoDinamicoService } from './campo-dinamico.service';
import { TipoBeneficio } from '../entities/tipo-beneficio.entity';

/**
 * Serviço de Dados Dinâmicos
 * 
 * Responsável por processar e validar dados dinâmicos durante a solicitação de benefícios.
 * Integra-se com o serviço de validação dinâmica para garantir a integridade dos dados.
 */
@Injectable()
export class DadosDinamicosService {
  private readonly logger = new Logger(DadosDinamicosService.name);

  constructor(
    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,
    private validacaoDinamicaService: ValidacaoDinamicaService,
    private campoDinamicoService: CampoDinamicoService,
  ) {}

  /**
   * Processa e valida dados dinâmicos para uma solicitação de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param dadosDinamicos Dados dinâmicos a serem processados e validados
   * @returns Dados dinâmicos processados e validados
   */
  async processarDadosDinamicos(tipoBeneficioId: string, dadosDinamicos: any): Promise<any> {
    try {
      // Verificar se o tipo de benefício existe
      const tipoBeneficio = await this.tipoBeneficioRepository.findOne({
        where: { id: tipoBeneficioId }
      });
      
      if (!tipoBeneficio) {
        throw new NotFoundException(`Tipo de benefício com ID ${tipoBeneficioId} não encontrado`);
      }
      
      // Validar dados dinâmicos
      const resultadoValidacao = await this.validacaoDinamicaService.validarCamposDinamicos(
        tipoBeneficioId,
        dadosDinamicos
      );
      
      if (!resultadoValidacao.valido) {
        throw new BadRequestException({
          message: 'Dados dinâmicos inválidos',
          erros: resultadoValidacao.erros
        });
      }
      
      // Processar dados dinâmicos (sanitização, transformação, etc.)
      const dadosProcessados = await this.processarDados(tipoBeneficioId, dadosDinamicos);
      
      return dadosProcessados;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Erro ao processar dados dinâmicos: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao processar dados dinâmicos');
    }
  }

  /**
   * Processa dados dinâmicos (sanitização, transformação, etc.)
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param dadosDinamicos Dados dinâmicos a serem processados
   * @returns Dados dinâmicos processados
   */
  private async processarDados(tipoBeneficioId: string, dadosDinamicos: any): Promise<any> {
    // Obter schema ativo
    const schemaAtivo = await this.campoDinamicoService.getSchemaAtivo(tipoBeneficioId);
    const campos = schemaAtivo.schema;
    
    // Processar cada campo conforme seu tipo
    const dadosProcessados = { ...dadosDinamicos };
    
    for (const campo of campos) {
      const valor = dadosDinamicos[campo.nome];
      
      // Se o campo não foi informado, continua
      if (valor === undefined || valor === null) {
        continue;
      }
      
      // Processar conforme o tipo
      switch (campo.tipo) {
        case 'string':
          dadosProcessados[campo.nome] = this.processarString(valor);
          break;
        case 'number':
          dadosProcessados[campo.nome] = this.processarNumber(valor);
          break;
        case 'boolean':
          dadosProcessados[campo.nome] = this.processarBoolean(valor);
          break;
        case 'date':
          dadosProcessados[campo.nome] = this.processarDate(valor);
          break;
        // Outros tipos podem ser processados conforme necessário
      }
    }
    
    return dadosProcessados;
  }

  /**
   * Processa um valor do tipo string
   */
  private processarString(valor: any): string {
    if (typeof valor !== 'string') {
      return String(valor);
    }
    
    // Sanitização básica (remover espaços extras, etc.)
    return valor.trim();
  }

  /**
   * Processa um valor do tipo number
   */
  private processarNumber(valor: any): number {
    if (typeof valor === 'string') {
      // Converter string para número
      return Number(valor.replace(',', '.'));
    }
    
    if (typeof valor !== 'number') {
      return Number(valor);
    }
    
    return valor;
  }

  /**
   * Processa um valor do tipo boolean
   */
  private processarBoolean(valor: any): boolean {
    if (typeof valor === 'string') {
      return valor.toLowerCase() === 'true';
    }
    
    return Boolean(valor);
  }

  /**
   * Processa um valor do tipo date
   */
  private processarDate(valor: any): string {
    if (valor instanceof Date) {
      return valor.toISOString();
    }
    
    if (typeof valor === 'string') {
      // Tentar converter para data ISO
      const data = new Date(valor);
      if (!isNaN(data.getTime())) {
        return data.toISOString();
      }
    }
    
    return valor;
  }

  /**
   * Gera um formulário dinâmico baseado no schema de um tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Estrutura de formulário dinâmico
   */
  async gerarFormularioDinamico(tipoBeneficioId: string): Promise<any> {
    try {
      // Obter schema ativo
      const schemaAtivo = await this.campoDinamicoService.getSchemaAtivo(tipoBeneficioId);
      const campos = schemaAtivo.schema;
      
      // Transformar schema em estrutura de formulário
      const formulario = campos.map(campo => ({
        id: campo.id,
        nome: campo.nome,
        label: campo.label,
        tipo: campo.tipo,
        obrigatorio: campo.obrigatorio,
        descricao: campo.descricao,
        validacoes: campo.validacoes,
        ordem: campo.ordem
      }));
      
      return {
        versao: schemaAtivo.versao,
        campos: formulario
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar formulário dinâmico: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao gerar formulário dinâmico');
    }
  }
}
