# Integrações Externas

## Visão Geral

O sistema de integrações do PGBen permite configurar e gerenciar conexões com sistemas externos, como serviços de e-mail, SMS, armazenamento em nuvem, APIs externas e serviços de validação. As configurações de integrações são armazenadas de forma segura, com credenciais criptografadas.

## Tipos de Integrações Suportadas

O sistema suporta os seguintes tipos de integrações:

| Tipo | Código | Descrição | Uso Típico |
|------|--------|-----------|------------|
| E-mail | `EMAIL` | Servidores SMTP para envio de e-mails | Notificações, comunicações oficiais |
| SMS | `SMS` | Gateways para envio de SMS | Alertas, códigos de confirmação |
| Armazenamento | `STORAGE` | Serviços de armazenamento em nuvem | Documentos, anexos, backups |
| API Externa | `API_EXTERNA` | APIs de sistemas externos | Integração com outros sistemas |
| Autenticação | `AUTENTICACAO` | Serviços de autenticação | Login social, federação |
| Geocodificação | `GEOCODING` | Serviços de geocodificação | Validação de endereços, mapas |
| Validação de CPF | `VALIDACAO_CPF` | Serviços de validação de CPF | Verificação de dados cadastrais |
| Validação de CEP | `VALIDACAO_CEP` | Serviços de validação de CEP | Preenchimento automático de endereços |

## Integrações Pré-configuradas

O sistema vem com as seguintes integrações pré-configuradas:

| Código | Nome | Tipo | Descrição |
|--------|------|------|-----------|
| `smtp-padrao` | Servidor SMTP Padrão | `EMAIL` | Configuração padrão para envio de e-mails |

## Estrutura de uma Configuração de Integração

Uma configuração de integração é composta por:

1. **Dados Básicos**:
   - Código único da integração
   - Nome descritivo
   - Descrição detalhada
   - Tipo de integração
   - Status de ativação

2. **Configuração**:
   - Parâmetros específicos do tipo de integração (ex: host, porta, URL base)
   - Armazenado como JSON

3. **Credenciais**:
   - Dados sensíveis de autenticação (ex: usuário, senha, chaves API)
   - Armazenados de forma criptografada

## Utilizando o Serviço de Integrações

Para utilizar o serviço de integrações em seu código:

```typescript
import { Injectable } from '@nestjs/common';
import { IntegracaoService } from '../configuracao/services/integracao.service';
import { IntegracaoTipoEnum } from '../configuracao/enums/integracao-tipo.enum';

@Injectable()
export class EmailService {
  constructor(
    private readonly integracaoService: IntegracaoService
  ) {}

  async enviarEmail(destinatario: string, assunto: string, conteudo: string) {
    try {
      // Obter configuração de integração para e-mail
      const integracao = await this.integracaoService.buscarPorCodigo('smtp-padrao');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.EMAIL) {
        throw new Error('Configuração de e-mail não encontrada ou inválida');
      }
      
      // Verificar se a integração está ativa
      if (!integracao.ativo) {
        throw new Error('Serviço de e-mail está desativado');
      }
      
      // Obter configuração e credenciais
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // Configurar transportador de e-mail (exemplo com nodemailer)
      const transportador = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: config.requireTLS,
        auth: {
          user: credenciais.user,
          pass: credenciais.password
        }
      });
      
      // Enviar e-mail
      const resultado = await transportador.sendMail({
        from: config.from || `"PGBen" <${credenciais.user}>`,
        to: destinatario,
        subject: assunto,
        html: conteudo
      });
      
      return {
        sucesso: true,
        mensagemId: resultado.messageId
      };
    } catch (error) {
      // Registrar erro e retornar falha
      console.error('Erro ao enviar e-mail:', error);
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }
}
```

## Testando Integrações

Você pode testar uma integração antes de utilizá-la:

```typescript
// Testar integração existente
const resultado = await this.integracaoService.testar({
  codigo: 'smtp-padrao',
  parametros: {
    destinatario: 'teste@exemplo.com'
  }
});

// Testar configuração sem salvar
const resultado = await this.integracaoService.testar({
  tipo: IntegracaoTipoEnum.EMAIL,
  configuracao: {
    host: 'smtp.exemplo.com',
    port: 587,
    secure: false,
    requireTLS: true
  },
  credenciais: {
    user: 'usuario_teste',
    password: 'senha_teste'
  },
  parametros: {
    destinatario: 'teste@exemplo.com'
  }
});

console.log(resultado); // { sucesso: true/false, mensagem: '...' }
```

## Gerenciando Integrações Programaticamente

Além de usar a interface administrativa, você pode gerenciar integrações programaticamente:

