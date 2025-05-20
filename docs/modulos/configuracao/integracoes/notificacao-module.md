# Integração com NotificacaoModule

## Visão Geral

O módulo de Configuração disponibiliza serviços que podem ser utilizados pelo módulo de Notificação para renderizar templates e obter configurações de e-mail/SMS. Esta documentação demonstra como implementar essa integração.

## Serviços Disponibilizados

### 1. Serviço de Templates

O `TemplateService` permite buscar e renderizar templates para e-mails, SMS e notificações.

### 2. Configurações de E-mail/SMS

O `IntegracaoService` fornece acesso às configurações de servidores SMTP e gateways de SMS.

## Implementação da Integração

### Passo 1: Importar o Módulo de Configuração

No arquivo `notificacao.module.ts`, importe o módulo de Configuração:

```typescript
import { Module } from '@nestjs/common';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { NotificacaoService } from './services/notificacao.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
// Outros imports necessários...

@Module({
  imports: [
    ConfiguracaoModule,
    // Outros módulos necessários...
  ],
  controllers: [
    // Controllers do módulo de Notificação...
  ],
  providers: [
    NotificacaoService,
    EmailService,
    SmsService,
    // Outros providers...
  ],
  exports: [
    NotificacaoService,
    EmailService,
    SmsService,
  ]
})
export class NotificacaoModule {}
```

### Passo 2: Injetar os Serviços Necessários

