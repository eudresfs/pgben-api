# Módulo de Configuração - Documentação para Desenvolvedores

## Introdução

O Módulo de Configuração do PGBen é responsável por centralizar a gestão de parâmetros operacionais, templates, workflows e integrações do sistema. Este módulo permite personalizar o comportamento do sistema sem necessidade de alterações no código-fonte, fornecendo uma camada de abstração para configurações dinâmicas.

## Documentação Disponível

Esta documentação é direcionada para desenvolvedores que precisam utilizar os serviços e recursos do Módulo de Configuração em outros módulos do sistema PGBen:

1. [Parâmetros do Sistema](./parametros.md) - Guia completo sobre o sistema de parâmetros
2. [Sistema de Templates](./templates.md) - Documentação para o motor de templates e variáveis disponíveis
3. [Workflows de Benefícios](./workflows.md) - Guia para configuração e uso de workflows
4. [Integrações Externas](./integracoes.md) - Configuração de integrações com sistemas externos
5. [Limites e Prazos](./limites.md) - Configuração de limites operacionais e prazos

## Utilização Básica do Módulo

Para utilizar o Módulo de Configuração em outros módulos do sistema:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { SeuService } from './services/seu.service';

@Module({
  imports: [
    ConfiguracaoModule, // Importa o módulo de configuração
    // Outros imports necessários
  ],
  providers: [SeuService],
  controllers: [/* seus controllers */],
})
export class SeuModule {}
```

Depois, injete os serviços necessários no seu serviço:

```typescript
import { Injectable } from '@nestjs/common';
import { ParametroService } from '../configuracao/services/parametro.service';
import { TemplateService } from '../configuracao/services/template.service';

@Injectable()
export class SeuService {
  constructor(
    private readonly parametroService: ParametroService,
    private readonly templateService: TemplateService,
    // Outros serviços necessários
  ) {}

  async algumaFuncao() {
    // Exemplo de uso do serviço de parâmetros
    const valorMaximo = await this.parametroService.obterNumero('upload.tamanho_maximo', 5242880);
    
    // Exemplo de uso do serviço de templates
    const template = await this.templateService.buscarPorCodigo('email-bem-vindo');
    const emailRenderizado = await this.templateService.renderizar(template, {
      nome: 'João Silva',
      link: 'https://pgben.natal.rn.gov.br/login'
    });
    
    // Restante da sua lógica
  }
}
```

## Avisos Importantes

1. **Cache**: O sistema de parâmetros utiliza cache para melhorar o desempenho. Se você atualizar parâmetros programaticamente, pode ser necessário limpar o cache.

2. **Valores Padrão**: Sempre forneça valores padrão ao buscar parâmetros, para garantir que sua funcionalidade continue operando mesmo se o parâmetro não existir.

3. **Sanitização**: O motor de templates já implementa sanitização de dados, mas tome cuidado ao renderizar conteúdo gerado pelo usuário.

4. **Credenciais**: As credenciais de integrações são armazenadas de forma segura (criptografadas), mas evite expô-las desnecessariamente na interface.

## Exemplos Práticos

Veja exemplos práticos de uso do Módulo de Configuração na documentação específica de cada componente.

## Suporte e Contribuições

Para questões relacionadas ao Módulo de Configuração, entre em contato com a equipe de desenvolvimento através do canal adequado no sistema de tickets.
