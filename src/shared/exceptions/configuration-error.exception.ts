import { InternalServerErrorException } from '@nestjs/common';

/**
 * Exceção lançada quando há problemas de configuração do sistema.
 * 
 * Esta exceção é usada para erros relacionados a configurações ausentes,
 * inválidas ou inconsistentes que impedem o funcionamento correto do sistema.
 */
export class ConfigurationErrorException extends InternalServerErrorException {
  constructor(
    configKey: string,
    issue: string,
    suggestion?: string
  ) {
    const message = `Erro de configuração: ${configKey}`;
    const details = {
      configKey,
      issue,
      suggestion,
      message: `${issue}${suggestion ? ` Sugestão: ${suggestion}` : ''}`
    };

    super({
      message,
      code: 'CONFIGURATION_ERROR',
      details
    });
  }
}