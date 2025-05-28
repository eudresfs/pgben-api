import { ParametroTipoEnum } from '../enums';
import { ParametroTipoInvalidoException } from '../exceptions';

/**
 * Classe utilitária que fornece métodos para converter valores de parâmetros
 * entre string e seus tipos nativos correspondentes.
 */
export class ParametroConverter {
  /**
   * Converte um valor de string para o tipo especificado.
   * 
   * @param chave - Chave do parâmetro (usado para mensagens de erro)
   * @param valor - Valor em formato string
   * @param tipo - Tipo para o qual converter
   * @returns O valor convertido para o tipo especificado
   * @throws ParametroTipoInvalidoException se a conversão falhar
   */
  static paraValorTipado(chave: string, valor: string, tipo: ParametroTipoEnum): any {
    try {
      switch (tipo) {
        case ParametroTipoEnum.STRING:
          return valor;
        
        case ParametroTipoEnum.NUMBER:
          const numero = Number(valor);
          if (isNaN(numero)) {
            throw new ParametroTipoInvalidoException(chave, valor, tipo);
          }
          return numero;
        
        case ParametroTipoEnum.BOOLEAN:
          if (valor.toLowerCase() === 'true') return true;
          if (valor.toLowerCase() === 'false') return false;
          if (valor === '1') return true;
          if (valor === '0') return false;
          throw new ParametroTipoInvalidoException(chave, valor, tipo);
        
        case ParametroTipoEnum.JSON:
          return JSON.parse(valor);
        
        case ParametroTipoEnum.DATE:
          const data = new Date(valor);
          if (isNaN(data.getTime())) {
            throw new ParametroTipoInvalidoException(chave, valor, tipo);
          }
          return data;
        
        default:
          throw new ParametroTipoInvalidoException(chave, valor, tipo);
      }
    } catch (error) {
      throw new ParametroTipoInvalidoException(chave, valor, tipo);
    }
  }

  /**
   * Converte um valor de qualquer tipo para string para armazenamento.
   * 
   * @param valor - Valor a ser convertido
   * @param tipo - Tipo original do valor
   * @returns O valor convertido para string
   */
  static paraString(valor: any, tipo: ParametroTipoEnum): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    switch (tipo) {
      case ParametroTipoEnum.STRING:
        return String(valor);
      
      case ParametroTipoEnum.NUMBER:
        return String(valor);
      
      case ParametroTipoEnum.BOOLEAN:
        return valor ? 'true' : 'false';
      
      case ParametroTipoEnum.JSON:
        return JSON.stringify(valor);
      
      case ParametroTipoEnum.DATE:
        if (valor instanceof Date) {
          return valor.toISOString();
        }
        
        // Tenta converter para Date se não for uma instância
        const data = new Date(valor);
        if (isNaN(data.getTime())) {
          return String(valor); // Fallback
        }
        return data.toISOString();
      
      default:
        return String(valor);
    }
  }

  /**
   * Verifica se um valor string pode ser convertido para o tipo especificado.
   * 
   * @param valor - Valor em formato string
   * @param tipo - Tipo para o qual verificar a conversão
   * @returns true se o valor pode ser convertido, false caso contrário
   */
  static podeConverterPara(valor: string, tipo: ParametroTipoEnum): boolean {
    try {
      this.paraValorTipado('validação', valor, tipo);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Formata um valor para exibição amigável, conforme seu tipo.
   * 
   * @param valor - Valor a ser formatado
   * @param tipo - Tipo do valor
   * @returns String formatada para exibição
   */
  static formatarParaExibicao(valor: any, tipo: ParametroTipoEnum): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    switch (tipo) {
      case ParametroTipoEnum.DATE:
        if (valor instanceof Date) {
          // Formato: DD/MM/YYYY HH:MM
          return `${valor.getDate().toString().padStart(2, '0')}/${(valor.getMonth() + 1).toString().padStart(2, '0')}/${valor.getFullYear()} ${valor.getHours().toString().padStart(2, '0')}:${valor.getMinutes().toString().padStart(2, '0')}`;
        }
        return String(valor);
      
      case ParametroTipoEnum.JSON:
        if (typeof valor === 'object') {
          return JSON.stringify(valor, null, 2);
        }
        return String(valor);
      
      default:
        return String(valor);
    }
  }
}
