import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ValidationErrorInterceptor, ValidationMessageHelper } from './validation-error.interceptor';

describe('ValidationErrorInterceptor', () => {
  let interceptor: ValidationErrorInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationErrorInterceptor],
    }).compile();

    interceptor = module.get<ValidationErrorInterceptor>(ValidationErrorInterceptor);
    
    mockExecutionContext = {
      switchToHttp: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('intercept', () => {
    it('deve passar erros não relacionados à validação sem modificação', (done) => {
      const nonValidationError = new Error('Erro genérico');
      mockCallHandler.handle = jest.fn(() => throwError(() => nonValidationError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBe(nonValidationError);
          done();
        },
      });
    });

    it('deve passar BadRequestException não relacionado à validação', (done) => {
      const nonValidationBadRequest = new BadRequestException('Erro customizado');
      mockCallHandler.handle = jest.fn(() => throwError(() => nonValidationBadRequest));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.getResponse()).toBe('Erro customizado');
          done();
        },
      });
    });

    it('deve melhorar erros de validação do class-validator', (done) => {
      const validationError = new BadRequestException({
        error: 'Bad Request',
        message: [
          'nome must be a string',
          'email must be an email',
          'idade must not be less than 18',
        ],
        statusCode: 400,
      });

      mockCallHandler.handle = jest.fn(() => throwError(() => validationError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          try {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = error.getResponse();
            
            expect(response).toHaveProperty('error', 'Erro de Validação');
            expect(response).toHaveProperty('message', 'Os dados fornecidos contêm erros de validação');
            expect(response).toHaveProperty('details');
            expect(response).toHaveProperty('timestamp');
            expect(response).toHaveProperty('statusCode', 400);
            
            done();
          } catch (e) {
            done(e);
          }
        },
      });
    });

    it('deve agrupar erros por campo', (done) => {
      const validationError = new BadRequestException({
        error: 'Bad Request',
        message: [
          'nome must be a string',
          'nome must be longer than 2 characters',
          'email must be an email',
        ],
        statusCode: 400,
      });

      mockCallHandler.handle = jest.fn(() => throwError(() => validationError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          try {
            const response = error.getResponse();
            const details = response.details;
            
            expect(details).toHaveProperty('nome');
            expect(details).toHaveProperty('email');
            expect(details.nome).toHaveLength(2); // Dois erros para o campo nome
            expect(details.email).toHaveLength(1); // Um erro para o campo email
            
            done();
          } catch (e) {
            done(e);
          }
        },
      });
    });

    it('deve melhorar mensagens de erro de enum', async () => {
      const enumError = new BadRequestException({
        error: 'Bad Request',
        message: [
          'status must be one of the following values [ATIVO, INATIVO, PENDENTE]',
        ],
        statusCode: 400,
      });

      mockCallHandler.handle = jest.fn(() => throwError(() => enumError));

       try {
          await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
        } catch (error) {
          const response = error.getResponse();
          console.log('Response structure:', JSON.stringify(response, null, 2));
          
          expect(response).toHaveProperty('details');
          const details = response.details;
          console.log('Details structure:', JSON.stringify(details, null, 2));
          
          // Verifica se o campo status existe e tem pelo menos um erro
          expect(details).toHaveProperty('status');
          expect(Array.isArray(details.status)).toBe(true);
          expect(details.status.length).toBeGreaterThan(0);
          
          expect(details.status[0]).toContain('deve ser um dos seguintes valores');
          expect(details.status[0]).toContain('ATIVO, INATIVO, PENDENTE');
        }
    });

    it('deve melhorar mensagens de erro de tipo', async () => {
      const typeError = new BadRequestException({
        error: 'Bad Request',
        message: [
          'idade must be a number',
          'ativo must be a boolean',
        ],
        statusCode: 400,
      });

      mockCallHandler.handle = jest.fn(() => throwError(() => typeError));

      try {
         await interceptor.intercept(mockExecutionContext, mockCallHandler).toPromise();
       } catch (error) {
         const response = error.getResponse();
         expect(response).toHaveProperty('details');
         const details = response.details;
         
         // Verifica se os campos existem e têm pelo menos um erro
         expect(details).toHaveProperty('idade');
         expect(Array.isArray(details.idade)).toBe(true);
         expect(details.idade.length).toBeGreaterThan(0);
         
         expect(details).toHaveProperty('ativo');
         expect(Array.isArray(details.ativo)).toBe(true);
         expect(details.ativo.length).toBeGreaterThan(0);
         
         expect(details.idade[0]).toContain('deve ser um número');
         expect(details.ativo[0]).toContain('deve ser um verdadeiro ou falso');
       }
    });

    it('deve melhorar mensagens de erro de tamanho', (done) => {
      const lengthError = new BadRequestException({
        error: 'Bad Request',
        message: [
          'nome must be longer than 2 characters',
          'descricao must be shorter than 100 characters',
        ],
        statusCode: 400,
      });

      mockCallHandler.handle = jest.fn(() => throwError(() => lengthError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          try {
            const response = error.getResponse();
            const details = response.details;
            
            expect(details.nome[0]).toContain('deve ter mais de 2 caracteres');
            expect(details.descricao[0]).toContain('deve ter menos de 100 caracteres');
            
            done();
          } catch (e) {
            done(e);
          }
        },
      });
    });

    it('deve melhorar mensagens de erro numérico', (done) => {
      const numericError = new BadRequestException({
        error: 'Bad Request',
        message: [
          'idade must not be less than 18',
          'salario must not be greater than 50000',
        ],
        statusCode: 400,
      });

      mockCallHandler.handle = jest.fn(() => throwError(() => numericError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          try {
            const response = error.getResponse();
            const details = response.details;
            
            expect(details.idade[0]).toContain('deve ser maior ou igual a 18');
            expect(details.salario[0]).toContain('deve ser menor ou igual a 50000');
            
            done();
          } catch (e) {
            done(e);
          }
        },
      });
    });

    it('deve passar dados válidos sem modificação', (done) => {
      const validData = { id: 1, nome: 'Teste' };
      mockCallHandler.handle = jest.fn(() => of(validData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toBe(validData);
          done();
        },
      });
    });
  });
});

