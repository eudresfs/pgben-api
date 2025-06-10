import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoBeneficio } from '@/entities/tipo-beneficio.entity';
import { TipoBeneficioSchema } from '@/entities/tipo-beneficio-schema.entity';

/**
 * Interface para resultado da validação de schema
 */
export interface SchemaValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: {
    field: string;
    message: string;
    value?: any;
  }[];
  warnings: string[];
}

/**
 * Interface para campo do schema
 */
interface SchemaField {
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  regras?: any;
}

/**
 * Serviço responsável pela validação de dados contra schema de tipos de benefício
 * Extraído do DadosBeneficioFactoryService para separação de responsabilidades
 */
@Injectable()
export class SchemaValidationService {
  private readonly logger = new Logger(SchemaValidationService.name);

  constructor(
    @InjectRepository(TipoBeneficio)
    private readonly tipoBeneficioRepo: Repository<TipoBeneficio>,
    @InjectRepository(TipoBeneficioSchema)
    private readonly tipoBeneficioSchemaRepo: Repository<TipoBeneficioSchema>,
  ) {}

  /**
   * Valida dados contra o schema do tipo de benefício
   */
  async validate(
    codigoTipoBeneficio: string,
    data: Record<string, any>,
  ): Promise<SchemaValidationResult> {
    try {
      // Busca o tipo de benefício pelo código
      const tipoBeneficio = await this.tipoBeneficioRepo.findOne({
        where: { codigo: codigoTipoBeneficio },
      });

      if (!tipoBeneficio) {
        throw new NotFoundException(
          `Tipo de benefício '${codigoTipoBeneficio}' não encontrado`,
        );
      }

      // Busca o schema do tipo de benefício
      const tipoBeneficioSchema = await this.tipoBeneficioSchemaRepo.findOne({
        where: { tipo_beneficio_id: tipoBeneficio.id },
      });

      if (!tipoBeneficioSchema) {
        throw new NotFoundException(
          `Schema não encontrado para o tipo de benefício '${codigoTipoBeneficio}'`,
        );
      }

      // Valida os dados contra o schema
      return this.validateAgainstSchema(data, tipoBeneficioSchema.schema_estrutura?.campos || []);
    } catch (error) {
      this.logger.error(
        `Erro ao validar schema para tipo '${codigoTipoBeneficio}':`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida dados contra campos do schema
   */
  private validateAgainstSchema(
    data: Record<string, any>,
    schemaFields: any[],
  ): SchemaValidationResult {
    const result: SchemaValidationResult = {
      isValid: true,
      missingFields: [],
      errors: [],
      warnings: [],
    };

    // Converte campos do schema para formato mais fácil de trabalhar
    const fields = schemaFields.map(campo => ({
      nome: campo.nome,
      tipo: campo.tipo,
      obrigatorio: campo.obrigatorio,
      validacoes: campo.validacoes,
    }));

    // Verifica campos obrigatórios
    for (const field of fields) {
      if (field.obrigatorio && this.isFieldMissing(data, field.nome)) {
        result.missingFields.push(field.nome);
        result.isValid = false;
      }
    }

    // Valida tipos e regras dos campos presentes
    for (const [fieldName, value] of Object.entries(data)) {
      const schemaField = fields.find(f => f.nome === fieldName);
      
      if (schemaField && value !== null && value !== undefined) {
        // Valida tipo do campo
        const typeValidation = this.validateFieldType(value, schemaField.tipo);
        if (!typeValidation.isValid) {
          result.errors.push({
            field: fieldName,
            message: typeValidation.message,
            value,
          });
          result.isValid = false;
        }

        // Valida regras específicas do campo
        const rulesValidation = this.validateFieldRules(value, schemaField.validacoes);
        if (!rulesValidation.isValid) {
          result.errors.push({
            field: fieldName,
            message: rulesValidation.message,
            value,
          });
          result.isValid = false;
        }
      }
    }

    // Adiciona warnings para campos não reconhecidos
    const recognizedFields = fields.map(f => f.nome);
    const unrecognizedFields = Object.keys(data).filter(
      key => !recognizedFields.includes(key) && key !== 'solicitacao_id',
    );
    
    if (unrecognizedFields.length > 0) {
      result.warnings.push(
        `Campos não reconhecidos no schema: ${unrecognizedFields.join(', ')}`,
      );
    }

    return result;
  }

  /**
   * Verifica se um campo está ausente ou vazio
   */
  private isFieldMissing(data: Record<string, any>, fieldName: string): boolean {
    const value = data[fieldName];
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  /**
   * Valida o tipo de um campo
   */
  private validateFieldType(
    value: any,
    expectedType: string,
  ): { isValid: boolean; message: string } {
    switch (expectedType.toLowerCase()) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            isValid: false,
            message: `Esperado string, recebido ${typeof value}`,
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            isValid: false,
            message: `Esperado número, recebido ${typeof value}`,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            isValid: false,
            message: `Esperado boolean, recebido ${typeof value}`,
          };
        }
        break;

      case 'date':
        if (!(value instanceof Date) && !this.isValidDateString(value)) {
          return {
            isValid: false,
            message: `Esperado data válida, recebido ${typeof value}`,
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            isValid: false,
            message: `Esperado array, recebido ${typeof value}`,
          };
        }
        break;

      default:
        // Tipo não reconhecido, considera válido
        break;
    }

    return { isValid: true, message: '' };
  }

  /**
   * Valida regras específicas de um campo
   */
  private validateFieldRules(
    value: any,
    rules: any,
  ): { isValid: boolean; message: string } {
    if (!rules || typeof rules !== 'object') {
      return { isValid: true, message: '' };
    }

    // Validação de tamanho mínimo
    if (rules.minLength && typeof value === 'string') {
      if (value.length < rules.minLength) {
        return {
          isValid: false,
          message: `Tamanho mínimo de ${rules.minLength} caracteres`,
        };
      }
    }

    // Validação de tamanho máximo
    if (rules.maxLength && typeof value === 'string') {
      if (value.length > rules.maxLength) {
        return {
          isValid: false,
          message: `Tamanho máximo de ${rules.maxLength} caracteres`,
        };
      }
    }

    // Validação de valor mínimo
    if (rules.min && typeof value === 'number') {
      if (value < rules.min) {
        return {
          isValid: false,
          message: `Valor mínimo de ${rules.min}`,
        };
      }
    }

    // Validação de valor máximo
    if (rules.max && typeof value === 'number') {
      if (value > rules.max) {
        return {
          isValid: false,
          message: `Valor máximo de ${rules.max}`,
        };
      }
    }

    // Validação de padrão regex
    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return {
          isValid: false,
          message: `Formato inválido (padrão: ${rules.pattern})`,
        };
      }
    }

