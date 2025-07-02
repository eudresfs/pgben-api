import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contato } from '../../../entities/contato.entity';
import { ContatoDto } from '../dto/contato.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContatoService {
  constructor(
    @InjectRepository(Contato)
    private readonly contatoRepository: Repository<Contato>,
    private readonly configService: ConfigService,
  ) {}



  /**
   * Busca todos os contatos de um cidadão
   */
  async findByCidadaoId(cidadaoId: string): Promise<Contato[]> {
    return this.contatoRepository.find({
      where: { cidadao_id: cidadaoId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca um contato específico pelo ID
   */
  async findById(id: string): Promise<Contato> {
    const contato = await this.contatoRepository.findOne({
      where: { id },
    });

    if (!contato) {
      throw new NotFoundException('Contato não encontrado');
    }

    return contato;
  }

  /**
   * Cria um novo contato
   */
  async create(contatoDto: ContatoDto): Promise<Contato> {
    const contato = this.contatoRepository.create(contatoDto);
    return this.contatoRepository.save(contato);
  }

  /**
   * Atualiza um contato existente
   */
  async update(id: string, contatoDto: ContatoDto): Promise<Contato> {
    const contato = await this.findById(id);
    
    // Atualiza apenas os campos fornecidos
    Object.assign(contato, contatoDto);
    
    return this.contatoRepository.save(contato);
  }

  /**
   * Remove um contato
   */
  async remove(id: string): Promise<void> {
    const contato = await this.findById(id);
    await this.contatoRepository.remove(contato);
  }

  /**
   * Cria ou atualiza múltiplos contatos para um cidadão
   * Usado na migração e na atualização via cidadão
   */
  async upsertMany(cidadaoId: string, contatos: ContatoDto[]): Promise<Contato[]> {
    // Remove contatos que não estão na lista e pertencem ao cidadão
    if (contatos.length > 0) {
      const contatosExistentes = await this.findByCidadaoId(cidadaoId);
      const idsNovos = contatos.filter(c => c.id).map(c => c.id);
      
      const contatosParaRemover = contatosExistentes.filter(
        c => !idsNovos.includes(c.id)
      );
      
      if (contatosParaRemover.length > 0) {
        await this.contatoRepository.remove(contatosParaRemover);
      }
    }

    // Cria ou atualiza os contatos
    const contatosSalvos: Contato[] = [];
    
    for (const contatoDto of contatos) {
      contatoDto.cidadao_id = cidadaoId;
      
      if (contatoDto.id) {
        // Atualiza contato existente
        const contatoAtualizado = await this.update(contatoDto.id, contatoDto);
        contatosSalvos.push(contatoAtualizado);
      } else {
        // Cria novo contato
        const novoContato = await this.create(contatoDto);
        contatosSalvos.push(novoContato);
      }
    }
    
    return contatosSalvos;
  }
}
