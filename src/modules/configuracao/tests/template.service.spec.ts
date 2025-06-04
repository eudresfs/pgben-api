import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from '../services/template.service';
import { TemplateRepository } from '../repositories/template.repository';
import { TemplateCreateDto } from '../dtos/template/template-create.dto';
import { TemplateUpdateDto } from '../dtos/template/template-update.dto';
import { TemplateTestDto } from '../dtos/template/template-test.dto';
import { TemplateTipoEnum } from '../enums/template-tipo.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock do Repositório
const mockTemplateRepository = {
  findByCodigo: jest.fn(),
  findAll: jest.fn(),
  findByTipo: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('TemplateService', () => {
  let service: TemplateService;
  let repository: TemplateRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: TemplateRepository,
          useValue: mockTemplateRepository,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    repository = module.get<TemplateRepository>(TemplateRepository);

    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('buscarPorCodigo', () => {
    it('deve retornar um template quando encontrado', async () => {
      // Arrange
      const templateMock = {
        id: '1',
        codigo: 'email-bem-vindo',
        nome: 'E-mail de Boas-vindas',
        descricao: 'Template para e-mail de boas-vindas',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Bem-vindo, {{nome}}!</body></html>',
        ativo: true,
      };

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(templateMock);

      // Act
      const resultado = await service.buscarPorCodigo('email-bem-vindo');

      // Assert
      expect(resultado).toEqual(templateMock);
      expect(repository.findByCodigo).toHaveBeenCalledWith('email-bem-vindo');
    });

    it('deve lançar NotFoundException quando o template não for encontrado', async () => {
      // Arrange
      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.buscarPorCodigo('template-inexistente'),
      ).rejects.toThrow(NotFoundException);

      expect(repository.findByCodigo).toHaveBeenCalledWith(
        'template-inexistente',
      );
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar todos os templates quando não for especificado um tipo', async () => {
      // Arrange
      const templatesMock = [
        {
          id: '1',
          codigo: 'email-bem-vindo',
          nome: 'E-mail de Boas-vindas',
          descricao: 'Template para e-mail de boas-vindas',
          tipo: TemplateTipoEnum.EMAIL,
          conteudo: '<html><body>Bem-vindo, {{nome}}!</body></html>',
          ativo: true,
        },
        {
          id: '2',
          codigo: 'notificacao-solicitacao',
          nome: 'Notificação de Solicitação',
          descricao: 'Template para notificação de solicitação',
          tipo: TemplateTipoEnum.NOTIFICACAO,
          conteudo: 'Sua solicitação {{protocolo}} foi recebida',
          ativo: true,
        },
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(templatesMock);

      // Act
      const resultado = await service.buscarTodos();

      // Assert
      expect(resultado).toEqual(templatesMock);
      expect(repository.findAll).toHaveBeenCalled();
      expect(repository.findByTipo).not.toHaveBeenCalled();
    });

    it('deve retornar templates filtrados por tipo quando especificado', async () => {
      // Arrange
      const tipo = TemplateTipoEnum.EMAIL;
      const templatesMock = [
        {
          id: '1',
          codigo: 'email-bem-vindo',
          nome: 'E-mail de Boas-vindas',
          descricao: 'Template para e-mail de boas-vindas',
          tipo: TemplateTipoEnum.EMAIL,
          conteudo: '<html><body>Bem-vindo, {{nome}}!</body></html>',
          ativo: true,
        },
      ];

      jest.spyOn(repository, 'findByTipo').mockResolvedValue(templatesMock);

      // Act
      const resultado = await service.buscarTodos(tipo);

      // Assert
      expect(resultado).toEqual(templatesMock);
      expect(repository.findByTipo).toHaveBeenCalledWith(tipo);
      expect(repository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('buscarPorTipo', () => {
    it('deve retornar templates filtrados por tipo', async () => {
      // Arrange
      const tipo = TemplateTipoEnum.EMAIL;
      const templatesMock = [
        {
          id: '1',
          codigo: 'email-bem-vindo',
          nome: 'E-mail de Boas-vindas',
          descricao: 'Template para e-mail de boas-vindas',
          tipo: TemplateTipoEnum.EMAIL,
          conteudo: '<html><body>Bem-vindo, {{nome}}!</body></html>',
          ativo: true,
        },
      ];

      jest.spyOn(repository, 'findByTipo').mockResolvedValue(templatesMock);

      // Act
      const resultado = await service.buscarPorTipo(tipo);

      // Assert
      expect(resultado).toEqual(templatesMock);
      expect(repository.findByTipo).toHaveBeenCalledWith(tipo);
    });
  });

  describe('criar', () => {
    it('deve criar um novo template com sucesso', async () => {
      // Arrange
      const dto: TemplateCreateDto = {
        codigo: 'novo-template',
        nome: 'Novo Template',
        descricao: 'Descrição do novo template',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo:
          '<html><body>Conteúdo do template: {{variavel}}</body></html>',
      };

      const templateMock = {
        id: '3',
        ...dto,
        ativo: true,
      };

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue(templateMock);

      // Act
      const resultado = await service.criar(dto);

      // Assert
      expect(resultado).toEqual(templateMock);
      expect(repository.findByCodigo).toHaveBeenCalledWith('novo-template');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          ativo: true,
        }),
      );
    });

    it('deve lançar BadRequestException ao tentar criar um template com código já existente', async () => {
      // Arrange
      const dto: TemplateCreateDto = {
        codigo: 'template-existente',
        nome: 'Template Existente',
        descricao: 'Descrição do template',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Conteúdo</body></html>',
      };

      const templateExistente = {
        id: '4',
        ...dto,
        ativo: true,
      };

      jest
        .spyOn(repository, 'findByCodigo')
        .mockResolvedValue(templateExistente);

      // Act & Assert
      await expect(service.criar(dto)).rejects.toThrow(BadRequestException);

      expect(repository.findByCodigo).toHaveBeenCalledWith(
        'template-existente',
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando o conteúdo do template for inválido', async () => {
      // Arrange
      const dto: TemplateCreateDto = {
        codigo: 'template-invalido',
        nome: 'Template Inválido',
        descricao: 'Descrição do template',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>{{#each items}}</body></html>', // Template inválido (tag não fechada)
      };

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);

      // Act & Assert
      await expect(service.criar(dto)).rejects.toThrow(BadRequestException);

      expect(repository.findByCodigo).toHaveBeenCalledWith('template-invalido');
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('deve atualizar um template existente com sucesso', async () => {
      // Arrange
      const codigo = 'template-existente';
      const dto: TemplateUpdateDto = {
        nome: 'Nome Atualizado',
        descricao: 'Descrição atualizada',
        conteudo: '<html><body>Conteúdo atualizado: {{variavel}}</body></html>',
      };

      const templateExistente = {
        id: '5',
        codigo,
        nome: 'Nome Antigo',
        descricao: 'Descrição antiga',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Conteúdo antigo</body></html>',
        ativo: true,
      };

      const templateAtualizado = {
        ...templateExistente,
        ...dto,
      };

      jest
        .spyOn(repository, 'findByCodigo')
        .mockResolvedValue(templateExistente);
      jest.spyOn(repository, 'save').mockResolvedValue(templateAtualizado);

      // Act
      const resultado = await service.atualizar(codigo, dto);

      // Assert
      expect(resultado).toEqual(templateAtualizado);
      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...templateExistente,
          ...dto,
        }),
      );
    });

    it('deve lançar NotFoundException ao tentar atualizar um template inexistente', async () => {
      // Arrange
      const codigo = 'template-inexistente';
      const dto: TemplateUpdateDto = {
        nome: 'Nome Atualizado',
        descricao: 'Descrição atualizada',
        conteudo: '<html><body>Conteúdo atualizado</body></html>',
      };

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);

      // Act & Assert
      await expect(service.atualizar(codigo, dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando o conteúdo atualizado for inválido', async () => {
      // Arrange
      const codigo = 'template-existente';
      const dto: TemplateUpdateDto = {
        nome: 'Nome Atualizado',
        descricao: 'Descrição atualizada',
        conteudo: '<html><body>{{#if invalido}</body></html>', // Template inválido (tag não fechada)
      };

      const templateExistente = {
        id: '6',
        codigo,
        nome: 'Nome Antigo',
        descricao: 'Descrição antiga',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Conteúdo antigo</body></html>',
        ativo: true,
      };

      jest
        .spyOn(repository, 'findByCodigo')
        .mockResolvedValue(templateExistente);

      // Act & Assert
      await expect(service.atualizar(codigo, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('deve remover um template existente com sucesso', async () => {
      // Arrange
      const codigo = 'template-existente';
      const templateExistente = {
        id: '7',
        codigo,
        nome: 'Template Existente',
        descricao: 'Descrição do template',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Conteúdo</body></html>',
        ativo: true,
      };

      jest
        .spyOn(repository, 'findByCodigo')
        .mockResolvedValue(templateExistente);
      jest.spyOn(repository, 'remove').mockResolvedValue(undefined);

      // Act
      await service.remover(codigo);

      // Assert
      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.remove).toHaveBeenCalledWith(templateExistente);
    });

    it('deve lançar NotFoundException ao tentar remover um template inexistente', async () => {
      // Arrange
      const codigo = 'template-inexistente';

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);

      // Act & Assert
      await expect(service.remover(codigo)).rejects.toThrow(NotFoundException);

      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('alterarStatus', () => {
    it('deve alterar o status do template para ativo', async () => {
      // Arrange
      const codigo = 'template-existente';
      const ativo = true;

      const templateExistente = {
        id: '8',
        codigo,
        nome: 'Template Existente',
        descricao: 'Descrição do template',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Conteúdo</body></html>',
        ativo: false,
      };

      const templateAtualizado = {
        ...templateExistente,
        ativo,
      };

      jest
        .spyOn(repository, 'findByCodigo')
        .mockResolvedValue(templateExistente);
      jest.spyOn(repository, 'save').mockResolvedValue(templateAtualizado);

      // Act
      const resultado = await service.alterarStatus(codigo, ativo);

      // Assert
      expect(resultado).toEqual(templateAtualizado);
      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...templateExistente,
          ativo,
        }),
      );
    });

    it('deve lançar NotFoundException ao tentar alterar o status de um template inexistente', async () => {
      // Arrange
      const codigo = 'template-inexistente';
      const ativo = true;

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);

      // Act & Assert
      await expect(service.alterarStatus(codigo, ativo)).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('testar', () => {
    it('deve renderizar um template com sucesso', async () => {
      // Arrange
      const dto: TemplateTestDto = {
        conteudo: '<html><body>Olá, {{nome}}!</body></html>',
        dados: { nome: 'João' },
      };

      const conteudoEsperado = '<html><body>Olá, João!</body></html>';

      // Act
      const resultado = await service.testar(dto);

      // Assert
      expect(resultado).toEqual({ conteudo: conteudoEsperado });
    });

    it('deve lançar BadRequestException quando o template for inválido', async () => {
      // Arrange
      const dto: TemplateTestDto = {
        conteudo: '<html><body>{{#each items}}</body></html>', // Template inválido (tag não fechada)
        dados: { items: ['item1', 'item2'] },
      };

      // Act & Assert
      await expect(service.testar(dto)).rejects.toThrow(BadRequestException);
    });

    it('deve renderizar um template com dados complexos', async () => {
      // Arrange
      const dto: TemplateTestDto = {
        conteudo: `
          <html>
            <body>
              <h1>Lista de Itens</h1>
              <ul>
                {{#each items}}
                  <li>{{nome}} - R$ {{preco}}</li>
                {{/each}}
              </ul>
              <p>Total: R$ {{total}}</p>
            </body>
          </html>
        `,
        dados: {
          items: [
            { nome: 'Item 1', preco: 10.5 },
            { nome: 'Item 2', preco: 20.75 },
          ],
          total: 31.25,
        },
      };

      // Act
      const resultado = await service.testar(dto);

      // Assert
      expect(resultado).toHaveProperty('conteudo');
      expect(resultado.conteudo).toContain('<li>Item 1 - R$ 10.5</li>');
      expect(resultado.conteudo).toContain('<li>Item 2 - R$ 20.75</li>');
      expect(resultado.conteudo).toContain('<p>Total: R$ 31.25</p>');
    });
  });

  describe('renderizar', () => {
    it('deve renderizar um template existente com sucesso', async () => {
      // Arrange
      const codigo = 'email-bem-vindo';
      const dados = { nome: 'João', link: 'https://exemplo.com' };

      const templateMock = {
        id: '9',
        codigo,
        nome: 'E-mail de Boas-vindas',
        descricao: 'Template para e-mail de boas-vindas',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo:
          '<html><body>Bem-vindo, {{nome}}! <a href="{{link}}">Acesse aqui</a></body></html>',
        ativo: true,
      };

      const conteudoEsperado =
        '<html><body>Bem-vindo, João! <a href="https://exemplo.com">Acesse aqui</a></body></html>';

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(templateMock);

      // Act
      const resultado = await service.renderizar(codigo, dados);

      // Assert
      expect(resultado).toBe(conteudoEsperado);
      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
    });

    it('deve lançar NotFoundException ao tentar renderizar um template inexistente', async () => {
      // Arrange
      const codigo = 'template-inexistente';
      const dados = { nome: 'João' };

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(null);

      // Act & Assert
      await expect(service.renderizar(codigo, dados)).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
    });

    it('deve lançar BadRequestException quando o template não estiver ativo', async () => {
      // Arrange
      const codigo = 'template-inativo';
      const dados = { nome: 'João' };

      const templateMock = {
        id: '10',
        codigo,
        nome: 'Template Inativo',
        descricao: 'Template inativo para teste',
        tipo: TemplateTipoEnum.EMAIL,
        conteudo: '<html><body>Conteúdo</body></html>',
        ativo: false,
      };

      jest.spyOn(repository, 'findByCodigo').mockResolvedValue(templateMock);

      // Act & Assert
      await expect(service.renderizar(codigo, dados)).rejects.toThrow(
        BadRequestException,
      );

      expect(repository.findByCodigo).toHaveBeenCalledWith(codigo);
    });
  });
});
