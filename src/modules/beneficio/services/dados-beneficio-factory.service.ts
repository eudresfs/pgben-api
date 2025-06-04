import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DadosAluguelSocialService } from './dados-aluguel-social.service';
import { DadosCestaBasicaService } from './dados-cesta-basica.service';
import { DadosFuneralService } from './dados-funeral.service';
import { DadosNatalidadeService } from './dados-natalidade.service';
import {
  TipoDadosBeneficio,
  IDadosBeneficio,
  ICreateDadosBeneficioDto,
  IUpdateDadosBeneficioDto,
  IDadosBeneficioService,
} from '../interfaces/dados-beneficio.interface';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';
import {
  CreateDadosAluguelSocialDto,
  UpdateDadosAluguelSocialDto,
} from '../dto/create-dados-aluguel-social.dto';
import {
  CreateDadosCestaBasicaDto,
  UpdateDadosCestaBasicaDto,
} from '../dto/create-dados-cesta-basica.dto';
import {
  CreateDadosFuneralDto,
  UpdateDadosFuneralDto,
} from '../dto/create-dados-funeral.dto';
import {
  CreateDadosNatalidadeDto,
  UpdateDadosNatalidadeDto,
} from '../dto/create-dados-natalidade.dto';

/**
 * Factory service para gerenciar todos os tipos de dados de benefícios
 * de forma centralizada e type-safe
 */
@Injectable()
export class DadosBeneficioFactoryService {
  private readonly serviceMap: Map<TipoDadosBeneficio, any>;

  constructor(
    private readonly dadosAluguelSocialService: DadosAluguelSocialService,
    private readonly dadosCestaBasicaService: DadosCestaBasicaService,
    private readonly dadosFuneralService: DadosFuneralService,
    private readonly dadosNatalidadeService: DadosNatalidadeService,
  ) {
    this.serviceMap = new Map<TipoDadosBeneficio, any>([
      [TipoDadosBeneficio.ALUGUEL_SOCIAL, this.dadosAluguelSocialService],
      [TipoDadosBeneficio.CESTA_BASICA, this.dadosCestaBasicaService],
      [TipoDadosBeneficio.FUNERAL, this.dadosFuneralService],
      [TipoDadosBeneficio.NATALIDADE, this.dadosNatalidadeService],
    ]);
  }

  /**
   * Obter o serviço apropriado para o tipo de benefício
   */
  private getService(
    tipo: TipoDadosBeneficio,
  ): IDadosBeneficioService<any, any, any> {
    const service = this.serviceMap.get(tipo);
    if (!service) {
      throw new BadRequestException(`Tipo de benefício não suportado: ${tipo}`);
    }
    return service;
  }

  /**
   * Validar se o tipo de benefício é válido
   */
  private validateTipo(tipo: string): TipoDadosBeneficio {
    if (
      !Object.values(TipoDadosBeneficio).includes(tipo as TipoDadosBeneficio)
    ) {
      throw new BadRequestException(`Tipo de benefício inválido: ${tipo}`);
    }
    return tipo as TipoDadosBeneficio;
  }

  /**
   * Criar dados de benefício
   */
  async create(
    tipo: string,
    createDto: ICreateDadosBeneficioDto,
  ): Promise<IDadosBeneficio> {
    const tipoBeneficio = this.validateTipo(tipo);
    const service = this.getService(tipoBeneficio);
    return service.create(createDto);
  }

  /**
   * Buscar dados de benefício por ID
   */
  async findOne(tipo: string, id: string): Promise<IDadosBeneficio> {
    const tipoBeneficio = this.validateTipo(tipo);
    const service = this.getService(tipoBeneficio);
    return service.findOne(id);
  }

  /**
   * Buscar dados de benefício por solicitação
   */
  async findBySolicitacao(
    tipo: string,
    solicitacaoId: string,
  ): Promise<IDadosBeneficio> {
    const tipoBeneficio = this.validateTipo(tipo);
    const service = this.getService(tipoBeneficio);
    return service.findBySolicitacao(solicitacaoId);
  }

  /**
   * Atualizar dados de benefício
   */
  async update(
    tipo: string,
    id: string,
    updateDto: IUpdateDadosBeneficioDto,
  ): Promise<IDadosBeneficio> {
    const tipoBeneficio = this.validateTipo(tipo);
    const service = this.getService(tipoBeneficio);
    return service.update(id, updateDto);
  }

  /**
   * Remover dados de benefício
   */
  async remove(tipo: string, id: string): Promise<void> {
    const tipoBeneficio = this.validateTipo(tipo);
    const service = this.getService(tipoBeneficio);
    return service.remove(id);
  }

  /**
   * Verificar se existem dados para uma solicitação
   */
  async existsBySolicitacao(
    tipo: string,
    solicitacaoId: string,
  ): Promise<boolean> {
    const tipoBeneficio = this.validateTipo(tipo);
    const service = this.getService(tipoBeneficio);
    return service.existsBySolicitacao(solicitacaoId);
  }

  /**
   * Obter todos os tipos de benefícios suportados
   */
  getSupportedTypes(): TipoDadosBeneficio[] {
    return Object.values(TipoDadosBeneficio);
  }

  /**
   * Verificar se um tipo é suportado
   */
  isTypeSupported(tipo: string): boolean {
    return Object.values(TipoDadosBeneficio).includes(
      tipo as TipoDadosBeneficio,
    );
  }

  /**
   * Obter metadados do tipo de benefício
   */
  getTypeMetadata(tipo: string): { name: string; description: string } {
    const tipoBeneficio = this.validateTipo(tipo);

    const metadata = {
      [TipoDadosBeneficio.ALUGUEL_SOCIAL]: {
        name: 'Aluguel Social',
        description: 'Dados específicos para solicitação de Aluguel Social',
      },
      [TipoDadosBeneficio.CESTA_BASICA]: {
        name: 'Cesta Básica',
        description: 'Dados específicos para solicitação de Cesta Básica',
      },
      [TipoDadosBeneficio.FUNERAL]: {
        name: 'Auxílio Funeral',
        description: 'Dados específicos para solicitação de Auxílio Funeral',
      },
      [TipoDadosBeneficio.NATALIDADE]: {
        name: 'Auxílio Natalidade',
        description: 'Dados específicos para solicitação de Auxílio Natalidade',
      },
    };

    return metadata[tipoBeneficio];
  }
}
