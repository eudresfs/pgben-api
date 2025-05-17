import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import * as Joi from 'joi';
import { MetadadosDocumento } from '../interfaces/metadados.interface';

/**
 * Interface para o resultado da validação de metadados
 */
export interface MetadadosValidationResult {
  isValid: boolean;
  message: string;
  errors?: string[];
}

/**
 * Validador personalizado para metadados de documentos
 *
 * Verifica se os metadados de um documento estão de acordo com o esquema definido
 */
@ValidatorConstraint({ name: 'metadadosValidator', async: false })
@Injectable()
export class MetadadosValidator implements ValidatorConstraintInterface {
  private readonly logger = new Logger(MetadadosValidator.name);
  private readonly schema: Joi.ObjectSchema;

  constructor() {
    // Definir esquema de validação usando Joi
    this.schema = Joi.object({
      // Campos básicos
      sensivel: Joi.boolean().default(false),
      categoria: Joi.string().max(50),
      titulo: Joi.string().max(255),
      descricao: Joi.string().max(1000),
      autor: Joi.string().max(255),
      data_documento: Joi.string().isoDate(),
      tags: Joi.array().items(Joi.string().max(50)),
      criptografado: Joi.boolean(),
      criptografia: Joi.object({
        iv: Joi.string().required(),
        authTag: Joi.string().required(),
        algoritmo: Joi.string().required(),
      }).when('criptografado', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      hash: Joi.string(),
      validade: Joi.string().isoDate(),
      verificado: Joi.boolean(),
      observacoes: Joi.string().max(1000),
      schema_version: Joi.string().max(10),

      localizacao: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180),
        endereco: Joi.string().max(500),
      }),

      dispositivo: Joi.object({
        tipo: Joi.string().max(50),
        sistema_operacional: Joi.string().max(100),
        navegador: Joi.string().max(100),
      }),

      verificacao_malware: Joi.object({
        verificado_em: Joi.string().isoDate(),
        resultado: Joi.string().valid('limpo', 'infectado', 'suspeito'),
        detalhes: Joi.string().max(1000),
      }),

      deteccao_mime: Joi.object({
        mime_declarado: Joi.string().required(),
        mime_detectado: Joi.string().required(),
        extensao_detectada: Joi.string(),
      }),

      upload_info: Joi.object({
        data: Joi.string().isoDate(),
        usuario_id: Joi.string().uuid(),
        ip: Joi.string().max(50),
        user_agent: Joi.string().max(500),
      }),

      verificacao: Joi.object({
        data: Joi.string().isoDate(),
        usuario_id: Joi.string().uuid(),
        observacoes: Joi.string().max(1000),
      }),

      ultima_atualizacao: Joi.object({
        data: Joi.string().isoDate(),
        usuario_id: Joi.string().uuid(),
      }),

      miniaturas: Joi.object({
        pequena: Joi.string(),
        media: Joi.string(),
        grande: Joi.string(),
        gerado_em: Joi.string().isoDate(),
      }),

      campos_personalizados: Joi.object().pattern(Joi.string(), Joi.any()),
    }).unknown(false); // Não permitir campos desconhecidos
  }

  /**
   * Valida os metadados de um documento
   * @param metadados Metadados a serem validados
   * @returns Objeto com o resultado da validação
   */
  validateMetadados(metadados: MetadadosDocumento): MetadadosValidationResult {
    if (!metadados) {
      // Metadados são opcionais
      return {
        isValid: true,
        message: 'Metadados não fornecidos, usando valores padrão',
      };
    }

    const { error } = this.schema.validate(metadados, {
      abortEarly: false, // Retornar todos os erros, não apenas o primeiro
      allowUnknown: false, // Não permitir campos desconhecidos
    });

    if (error) {
      return {
        isValid: false,
        message: `Metadados inválidos: ${error.details.map((detail) => detail.message).join('; ')}`,
        errors: error.details.map((detail) => detail.message),
      };
    }

    return {
      isValid: true,
      message: 'Metadados válidos',
    };
  }

  /**
   * Implementação da interface ValidatorConstraintInterface
   * @param value Valor a ser validado (deve ser um objeto MetadadosDocumento)
   * @param args Argumentos de validação
   * @returns true se os metadados são válidos, false caso contrário
   */
  validate(value: any, args?: ValidationArguments): boolean {
    try {
      const result = this.validateMetadados(value as MetadadosDocumento);
      return result.isValid;
    } catch (error) {
      this.logger.error(
        `Erro ao validar metadados: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Mensagem de erro personalizada
   * @param args Argumentos de validação
   * @returns Mensagem de erro
   */
  defaultMessage(args: ValidationArguments): string {
    if (!args.value) return 'Metadados inválidos';

    const { error } = this.schema.validate(args.value, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (!error) return 'Metadados inválidos';

    // Retornar todos os erros de validação em uma única mensagem
    return `Metadados inválidos: ${error.details.map((detail) => detail.message).join('; ')}`;
  }
}
