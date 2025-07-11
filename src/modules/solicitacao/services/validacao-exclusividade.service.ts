import { ConflictException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
 Solicitacao,
 StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import {
 throwCidadaoAlreadyBeneficiario,
 throwCidadaoAlreadyInComposicaoFamiliar,
} from '../../../shared/exceptions/error-catalog/domains/solicitacao.errors';
import { ComposicaoFamiliar, Cidadao } from '@/entities';

@Injectable()
export class ValidacaoExclusividadeService {
 constructor(
   @InjectRepository(Solicitacao)
   private solicitacaoRepository: Repository<Solicitacao>,
   @InjectRepository(ComposicaoFamiliar)
   private composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,
   
   @InjectRepository(Cidadao)
   private cidadaoRepository: Repository<Cidadao>,
 ) {}

 async validarExclusividade(beneficiarioId: string, beneficioId: string): Promise<boolean> {
   const beneficiario = await this.cidadaoRepository.findOne({
     where: { id: beneficiarioId }
   });

   if (!beneficiario) {
     throw new ConflictException('Beneficiário não encontrado');
   }

   const beneficiarioCpf = beneficiario.cpf;
   const statusInativos = [StatusSolicitacao.CANCELADA, StatusSolicitacao.INDEFERIDA];

   // 1. Verifica se beneficiário faz parte da composição familiar de outro cidadão
   const membroComposicao = await this.composicaoFamiliarRepository.findOne({
     where: { cpf: beneficiarioCpf }
   });

   if (membroComposicao) {
     throw new ConflictException(
       `Cidadão não pode ser beneficiário pois faz parte da composição familiar de outro cidadão. Remover o membro da composição familiar do outro cidadão.`
     );
   }

   // 2. Verifica se membros da composição familiar possuem solicitação ativa
   const membrosComposicao = await this.composicaoFamiliarRepository.find({
     where: { cidadao_id: beneficiarioId }
   });

   if (membrosComposicao.length > 0) {
     const cpfsMembros = membrosComposicao.map(m => m.cpf);
     
     const membrosComConcessao = await this.solicitacaoRepository
       .createQueryBuilder('s')
       .innerJoin('s.beneficiario', 'b')
       .where('b.cpf IN (:...cpfsMembros)', { cpfsMembros })
       .andWhere('s.status NOT IN (:...statusInativos)', { statusInativos })
       .getCount();

     if (membrosComConcessao > 0) {
       throw new ConflictException(
         `Cidadão não pode ter membros em sua composição familiar que possuam concessão ativa. Remover o membro da sua composição familiar.`
       );
     }
   }

   return true;
 }
}