import { TemplateMappingService, TipoNotificacaoTemplate } from './template-mapping.service';

describe('TemplateMappingService - Unit Tests', () => {
  let service: TemplateMappingService;

  beforeEach(() => {
    // Criar instância simples para testes unitários básicos
    service = new TemplateMappingService(null, null);
  });

  describe('temTemplateMapeado', () => {
    it('should return true for valid notification types', () => {
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.APROVACAO)).toBe(true);
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.REJEICAO)).toBe(true);
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.BLOQUEIO)).toBe(true);
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.SUSPENSAO)).toBe(true);
    });

    it('should return false for invalid notification type', () => {
      expect(service.temTemplateMapeado('TIPO_INEXISTENTE')).toBe(false);
    });
  });

  describe('obterTodosMapeamentos', () => {
    it('should return all template mappings', () => {
      const mappings = service.obterTodosMapeamentos();
      
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.APROVACAO);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.REJEICAO);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.BLOQUEIO);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.SUSPENSAO);
    });
  });

  describe('TipoNotificacaoTemplate enum', () => {
    it('should have all required notification types', () => {
      expect(TipoNotificacaoTemplate.APROVACAO).toBe('APROVACAO');
      expect(TipoNotificacaoTemplate.REJEICAO).toBe('REJEICAO');
      expect(TipoNotificacaoTemplate.BLOQUEIO).toBe('BLOQUEIO');
      expect(TipoNotificacaoTemplate.SUSPENSAO).toBe('SUSPENSAO');
    });
  });
});