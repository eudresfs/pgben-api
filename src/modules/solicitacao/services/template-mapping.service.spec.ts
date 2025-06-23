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
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.INDEFERIMENTO)).toBe(true);
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.CANCELAMENTO)).toBe(true);
      expect(service.temTemplateMapeado(TipoNotificacaoTemplate.PENDENCIA)).toBe(true);
    });

    it('should return false for invalid notification type', () => {
      expect(service.temTemplateMapeado('TIPO_INEXISTENTE')).toBe(false);
    });
  });

  describe('obterTodosMapeamentos', () => {
    it('should return all template mappings', () => {
      const mappings = service.obterTodosMapeamentos();
      
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.APROVACAO);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.INDEFERIMENTO);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.CANCELAMENTO);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.PENDENCIA);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.DOCUMENTOS);
      expect(mappings).toHaveProperty(TipoNotificacaoTemplate.PRAZO);
    });
  });

  describe('TipoNotificacaoTemplate enum', () => {
    it('should have all required notification types', () => {
      expect(TipoNotificacaoTemplate.APROVACAO).toBe('APROVACAO');
      expect(TipoNotificacaoTemplate.INDEFERIMENTO).toBe('INDEFERIMENTO');
      expect(TipoNotificacaoTemplate.CANCELAMENTO).toBe('CANCELAMENTO');
      expect(TipoNotificacaoTemplate.PENDENCIA).toBe('PENDENCIA');
      expect(TipoNotificacaoTemplate.DOCUMENTOS).toBe('DOCUMENTOS');
      expect(TipoNotificacaoTemplate.PRAZO).toBe('PRAZO');
    });
  });
});