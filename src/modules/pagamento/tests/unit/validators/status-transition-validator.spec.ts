import { StatusTransitionValidator } from '../../../validators/status-transition-validator';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

describe('StatusTransitionValidator', () => {
  let validator: StatusTransitionValidator;

  beforeEach(() => {
    validator = new StatusTransitionValidator();
  });

  describe('canTransition', () => {
    it('deve permitir transição de AGENDADO para LIBERADO', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.AGENDADO, 
        StatusPagamentoEnum.LIBERADO
      );
      
      expect(result.allowed).toBeTruthy();
      expect(result.message).toBe('Transição permitida');
    });

    it('deve permitir transição de LIBERADO para CONFIRMADO', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.LIBERADO, 
        StatusPagamentoEnum.CONFIRMADO
      );
      
      expect(result.allowed).toBeTruthy();
      expect(result.message).toBe('Transição permitida');
    });

    it('deve permitir transição de AGENDADO para CANCELADO', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.AGENDADO, 
        StatusPagamentoEnum.CANCELADO
      );
      
      expect(result.allowed).toBeTruthy();
      expect(result.message).toBe('Transição permitida');
    });

    it('deve permitir transição de LIBERADO para CANCELADO', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.LIBERADO, 
        StatusPagamentoEnum.CANCELADO
      );
      
      expect(result.allowed).toBeTruthy();
      expect(result.message).toBe('Transição permitida');
    });

    it('deve rejeitar transição de CONFIRMADO para LIBERADO', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.CONFIRMADO, 
        StatusPagamentoEnum.LIBERADO
      );
      
      expect(result.allowed).toBeFalsy();
      expect(result.message).toContain('não permitida');
    });

    it('deve rejeitar transição de CANCELADO para qualquer outro status', () => {
      const resultParaLiberado = validator.canTransition(
        StatusPagamentoEnum.CANCELADO, 
        StatusPagamentoEnum.LIBERADO
      );
      
      const resultParaConfirmado = validator.canTransition(
        StatusPagamentoEnum.CANCELADO, 
        StatusPagamentoEnum.CONFIRMADO
      );
      
      const resultParaAgendado = validator.canTransition(
        StatusPagamentoEnum.CANCELADO, 
        StatusPagamentoEnum.AGENDADO
      );
      
      expect(resultParaLiberado.allowed).toBeFalsy();
      expect(resultParaConfirmado.allowed).toBeFalsy();
      expect(resultParaAgendado.allowed).toBeFalsy();
    });

    it('deve rejeitar transição para o mesmo status', () => {
      const resultAgendado = validator.canTransition(
        StatusPagamentoEnum.AGENDADO, 
        StatusPagamentoEnum.AGENDADO
      );
      
      const resultLiberado = validator.canTransition(
        StatusPagamentoEnum.LIBERADO, 
        StatusPagamentoEnum.LIBERADO
      );
      
      expect(resultAgendado.allowed).toBeFalsy();
      expect(resultLiberado.allowed).toBeFalsy();
      expect(resultAgendado.message).toContain('mesmo status');
      expect(resultLiberado.message).toContain('mesmo status');
    });

    it('deve rejeitar transição para status inválido', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.AGENDADO, 
        'STATUS_INEXISTENTE' as StatusPagamentoEnum
      );
      
      expect(result.allowed).toBeFalsy();
      expect(result.message).toContain('inválido');
    });

    it('deve rejeitar transição de CONFIRMADO para CANCELADO', () => {
      const result = validator.canTransition(
        StatusPagamentoEnum.CONFIRMADO, 
        StatusPagamentoEnum.CANCELADO
      );
      
      expect(result.allowed).toBeFalsy();
      expect(result.message).toContain('não permitida');
    });
  });

  describe('getValidTransitions', () => {
    it('deve retornar as transições válidas para AGENDADO', () => {
      const transitions = validator.getValidTransitions(StatusPagamentoEnum.AGENDADO);
      
      expect(transitions).toContain(StatusPagamentoEnum.LIBERADO);
      expect(transitions).toContain(StatusPagamentoEnum.CANCELADO);
      expect(transitions.length).toBe(2);
    });

    it('deve retornar as transições válidas para LIBERADO', () => {
      const transitions = validator.getValidTransitions(StatusPagamentoEnum.LIBERADO);
      
      expect(transitions).toContain(StatusPagamentoEnum.CONFIRMADO);
      expect(transitions).toContain(StatusPagamentoEnum.CANCELADO);
      expect(transitions.length).toBe(2);
    });

    it('deve retornar lista vazia para CONFIRMADO', () => {
      const transitions = validator.getValidTransitions(StatusPagamentoEnum.CONFIRMADO);
      
      expect(transitions.length).toBe(0);
    });

    it('deve retornar lista vazia para CANCELADO', () => {
      const transitions = validator.getValidTransitions(StatusPagamentoEnum.CANCELADO);
      
      expect(transitions.length).toBe(0);
    });

    it('deve retornar lista vazia para status inválido', () => {
      const transitions = validator.getValidTransitions('STATUS_INEXISTENTE' as StatusPagamentoEnum);
      
      expect(transitions.length).toBe(0);
    });
  });

  describe('getTransitionMatrix', () => {
    it('deve retornar a matriz de transição completa', () => {
      const matrix = validator.getTransitionMatrix();
      
      // Verifica se a matriz tem a estrutura esperada
      expect(matrix).toBeDefined();
      expect(Object.keys(matrix)).toContain(StatusPagamentoEnum.AGENDADO);
      expect(Object.keys(matrix)).toContain(StatusPagamentoEnum.LIBERADO);
      expect(Object.keys(matrix)).toContain(StatusPagamentoEnum.CONFIRMADO);
      expect(Object.keys(matrix)).toContain(StatusPagamentoEnum.CANCELADO);
      
      // Verifica transições específicas
      expect(matrix[StatusPagamentoEnum.AGENDADO]).toContain(StatusPagamentoEnum.LIBERADO);
      expect(matrix[StatusPagamentoEnum.LIBERADO]).toContain(StatusPagamentoEnum.CONFIRMADO);
      expect(matrix[StatusPagamentoEnum.CONFIRMADO].length).toBe(0);
      expect(matrix[StatusPagamentoEnum.CANCELADO].length).toBe(0);
    });
  });
});