#### Exemplo: Serviço de E-mail

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { TemplateService } from '../../configuracao/services/template.service';
import { IntegracaoService } from '../../configuracao/services/integracao.service';
import { IntegracaoTipoEnum } from '../../configuracao/enums/integracao-tipo.enum';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly templateService: TemplateService,
    private readonly integracaoService: IntegracaoService
  ) {}

  /**
   * Envia um e-mail utilizando um template
   * @param destinatario E-mail do destinatário
   * @param codigoTemplate Código do template a ser utilizado
   * @param dados Dados para renderização do template
   * @param opcoes Opções adicionais (cc, bcc, anexos, etc.)
   */
  async enviarEmailComTemplate(
    destinatario: string,
    codigoTemplate: string,
    dados: any,
    opcoes?: {
      cc?: string[];
      bcc?: string[];
      anexos?: Array<{ filename: string; content: Buffer }>;
    }
  ): Promise<boolean> {
    try {
      // Buscar o template pelo código
      const template = await this.templateService.buscarPorCodigo(codigoTemplate);
      
      if (!template) {
        this.logger.error(`Template não encontrado: ${codigoTemplate}`);
        return false;
      }
      
      // Renderizar o template com os dados fornecidos
      const conteudoHtml = await this.templateService.renderizar(template, dados);
      
      // Extrair o assunto dos dados (ou usar um padrão)
      const assunto = dados.assunto || template.nome;
      
      // Enviar o e-mail
      return await this.enviarEmail(destinatario, assunto, conteudoHtml, opcoes);
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail com template: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envia um e-mail
   * @param destinatario E-mail do destinatário
   * @param assunto Assunto do e-mail
   * @param conteudoHtml Conteúdo HTML do e-mail
   * @param opcoes Opções adicionais (cc, bcc, anexos, etc.)
   */
  async enviarEmail(
    destinatario: string,
    assunto: string,
    conteudoHtml: string,
    opcoes?: {
      cc?: string[];
      bcc?: string[];
      anexos?: Array<{ filename: string; content: Buffer }>;
    }
  ): Promise<boolean> {
    try {
      // Obter configuração de integração para e-mail
      const integracao = await this.integracaoService.buscarPorCodigo('smtp-padrao');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.EMAIL || !integracao.ativo) {
        this.logger.error('Configuração de e-mail não encontrada ou inativa');
        return false;
      }
      
      // Obter configuração e credenciais
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // Configurar transportador de e-mail
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
      
      // Preparar opções de e-mail
      const mailOptions = {
        from: config.from || `"PGBen" <${credenciais.user}>`,
        to: destinatario,
        subject: assunto,
        html: conteudoHtml,
        cc: opcoes?.cc,
        bcc: opcoes?.bcc,
        attachments: opcoes?.anexos
      };
      
      // Enviar e-mail
      const info = await transportador.sendMail(mailOptions);
      
      this.logger.log(`E-mail enviado para ${destinatario}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail: ${error.message}`, error.stack);
      return false;
    }
  }
}
```

#### Exemplo: Serviço de SMS

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { TemplateService } from '../../configuracao/services/template.service';
import { IntegracaoService } from '../../configuracao/services/integracao.service';
import { IntegracaoTipoEnum } from '../../configuracao/enums/integracao-tipo.enum';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly templateService: TemplateService,
    private readonly integracaoService: IntegracaoService
  ) {}

  /**
   * Envia um SMS utilizando um template
   * @param numero Número do destinatário
   * @param codigoTemplate Código do template a ser utilizado
   * @param dados Dados para renderização do template
   */
  async enviarSmsComTemplate(
    numero: string,
    codigoTemplate: string,
    dados: any
  ): Promise<boolean> {
    try {
      // Buscar o template pelo código
      const template = await this.templateService.buscarPorCodigo(codigoTemplate);
      
      if (!template) {
        this.logger.error(`Template não encontrado: ${codigoTemplate}`);
        return false;
      }
      
      // Renderizar o template com os dados fornecidos
      const conteudoSms = await this.templateService.renderizar(template, dados);
      
      // Enviar o SMS
      return await this.enviarSms(numero, conteudoSms);
    } catch (error) {
      this.logger.error(`Erro ao enviar SMS com template: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envia um SMS
   * @param numero Número do destinatário
   * @param mensagem Conteúdo da mensagem
   */
  async enviarSms(numero: string, mensagem: string): Promise<boolean> {
    try {
      // Formatar número (remover caracteres não numéricos)
      const numeroFormatado = numero.replace(/\D/g, '');
      
      // Obter configuração de integração para SMS
      const integracao = await this.integracaoService.buscarPorCodigo('sms-gateway');
      
      if (!integracao || integracao.tipo !== IntegracaoTipoEnum.SMS || !integracao.ativo) {
        this.logger.error('Configuração de SMS não encontrada ou inativa');
        return false;
      }
      
      // Obter configuração e credenciais
      const config = integracao.configuracao;
      const credenciais = integracao.credenciais;
      
      // Preparar requisição para o gateway de SMS
      const response = await axios.post(
        config.apiUrl,
        {
          to: numeroFormatado,
          message: mensagem
        },
        {
          headers: {
            'Authorization': `Bearer ${credenciais.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: config.timeout || 5000
        }
      );
      
      if (response.status === 200 && response.data.success) {
        this.logger.log(`SMS enviado para ${numeroFormatado}: ${response.data.messageId}`);
        return true;
      } else {
        this.logger.error(`Falha ao enviar SMS: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar SMS: ${error.message}`, error.stack);
      return false;
    }
  }
}
```

### Passo 3: Utilizar os Serviços no Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { SmsService } from '../services/sms.service';

@ApiTags('Notificações')
@Controller('notificacoes')
export class NotificacaoController {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService
  ) {}

  @Post('email')
  @ApiOperation({ summary: 'Enviar notificação por e-mail' })
  async enviarEmail(@Body() dto: any) {
    const resultado = await this.emailService.enviarEmailComTemplate(
      dto.email,
      dto.template,
      dto.dados
    );
    
    return {
      sucesso: resultado,
      mensagem: resultado ? 'E-mail enviado com sucesso' : 'Falha ao enviar e-mail'
    };
  }

  @Post('sms')
  @ApiOperation({ summary: 'Enviar notificação por SMS' })
  async enviarSms(@Body() dto: any) {
    const resultado = await this.smsService.enviarSmsComTemplate(
      dto.telefone,
      dto.template,
      dto.dados
    );
    
    return {
      sucesso: resultado,
      mensagem: resultado ? 'SMS enviado com sucesso' : 'Falha ao enviar SMS'
    };
  }
}
```

## Exemplo de Uso

### Envio de E-mail de Boas-vindas

```typescript
// Em um serviço que precisa enviar e-mail de boas-vindas
import { Injectable } from '@nestjs/common';
import { EmailService } from '../notificacao/services/email.service';

@Injectable()
export class UsuarioService {
  constructor(
    private readonly emailService: EmailService
  ) {}

  async criarUsuario(dados) {
    // Lógica para criar o usuário...
    
    // Enviar e-mail de boas-vindas
    await this.emailService.enviarEmailComTemplate(
      dados.email,
      'email-bem-vindo',
      {
        nome: dados.nome,
        link: `https://pgben.natal.rn.gov.br/login?token=${token}`
      }
    );
    
    // Resto da lógica...
  }
}
```

### Envio de SMS de Confirmação

```typescript
// Em um serviço que precisa enviar SMS de confirmação
import { Injectable } from '@nestjs/common';
import { SmsService } from '../notificacao/services/sms.service';

@Injectable()
export class SolicitacaoService {
  constructor(
    private readonly smsService: SmsService
  ) {}

  async registrarSolicitacao(dados) {
    // Lógica para registrar a solicitação...
    
    // Enviar SMS de confirmação
    await this.smsService.enviarSmsComTemplate(
      dados.telefone,
      'sms-confirmacao-solicitacao',
      {
        nome: dados.nome,
        protocolo: solicitacao.protocolo,
        tipo_beneficio: solicitacao.tipoBeneficio.nome
      }
    );
    
    // Resto da lógica...
  }
}
```

## Considerações de Segurança

1. **Validação de Dados**: Sempre valide os dados antes de renderizar templates para evitar injeção de código.
2. **Limitação de Tamanho**: Implemente limites para o tamanho das mensagens, especialmente para SMS.
3. **Monitoramento**: Monitore o uso dos serviços de e-mail e SMS para detectar abusos.
4. **Throttling**: Implemente limites de taxa para evitar envio em massa não autorizado.
5. **Logs**: Mantenha logs detalhados de todas as notificações enviadas para auditoria.
