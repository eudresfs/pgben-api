import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfiguracaoModule } from '../configuracao.module';
import { JwtModule } from '@nestjs/jwt';
import { ParametroTipoEnum } from '../enums/parametro-tipo.enum';
import { TemplateTipoEnum } from '../enums/template-tipo.enum';
import { IntegracaoTipoEnum } from '../enums/integracao-tipo.enum';

/**
 * Teste de integração do Módulo de Configuração
 *
 * Este teste realiza a verificação completa do fluxo de operações
 * CRUD para os diversos serviços do módulo, garantindo que todas
 * as funcionalidades estão operando corretamente.
 */
describe('Configuração - Testes de Integração', () => {
  let app: INestApplication;
  let authToken: string;

  // Dados de teste para criação de um parâmetro
  const parametroTeste = {
    chave: 'teste.parametro',
    valor: 'Valor de teste',
    tipo: ParametroTipoEnum.STRING,
    descricao: 'Parâmetro para testes',
    categoria: 'testes',
  };

  // Dados de teste para criação de um template
  const templateTeste = {
    codigo: 'teste-template',
    nome: 'Template de Teste',
    descricao: 'Template para testes',
    tipo: TemplateTipoEnum.EMAIL,
    conteudo: '<html><body>Olá, {{nome}}!</body></html>',
  };

  // Dados de teste para criação de uma configuração de integração
  const integracaoTeste = {
    codigo: 'teste-integracao',
    nome: 'Integração de Teste',
    descricao: 'Configuração para testes',
    tipo: IntegracaoTipoEnum.EMAIL,
    configuracao: {
      host: 'smtp.teste.com',
      port: 587,
      secure: false,
      from: 'teste@example.com',
    },
    credenciais: {
      user: 'usuario_teste',
      password: 'senha_teste',
    },
  };

  // Configurar a aplicação para os testes
  beforeAll(async () => {
    // Criar o módulo de teste que inclui os componentes necessários
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Configuração do ambiente
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),

        // Conexão com o banco de dados de teste
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_DATABASE', 'pgben_test'),
            entities: ['dist/**/*.entity{.ts,.js}'],
            synchronize: true, // Apenas para ambiente de teste
          }),
          inject: [ConfigService],
        }),

        // Módulo JWT para simulação de autenticação
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET', 'test-secret'),
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService],
        }),

        // Módulo de configuração a ser testado
        ConfiguracaoModule,
      ],
    }).compile();

    // Criar a aplicação
    app = moduleFixture.createNestApplication();

    // Configurar pipes globais para validação
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Criar um token JWT para os testes (simulando um usuário autenticado)
    const jwtService = moduleFixture.get<JwtModule>(JwtModule);
    authToken = `Bearer ${jwtService.sign({
      sub: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      roles: ['admin'],
    })}`;
  });

  // Limpar recursos após os testes
  afterAll(async () => {
    await app.close();
  });

  // Verificar a limpeza entre testes
  afterEach(async () => {
    // Remover os dados de teste criados
    await request(app.getHttpServer())
      .delete(`/configuracao/parametros/${parametroTeste.chave}`)
      .set('Authorization', authToken)
      .catch(() => {});

    await request(app.getHttpServer())
      .delete(`/configuracao/templates/${templateTeste.codigo}`)
      .set('Authorization', authToken)
      .catch(() => {});

    await request(app.getHttpServer())
      .delete(`/configuracao/integracoes/${integracaoTeste.codigo}`)
      .set('Authorization', authToken)
      .catch(() => {});
  });

  //------------------------------------------------------
  // Testes para o serviço de Parâmetros
  //------------------------------------------------------
  describe('Serviço de Parâmetros', () => {
    it('Deve criar, buscar, atualizar e remover um parâmetro', async () => {
      // 1. Criar um parâmetro
      const criarResponse = await request(app.getHttpServer())
        .post('/configuracao/parametros')
        .set('Authorization', authToken)
        .send(parametroTeste)
        .expect(201);

      expect(criarResponse.body).toHaveProperty('id');
      expect(criarResponse.body.chave).toBe(parametroTeste.chave);

      // 2. Buscar o parâmetro criado
      const buscarResponse = await request(app.getHttpServer())
        .get(`/configuracao/parametros/${parametroTeste.chave}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(buscarResponse.body.chave).toBe(parametroTeste.chave);
      expect(buscarResponse.body.valor).toBe(parametroTeste.valor);

      // 3. Atualizar o parâmetro
      const dadosAtualizacao = {
        valor: 'Valor atualizado',
        descricao: 'Descrição atualizada',
      };

      const atualizarResponse = await request(app.getHttpServer())
        .put(`/configuracao/parametros/${parametroTeste.chave}`)
        .set('Authorization', authToken)
        .send(dadosAtualizacao)
        .expect(200);

      expect(atualizarResponse.body.valor).toBe(dadosAtualizacao.valor);
      expect(atualizarResponse.body.descricao).toBe(dadosAtualizacao.descricao);

      // 4. Remover o parâmetro
      await request(app.getHttpServer())
        .delete(`/configuracao/parametros/${parametroTeste.chave}`)
        .set('Authorization', authToken)
        .expect(204);

      // 5. Verificar que o parâmetro foi removido
      await request(app.getHttpServer())
        .get(`/configuracao/parametros/${parametroTeste.chave}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('Deve buscar parâmetros por categoria', async () => {
      // 1. Criar um parâmetro
      await request(app.getHttpServer())
        .post('/configuracao/parametros')
        .set('Authorization', authToken)
        .send(parametroTeste)
        .expect(201);

      // 2. Buscar por categoria
      const buscarResponse = await request(app.getHttpServer())
        .get(`/configuracao/parametros/categoria/${parametroTeste.categoria}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(buscarResponse.body)).toBe(true);
      expect(buscarResponse.body.length).toBeGreaterThan(0);
      expect(buscarResponse.body[0].categoria).toBe(parametroTeste.categoria);
    });
  });

  //------------------------------------------------------
  // Testes para o serviço de Templates
  //------------------------------------------------------
  describe('Serviço de Templates', () => {
    it('Deve criar, buscar, atualizar e remover um template', async () => {
      // 1. Criar um template
      const criarResponse = await request(app.getHttpServer())
        .post('/configuracao/templates')
        .set('Authorization', authToken)
        .send(templateTeste)
        .expect(201);

      expect(criarResponse.body).toHaveProperty('id');
      expect(criarResponse.body.codigo).toBe(templateTeste.codigo);

      // 2. Buscar o template criado
      const buscarResponse = await request(app.getHttpServer())
        .get(`/configuracao/templates/${templateTeste.codigo}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(buscarResponse.body.codigo).toBe(templateTeste.codigo);
      expect(buscarResponse.body.nome).toBe(templateTeste.nome);

      // 3. Atualizar o template
      const dadosAtualizacao = {
        nome: 'Nome Atualizado',
        descricao: 'Descrição atualizada',
        conteudo: '<html><body>Conteúdo atualizado, {{nome}}!</body></html>',
      };

      const atualizarResponse = await request(app.getHttpServer())
        .put(`/configuracao/templates/${templateTeste.codigo}`)
        .set('Authorization', authToken)
        .send(dadosAtualizacao)
        .expect(200);

      expect(atualizarResponse.body.nome).toBe(dadosAtualizacao.nome);
      expect(atualizarResponse.body.descricao).toBe(dadosAtualizacao.descricao);
      expect(atualizarResponse.body.conteudo).toBe(dadosAtualizacao.conteudo);

      // 4. Testar renderização do template
      const testarResponse = await request(app.getHttpServer())
        .post('/configuracao/templates/testar')
        .set('Authorization', authToken)
        .send({
          conteudo: dadosAtualizacao.conteudo,
          dados: { nome: 'João' },
        })
        .expect(200);

      expect(testarResponse.body.conteudo).toBe(
        '<html><body>Conteúdo atualizado, João!</body></html>',
      );

      // 5. Alterar status do template
      const statusResponse = await request(app.getHttpServer())
        .put(`/configuracao/templates/${templateTeste.codigo}/status`)
        .set('Authorization', authToken)
        .send({ ativo: false })
        .expect(200);

      expect(statusResponse.body.ativo).toBe(false);

      // 6. Remover o template
      await request(app.getHttpServer())
        .delete(`/configuracao/templates/${templateTeste.codigo}`)
        .set('Authorization', authToken)
        .expect(204);

      // 7. Verificar que o template foi removido
      await request(app.getHttpServer())
        .get(`/configuracao/templates/${templateTeste.codigo}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('Deve buscar templates por tipo', async () => {
      // 1. Criar um template
      await request(app.getHttpServer())
        .post('/configuracao/templates')
        .set('Authorization', authToken)
        .send(templateTeste)
        .expect(201);

      // 2. Buscar por tipo
      const buscarResponse = await request(app.getHttpServer())
        .get(`/configuracao/templates/tipo/${templateTeste.tipo}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(buscarResponse.body)).toBe(true);
      expect(buscarResponse.body.length).toBeGreaterThan(0);
      expect(buscarResponse.body[0].tipo).toBe(templateTeste.tipo);
    });
  });

  //------------------------------------------------------
  // Testes para o serviço de Integrações
  //------------------------------------------------------
  describe('Serviço de Integrações', () => {
    it('Deve criar, buscar, atualizar e remover uma configuração de integração', async () => {
      // 1. Criar uma configuração de integração
      const criarResponse = await request(app.getHttpServer())
        .put(`/configuracao/integracoes/${integracaoTeste.codigo}`)
        .set('Authorization', authToken)
        .send(integracaoTeste)
        .expect(200);

      expect(criarResponse.body).toHaveProperty('id');
      expect(criarResponse.body.codigo).toBe(integracaoTeste.codigo);

      // 2. Buscar a configuração criada
      const buscarResponse = await request(app.getHttpServer())
        .get(`/configuracao/integracoes/${integracaoTeste.codigo}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(buscarResponse.body.codigo).toBe(integracaoTeste.codigo);
      expect(buscarResponse.body.nome).toBe(integracaoTeste.nome);
      expect(buscarResponse.body.configuracao).toEqual(
        integracaoTeste.configuracao,
      );
      // As credenciais não devem ser retornadas na resposta
      expect(buscarResponse.body.credenciais).toBeUndefined();

      // 3. Atualizar a configuração
      const dadosAtualizacao = {
        nome: 'Nome Atualizado',
        descricao: 'Descrição atualizada',
        configuracao: {
          ...integracaoTeste.configuracao,
          port: 465,
          secure: true,
        },
      };

      const atualizarResponse = await request(app.getHttpServer())
        .put(`/configuracao/integracoes/${integracaoTeste.codigo}`)
        .set('Authorization', authToken)
        .send(dadosAtualizacao)
        .expect(200);

      expect(atualizarResponse.body.nome).toBe(dadosAtualizacao.nome);
      expect(atualizarResponse.body.descricao).toBe(dadosAtualizacao.descricao);
      expect(atualizarResponse.body.configuracao).toEqual(
        dadosAtualizacao.configuracao,
      );

      // 4. Alterar status da configuração
      const statusResponse = await request(app.getHttpServer())
        .put(`/configuracao/integracoes/${integracaoTeste.codigo}/status`)
        .set('Authorization', authToken)
        .send({ ativo: false })
        .expect(200);

      expect(statusResponse.body.ativo).toBe(false);

      // 5. Remover a configuração
      await request(app.getHttpServer())
        .delete(`/configuracao/integracoes/${integracaoTeste.codigo}`)
        .set('Authorization', authToken)
        .expect(204);

      // 6. Verificar que a configuração foi removida
      await request(app.getHttpServer())
        .get(`/configuracao/integracoes/${integracaoTeste.codigo}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('Deve buscar configurações de integração por tipo', async () => {
      // 1. Criar uma configuração de integração
      await request(app.getHttpServer())
        .put(`/configuracao/integracoes/${integracaoTeste.codigo}`)
        .set('Authorization', authToken)
        .send(integracaoTeste)
        .expect(200);

      // 2. Buscar por tipo
      const buscarResponse = await request(app.getHttpServer())
        .get(`/configuracao/integracoes?tipo=${integracaoTeste.tipo}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(buscarResponse.body)).toBe(true);
      expect(buscarResponse.body.length).toBeGreaterThan(0);
      expect(buscarResponse.body[0].tipo).toBe(integracaoTeste.tipo);
    });

    it('Deve testar uma configuração de integração', async () => {
      // 1. Testar uma configuração
      // Note: Em um ambiente de teste real, você provavelmente usaria um mock para o
      // serviço externo que é testado, como um servidor SMTP
      const testarResponse = await request(app.getHttpServer())
        .post('/configuracao/integracoes/testar')
        .set('Authorization', authToken)
        .send({
          tipo: IntegracaoTipoEnum.EMAIL,
          configuracao: integracaoTeste.configuracao,
          credenciais: integracaoTeste.credenciais,
          dadosTeste: {
            para: 'teste@example.com',
            assunto: 'Teste de Integração',
            mensagem: 'Esta é uma mensagem de teste.',
          },
        })
        .expect(200);

      // Em um teste real, você verificaria o sucesso ou falha com base na resposta do serviço externo
      expect(testarResponse.body).toHaveProperty('sucesso');
      expect(testarResponse.body).toHaveProperty('mensagem');
    });
  });

  //------------------------------------------------------
  // Testes para o serviço de Limites
  //------------------------------------------------------
  describe('Serviço de Limites', () => {
    it('Deve atualizar e buscar limites de upload', async () => {
      // 1. Buscar limites atuais
      const buscarLimitesResponse = await request(app.getHttpServer())
        .get('/configuracao/limites/upload')
        .set('Authorization', authToken)
        .expect(200);

      // 2. Atualizar limites
      const limitesAtualizados = {
        tamanhoMaximoArquivo: 20971520, // 20MB
        numeroMaximoArquivos: 30,
        extensoesPermitidas: ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx'],
        maximoPorRequisicao: 10,
      };

      const atualizarResponse = await request(app.getHttpServer())
        .put('/configuracao/limites/upload')
        .set('Authorization', authToken)
        .send(limitesAtualizados)
        .expect(200);

      expect(atualizarResponse.body.tamanhoMaximoArquivo).toBe(
        limitesAtualizados.tamanhoMaximoArquivo,
      );
      expect(atualizarResponse.body.numeroMaximoArquivos).toBe(
        limitesAtualizados.numeroMaximoArquivos,
      );
      expect(atualizarResponse.body.extensoesPermitidas).toEqual(
        expect.arrayContaining(limitesAtualizados.extensoesPermitidas),
      );
      expect(atualizarResponse.body.maximoPorRequisicao).toBe(
        limitesAtualizados.maximoPorRequisicao,
      );

      // 3. Verificar que os limites foram atualizados
      const verificarResponse = await request(app.getHttpServer())
        .get('/configuracao/limites/upload')
        .set('Authorization', authToken)
        .expect(200);

      expect(verificarResponse.body).toEqual(atualizarResponse.body);
    });

    it('Deve atualizar e buscar prazos', async () => {
      // 1. Buscar prazo atual de análise
      const buscarPrazoResponse = await request(app.getHttpServer())
        .get('/configuracao/limites/prazos/analise')
        .set('Authorization', authToken)
        .expect(200);

      expect(buscarPrazoResponse.body).toHaveProperty('tipo', 'analise');
      expect(buscarPrazoResponse.body).toHaveProperty('dias');

      // 2. Atualizar prazo
      const prazoAtualizado = {
        dias: 20,
      };

      const atualizarResponse = await request(app.getHttpServer())
        .put('/configuracao/limites/prazos/analise')
        .set('Authorization', authToken)
        .send(prazoAtualizado)
        .expect(200);

      expect(atualizarResponse.body).toHaveProperty('tipo', 'analise');
      expect(atualizarResponse.body).toHaveProperty(
        'dias',
        prazoAtualizado.dias,
      );

      // 3. Verificar que o prazo foi atualizado
      const verificarResponse = await request(app.getHttpServer())
        .get('/configuracao/limites/prazos/analise')
        .set('Authorization', authToken)
        .expect(200);

      expect(verificarResponse.body).toEqual(atualizarResponse.body);

      // 4. Buscar data limite baseada no prazo
      const dataLimiteResponse = await request(app.getHttpServer())
        .get('/configuracao/limites/prazos/analise/data-limite')
        .set('Authorization', authToken)
        .expect(200);

      expect(dataLimiteResponse.body).toHaveProperty('tipo', 'analise');
      expect(dataLimiteResponse.body).toHaveProperty(
        'dias',
        prazoAtualizado.dias,
      );
      expect(dataLimiteResponse.body).toHaveProperty('dataLimite');

      // A data limite deve ser uma data futura
      const dataLimite = new Date(dataLimiteResponse.body.dataLimite);
      const hoje = new Date();
      expect(dataLimite > hoje).toBe(true);
    });
  });
});
