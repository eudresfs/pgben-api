# Changelog da API PGBen

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [Não Publicado]

### Adicionado
- Novo endpoint `POST /v1/beneficio/verificar-disponibilidade` para verificar disponibilidade de benefícios para um cidadão
- Enum `CategoriaBeneficio` para categorização de benefícios
- Coluna `categoria` na entidade `TipoBeneficio`
- DTOs para verificação de disponibilidade (`VerificarDisponibilidadeBeneficioDto`, `VerificarDisponibilidadeBeneficioResponseDto`, `DisponibilidadeBeneficioDto`)
- Documentação completa do novo endpoint
- Migration para adicionar coluna categoria na tabela tipo_beneficio
- Documentação inicial da API
- Estratégia de versionamento
- Guia de autenticação e erros
- Exemplos de fluxos de trabalho

## [1.0.0] - 2025-05-17

### Adicionado
- Versão inicial da API PGBen
- Suporte a autenticação JWT
- Gerenciamento de cidadãos e benefícios
- Upload e validação de documentos
- Geração de relatórios

### Alterado
- Padronização de respostas de erro
- Melhorias na documentação da API

## [0.9.0] - 2025-04-30

### Adicionado
- Versão beta da API
- Endpoints básicos de gerenciamento
- Autenticação básica

### Alterado
- Melhorias na estrutura da API
- Otimização de consultas

## Notas de Atualização

### Atualizando para v1.0.0

Esta versão inclui várias mudanças significativas em relação à versão beta:

1. **Mudanças que quebram compatibilidade**
   - Alteração na estrutura de autenticação
   - Novos campos obrigatórios em vários endpoints
   - Remoção de endpoints obsoletos

2. **Novos recursos**
   - Suporte a upload de documentos
   - Geração de relatórios em PDF/Excel
   - Filtros avançados de consulta

3. **Melhorias**
   - Desempenho otimizado
   - Mensagens de erro mais descritivas
   - Documentação completa

### Atualizando para v0.9.0

Esta foi a primeira versão pública beta da API. As principais características incluem:

- Autenticação básica
- CRUD de cidadãos
- Gerenciamento de benefícios
- Rascunho da documentação

## Política de Suporte

### Versões Suportadas

| Versão | Status          | Fim do Suporte  |
|--------|----------------|-----------------|
| 1.x    | Ativo          | Maio 2026       |
| 0.9    | Manutenção      | Novembro 2025   |
| < 0.9  | Não suportado   | -               |

### Política de Depreciação

- **Aviso de descontinuação**: 6 meses de antecedência
- **Período de sobreposição**: 3 meses (duas versões ativas simultaneamente)
- **Notificações**: Através de changelog, e-mail e cabeçalhos HTTP

## Links

- [Documentação da API](./README.md)
- [Guia de Migração](./MIGRACAO.md)
- [Repositório](https://github.com/seu-usuario/pgben-api)

---

**Nota**: Este arquivo é gerado automaticamente. Por favor, não edite manualmente.
