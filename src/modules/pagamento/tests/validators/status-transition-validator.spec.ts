import { Test, TestingModule } from '@nestjs/testing';
import { StatusTransitionValidator } from '../../validators/status-transition-validator';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';

/**
 * Testes unitários para o validador de transições de status
 * 
 * Verifica o funcionamento correto das validações de transições entre
 * os diferentes estados de um pagamento, garantindo que apenas transições
 * válidas sejam permitidas.
 * 
 * @author Equipe PGBen
 */
describe('StatusTransitionValidator', () => {
  let validator: StatusTransitionValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatusTransitionValidator],
    }).compile();

    validator = module.get<StatusTransitionValidator>(StatusTransitionValidator);
  });

  describe('validarTransicao', () => {
    it('deve permitir transição de AGENDADO para LIBERADO', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.AGENDADO,
        StatusPagamentoEnum.LIBERADO
      )).toBe(true);
    });

    it('deve permitir transição de AGENDADO para CANCELADO', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.AGENDADO,
        StatusPagamentoEnum.CANCELADO
      )).toBe(true);
    });

    it('deve permitir transição de LIBERADO para CONFIRMADO', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.LIBERADO,
        StatusPagamentoEnum.CONFIRMADO
      )).toBe(true);
    });

    it('deve permitir transição de LIBERADO para CANCELADO', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.LIBERADO,
        StatusPagamentoEnum.CANCELADO
      )).toBe(true);
    });

    it('não deve permitir transição de CANCELADO para qualquer outro status', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.CANCELADO,
        StatusPagamentoEnum.AGENDADO
      )).toBe(false);
      
      expect(validator.validarTransicao(
        StatusPagamentoEnum.CANCELADO,
        StatusPagamentoEnum.LIBERADO
      )).toBe(false);
      
      expect(validator.validarTransicao(
        StatusPagamentoEnum.CANCELADO,
        StatusPagamentoEnum.CONFIRMADO
      )).toBe(false);
    });

    it('não deve permitir transição de CONFIRMADO para qualquer outro status', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.CONFIRMADO,
        StatusPagamentoEnum.AGENDADO
      )).toBe(false);
      
      expect(validator.validarTransicao(
        StatusPagamentoEnum.CONFIRMADO,
        StatusPagamentoEnum.LIBERADO
      )).toBe(false);
      
      expect(validator.validarTransicao(
        StatusPagamentoEnum.CONFIRMADO,
        StatusPagamentoEnum.CANCELADO
      )).toBe(false);
    });

    it('não deve permitir transição de AGENDADO para CONFIRMADO (pula etapa)', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.AGENDADO,
        StatusPagamentoEnum.CONFIRMADO
      )).toBe(false);
    });

    it('deve retornar false para status inválidos', () => {
      expect(validator.validarTransicao(
        'STATUS_INVALIDO' as StatusPagamentoEnum,
        StatusPagamentoEnum.LIBERADO
      )).toBe(false);
      
      expect(validator.validarTransicao(
        StatusPagamentoEnum.AGENDADO,
        'STATUS_INVALIDO' as StatusPagamentoEnum
      )).toBe(false);
    });

    it('deve permitir manter o mesmo status', () => {
      expect(validator.validarTransicao(
        StatusPagamentoEnum.AGENDADO,
        StatusPagamentoEnum.AGENDADO
      )).toBe(true);
      
      expect(validator.validarTransicao(
        StatusPagamentoEnum.LIBERADO,
        StatusPagamentoEnum.LIBERADO
      )).toBe(true);
    });
  });

  describe('getProximosStatusPossiveis', () => {
    it('deve retornar os próximos status possíveis para AGENDADO', () => {
      const proximos = validator.getProximosStatusPossiveis(StatusPagamentoEnum.AGENDADO);
      expect(proximos).toContain(StatusPagamentoEnum.LIBERADO);
      expect(proximos).toContain(StatusPagamentoEnum.CANCELADO);
      expect(proximos).not.toContain(StatusPagamentoEnum.CONFIRMADO);
    });

    it('deve retornar os próximos status possíveis para LIBERADO', () => {
      const proximos = validator.getProximosStatusPossiveis(StatusPagamentoEnum.LIBERADO);
      expect(proximos).toContain(StatusPagamentoEnum.CONFIRMADO);
      expect(proximos).toContain(StatusPagamentoEnum.CANCELADO);
      expect(proximos).not.toContain(StatusPagamentoEnum.AGENDADO);
    });

    it('deve retornar array vazio para CONFIRMADO', () => {
      const proximos = validator.getProximosStatusPossiveis(StatusPagamentoEnum.CONFIRMADO);
      expect(proximos.length).toBe(0);
    });

    it('deve retornar array vazio para CANCELADO', () => {
      const proximos = validator.getProximosStatusPossiveis(StatusPagamentoEnum.CANCELADO);
      expect(proximos.length).toBe(0);
    });

    it('deve retornar array vazio para status inválido', () => {
      const proximos = validator.getProximosStatusPossiveis('STATUS_INVALIDO' as StatusPagamentoEnum);
      expect(proximos.length).toBe(0);
    });
  });

  describe('getStatusInicial', () => {
    it('deve retornar AGENDADO como status inicial', () => {
      expect(validator.getStatusInicial()).toBe(StatusPagamentoEnum.AGENDADO);
    });
  });

  describe('getStatusFinais', () => {
    it('deve retornar CONFIRMADO e CANCELADO como status finais', () => {
      const statusFinais = validator.getStatusFinais();
      expect(statusFinais).toContain(StatusPagamentoEnum.CONFIRMADO);
      expect(statusFinais).toContain(StatusPagamentoEnum.CANCELADO);
      expect(statusFinais).not.toContain(StatusPagamentoEnum.AGENDADO);
      expect(statusFinais).not.toContain(StatusPagamentoEnum.LIBERADO);
    });
  });

  describe('isStatusFinal', () => {
    it('deve identificar corretamente status finais', () => {
      expect(validator.isStatusFinal(StatusPagamentoEnum.CONFIRMADO)).toBe(true);
      expect(validator.isStatusFinal(StatusPagamentoEnum.CANCELADO)).toBe(true);
    });

    it('deve identificar corretamente status não finais', () => {
      expect(validator.isStatusFinal(StatusPagamentoEnum.AGENDADO)).toBe(false);
      expect(validator.isStatusFinal(StatusPagamentoEnum.LIBERADO)).toBe(false);
    });

    it('deve retornar false para status inválido', () => {
      expect(validator.isStatusFinal('STATUS_INVALIDO' as StatusPagamentoEnum)).toBe(false);
    });
  });
});