```typescript
// Criar nova integração
await this.integracaoService.criar({
  codigo: 'storage-s3',
  nome: 'Amazon S3 Storage',
  descricao: 'Armazenamento de documentos no Amazon S3',
  tipo: IntegracaoTipoEnum.STORAGE,
  configuracao: {
    region: 'us-east-1',
    bucket: 'pgben-documentos',
    baseUrl: 'https://pgben-documentos.s3.amazonaws.com/'
  },
  credenciais: {
    accessKeyId: 'AKIAXXXXXXXXXXXXXXXX',
    secretAccessKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  }
});

// Atualizar integração existente
await this.integracaoService.atualizar('smtp-padrao', {
  nome: 'Servidor SMTP Principal',
  configuracao: {
    host: 'smtp.novoprovedor.com',
    port: 465,
    secure: true
  }
});

// Atualizar apenas credenciais
await this.integracaoService.atualizarCredenciais('smtp-padrao', {
  user: 'novo_usuario',
  password: 'nova_senha'
});

// Ativar/desativar integração
await this.integracaoService.alterarStatus('smtp-padrao', false); // desativar
```

## Segurança das Credenciais

As credenciais de integrações são tratadas com medidas especiais de segurança:

1. **Criptografia**: Credenciais são criptografadas no banco de dados
2. **Mascaramento**: Ao retornar dados de integrações, credenciais são mascaradas (ex: "pass****")
3. **Acesso restrito**: Apenas usuários com permissões adequadas podem visualizar ou editar credenciais
4. **Auditoria**: Todas as alterações em integrações são registradas no log de auditoria

## Implementações Específicas por Tipo

### Integração de E-mail (SMTP)

**Configuração**:
```json
{
  "host": "smtp.exemplo.com",
  "port": 587,
  "secure": false,
  "requireTLS": true,
  "from": "noreply@pgben.gov.br"
}
```

**Credenciais**:
```json
{
  "user": "usuario_smtp",
  "password": "senha_smtp"
}
```

**Parâmetros de teste**:
```json
{
  "destinatario": "teste@exemplo.com"
}
```

### Integração de SMS

**Configuração**:
```json
{
  "apiUrl": "https://api.sms.exemplo.com/v1/send",
  "timeout": 5000
}
```

**Credenciais**:
```json
{
  "apiKey": "chave_api_secreta"
}
```

**Parâmetros de teste**:
```json
{
  "numero": "84999999999"
}
```

### Integração de Armazenamento (S3)

**Configuração**:
```json
{
  "region": "us-east-1",
  "bucket": "pgben-documentos",
  "baseUrl": "https://pgben-documentos.s3.amazonaws.com/"
}
```

**Credenciais**:
```json
{
  "accessKeyId": "AKIAXXXXXXXXXXXXXXXX",
  "secretAccessKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Parâmetros de teste**:
```json
{
  "testFile": true
}
```

## Boas Práticas

1. **Sempre teste integrações**: Utilize o método `testar()` antes de colocar em produção.
2. **Implemente fallbacks**: Tenha alternativas caso uma integração falhe.
3. **Monitore uso**: Acompanhe o uso de integrações para identificar problemas.
4. **Rotacione credenciais**: Atualize credenciais periodicamente para maior segurança.
5. **Documente parâmetros**: Ao criar novas integrações, documente os parâmetros esperados.

## Exemplos Práticos

### Serviço de Validação de CEP

```typescript
@Injectable()
export class EnderecoService {
  constructor(
    private readonly integracaoService: IntegracaoService
  ) {}

  async buscarEnderecoPorCep(cep: string) {
    try {
      // Remover caracteres não numéricos
      const cepNumerico = cep.replace(/\D/g, '');
      
      if (cepNumerico.length !== 8) {
        throw new Error('CEP inválido');
      }
      
      // Obter configuração de integração para validação de CEP
      const integracao = await this.integracaoService.buscarPorCodigo('validacao-cep');
      
      if (!integracao || !integracao.ativo) {
        throw new Error('Serviço de validação de CEP não disponível');
      }
      
      // Obter configuração
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // Construir URL da requisição
      const url = `${config.baseUrl}/${cepNumerico}`;
      
      // Fazer requisição à API
      const response = await axios.get(url, {
        headers: credenciais.apiKey ? {
          'Authorization': `Bearer ${credenciais.apiKey}`
        } : {}
      });
      
      // Processar e retornar dados
      if (response.data && response.data.erro !== true) {
        return {
          cep: response.data.cep,
          logradouro: response.data.logradouro,
          complemento: response.data.complemento,
          bairro: response.data.bairro,
          cidade: response.data.localidade,
          uf: response.data.uf
        };
      } else {
        throw new Error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
      throw new Error(`Falha ao consultar CEP: ${error.message}`);
    }
  }
}
```
