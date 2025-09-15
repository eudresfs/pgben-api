# Mapeamento Técnico - Módulos de Geração de PDF

## Visão Geral

Este documento mapeia todos os módulos existentes no sistema PGBEN que geram arquivos PDF, identificando suas funcionalidades, dependências e propondo estratégias de refatoração para migração ao novo módulo comum de PDF.

## Módulos Identificados

### 1. Módulo de Pagamento

#### Localização
- **Pasta Principal**: `src/modules/pagamento/`
- **Utilitário Principal**: `utils/pdf-generator.util.ts`
- **Templates**: `templates/`
- **Interfaces**: `interfaces/comprovante-pdf.interface.ts`

#### Funcionalidades
- Geração de comprovantes de pagamento em PDF
- Suporte a diferentes tipos de benefício (Cesta Básica, Aluguel Social)
- Geração individual e em lote
- Conversão para base64
- Combinação de múltiplos PDFs

#### Arquivos Principais
```
src/modules/pagamento/
├── controllers/
│   ├── comprovante.controller.ts          # Endpoints para geração de PDF
│   └── comprovante-pdf.controller.spec.ts # Testes e2e
├── services/
│   ├── comprovante.service.ts             # Lógica de negócio
│   └── comprovante-pdf.service.spec.ts    # Testes unitários
├── utils/
│   ├── pdf-generator.util.ts              # Gerador de PDF
│   └── pdf-generator.util.spec.ts         # Testes do gerador
├── templates/
│   ├── comprovante-base.template.ts       # Template base
│   ├── cesta-basica.template.ts           # Template cesta básica
│   └── aluguel-social.template.ts         # Template aluguel social
├── interfaces/
│   └── comprovante-pdf.interface.ts       # Definições de tipos
├── mappers/
│   ├── comprovante-dados.mapper.ts        # Mapeamento de dados
│   └── comprovante-dados.mapper.spec.ts   # Testes do mapper
└── dtos/
    ├── gerar-comprovante.dto.ts           # DTO para geração individual
    ├── gerar-comprovante-lote.dto.ts      # DTO para geração em lote
    └── comprovante-response.dto.ts        # DTO de resposta
```

#### Dependências
- **pdfmake**: Biblioteca principal para geração
- **pdf-lib**: Para combinação de PDFs
- **pdfmake/interfaces**: Tipos TypeScript

#### Características Técnicas
- Implementa interface `IComprovantePdfService`
- Usa `PdfPrinter` do pdfmake
- Suporte a fontes customizadas
- Validação de dados obrigatórios
- Cálculo de tamanho estimado
- Geração de nomes únicos de arquivo

### 2. Módulo de Relatórios

#### Localização
- **Pasta Principal**: `src/modules/relatorios/`
- **Serviço Principal**: `services/relatorios.service.ts`
- **Templates**: `services/pdf-templates.service.ts`
- **Estratégia**: `strategies/pdf.strategy.ts`

#### Funcionalidades
- Geração de relatórios em múltiplos formatos (PDF, Excel, CSV)
- Relatórios de solicitações, pagamentos, benefícios e atendimentos
- Templates específicos por tipo de benefício
- Relatórios baseados em IDs de pagamentos

#### Arquivos Principais
```
src/modules/relatorios/
├── services/
│   ├── relatorios.service.ts              # Serviço principal
│   └── pdf-templates.service.ts           # Templates PDF
├── strategies/
│   └── pdf.strategy.ts                    # Estratégia PDF
├── dto/
│   ├── relatorio-solicitacoes.dto.ts      # DTO relatório solicitações
│   ├── relatorio-pagamentos-pdf.dto.ts    # DTO relatório pagamentos
│   ├── relatorio-beneficios.dto.ts        # DTO relatório benefícios
│   └── relatorio-atendimentos.dto.ts      # DTO relatório atendimentos
└── __tests__/
    └── pdf.strategy.spec.ts               # Testes da estratégia
```

#### Dependências
- **pdfmake**: Para geração de PDFs
- **pdfkit**: Biblioteca alternativa (mockada nos testes)
- **TDocumentDefinitions**: Tipos do pdfmake

#### Características Técnicas
- Padrão Strategy para diferentes formatos
- Geração de PDF vazio quando não há dados
- Templates específicos por tipo de benefício
- Processamento em lotes paralelos

### 3. Módulo de Documento

#### Localização
- **Pasta Principal**: `src/modules/documento/`
- **Utilitário Principal**: `utils/pdf-generator.util.ts`
- **Serviço Principal**: `services/documento-pdf.service.ts`

