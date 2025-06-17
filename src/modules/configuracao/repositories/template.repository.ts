import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../../../entities/notification-template.entity';
import { TemplateTipoEnum } from '../../../enums/template-tipo.enum';

/**
 * Repositório para gerenciamento de templates do sistema
 *
 * Fornece operações de acesso a dados para entidade Template
 */
@Injectable()
export class TemplateRepository {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly repository: Repository<NotificationTemplate>,
  ) {}

  /**
   * Encontra um template por seu código
   * @param codigo Código do template
   * @returns Template encontrado ou null
   */
  async findByCodigo(codigo: string): Promise<NotificationTemplate | null> {
    return this.repository.findOne({ where: { codigo } });
  }

  /**
   * Busca todos os templates do sistema
   * @param tipo Tipo opcional para filtrar templates
   * @returns Lista de templates
   */
  async findAll(tipo?: TemplateTipoEnum): Promise<NotificationTemplate[]> {
    const whereClause = tipo ? { tipo } : {};
    return this.repository.find({
      where: whereClause,
      order: { tipo: 'ASC', codigo: 'ASC' },
    });
  }

  /**
   * Salva um template no banco de dados
   * @param template Template a ser salvo
   * @returns Template salvo
   */
  async save(template: NotificationTemplate): Promise<NotificationTemplate> {
    return this.repository.save(template);
  }

  /**
   * Remove um template do banco de dados
   * @param id ID do template a ser removido
   */
  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Busca templates por tipo
   * @param tipo Tipo dos templates
   * @returns Lista de templates do tipo
   */
  async findByTipo(tipo: TemplateTipoEnum): Promise<NotificationTemplate[]> {
    return this.repository.find({
      where: { tipo },
      order: { codigo: 'ASC' },
    });
  }

  /**
   * Verifica se existe um template com o código especificado
   * @param codigo Código do template
   * @returns true se existir, false caso contrário
   */
  async existsByCodigo(codigo: string): Promise<boolean> {
    const count = await this.repository.count({ where: { codigo } });
    return count > 0;
  }
}
