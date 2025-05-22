import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { setupSwagger } from './shared/configs/swagger';
import { HealthCheckService } from './shared/services/health-check.service';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import timeout from 'connect-timeout';
import * as os from 'os';
import * as fs from 'fs';
import * as net from 'net';

/**
 * Verifica se uma porta está disponível
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      server.close();
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Outro erro, vamos assumir que a porta está disponível
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '0.0.0.0');
  });
}

/**
 * Função principal de inicialização da aplicação
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('✨ Iniciando aplicação PGBen...');
  
  // Diagnóstico do ambiente
  logger.log('📊 Informações do Sistema:');
  logger.log(` - Sistema: ${os.platform()} ${os.release()}`);
  logger.log(` - Memória: ${Math.round(os.freemem() / 1024 / 1024)}MB livre de ${Math.round(os.totalmem() / 1024 / 1024)}MB`);
  logger.log(` - CPUs: ${os.cpus().length} núcleos`);
  logger.log(` - Node.js: ${process.version}`);
  logger.log(` - Diretório: ${process.cwd()}`);

  /** Cria a aplicação NestJS com Express */
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    abortOnError: false,
  });

  /** Carrega configurações centralizadas */
  const configService = app.get(ConfigService);
  let port = parseInt(process.env.APP_PORT || '3000', 10);
  const env = configService.get<string>('NODE_ENV', 'development');
  const isDev = env === 'development';
  
  // Verifica se a porta está disponível
  const portAvailable = await isPortAvailable(port);
  if (!portAvailable) {
    logger.warn(`⚠️ Porta ${port} já está em uso!`);
    // Em ambiente de desenvolvimento, podemos tentar outra porta
    if (isDev) {
      const newPort = port + 1;
      logger.warn(`⚠️ Tentando porta alternativa: ${newPort}`);
      if (await isPortAvailable(newPort)) {
        logger.log(`✅ Porta ${newPort} está disponível, usando-a em vez de ${port}`);
        port = newPort;
      } else {
        logger.error(`❌ Porta alternativa ${newPort} também está em uso!`);
      }
    }
  } else {
    logger.log(`✅ Porta ${port} está disponível`);
  }
  
  /** Prefixo global */
  app.setGlobalPrefix('api');

  /** Middleware de segurança */
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : undefined,
  }));
  app.use(compression()); // Compressão gzip
  // Configuração corrigida de timeout (apenas ativa o middleware)
  app.use(timeout('45s')); // Timeout global para requisições - apenas ativa o middleware
  
  /** CORS */
  app.enableCors({
    origin: isDev ? true : [
      configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      '0.0.0.0'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  });

  /** Swagger */
  if (isDev || configService.get<boolean>('ENABLE_SWAGGER', false)) {
    setupSwagger(app);
  }

  /** Pipes / interceptors / filters globais */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        // Mapear todos os erros de validação
        const errorMessages = errors.map(error => {
          // Se houver restrições, pegar a primeira mensagem de erro
          if (error.constraints) {
            const firstConstraintKey = Object.keys(error.constraints)[0];
            return {
              field: error.property,
              message: error.constraints[firstConstraintKey],
              value: error.value,
            };
          }
          return {
            field: error.property,
            message: 'Erro de validação',
            value: error.value,
          };
        });
        
        // Retornar um objeto de erro estruturado
        throw new BadRequestException({
          statusCode: 400,
          message: 'Erro de validação',
          errors: errorMessages,
          error: 'Bad Request',
        });
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Middleware para tratar timeout adequadamente
  app.use((req, res, next) => {
    if (req.timedout) {
      logger.warn(`⏰ Request timeout: ${req.method} ${req.originalUrl}`);
      
      if (!res.headersSent) {
        return res.status(408).json({
          statusCode: 408,
          message: 'Request timeout - operação demorou mais que 45 segundos',
          error: 'Request Timeout',
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }
      return; // Não chama next() se já teve timeout
    }
    
    next(); // Só chama next() se NÃO teve timeout
  });
  
  // Middleware de debug para requisições (ajuda no diagnóstico)
  app.use((req, res, next) => {
    logger.debug(`📝 ${req.method} ${req.originalUrl} - ${req.ip}`);
    next();
  });

  /** Health-check (ignora falhas para não travar o bootstrap) */
  try {
    const health = app.get(HealthCheckService);
    
    logger.log('🔍 Iniciando verificação de saúde dos serviços...');
    
    // Verificamos o Redis com timeout
    let redisOK = false;
    try {
      const redisPromise = health.isRedisAvailable();
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao verificar Redis')), 5000);
      });
      
      redisOK = await Promise.race([redisPromise, timeoutPromise]);
    } catch (redisErr) {
      logger.warn(`⚠️ Verificação do Redis falhou: ${redisErr.message}`);
    }
    
    health.logServicesStatus(redisOK);
  } catch (e) {
    logger.warn(`⚠️ Health-check falhou, mas continuando: ${e.message}`);
  }

  /** Sobe o servidor */
  logger.log(`🚀 Tentando iniciar o servidor na porta ${port}...`);
  
  try {
    // Verificamos se há pacotes necessários para teste
    try {
      await import('node-fetch');
    } catch (e) {
      logger.warn('⚠️ node-fetch não está instalado, instale-o para auto-testes de conectividade');
      // Vamos continuar sem o auto-teste
    }
    
    // Criamos um arquivo de diagnóstico
    const logDir = './logs';
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.writeFileSync(
        `${logDir}/server-startup-${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
        `Iniciando servidor PGBen na porta ${port}\n`+
        `Ambiente: ${env}\n`+
        `Sistema: ${os.platform()} ${os.release()}\n`+
        `Node.js: ${process.version}\n`+
        `Data: ${new Date().toISOString()}\n`
      );
    } catch (e) {
      logger.warn(`⚠️ Não foi possível criar arquivo de log: ${e.message}`);
    }
    
    // Logs de diagnóstico detalhados
    logger.log(`[DIAGNOSTICO] Preparando para iniciar servidor na porta ${port}...`);
    
    // Abordagem alternativa: usar o adaptador HTTP diretamente
    try {
      // Obter o adaptador HTTP subjacente diretamente
      logger.log(`[DIAGNOSTICO] Obtendo adaptador HTTP...`);
      const httpAdapter = app.getHttpAdapter();
      logger.log(`[DIAGNOSTICO] Adaptador HTTP obtido: ${httpAdapter.constructor.name}`);
      
      // Obter o servidor HTTP nativo
      logger.log(`[DIAGNOSTICO] Obtendo servidor HTTP nativo...`);
      const server = httpAdapter.getHttpServer();
      logger.log(`[DIAGNOSTICO] Servidor HTTP nativo obtido`);
      
      // Configurar listeners de eventos para ajudar no diagnóstico
      server.on('error', (error) => {
        logger.error(`[DIAGNOSTICO] Erro no servidor HTTP: ${error.message}`);
      });
      
      server.on('listening', () => {
        logger.log(`[DIAGNOSTICO] Servidor está escutando eventos`);
      });
      
      // Iniciar o servidor com um mecanismo de timeout
      logger.log(`[DIAGNOSTICO] Iniciando servidor na porta ${port}...`);
      
      // Usar uma promessa com timeout para evitar bloqueio indefinido
      const serverPromise = new Promise<any>((resolve, reject) => {
        try {
          // Configura um listener para detecção de sucesso na inicialização
          server.once('listening', () => {
            logger.log(`[DIAGNOSTICO] Evento 'listening' recebido`);
            resolve(server);
          });
          
          // Inicialização do servidor com uma abordagem mais controlada
          server.listen(port, '0.0.0.0', () => {
            logger.log(`[DIAGNOSTICO] Callback de inicialização executado`);
          });
          
          // Verificar se o servidor já está ouvindo (pode já ter inicializado antes do listener ser configurado)
          if (server.listening) {
            logger.log(`[DIAGNOSTICO] Servidor já está ouvindo`);
            resolve(server);
          }
        } catch (error) {
          logger.error(`[DIAGNOSTICO] Erro ao iniciar servidor: ${error.message}`);
          reject(error);
        }
      });
      
      // Timeout para evitar bloqueio indefinido
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          logger.error(`[DIAGNOSTICO] Timeout ao iniciar o servidor - monitorando status do processo...`);
          
          // Em caso de timeout, coletar informações de diagnóstico do sistema
          const memoryUsage = process.memoryUsage();
          logger.error(`[DIAGNOSTICO] Uso de memória: ${JSON.stringify(memoryUsage)}`);
          logger.error(`[DIAGNOSTICO] Uso de CPU: ${process.cpuUsage()}`);
          
          reject(new Error('Timeout ao iniciar o servidor - possível bloqueio indefinido'));
        }, 15000); // 15 segundos de timeout
      });
      
      // Aguarda o primeiro a completar: inicialização do servidor ou timeout
      const activeServer = await Promise.race([serverPromise, timeoutPromise]);
      
      // Verificação imediata do bind
      try {
        const address = server.address();
        logger.log(`✅ Servidor bind realizado:`, JSON.stringify(address, null, 2));
        logger.log(`✅ Servidor iniciado com sucesso na porta ${port}`);
        logger.log('============================================');
        logger.log(`✅ Servidor online:  http://localhost:${port}`);
      } catch (error) {
        logger.error(`[DIAGNOSTICO] Erro ao acessar server.address(): ${error.message}`);
      }
      
      return activeServer; // Retorna o servidor ativo para uso posterior
    } catch (error) {
      logger.error(`[DIAGNOSTICO] Erro geral na inicialização do servidor: ${error.message}`);
      logger.error(error.stack);
      throw error;
    }
    
    // Auto-teste de conectividade (ajuda no diagnóstico)
    setTimeout(async () => {
      try {
        const testUrls = [
          `http://localhost:${port}/api`,
          `http://127.0.0.1:${port}/api`
        ];
        
        logger.log('🧪 Iniciando auto-teste de conectividade...');
        
        let allTestsFailed = true;
        
        for (const url of testUrls) {
          try {
            logger.log(`🧪 Testando: ${url}`);
            
            // Utilizamos o módulo http nativo para evitar dependências externas
            const http = await import('http');
            
            const testPromise = new Promise((resolve, reject) => {
              const req = http.get(url, (res) => {
                logger.log(`✅ Auto-teste ${url} - Status: ${res.statusCode}`);
                allTestsFailed = false;
                resolve(res.statusCode);
              });
              
              req.on('error', (err) => {
                logger.error(`❌ Auto-teste ${url} - Erro: ${err.message}`);
                reject(err);
              });
              
              req.setTimeout(5000, () => {
                req.destroy();
                logger.error(`❌ Auto-teste ${url} - Erro: Timeout após 5 segundos`);
                reject(new Error('Timeout'));
              });
            });
            
            await testPromise.catch(() => {});
          } catch (err) {
            logger.error(`❌ Auto-teste ${url} - Erro: ${err.message}`);
          }
        }
        
        if (allTestsFailed) {
          logger.warn('⚠️ Todos os auto-testes falharam. Possíveis problemas:');
          logger.warn('   1. Firewall bloqueando conexões locais');
          logger.warn('   2. Middleware incorreto bloqueando requisições');
          logger.warn('   3. Servidor não está realmente ouvindo na porta especificada');
          logger.warn('⚠️ Executando verificação adicional de socket...');
          
          // Teste direto de socket TCP (sem HTTP)
          try {
            const net = await import('net');
            const socket = new net.Socket();
            
            const connectPromise = new Promise<boolean>((resolve) => {
              socket.connect(port, '127.0.0.1', () => {
                logger.log('✅ Conexão TCP direta bem-sucedida! Servidor está ouvindo.');
                socket.destroy();
                resolve(true);
              });
              
              socket.on('error', (err) => {
                logger.error(`❌ Teste de socket falhou: ${err.message}`);
                socket.destroy();
                resolve(false);
              });
              
              socket.setTimeout(3000, () => {
                logger.error('❌ Teste de socket falhou: Timeout');
                socket.destroy();
                resolve(false);
              });
            });
            
            await connectPromise;
          } catch (socketErr) {
            logger.error(`❌ Erro ao testar socket: ${socketErr.message}`);
          }
        }
      } catch (error) {
        logger.error(`❌ Erro geral no auto-teste: ${error.message}`);
      }
    }, 3000);
  } catch (error) {
    logger.error(`❌ FALHA CRÍTICA ao fazer bind:`, error);
    logger.error(`Stack trace:`, error.stack);
    
    // Diagnóstico de porta ocupada
    if (error.code === 'EADDRINUSE') {
      logger.error(`🚨 Porta ${port} já está em uso!`);
      logger.error(`Execute: netstat -ano | findstr :${port} para ver o processo`);
    }
    
    throw error;
  }
  
  if (isDev || configService.get<boolean>('ENABLE_SWAGGER', false)) {
    logger.log(`✅ Swagger:          http://localhost:${port}/api-docs`);
  }
  
  logger.log(`✅ Ambiente:         ${env}`);
  logger.log('============================================');

  /** Configuração para graceful shutdown */
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.log(`${signal} recebido - iniciando shutdown gracioso...`);
      
      // Fecha conexões com banco de dados e outros recursos
      await app.close();
      
      // Notifica servidores de logs externos
      logger.log('Aplicação encerrada com sucesso');
      
      // Aguarda finalização de logs
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  });
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Falha crítica ao iniciar: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});