/**
 * DTO Base
 * 
 * Classe base para todos os DTOs da aplicação, fornecendo métodos utilitários
 * para transformação e validação de dados.
 */
export abstract class BaseDto {
  /**
   * Transforma um objeto plano em uma instância da classe DTO
   * 
   * @param data Objeto plano com os dados
   * @param dto Classe DTO para transformação
   * @returns Instância da classe DTO
   */
  static plainToInstance<T>(data: object, dto: new () => T): T {
    const instance = new dto();
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        instance[key] = data[key];
      }
    }
    
    return instance;
  }
  
  /**
   * Transforma uma instância da classe DTO em um objeto plano
   * 
   * @param instance Instância da classe DTO
   * @returns Objeto plano com os dados
   */
  static instanceToPlain<T>(instance: T): Record<string, any> {
    const plainObject: Record<string, any> = {};
    
    for (const key in instance) {
      if (Object.prototype.hasOwnProperty.call(instance, key)) {
        plainObject[key] = instance[key];
      }
    }
    
    return plainObject;
  }
  
  /**
   * Valida os dados do DTO de acordo com as regras definidas pelos decorators
   * Este método pode ser sobrescrito pelas classes filhas para adicionar validações específicas
   * 
   * @param validationGroup Grupo de validação opcional
   * @returns Void se a validação for bem-sucedida, ou lança uma exceção em caso de erro
   */
  validar(validationGroup?: string): void {
    // Este método será implementado pelas classes filhas ou mockado em testes
    // Por padrão, não faz nada, mas serve como ponto de extensão
  }
}
