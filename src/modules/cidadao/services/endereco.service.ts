import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Endereco } from '../../../entities/endereco.entity';
import { EnderecoDto } from '../dto/endereco.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnderecoService {
  constructor(
    @InjectRepository(Endereco)
    private readonly enderecoRepository: Repository<Endereco>,
    private readonly configService: ConfigService,
  ) {}



  /**
   * Busca todos os endereços de um cidadão
   */
  async findByCidadaoId(cidadaoId: string): Promise<Endereco[]> {
    return this.enderecoRepository.find({
      where: { cidadao_id: cidadaoId },
      order: { data_inicio_vigencia: 'DESC' },
    });
  }

  /**
   * Busca o endereço atual de um cidadão
   */
  async findEnderecoAtual(cidadaoId: string): Promise<Endereco | null> {
    // Usando QueryBuilder para poder usar IS NULL corretamente
    return this.enderecoRepository
      .createQueryBuilder('endereco')
      .where('endereco.cidadao_id = :cidadaoId', { cidadaoId })
      .andWhere('endereco.data_fim_vigencia IS NULL')
      .getOne();
  }

  /**
   * Busca um endereço específico pelo ID
   */
  async findById(id: string): Promise<Endereco> {
    const endereco = await this.enderecoRepository.findOne({
      where: { id },
    });

    if (!endereco) {
      throw new NotFoundException('Endereço não encontrado');
    }

    return endereco;
  }

  /**
   * Cria um novo endereço
   * Se for o primeiro ou marcado como atual, encerra a vigência do endereço atual
   */
  async create(enderecoDto: EnderecoDto): Promise<Endereco> {
    // Se não tiver data de início, usa a data atual
    if (!enderecoDto.data_inicio_vigencia) {
      enderecoDto.data_inicio_vigencia = new Date().toISOString().split('T')[0];
    }

    // Se não tiver data fim, é o endereço atual
    const isEnderecoAtual = !enderecoDto.data_fim_vigencia;

    // Se for endereço atual, encerra a vigência do endereço atual anterior
    if (isEnderecoAtual) {
      await this.encerrarVigenciaEnderecoAtual(
        enderecoDto.cidadao_id, 
        enderecoDto.data_inicio_vigencia
      );
    }

    const endereco = this.enderecoRepository.create(enderecoDto);
    return this.enderecoRepository.save(endereco);
  }

  /**
   * Atualiza um endereço existente
   */
  async update(id: string, enderecoDto: EnderecoDto): Promise<Endereco> {
    const endereco = await this.findById(id);
    const enderecoAnterior = { ...endereco };
    
    // Atualiza apenas os campos fornecidos
    Object.assign(endereco, enderecoDto);
    
    // Se mudou de não-atual para atual, encerra vigência do atual
    if (
      enderecoAnterior.data_fim_vigencia !== null && 
      endereco.data_fim_vigencia === null
    ) {
      await this.encerrarVigenciaEnderecoAtual(
        endereco.cidadao_id, 
        endereco.data_inicio_vigencia,
        endereco.id
      );
    }
    
    return this.enderecoRepository.save(endereco);
  }

  /**
   * Encerra a vigência do endereço atual, definindo a data_fim_vigencia
   * @param cidadaoId ID do cidadão
   * @param dataFim Data de fim da vigência
   * @param excluirEnderecoId ID do endereço a ser excluído da atualização (opcional)
   */
  private async encerrarVigenciaEnderecoAtual(
    cidadaoId: string, 
    dataFim: string,
    excluirEnderecoId?: string
  ): Promise<void> {
    const query = this.enderecoRepository.createQueryBuilder('endereco')
      .where('endereco.cidadao_id = :cidadaoId', { cidadaoId })
      .andWhere('endereco.data_fim_vigencia IS NULL');
    
    if (excluirEnderecoId) {
      query.andWhere('endereco.id != :excluirEnderecoId', { excluirEnderecoId });
    }
    
    await query
      .update()
      .set({ data_fim_vigencia: dataFim })
      .execute();
  }

  /**
   * Remove um endereço
   */
  async remove(id: string): Promise<void> {
    const endereco = await this.findById(id);
    await this.enderecoRepository.remove(endereco);
  }

  /**
   * Cria um novo endereço atual para o cidadão
   * Usado na migração e na atualização via cidadão
   */
  async criarOuAtualizarEnderecoAtual(
    cidadaoId: string, 
    enderecoDto: EnderecoDto
  ): Promise<Endereco> {
    // Configura o DTO
    enderecoDto.cidadao_id = cidadaoId;
    enderecoDto.data_inicio_vigencia = enderecoDto.data_inicio_vigencia || 
      new Date().toISOString().split('T')[0];
    enderecoDto.data_fim_vigencia = null; // Endereço atual
    
    // Verifica se já existe um endereço atual
    const enderecoAtual = await this.findEnderecoAtual(cidadaoId);
    
    if (enderecoAtual) {
      // Se os dados são iguais, não faz nada
      if (this.enderecoIgual(enderecoAtual, enderecoDto)) {
        return enderecoAtual;
      }
      
      // Se tem ID no DTO, atualiza esse endereço específico
      if (enderecoDto.id) {
        return this.update(enderecoDto.id, enderecoDto);
      }
      
      // Caso contrário, encerra o atual e cria um novo
      return this.create(enderecoDto);
    }
    
    // Se não existe endereço atual, cria um novo
    return this.create(enderecoDto);
  }

  /**
   * Compara se dois endereços têm os mesmos dados relevantes
   */
  private enderecoIgual(endereco: Endereco, enderecoDto: EnderecoDto): boolean {
    return (
      endereco.logradouro === enderecoDto.logradouro &&
      endereco.numero === enderecoDto.numero &&
      endereco.complemento === enderecoDto.complemento &&
      endereco.bairro === enderecoDto.bairro &&
      endereco.cidade === enderecoDto.cidade &&
      endereco.estado === enderecoDto.estado &&
      endereco.cep === enderecoDto.cep
    );
  }

  /**
   * Cria ou atualiza múltiplos endereços para um cidadão
   * Usado na migração e na atualização via cidadão
   */
  async upsertMany(cidadaoId: string, enderecos: EnderecoDto[]): Promise<Endereco[]> {
    if (!enderecos || enderecos.length === 0) {
      return [];
    }

    // Verifica se existe um endereço atual
    const enderecoAtual = await this.findEnderecoAtual(cidadaoId);
    
    // Processa cada endereço da lista
    const enderecosSalvos: Endereco[] = [];
    
    for (const enderecoDto of enderecos) {
      enderecoDto.cidadao_id = cidadaoId;
      
      // Se não tem data de início, usa a data atual
      if (!enderecoDto.data_inicio_vigencia) {
        enderecoDto.data_inicio_vigencia = new Date().toISOString().split('T')[0];
      }
      
      // Se não tem data fim, é o endereço atual
      const isEnderecoAtual = !enderecoDto.data_fim_vigencia;
      
      if (enderecoDto.id) {
        // Atualiza endereço existente
        const enderecoAtualizado = await this.update(enderecoDto.id, enderecoDto);
        enderecosSalvos.push(enderecoAtualizado);
      } else if (isEnderecoAtual && enderecoAtual && this.enderecoIgual(enderecoAtual, enderecoDto)) {
        // Se é igual ao atual, não faz nada
        enderecosSalvos.push(enderecoAtual);
      } else {
        // Cria novo endereço
        const novoEndereco = await this.create(enderecoDto);
        enderecosSalvos.push(novoEndereco);
      }
    }
    
    return enderecosSalvos;
  }
}