describe('ValidationMessageHelper', () => {
  describe('required', () => {
    it('deve criar mensagem para campo obrigatório', () => {
      const message = ValidationMessageHelper.required('nome');
      expect(message).toBe("O campo 'nome' é obrigatório");
    });
  });

  describe('invalidType', () => {
    it('deve criar mensagem para tipo inválido', () => {
      const message = ValidationMessageHelper.invalidType('idade', 'number');
      expect(message).toBe("O campo 'idade' deve ser número");
    });

    it('deve mapear tipos em inglês para português', () => {
      expect(ValidationMessageHelper.invalidType('campo', 'string'))
        .toBe("O campo 'campo' deve ser texto");
      expect(ValidationMessageHelper.invalidType('campo', 'boolean'))
        .toBe("O campo 'campo' deve ser verdadeiro ou falso");
      expect(ValidationMessageHelper.invalidType('campo', 'email'))
        .toBe("O campo 'campo' deve ser email válido");
    });
  });

  describe('invalidLength', () => {
    it('deve criar mensagem para tamanho com min e max', () => {
      const message = ValidationMessageHelper.invalidLength('nome', 2, 50);
      expect(message).toBe("O campo 'nome' deve ter entre 2 e 50 caracteres");
    });

    it('deve criar mensagem apenas para mínimo', () => {
      const message = ValidationMessageHelper.invalidLength('nome', 2);
      expect(message).toBe("O campo 'nome' deve ter pelo menos 2 caracteres");
    });

    it('deve criar mensagem apenas para máximo', () => {
      const message = ValidationMessageHelper.invalidLength('nome', undefined, 50);
      expect(message).toBe("O campo 'nome' deve ter no máximo 50 caracteres");
    });

    it('deve criar mensagem genérica quando não há limites', () => {
      const message = ValidationMessageHelper.invalidLength('nome');
      expect(message).toBe("O campo 'nome' tem tamanho inválido");
    });
  });

  describe('invalidRange', () => {
    it('deve criar mensagem para intervalo com min e max', () => {
      const message = ValidationMessageHelper.invalidRange('idade', 18, 65);
      expect(message).toBe("O campo 'idade' deve estar entre 18 e 65");
    });

    it('deve criar mensagem apenas para mínimo', () => {
      const message = ValidationMessageHelper.invalidRange('idade', 18);
      expect(message).toBe("O campo 'idade' deve ser maior ou igual a 18");
    });

    it('deve criar mensagem apenas para máximo', () => {
      const message = ValidationMessageHelper.invalidRange('idade', undefined, 65);
      expect(message).toBe("O campo 'idade' deve ser menor ou igual a 65");
    });
  });

  describe('invalidFormat', () => {
    it('deve criar mensagem para formato inválido', () => {
      const message = ValidationMessageHelper.invalidFormat('email', 'email');
      expect(message).toBe("O campo 'email' deve ter o formato: email válido (exemplo: usuario@dominio.com)");
    });

    it('deve mapear formatos conhecidos', () => {
      expect(ValidationMessageHelper.invalidFormat('cpf', 'cpf'))
        .toContain('CPF válido (exemplo: 123.456.789-00)');
      expect(ValidationMessageHelper.invalidFormat('telefone', 'phone'))
        .toContain('telefone válido (exemplo: (11) 99999-9999)');
    });

    it('deve usar formato original se não mapeado', () => {
      const message = ValidationMessageHelper.invalidFormat('campo', 'formato_customizado');
      expect(message).toBe("O campo 'campo' deve ter o formato: formato_customizado");
    });
  });
});