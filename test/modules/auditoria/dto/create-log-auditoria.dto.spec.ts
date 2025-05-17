import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLogAuditoriaDto } from '../../../../src/modules/auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';

describe('CreateLogAuditoriaDto', () => {
  it('deve ser válido com todos os campos obrigatórios', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.CREATE,
      entidade_afetada: 'Usuario',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve ser inválido sem tipo_operacao', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      entidade_afetada: 'Usuario',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tipo_operacao');
  });

  it('deve ser inválido sem entidade_afetada', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.CREATE,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('entidade_afetada');
  });

  it('deve ser inválido com tipo_operacao inválido', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: 'INVALID_TYPE' as TipoOperacao,
      entidade_afetada: 'Usuario',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tipo_operacao');
  });

  it('deve ser válido com campos opcionais', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'Usuario',
      entidade_id: '123e4567-e89b-12d3-a456-426614174000',
      dados_anteriores: { nome: 'João' },
      dados_novos: { nome: 'João Silva' },
      usuario_id: '123e4567-e89b-12d3-a456-426614174001',
      ip_origem: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      endpoint: '/api/v1/usuarios',
      metodo_http: 'PUT',
      dados_sensiveis_acessados: ['cpf', 'renda_familiar'],
      motivo: 'Correção de dados cadastrais',
      descricao: 'Atualização de nome do usuário',
      data_hora: new Date().toISOString(),
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve ser inválido com entidade_id em formato inválido', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
      entidade_id: 'id-invalido',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('entidade_id');
  });

  it('deve ser inválido com IP em formato inválido', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
      ip_origem: 'ip-invalido',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('ip_origem');
  });

  it('deve ser válido com dados_sensiveis_acessados como array vazio', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
      dados_sensiveis_acessados: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve ser inválido com dados_sensiveis_acessados como string', async () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
      dados_sensiveis_acessados: 'cpf' as any,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('dados_sensiveis_acessados');
  });

  it('deve verificar corretamente se contém dados LGPD', () => {
    const dtoComDadosLGPD = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
      dados_sensiveis_acessados: ['cpf', 'renda_familiar'],
    });

    const dtoSemDadosLGPD = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
      dados_sensiveis_acessados: [],
    });

    const dtoSemCampoLGPD = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.READ,
      entidade_afetada: 'Usuario',
    });

    expect(dtoComDadosLGPD.contemDadosLGPD()).toBe(true);
    expect(dtoSemDadosLGPD.contemDadosLGPD()).toBe(false);
    expect(dtoSemCampoLGPD.contemDadosLGPD()).toBe(false);
  });

  it('deve retornar uma representação textual correta', () => {
    const dto = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.CREATE,
      entidade_afetada: 'Usuario',
      entidade_id: '123e4567-e89b-12d3-a456-426614174000',
      descricao: 'Criação de novo usuário',
    });

    expect(dto.toString()).toBe(
      '[create] Usuario (123e4567-e89b-12d3-a456-426614174000) - Criação de novo usuário',
    );

    const dtoSemDescricao = plainToInstance(CreateLogAuditoriaDto, {
      tipo_operacao: TipoOperacao.CREATE,
      entidade_afetada: 'Usuario',
    });

    expect(dtoSemDescricao.toString()).toBe('[create] Usuario - Sem descrição');
  });
});