#### Funcionalidades
- Geração de documentos PDF baseados em templates
- Gestão de documentos gerados
- Upload e validação de documentos
- Integração com sistema de armazenamento

#### Arquivos Principais
```
src/modules/documento/
├── controllers/
│   └── documento-pdf.controller.ts        # Endpoints de documentos
├── services/
│   ├── documento-pdf.service.ts           # Lógica de negócio
│   └── upload/
│       └── documento-upload-validation.service.ts # Validação upload
├── utils/
│   └── pdf-generator.util.ts              # Gerador específico
└── interfaces/
    └── documento-pdf.interface.ts         # Definições de tipos
```

#### Dependências
- **pdfmake**: Biblioteca principal
- **ConfigService**: Configurações do NestJS

#### Características Técnicas
- Implementa interface `IDocumentoPdfService`
- Configuração via `ConfigService`
- Validação de tipos de arquivo (inclui PDF)
- Integração com sistema de templates

### 4. Outros Módulos com Suporte a PDF

#### Módulo de Feedback
- **Arquivo**: `src/modules/feedback/services/file-upload.service.ts`
- **Funcionalidade**: Suporte a upload de arquivos PDF
- **Tipo MIME**: `application/pdf`

#### Módulo de Solicitação
- **Arquivos**: DTOs e controllers
- **Funcionalidade**: Referências a documentos PDF em solicitações
- **Exemplos**: Certidões, comprovantes, contratos em PDF

#### Serviços Compartilhados
- **MinIO Service**: `src/shared/services/minio.service.ts`
  - Suporte a tipo MIME `application/pdf`
  - Armazenamento e recuperação de PDFs
- **Compression Middleware**: `src/shared/middleware/compression.middleware.ts`
  - Compressão de arquivos PDF

## Análise de Dependências

### Bibliotecas Utilizadas

1. **pdfmake**
   - Versão: Não especificada nos arquivos
   - Uso: Geração principal de PDFs
   - Módulos: Pagamento, Relatórios, Documento

2. **pdf-lib**
   - Uso: Combinação de múltiplos PDFs
   - Módulo: Pagamento (para lotes)

3. **pdfkit**
   - Uso: Alternativo (mockado nos testes)
   - Módulo: Relatórios

### Padrões Identificados

1. **Interfaces Comuns**
   - Todas implementam interfaces similares
   - Métodos `gerarDocumento()` ou `gerarComprovante()`
   - Retorno de `Buffer` ou `Promise<Buffer>`

2. **Configurações**
   - Fontes customizadas
   - Margens e orientação
   - Templates específicos

3. **Validações**
   - Dados obrigatórios
   - Tipos de arquivo
   - Tamanhos estimados

## Estratégias de Refatoração

### Fase 1: Análise e Preparação

#### 1.1 Auditoria Completa
- [ ] Inventariar todos os templates existentes
- [ ] Mapear todas as interfaces e DTOs
- [ ] Identificar dependências específicas
- [ ] Documentar casos de uso únicos

#### 1.2 Compatibilidade
- [ ] Verificar versões das bibliotecas
- [ ] Testar compatibilidade entre módulos
- [ ] Identificar conflitos potenciais

### Fase 2: Migração Gradual

#### 2.1 Módulo de Pagamento (Prioridade Alta)

**Justificativa**: Módulo mais complexo e crítico

**Estratégia**:
1. **Manter Interfaces Existentes**
   ```typescript
   // Adapter para manter compatibilidade
   export class ComprovanteAdapter {
     constructor(private pdfCommonService: PdfCommonService) {}
     
     async gerarComprovante(
       dados: IDadosComprovante,
       template: IComprovanteTemplate
     ): Promise<Buffer> {
       // Converter dados para formato do módulo comum
       const dadosPdf = this.converterDados(dados);
       return this.pdfCommonService.gerarPdf(dadosPdf);
     }
   }
   ```

2. **Migrar Templates**
   ```typescript
   // Converter templates existentes
   const templateCestaBasica = {
     nome: 'comprovante-cesta-basica',
     configuracao: {
       orientacao: PdfOrientacao.PORTRAIT,
       tamanho: PdfTamanhoPapel.A4
     },
     // ... resto da configuração
   };
   ```

3. **Testes de Regressão**
   - Executar todos os testes existentes
   - Comparar PDFs gerados (byte a byte)
   - Validar funcionalidades de lote

#### 2.2 Módulo de Relatórios (Prioridade Média)

