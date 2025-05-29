/**
 * Funções utilitárias para cálculos estatísticos
 */
export class EstatisticaUtils {
    /**
     * Calcula a média de um array de valores
     */
    static calcularMedia(valores: number[]): number {
      if (valores.length === 0) {return 0;}
      const soma = valores.reduce((acc, val) => acc + val, 0);
      return soma / valores.length;
    }
    
    /**
     * Calcula o desvio padrão de um array de valores
     */
    static calcularDesvioPadrao(valores: number[], media?: number): number {
      if (valores.length <= 1) {return 0;}
      
      const mediaValores = media !== undefined ? media : this.calcularMedia(valores);
      
      const somaDosQuadradosDasDiferencas = valores.reduce(
        (acc, val) => acc + Math.pow(val - mediaValores, 2),
        0
      );
      
      return Math.sqrt(somaDosQuadradosDasDiferencas / (valores.length - 1));
    }
    
    /**
     * Calcula a mediana de um array de valores
     * @param valores Array de valores (deve estar ordenado)
     */
    static calcularMediana(valores: number[]): number {
      if (valores.length === 0) {return 0;}
      
      // Verificar se valores está ordenado
      const valoresOrdenados = [...valores].sort((a, b) => a - b);
      
      // Valores já devem estar ordenados
      const meio = Math.floor(valoresOrdenados.length / 2);
      
      if (valoresOrdenados.length % 2 === 0) {
        // Número par de elementos: média dos dois do meio
        return (valoresOrdenados[meio - 1] + valoresOrdenados[meio]) / 2;
      } else {
        // Número ímpar de elementos: elemento do meio
        return valoresOrdenados[meio];
      }
    }
    
    /**
     * Calcula regressão linear simples para um array de valores
     * 
     * @param valores Array de valores ou array de pares [x, y]
     * @returns Coeficientes da regressão linear e R²
     */
    static calcularRegressaoLinear(valores: number[] | Array<[number, number]>): { 
      coeficienteAngular: number, 
      intercepto: number, 
      r2: number 
    } {
      const n = valores.length;
      
      if (n <= 1) {
        return { coeficienteAngular: 0, intercepto: 0, r2: 0 };
      }
      
      // Calcular médias
      let somaX = 0;
      let somaY = 0;
      let somaXY = 0;
      let somaXX = 0;
      let somaYY = 0;
      
      // Verificar se é array de pares [x, y] ou array simples
      const isPares = Array.isArray(valores[0]);
      
      for (let i = 0; i < n; i++) {
        let x: number;
        let y: number;
        
        if (isPares) {
          const par = valores[i] as [number, number];
          x = par[0];
          y = par[1];
        } else {
          x = i;
          y = valores[i] as number;
        }
        
        somaX += x;
        somaY += y;
        somaXY += x * y;
        somaXX += x * x;
        somaYY += y * y;
      }
      
      const mediaX = somaX / n;
      const mediaY = somaY / n;
      
      // Calcular coeficientes
      const numerador = somaXY - n * mediaX * mediaY;
      const denominador = somaXX - n * mediaX * mediaX;
      
      if (denominador === 0) {
        return { coeficienteAngular: 0, intercepto: mediaY, r2: 0 };
      }
      
      const coeficienteAngular = numerador / denominador;
      const intercepto = mediaY - coeficienteAngular * mediaX;
      
      // Calcular R²
      let sqtotal = 0;
      let sqreg = 0;
      
      for (let i = 0; i < n; i++) {
        let x: number;
        let y: number;
        
        if (isPares) {
          const par = valores[i] as [number, number];
          x = par[0];
          y = par[1];
        } else {
          x = i;
          y = valores[i] as number;
        }
        
        const yPrevisto = intercepto + coeficienteAngular * x;
        
        sqtotal += Math.pow(y - mediaY, 2);
        sqreg += Math.pow(yPrevisto - mediaY, 2);
      }
      
      const r2 = sqtotal === 0 ? 0 : sqreg / sqtotal;
      
      return { coeficienteAngular, intercepto, r2 };
    }
    
    /**
     * Gera hash para as dimensões
     */
    static gerarHashDimensoes(dimensoes: Record<string, any>): string {
      return JSON.stringify(dimensoes || {});
    }
  }