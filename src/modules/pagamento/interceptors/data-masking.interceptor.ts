import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { DataMaskingUtil } from '../utils/data-masking.util';
import { Role } from '../../../enums/role.enum';

/**
 * Interceptor de Mascaramento de Dados para o Módulo de Pagamento
 * 
 * Este interceptor aplica automaticamente mascaramento de dados sensíveis
 * nas respostas das APIs do módulo de pagamento, baseado no perfil do usuário
 * e suas permissões específicas.
 * 
 * Funcionalidades:
 * - Mascara dados bancários (conta, agência, chave PIX)
 * - Aplica mascaramento baseado no perfil do usuário
 * - Preserva dados completos para usuários autorizados
 * - Funciona com respostas individuais e arrays
 * 
 * @author Equipe PGBen
 */
@Injectable()
export class DataMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    return next.handle().pipe(
      map((data) => {
        if (!data || !user) {
          return data;
        }

        // Verificar se o usuário pode ver dados não mascarados
        const canViewUnmasked = DataMaskingUtil.canViewUnmaskedData(
          user.perfil || user.role,
          user.permissoes || [],
        );

        if (canViewUnmasked) {
          return data;
        }

        // Aplicar mascaramento
        return this.maskSensitiveData(data);
      }),
    );
  }

  /**
   * Aplica mascaramento de dados sensíveis recursivamente
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Se for um array, aplicar mascaramento em cada item
    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item));
    }

    const maskedData = { ...data };

    // Mascarar dados bancários se presentes
    if (maskedData.dadosBancarios) {
      maskedData.dadosBancarios = this.maskDadosBancarios(maskedData.dadosBancarios);
    }

    if (maskedData.infoBancaria) {
      maskedData.infoBancaria = this.maskDadosBancarios(maskedData.infoBancaria);
    }

    // Mascarar outros campos sensíveis
    if (maskedData.cpf) {
      maskedData.cpf = this.maskCPF(maskedData.cpf);
    }

    // Aplicar mascaramento recursivamente em objetos aninhados
    Object.keys(maskedData).forEach((key) => {
      if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
        maskedData[key] = this.maskSensitiveData(maskedData[key]);
      }
    });

    return maskedData;
  }

  /**
   * Mascara dados bancários
   */
  private maskDadosBancarios(dadosBancarios: any): any {
    if (!dadosBancarios || typeof dadosBancarios !== 'object') {
      return dadosBancarios;
    }

    return DataMaskingUtil.maskDadosBancarios(dadosBancarios);
  }

  /**
   * Mascara CPF
   */
  private maskCPF(cpf: string): string {
    if (!cpf || typeof cpf !== 'string') {
      return cpf;
    }

    // Remove formatação
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) {
      return cpf; // Retorna original se não for um CPF válido
    }

    // Mascara mantendo apenas os 3 primeiros e 2 últimos dígitos
    return `${cleanCPF.substring(0, 3)}.***.***.${cleanCPF.substring(9)}`;
  }
}