**Estratégia**:
1. **Substituir PdfStrategy**
   ```typescript
   export class PdfStrategy implements IRelatorioStrategy {
     constructor(private pdfCommonService: PdfCommonService) {}
     
     async gerar(dados: any[]): Promise<Buffer> {
       const dadosFormatados = this.formatarDados(dados);
       return this.pdfCommonService.gerarPdf(dadosFormatados);
     }
   }
   ```

2. **Migrar Templates Específicos**
   - Templates por tipo de benefício
   - Layouts de relatórios
   - Estilos customizados

#### 2.3 Módulo de Documento (Prioridade Baixa)

**Estratégia**:
1. **Integração Direta**
   ```typescript
   @Injectable()
   export class DocumentoPdfService {
     constructor(private pdfCommonService: PdfCommonService) {}
     
     async gerarDocumento(
       dados: IDadosDocumento,
       template: IDocumentoTemplate
     ): Promise<Buffer> {
       return this.pdfCommonService.gerarPdf(dados, template);
     }
   }
   ```

### Fase 3: Consolidação

#### 3.1 Remoção de Código Duplicado
- [ ] Remover utilitários antigos
- [ ] Consolidar interfaces
- [ ] Unificar configurações

#### 3.2 Otimização
- [ ] Cache de templates
- [ ] Pool de workers para geração
- [ ] Compressão otimizada

#### 3.3 Documentação
- [ ] Atualizar documentação de APIs
- [ ] Guias de migração
- [ ] Exemplos de uso

## Cronograma Sugerido

### Sprint 1 (2 semanas)
- Auditoria completa dos módulos
- Análise de compatibilidade
- Preparação do ambiente de testes

### Sprint 2-3 (4 semanas)
- Migração do módulo de Pagamento
- Testes de regressão intensivos
- Ajustes de compatibilidade

### Sprint 4 (2 semanas)
- Migração do módulo de Relatórios
- Validação de templates

### Sprint 5 (1 semana)
- Migração do módulo de Documento
- Testes finais

### Sprint 6 (1 semana)
- Limpeza de código
- Documentação final
- Deploy em produção

## Riscos e Mitigações

### Riscos Identificados

1. **Incompatibilidade de Templates**
   - **Risco**: Templates existentes podem não funcionar
   - **Mitigação**: Criar adapters e converters

2. **Performance**
   - **Risco**: Degradação na geração de PDFs
   - **Mitigação**: Benchmarks e otimizações

3. **Quebra de Funcionalidades**
   - **Risco**: Funcionalidades específicas podem parar
   - **Mitigação**: Testes de regressão abrangentes

4. **Dependências Conflitantes**
   - **Risco**: Versões diferentes de bibliotecas
   - **Mitigação**: Auditoria de dependências

### Plano de Rollback

1. **Versionamento**
   - Manter versões antigas em branches separadas
   - Tags de release para cada fase

2. **Feature Flags**
   - Implementar flags para alternar entre sistemas
   - Rollback gradual por módulo

3. **Monitoramento**
   - Métricas de performance
   - Logs de erro detalhados
   - Alertas automáticos

## Benefícios Esperados

### Técnicos
- **Redução de Código**: ~60% menos código duplicado
- **Manutenibilidade**: Ponto único de manutenção
- **Consistência**: Padrões unificados
- **Performance**: Otimizações centralizadas

### Operacionais
- **Facilidade de Debug**: Logs centralizados
- **Atualizações**: Mudanças em um só lugar
- **Testes**: Suite unificada de testes
- **Documentação**: Documentação centralizada

### Desenvolvimento
- **Produtividade**: Menos tempo para implementar PDFs
- **Qualidade**: Padrões estabelecidos
- **Reutilização**: Templates compartilhados
- **Onboarding**: Curva de aprendizado reduzida

## Conclusão

A migração para o módulo comum de PDF representa uma oportunidade significativa de melhoria na arquitetura do sistema PGBEN. Com planejamento adequado e execução gradual, é possível alcançar os benefícios esperados minimizando os riscos.

A estratégia proposta prioriza a estabilidade do sistema através de:
- Migração gradual por módulo
- Manutenção de compatibilidade
- Testes abrangentes
- Planos de rollback

O sucesso da migração dependerá da execução cuidadosa de cada fase e do monitoramento contínuo dos resultados.

---

**Versão**: 1.0  
**Data**: Janeiro 2024  
**Responsável**: Equipe de Desenvolvimento  
**Próxima Revisão**: Após Sprint 1