    // Validação de valores permitidos
    if (rules.allowedValues && Array.isArray(rules.allowedValues)) {
      if (!rules.allowedValues.includes(value)) {
        return {
          isValid: false,
          message: `Valor deve ser um de: ${rules.allowedValues.join(', ')}`,
        };
      }
    }

    return { isValid: true, message: '' };
  }

  /**
   * Verifica se uma string representa uma data válida
   */
  private isValidDateString(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * Obtém schema de um tipo de benefício para referência
   */
  async getSchema(codigoTipoBeneficio: string): Promise<SchemaField[]> {
    const tipoBeneficio = await this.tipoBeneficioRepo.findOne({
      where: { codigo: codigoTipoBeneficio },
    });

    if (!tipoBeneficio) {
      throw new NotFoundException(
        `Tipo de benefício '${codigoTipoBeneficio}' não encontrado`,
      );
    }

    const tipoBeneficioSchema = await this.tipoBeneficioSchemaRepo.findOne({
      where: { tipo_beneficio_id: tipoBeneficio.id },
    });

    if (!tipoBeneficioSchema) {
      throw new NotFoundException(
        `Schema não encontrado para o tipo de benefício '${codigoTipoBeneficio}'`,
      );
    }

    return (tipoBeneficioSchema.schema_estrutura?.campos || []).map(campo => ({
      nome: campo.nome,
      tipo: campo.tipo,
      obrigatorio: campo.obrigatorio,
      validacoes: campo.validacoes,
    }));
  }
}