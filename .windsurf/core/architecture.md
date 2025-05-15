# Arquitetura do Projeto

## Visão Geral
O PGBen Server é uma API RESTful construída com NestJS, seguindo os princípios da Clean Architecture e Domain-Driven Design (DDD).

## Estrutura de Diretórios
```
src/
├── api/                  # Controladores e rotas da API
├── application/          # Casos de uso e serviços de aplicação
├── domain/               # Entidades, value objects e interfaces de repositório
├── infrastructure/       # Implementações concretas (banco de dados, serviços externos)
├── shared/               # Código compartilhado entre módulos
│   ├── decorators/       # Decoradores personalizados
│   ├── filters/          # Filtros de exceção
│   ├── guards/           # Guards de autorização
│   ├── interceptors/     # Interceptadores
│   ├── middlewares/      # Middlewares globais
│   └── utils/            # Utilitários comuns
└── tests/                # Testes automatizados
```

## Padrões de Projeto
- **Repository Pattern**: Para abstração do acesso a dados
- **Dependency Injection**: Para injeção de dependências
- **CQRS**: Separação de leitura e escrita quando aplicável
- **Unit of Work**: Para gerenciamento de transações

## Fluxo de Dados
1. **Camada de API**: Recebe requisições HTTP
2. **Camada de Aplicação**: Orquestra os casos de uso
3. **Domínio**: Contém a lógica de negócio
4. **Infraestrutura**: Implementações concretas de repositórios e serviços

## Decisões de Projeto
- Uso de DTOs para validação e tipagem
- Inversão de dependência para desacoplamento
- Tratamento centralizado de erros
- Documentação automática com Swagger
- Testes automatizados em todas as camadas

## Considerações de Performance
- Cache em múltiplas camadas
- Paginação de resultados
- Carregamento sob demanda (lazy loading)

## Segurança
- Validação de entrada em todas as camadas
- Sanitização de dados
- Proteção contra injeção SQL
- Rate limiting
- Headers de segurança (CSP, HSTS, etc.)