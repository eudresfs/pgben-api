import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EnderecoDto } from '../../../src/shared/dtos/endereco.dto';
import { CREATE, UPDATE } from '../../../src/shared/validators/validation-groups';

describe('EnderecoDto', () => {
  it('deve ser válido com todos os campos obrigatórios', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve ser válido com todos os campos incluindo opcionais', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve ser inválido sem logradouro', async () => {
    const dto = plainToInstance(EnderecoDto, {
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const errors = await validate(dto, { groups: [CREATE] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('logradouro');
  });

  it('deve ser inválido sem número', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const errors = await validate(dto, { groups: [CREATE] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('numero');
  });

  it('deve ser inválido sem bairro', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const errors = await validate(dto, { groups: [CREATE] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('bairro');
  });

  it('deve ser inválido sem cidade', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      estado: 'RN',
      cep: '59000-000'
    });

    const errors = await validate(dto, { groups: [CREATE] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('cidade');
  });

  it('deve ser inválido sem estado', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      cep: '59000-000'
    });

    const errors = await validate(dto, { groups: [CREATE] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('estado');
  });

  it('deve ser inválido sem CEP', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN'
    });

    const errors = await validate(dto, { groups: [CREATE] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('cep');
  });

  it('deve ser inválido com CEP em formato inválido', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '5900-000' // CEP com tamanho inválido
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('cep');
  });

  it('deve permitir atualização parcial no grupo UPDATE', async () => {
    const dto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Palmeiras',
      numero: '456'
    });

    const errors = await validate(dto, { groups: [UPDATE] });
    expect(errors.length).toBe(0);
  });

  it('deve verificar se o endereço está completo', () => {
    const enderecoCompleto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const enderecoIncompleto = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123'
    });

    expect(enderecoCompleto.isCompleto()).toBe(true);
    expect(enderecoIncompleto.isCompleto()).toBe(false);
  });

  it('deve retornar a representação textual correta do endereço', () => {
    const enderecoSemComplemento = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    const enderecoComComplemento = plainToInstance(EnderecoDto, {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Centro',
      cidade: 'Natal',
      estado: 'RN',
      cep: '59000-000'
    });

    expect(enderecoSemComplemento.toString()).toBe('Rua das Flores, 123 - Centro, Natal - RN, 59000-000');
    expect(enderecoComComplemento.toString()).toBe('Rua das Flores, 123 - Apto 101 - Centro, Natal - RN, 59000-000');
  });
});
