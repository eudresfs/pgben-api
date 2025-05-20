# Integração com CidadaoModule

## Visão Geral

O módulo de Configuração disponibiliza serviços que podem ser utilizados pelo módulo de Cidadão para parametrizar regras de validação, configurar definições específicas do domínio e gerenciar integrações externas de validação. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Parâmetros

O `ParametroService` permite acessar parâmetros operacionais que controlam regras de validação e comportamentos do módulo de cidadão.

### 2. Configurações de Integrações Externas

O `IntegracaoService` fornece acesso às integrações de validação de CPF, CEP e outros serviços externos.

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `cidadao.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { CidadaoService } from './services/cidadao.service';
import { ValidacaoCidadaoService } from './services/validacao-cidadao.service';
import { EnderecoService } from './services/endereco.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Cidadão...
  ],
  providers: [
    CidadaoService,
    ValidacaoCidadaoService,
    EnderecoService,
    // Outros providers...
  ],
  exports: [
    CidadaoService,
    ValidacaoCidadaoService,
  ]
})
export class CidadaoModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de Validação de Cidadão

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { IntegracaoService } from '../../configuracao/services/integracao.service';
import { IntegracaoTipoEnum } from '../../configuracao/enums/integracao-tipo.enum';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';
import axios from 'axios';

@Injectable()
export class ValidacaoCidadaoService {
  private readonly logger = new Logger(ValidacaoCidadaoService.name);
  private validarCpfExterno: boolean;
  private validarCepExterno: boolean;

  constructor(
    private readonly parametroService: ParametroService,
    private readonly integracaoService: IntegracaoService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega as configurações de validação
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      // Obter parâmetro de validação externa de CPF
      const parametroCpf = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.VALIDAR_CPF_EXTERNO
      );
      
      this.validarCpfExterno = parametroCpf?.valor === 'true';
      
      // Obter parâmetro de validação externa de CEP
      const parametroCep = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.VALIDAR_CEP_EXTERNO
      );
      
      this.validarCepExterno = parametroCep?.valor === 'true';
      
      this.logger.log(`Configurações carregadas: validar CPF externo=${this.validarCpfExterno}, validar CEP externo=${this.validarCepExterno}`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configurações: ${error.message}`, error.stack);
      // Usar valores padrão em caso de erro
      this.validarCpfExterno = false;
      this.validarCepExterno = false;
    }
  }

  /**
   * Valida um CPF
   * @param cpf CPF a ser validado
   */
  async validarCpf(cpf: string): Promise<boolean> {
    try {
      // Remover formatação
      const cpfLimpo = cpf.replace(/\D/g, '');
      
      // Validação básica de formato
      if (cpfLimpo.length !== 11) {
        return false;
      }
      
      // Validação de dígitos iguais
      if (/^(\d)\1+$/.test(cpfLimpo)) {
        return false;
      }
      
      // Validação do algoritmo de dígitos verificadores
      const valido = this.validarDigitosCpf(cpfLimpo);
      
      // Se não estiver configurado para validação externa ou se o CPF já for inválido, retornar
      if (!this.validarCpfExterno || !valido) {
        return valido;
      }
      
      // Validação externa via integração
      return await this.validarCpfExterno(cpfLimpo);
    } catch (error) {
      this.logger.error(`Erro ao validar CPF: ${error.message}`, error.stack);
      // Em caso de erro na validação externa, assumir que o algoritmo básico já validou
      return true;
    }
  }

  /**
   * Valida um CEP e retorna dados do endereço
   * @param cep CEP a ser validado
   */
  async validarCep(cep: string): Promise<any> {
    try {
      // Remover formatação
      const cepLimpo = cep.replace(/\D/g, '');
      
      // Validação básica de formato
      if (cepLimpo.length !== 8) {
        throw new BadRequestException('CEP deve conter 8 dígitos');
      }
      
      // Se não estiver configurado para validação externa, retornar apenas o status
      if (!this.validarCepExterno) {
        return { valido: true };
      }
      
      // Validação externa via integração
      return await this.validarCepExterno(cepLimpo);
    } catch (error) {
      this.logger.error(`Erro ao validar CEP: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao validar CEP: ${error.message}`);
    }
  }

  /**
   * Valida os dígitos verificadores de um CPF
   * @param cpf CPF sem formatação
   */
  private validarDigitosCpf(cpf: string): boolean {
    // Algoritmo de validação dos dígitos verificadores do CPF
    
    // Cálculo do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let resto = 11 - (soma % 11);
    const digito1 = resto === 10 || resto === 11 ? 0 : resto;
    
    // Cálculo do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    resto = 11 - (soma % 11);
    const digito2 = resto === 10 || resto === 11 ? 0 : resto;
    
    // Verificar se os dígitos calculados correspondem aos dígitos informados
    return digito1 === parseInt(cpf.charAt(9)) && digito2 === parseInt(cpf.charAt(10));
  }

  /**
   * Realiza validação externa de CPF via integração
   * @param cpf CPF sem formatação
   */
  private async validarCpfExterno(cpf: string): Promise<boolean> {
    try {
      // Obter configuração de integração para validação de CPF
      const integracao = await this.integracaoService.buscarPorCodigo('validacao-cpf');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.VALIDACAO_CPF || !integracao.ativo) {
        this.logger.warn('Configuração de validação de CPF não encontrada ou inativa.');
        return true; // Assumir válido se não houver integração configurada
      }
      
      // Obter configuração e credenciais
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // Realizar chamada para a API externa
      const response = await axios.post(
        config.baseUrl,
        { cpf },
        {
          headers: {
            'Authorization': `Bearer ${credenciais.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: config.timeout || 5000
        }
      );
      
      // Verificar resposta
      if (response.status === 200 && response.data) {
        return response.data.valido === true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Erro na validação externa de CPF: ${error.message}`, error.stack);
      // Em caso de erro na API externa, assumir válido (o algoritmo básico já validou)
      return true;
    }
  }

  /**
   * Realiza validação externa de CEP via integração
   * @param cep CEP sem formatação
   */
  private async validarCepExterno(cep: string): Promise<any> {
    try {
      // Obter configuração de integração para validação de CEP
      const integracao = await this.integracaoService.buscarPorCodigo('validacao-cep');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.VALIDACAO_CEP || !integracao.ativo) {
        this.logger.warn('Configuração de validação de CEP não encontrada ou inativa.');
        return { valido: true }; // Assumir válido se não houver integração configurada
      }
      
      // Obter configuração e credenciais
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // URL da API
      const url = `${config.baseUrl}/${cep}`;
      
      // Headers da requisição
      const headers: any = {
        'Content-Type': 'application/json'
      };
      
      // Adicionar token se configurado
      if (credenciais.apiKey) {
        headers['Authorization'] = `Bearer ${credenciais.apiKey}`;
      }
      
      // Realizar chamada para a API externa
      const response = await axios.get(url, {
        headers,
        timeout: config.timeout || 5000
      });
      
      // Verificar resposta
      if (response.status === 200 && response.data) {
        // Formatar resposta
        return {
          valido: !response.data.erro,
          cep: response.data.cep,
          logradouro: response.data.logradouro,
          complemento: response.data.complemento,
          bairro: response.data.bairro,
          cidade: response.data.localidade,
          uf: response.data.uf
        };
      }
      
      return { valido: false };
    } catch (error) {
      this.logger.error(`Erro na validação externa de CEP: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao validar CEP: ${error.message}`);
    }
  }
}
```

#### Exemplo: Serviço de Endereço

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ParametroService } from '../../configuracao/services/parametro.service';
import { ValidacaoCidadaoService } from './validacao-cidadao.service';
import { EnderecoRepository } from '../repositories/endereco.repository';
import { EnderecoCreateDto } from '../dtos/endereco-create.dto';
import { ParametroChavesEnum } from '../../configuracao/enums/parametro-chaves.enum';

@Injectable()
export class EnderecoService {
  private readonly logger = new Logger(EnderecoService.name);
  private autoPreencherEndereco: boolean;

  constructor(
    private readonly enderecoRepository: EnderecoRepository,
    private readonly parametroService: ParametroService,
    private readonly validacaoService: ValidacaoCidadaoService
  ) {
    this.carregarConfiguracoes();
  }

  /**
   * Carrega as configurações de endereço
   */
  private async carregarConfiguracoes(): Promise<void> {
    try {
      // Obter parâmetro de auto-preenchimento de endereço
      const parametro = await this.parametroService.buscarPorChave(
        ParametroChavesEnum.AUTO_PREENCHER_ENDERECO
      );
      
      this.autoPreencherEndereco = parametro?.valor === 'true';
      
      this.logger.log(`Auto-preenchimento de endereço: ${this.autoPreencherEndereco ? 'habilitado' : 'desabilitado'}`);
    } catch (error) {
      this.logger.error(`Erro ao carregar configurações: ${error.message}`, error.stack);
      // Usar valor padrão em caso de erro
      this.autoPreencherEndereco = false;
    }
  }

  /**
   * Cria um novo endereço
   * @param dto Dados do endereço
   */
  async criar(dto: EnderecoCreateDto): Promise<any> {
    try {
      // Se auto-preenchimento estiver habilitado e CEP for fornecido
      if (this.autoPreencherEndereco && dto.cep) {
        // Validar CEP e obter dados do endereço
        const dadosCep = await this.validacaoService.validarCep(dto.cep);
        
        if (dadosCep.valido) {
          // Preencher campos vazios com dados do CEP
          if (!dto.logradouro && dadosCep.logradouro) {
            dto.logradouro = dadosCep.logradouro;
          }
          
          if (!dto.bairro && dadosCep.bairro) {
            dto.bairro = dadosCep.bairro;
          }
          
          if (!dto.cidade && dadosCep.cidade) {
            dto.cidade = dadosCep.cidade;
          }
          
          if (!dto.uf && dadosCep.uf) {
            dto.uf = dadosCep.uf;
          }
        }
      }
      
      // Criar o endereço
      const endereco = await this.enderecoRepository.criar(dto);
      
      return endereco;
    } catch (error) {
      this.logger.error(`Erro ao criar endereço: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca dados de CEP
   * @param cep CEP a ser consultado
   */
  async buscarDadosCep(cep: string): Promise<any> {
    try {
      const dados = await this.validacaoService.validarCep(cep);
      return dados;
    } catch (error) {
      this.logger.error(`Erro ao buscar dados de CEP: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Passo 3: Utilizar os Serviços no Controller

```typescript
import { Controller, Post, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CidadaoService } from '../services/cidadao.service';
import { ValidacaoCidadaoService } from '../services/validacao-cidadao.service';
import { EnderecoService } from '../services/endereco.service';
import { CidadaoCreateDto } from '../dtos/cidadao-create.dto';
import { EnderecoCreateDto } from '../dtos/endereco-create.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Cidadãos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cidadaos')
export class CidadaoController {
  constructor(
    private readonly cidadaoService: CidadaoService,
    private readonly validacaoService: ValidacaoCidadaoService,
    private readonly enderecoService: EnderecoService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo cidadão' })
  async criar(
    @Body() dto: CidadaoCreateDto,
    @CurrentUser() usuario
  ) {
    // Validar CPF
    const cpfValido = await this.validacaoService.validarCpf(dto.cpf);
    
    if (!cpfValido) {
      throw new BadRequestException('CPF inválido');
    }
    
    // Criar cidadão
    const cidadao = await this.cidadaoService.criar({
      ...dto,
      created_by: usuario.id
    });
    
    return {
      id: cidadao.id,
      nome: cidadao.nome,
      cpf: cidadao.cpf,
      data_nascimento: cidadao.data_nascimento
    };
  }

  @Post(':id/enderecos')
  @ApiOperation({ summary: 'Adicionar endereço a um cidadão' })
  async adicionarEndereco(
    @Param('id') id: string,
    @Body() dto: EnderecoCreateDto,
    @CurrentUser() usuario
  ) {
    // Criar endereço com auto-preenchimento configurável
    const endereco = await this.enderecoService.criar({
      ...dto,
      cidadao_id: id,
      created_by: usuario.id
    });
    
    return endereco;
  }

  @Get('validar-cpf/:cpf')
  @ApiOperation({ summary: 'Validar CPF' })
  async validarCpf(
    @Param('cpf') cpf: string
  ) {
    const valido = await this.validacaoService.validarCpf(cpf);
    
    return { valido };
  }

  @Get('consultar-cep/:cep')
  @ApiOperation({ summary: 'Consultar CEP' })
  async consultarCep(
    @Param('cep') cep: string
  ) {
    const dados = await this.enderecoService.buscarDadosCep(cep);
    
    return dados;
  }
}
```

## Exemplo de Uso

### Validação de CPF Durante Cadastro

```typescript
// Em um serviço que precisa validar CPF durante cadastro
import { Injectable, BadRequestException } from '@nestjs/common';
import { ValidacaoCidadaoService } from '../cidadao/services/validacao-cidadao.service';

@Injectable()
export class CadastroService {
  constructor(
    private readonly validacaoService: ValidacaoCidadaoService
  ) {}

  async validarFormulario(dados) {
    // Validar CPF
    const cpfValido = await this.validacaoService.validarCpf(dados.cpf);
    
    if (!cpfValido) {
      throw new BadRequestException('CPF inválido');
    }
    
    // Validar CEP se fornecido
    if (dados.cep) {
      const dadosCep = await this.validacaoService.validarCep(dados.cep);
      
      if (!dadosCep.valido) {
        throw new BadRequestException('CEP inválido');
      }
      
      // Auto-preencher dados de endereço
      return {
        ...dados,
        logradouro: dados.logradouro || dadosCep.logradouro,
        bairro: dados.bairro || dadosCep.bairro,
        cidade: dados.cidade || dadosCep.cidade,
        uf: dados.uf || dadosCep.uf
      };
    }
    
    return dados;
  }
}
```

### Preenchimento Automático de Endereço

```typescript
// Em um componente frontend que interage com o backend
async function buscarDadosCep(cep) {
  try {
    // Remover formatação
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return null;
    }
    
    // Consultar API
    const response = await fetch(`/api/cidadaos/consultar-cep/${cepLimpo}`);
    const dados = await response.json();
    
    if (dados.valido) {
      // Preencher campos do formulário
      document.getElementById('logradouro').value = dados.logradouro || '';
      document.getElementById('bairro').value = dados.bairro || '';
      document.getElementById('cidade').value = dados.cidade || '';
      document.getElementById('uf').value = dados.uf || '';
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
}

// Adicionar evento ao campo de CEP
document.getElementById('cep').addEventListener('blur', function() {
  const cep = this.value;
  if (cep) {
    buscarDadosCep(cep);
  }
});
```

## Considerações de Implementação

1. **Cache**: Implemente cache para resultados de validação de CEP para melhorar a performance.
2. **Fallback**: Configure um mecanismo de fallback para validação local caso os serviços externos estejam indisponíveis.
3. **Validação Contextual**: Algumas validações podem depender do contexto, como regras específicas por tipo de benefício.
4. **Internacionalização**: Considere suporte para cidadãos estrangeiros com documentos diferentes de CPF.
5. **Desempenho**: Monitore o desempenho das integrações externas e implemente timeouts adequados.

## Parâmetros de Configuração

| Chave | Tipo | Descrição | Valor Padrão |
|-------|------|-----------|--------------|
| `VALIDAR_CPF_EXTERNO` | Booleano | Se deve validar CPF através de serviço externo | `false` |
| `VALIDAR_CEP_EXTERNO` | Booleano | Se deve validar CEP através de serviço externo | `false` |
| `AUTO_PREENCHER_ENDERECO` | Booleano | Se deve auto-preencher endereço a partir do CEP | `true` |
| `IDADE_MINIMA_CIDADAO` | Número | Idade mínima para cadastro de cidadão | `16` |
| `IDADE_APOSENTADORIA` | Número | Idade de referência para aposentadoria | `65` |
| `VALIDAR_NOME_SOCIAL` | Booleano | Se deve aceitar nome social no cadastro | `true` |

## Segurança e Privacidade

1. **Dados Sensíveis**: Trate documentos como CPF como dados sensíveis, aplicando mascaramento quando necessário.
2. **Logs**: Evite registrar dados pessoais em logs, exceto quando absolutamente necessário.
3. **Acesso**: Implemente controle de acesso granular para operações que envolvem dados de cidadãos.
4. **Comunicação**: Utilize sempre HTTPS para comunicação com serviços externos de validação.
5. **Auditoria**: Mantenha registros de auditoria para todas as consultas externas a dados de cidadãos.
