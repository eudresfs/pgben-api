import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagamento } from '../../src/entities/pagamento.entity';
import { Concessao } from '../../src/entities/concessao.entity';
import { Solicitacao } from '../../src/entities/solicitacao.entity';
import { TipoBeneficio } from '../../src/entities/tipo-beneficio.entity';
import { Beneficiario } from '../../src/entities/beneficiario.entity';
import { User } from '../../src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

describe('Relatórios Pagamentos - Validação de Tipos de Benefício (e2e)', () => {
  let app: INestApplication;
  let pagamentoRepository: Repository<Pagamento>;
  let concessaoRepository: Repository<Concessao>;
  let solicitacaoRepository: Repository<Solicitacao>;
  let tipoBeneficioRepository: Repository<TipoBeneficio>;
  let beneficiarioRepository: Repository<Beneficiario>;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    pagamentoRepository = moduleFixture.get<Repository<Pagamento>>(
      getRepositoryToken(Pagamento),
    );
    concessaoRepository = moduleFixture.get<Repository<Concessao>>(
      getRepositoryToken(Concessao),
    );
    solicitacaoRepository = moduleFixture.get<Repository<Solicitacao>>(
      getRepositoryToken(Solicitacao),
    );
    tipoBeneficioRepository = moduleFixture.get<Repository<TipoBeneficio>>(
      getRepositoryToken(TipoBeneficio),
    );
    beneficiarioRepository = moduleFixture.get<Repository<Beneficiario>>(
      getRepositoryToken(Beneficiario),
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Criar usuário de teste e token de autenticação
    const testUser = await userRepository.save({
      nome: 'Usuário Teste',
      email: 'teste@exemplo.com',
      cpf: '12345678901',
      senha: 'senha123',
      ativo: true,
    });

    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpar dados de teste
    await pagamentoRepository.delete({});
    await concessaoRepository.delete({});
    await solicitacaoRepository.delete({});
    await tipoBeneficioRepository.delete({});
    await beneficiarioRepository.delete({});
  });

  describe('POST /relatorios/pagamentos-pdf', () => {
    it('deve retornar erro 400 quando pagamentos têm tipos de benefício diferentes', async () => {
      // Criar tipos de benefício diferentes
      const tipoBeneficio1 = await tipoBeneficioRepository.save({
        nome: 'Aluguel Social',
        descricao: 'Auxílio para aluguel',
        valor_maximo: 500,
        ativo: true,
      });

      const tipoBeneficio2 = await tipoBeneficioRepository.save({
        nome: 'Cesta Básica',
        descricao: 'Auxílio alimentação',
        valor_maximo: 200,
        ativo: true,
      });

      // Criar beneficiários
      const beneficiario1 = await beneficiarioRepository.save({
        nome: 'João Silva',
        cpf: '11111111111',
        rg: '1111111',
        data_nascimento: new Date('1980-01-01'),
      });

      const beneficiario2 = await beneficiarioRepository.save({
        nome: 'Maria Santos',
        cpf: '22222222222',
        rg: '2222222',
        data_nascimento: new Date('1985-01-01'),
      });

      // Criar solicitações com tipos diferentes
      const solicitacao1 = await solicitacaoRepository.save({
        protocolo: 'SOL001',
        data_abertura: new Date(),
        beneficiario: beneficiario1,
        tipo_beneficio: tipoBeneficio1,
        status: 'APROVADA',
      });

      const solicitacao2 = await solicitacaoRepository.save({
        protocolo: 'SOL002',
        data_abertura: new Date(),
        beneficiario: beneficiario2,
        tipo_beneficio: tipoBeneficio2,
        status: 'APROVADA',
      });

      // Criar concessões
      const concessao1 = await concessaoRepository.save({
        data_inicio: new Date(),
        solicitacao: solicitacao1,
      });

      const concessao2 = await concessaoRepository.save({
        data_inicio: new Date(),
        solicitacao: solicitacao2,
      });

      // Criar pagamentos
      const pagamento1 = await pagamentoRepository.save({
        valor: 500,
        data_pagamento: new Date(),
        numero_parcela: 1,
        total_parcelas: 1,
        concessao: concessao1,
      });

      const pagamento2 = await pagamentoRepository.save({
        valor: 200,
        data_pagamento: new Date(),
        numero_parcela: 1,
        total_parcelas: 1,
        concessao: concessao2,
      });

      // Fazer requisição com pagamentos de tipos diferentes
      const response = await request(app.getHttpServer())
        .post('/relatorios/pagamentos-pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pagamento_ids: [pagamento1.id, pagamento2.id],
        })
        .expect(400);

      expect(response.body.message).toContain(
        'Todos os pagamentos devem ser do mesmo tipo de benefício',
      );
      expect(response.body.message).toContain('Aluguel Social');
      expect(response.body.message).toContain('Cesta Básica');
    });

    it('deve gerar PDF com sucesso quando todos os pagamentos são do mesmo tipo', async () => {
      // Criar tipo de benefício
      const tipoBeneficio = await tipoBeneficioRepository.save({
        nome: 'Aluguel Social',
        descricao: 'Auxílio para aluguel',
        valor_maximo: 500,
        ativo: true,
      });

      // Criar beneficiários
      const beneficiario1 = await beneficiarioRepository.save({
        nome: 'João Silva',
        cpf: '11111111111',
        rg: '1111111',
        data_nascimento: new Date('1980-01-01'),
      });

      const beneficiario2 = await beneficiarioRepository.save({
        nome: 'Maria Santos',
        cpf: '22222222222',
        rg: '2222222',
        data_nascimento: new Date('1985-01-01'),
      });

      // Criar solicitações do mesmo tipo
      const solicitacao1 = await solicitacaoRepository.save({
        protocolo: 'SOL001',
        data_abertura: new Date(),
        beneficiario: beneficiario1,
        tipo_beneficio: tipoBeneficio,
        status: 'APROVADA',
      });

      const solicitacao2 = await solicitacaoRepository.save({
        protocolo: 'SOL002',
        data_abertura: new Date(),
        beneficiario: beneficiario2,
        tipo_beneficio: tipoBeneficio,
        status: 'APROVADA',
      });

      // Criar concessões
      const concessao1 = await concessaoRepository.save({
        data_inicio: new Date(),
        solicitacao: solicitacao1,
      });

      const concessao2 = await concessaoRepository.save({
        data_inicio: new Date(),
        solicitacao: solicitacao2,
      });

      // Criar pagamentos
      const pagamento1 = await pagamentoRepository.save({
        valor: 500,
        data_pagamento: new Date(),
        numero_parcela: 1,
        total_parcelas: 1,
        concessao: concessao1,
      });

      const pagamento2 = await pagamentoRepository.save({
        valor: 500,
        data_pagamento: new Date(),
        numero_parcela: 1,
        total_parcelas: 1,
        concessao: concessao2,
      });

      // Fazer requisição com pagamentos do mesmo tipo
      const response = await request(app.getHttpServer())
        .post('/relatorios/pagamentos-pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pagamento_ids: [pagamento1.id, pagamento2.id],
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain(
        'attachment; filename=relatorio-pagamentos.pdf',
      );
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('deve retornar erro 400 quando lista de pagamentos está vazia', async () => {
      const response = await request(app.getHttpServer())
        .post('/relatorios/pagamentos-pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pagamento_ids: [],
        })
        .expect(400);

      expect(response.body.message).toContain('pagamento_ids');
    });

    it('deve retornar erro 401 quando não há token de autenticação', async () => {
      await request(app.getHttpServer())
        .post('/relatorios/pagamentos-pdf')
        .send({
          pagamento_ids: ['uuid-qualquer'],
        })
        .expect(401);
    });
  });
});