# Documentação da API PGBen

Este diretório contém a documentação da API do sistema PGBen, utilizando o Swagger/OpenAPI.

## Estrutura de Arquivos

```
swagger/
├── examples/           # Exemplos de requisições e respostas
│   ├── auth.ts         # Exemplos para autenticação
│   ├── beneficio.ts    # Exemplos para módulo de benefícios
│   └── cidadao.ts      # Exemplos para módulo de cidadãos
├── responses/          # Definições de respostas HTTP
│   ├── auth.ts         # Respostas para autenticação
│   ├── beneficio.ts    # Respostas para módulo de benefícios
│   └── common.ts       # Respostas comuns
├── schemas/            # Esquemas de dados (DTOs)
│   ├── auth.ts         # Esquemas para autenticação
│   ├── beneficio.ts    # Esquemas para módulo de benefícios
│   ├── cidadao.ts      # Esquemas para módulo de cidadãos
│   ├── documento.ts    # Esquemas para módulo de documentos
│   └── common.ts       # Esquemas comuns
├── index.ts            # Ponto de entrada principal
└── README.md           # Este arquivo
```

## Como Usar

### Importando Schemas

Para usar os schemas em seus controladores, importe-os do diretório de schemas:

```typescript
import { 
  CidadaoResponseDto, 
  CreateCidadaoDto, 
  UpdateCidadaoDto 
} from './schemas/cidadao';
```

### Usando Exemplos

Para manter a consistência, utilize os exemplos fornecidos:

```typescript
import { cidadaoResponse, createCidadaoRequest } from './examples/cidadao';

@ApiResponse({
  status: 200,
  description: 'Cidadão encontrado',
  type: CidadaoResponseDto,
  content: {
    'application/json': {
      example: cidadaoResponse
    }
  }
})
```

### Respostas Padrão

Utilize as respostas padrão para manter a consistência:

```typescript
import { 
  ApiCommonResponses,
  ApiAuthResponses,
  ApiBeneficioResponses 
} from './responses';

@ApiTags('beneficios')
@Controller('beneficios')
@ApiCommonResponses()
@ApiBeneficioResponses()
export class BeneficioController {
  // ...
}
```

## Convenções

1. **Nomes de Arquivos**: Use nomes em minúsculas com hífens para múltiplas palavras.
2. **Nomes de Classes**: Use PascalCase para nomes de classes e interfaces.
3. **Documentação**: Documente todas as classes, propriedades e métodos com JSDoc.
4. **Exemplos**: Forneça exemplos realistas para todas as propriedades.
5. **Enums**: Use UPPER_SNAKE_CASE para valores de enumeração.

## Atualizando a Documentação

1. Atualize os schemas conforme necessário
2. Atualize os exemplos para refletir as mudanças
3. Atualize as respostas HTTP, se necessário
4. Teste a documentação localmente
5. Faça commit das alterações

## Visualizando a Documentação

A documentação pode ser acessada em:
- Desenvolvimento: `http://localhost:3000/api`
- Produção: `https://api.pgben.natal.rn.gov.br/api`

## Boas Práticas

1. Mantenha os schemas sincronizados com as entidades do banco de dados
2. Atualize os exemplos sempre que os schemas forem alterados
3. Use descrições claras e concisas
4. Documente códigos de erro e possíveis cenários
5. Mantenha a consistência na nomenclatura e formatação
