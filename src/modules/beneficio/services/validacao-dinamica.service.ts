import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoDinamicoBeneficio, TipoDado } from '../entities/campo-dinamico-beneficio.entity';
import { Logger } from '@nestjs/common';

/**
 * Interface para resultado de validação
 */
export interface ValidationResult {
  valido: boolean;
  erros: Array<{
    campo: string;
    mensagem: string;
  }>;
}

/**
 * Serviço de Validação Dinâmica
 * 
 * Responsável por validar dados dinâmicos conforme esquema definido
 * para cada tipo de benefício.
 */
@Injectable()
export class ValidacaoDinamicaService {
  private readonly logger = new Logger(ValidacaoDinamicaService.name);

  constructor(
    @InjectRepository(CampoDinamicoBeneficio)
    private campoDinamicoRepository: Repository<CampoDinamicoBeneficio>,
  ) {}

  /**
   * Valida dados dinâmicos conforme esquema definido para o tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param dados Dados a serem validados
   * @returns Resultado da validação
   */
  async validarCamposDinamicos(tipoBeneficioId: string, dados: any): Promise<ValidationResult> {
    if (!dados) {
      return {
        valido: false,
        erros: [{ campo: 'dados', mensagem: 'Dados não informados' }]
      };
    }

    try {
      // Buscar esquema de campos para o tipo de benefício
      const campos = await this.campoDinamicoRepository.find({
        where: { tipo_beneficio_id: tipoBeneficioId, ativo: true },
        order: { ordem: 'ASC' }
      });

      if (!campos || campos.length === 0) {
        this.logger.warn(`Nenhum campo dinâmico encontrado para o tipo de benefício ${tipoBeneficioId}`);
        return { valido: true, erros: [] }; // Se não há campos definidos, considera válido
      }

      const erros = [];

      // Validar campos obrigatórios e tipos
      for (const campo of campos) {
        // Verificar se campo obrigatório foi informado
        if (campo.obrigatorio && (dados[campo.nome] === undefined || dados[campo.nome] === null)) {
          erros.push({
            campo: campo.nome,
            mensagem: `O campo ${campo.label} é obrigatório`
          });
          continue;
        }

        // Se o campo não foi informado e não é obrigatório, continua
        if (dados[campo.nome] === undefined || dados[campo.nome] === null) {
          continue;
        }

        // Validar tipo do campo
        const valorCampo = dados[campo.nome];
        
        switch (campo.tipo) {
          case TipoDado.STRING:
            this.validarString(campo, valorCampo, erros);
            break;
          case TipoDado.NUMBER:
            this.validarNumber(campo, valorCampo, erros);
            break;
          case TipoDado.BOOLEAN:
            this.validarBoolean(campo, valorCampo, erros);
            break;
          case TipoDado.DATE:
            this.validarDate(campo, valorCampo, erros);
            break;
          case TipoDado.ARRAY:
            this.validarArray(campo, valorCampo, erros);
            break;
          case TipoDado.OBJECT:
            this.validarObject(campo, valorCampo, erros);
            break;
        }
      }

      return {
        valido: erros.length === 0,
        erros
      };
    } catch (error) {
      this.logger.error(`Erro ao validar campos dinâmicos: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao validar campos dinâmicos');
    }
  }

  /**
   * Valida campo do tipo string
   */
  private validarString(campo: CampoDinamicoBeneficio, valor: any, erros: any[]): void {
    if (typeof valor !== 'string') {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser um texto`
      });
      return;
    }

    const validacoes = campo.validacoes || {};

    // Validar tamanho mínimo
    if (validacoes.minLength !== undefined && valor.length < validacoes.minLength) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ter no mínimo ${validacoes.minLength} caracteres`
      });
    }

    // Validar tamanho máximo
    if (validacoes.maxLength !== undefined && valor.length > validacoes.maxLength) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} não pode ter mais de ${validacoes.maxLength} caracteres`
      });
    }

    // Validar padrão (regex)
    if (validacoes.pattern && !new RegExp(validacoes.pattern).test(valor)) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} não está no formato esperado`
      });
    }

    // Validar enum (valores permitidos)
    if (validacoes.enum && Array.isArray(validacoes.enum) && !validacoes.enum.includes(valor)) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser um dos seguintes valores: ${validacoes.enum.join(', ')}`
      });
    }
  }

  /**
   * Valida campo do tipo number
   */
  private validarNumber(campo: CampoDinamicoBeneficio, valor: any, erros: any[]): void {
    // Converter para número se for string numérica
    if (typeof valor === 'string' && !isNaN(Number(valor))) {
      valor = Number(valor);
    }

    if (typeof valor !== 'number' || isNaN(valor)) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser um número`
      });
      return;
    }

    const validacoes = campo.validacoes || {};

    // Validar valor mínimo
    if (validacoes.min !== undefined && valor < validacoes.min) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser maior ou igual a ${validacoes.min}`
      });
    }

    // Validar valor máximo
    if (validacoes.max !== undefined && valor > validacoes.max) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser menor ou igual a ${validacoes.max}`
      });
    }
  }

  /**
   * Valida campo do tipo boolean
   */
  private validarBoolean(campo: CampoDinamicoBeneficio, valor: any, erros: any[]): void {
    // Converter strings 'true' e 'false' para boolean
    if (valor === 'true') valor = true;
    if (valor === 'false') valor = false;

    if (typeof valor !== 'boolean') {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser um valor booleano (verdadeiro/falso)`
      });
    }
  }

  /**
   * Valida campo do tipo date
   */
  private validarDate(campo: CampoDinamicoBeneficio, valor: any, erros: any[]): void {
    // Tentar converter para data
    const data = new Date(valor);
    
    if (isNaN(data.getTime())) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser uma data válida`
      });
      return;
    }

    const validacoes = campo.validacoes || {};

    // Validar data mínima
    if (validacoes.min && new Date(validacoes.min) > data) {
      const dataMinima = new Date(validacoes.min).toLocaleDateString('pt-BR');
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser uma data posterior a ${dataMinima}`
      });
    }

    // Validar data máxima
    if (validacoes.max && new Date(validacoes.max) < data) {
      const dataMaxima = new Date(validacoes.max).toLocaleDateString('pt-BR');
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser uma data anterior a ${dataMaxima}`
      });
    }
  }

  /**
   * Valida campo do tipo array
   */
  private validarArray(campo: CampoDinamicoBeneficio, valor: any, erros: any[]): void {
    if (!Array.isArray(valor)) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser uma lista`
      });
      return;
    }

    const validacoes = campo.validacoes || {};

    // Validar tamanho mínimo
    if (validacoes.minLength !== undefined && valor.length < validacoes.minLength) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ter no mínimo ${validacoes.minLength} item(ns)`
      });
    }

    // Validar tamanho máximo
    if (validacoes.maxLength !== undefined && valor.length > validacoes.maxLength) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} não pode ter mais de ${validacoes.maxLength} item(ns)`
      });
    }
  }

  /**
   * Valida campo do tipo object
   */
  private validarObject(campo: CampoDinamicoBeneficio, valor: any, erros: any[]): void {
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
      erros.push({
        campo: campo.nome,
        mensagem: `O campo ${campo.label} deve ser um objeto`
      });
    }
  }
}
