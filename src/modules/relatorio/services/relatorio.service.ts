import { 
  Injectable, 
  BadRequestException, 
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Solicitacao, StatusSolicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { StatusUnidade, Unidade } from '../../unidade/entities/unidade.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';
import { Role } from '../../auth/enums/role.enum';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

/**
 * Serviço de Relatórios
 * 
 * Responsável pela lógica de negócio relacionada à geração de relatórios
 * gerenciais e operacionais do sistema
 */
@Injectable()
export class RelatorioService {
  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
    
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    
    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,
  ) {}

  /**
   * Gera relatório de benefícios concedidos por período
   */
  async gerarRelatorioBeneficiosConcedidos(options: {
    dataInicio: string;
    dataFim: string;
    unidadeId?: string;
    tipoBeneficioId?: string;
    formato: 'pdf' | 'excel' | 'csv';
    user: any;
  }) {
    const { dataInicio, dataFim, unidadeId, tipoBeneficioId, formato, user } = options;
    
    // Verificar permissões do usuário
    if (![Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para gerar este relatório');
    }
    
    // Converter datas
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
    
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      throw new BadRequestException('Datas inválidas');
    }
    
    // Construir consulta
    const queryBuilder = this.solicitacaoRepository.createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.LIBERADA })
      .andWhere('solicitacao.data_liberacao BETWEEN :inicio AND :fim', { inicio, fim });
    
    if (unidadeId) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', { unidadeId });
    }
    
    if (tipoBeneficioId) {
      queryBuilder.andWhere('solicitacao.tipo_beneficio_id = :tipoBeneficioId', { tipoBeneficioId });
    }
    
    // Executar consulta
    const solicitacoes = await queryBuilder.getMany();
    
    // Gerar relatório no formato solicitado
    if (formato === 'pdf') {
      return this.gerarPdfBeneficiosConcedidos(solicitacoes, inicio, fim);
    } else if (formato === 'excel') {
      return this.gerarExcelBeneficiosConcedidos(solicitacoes, inicio, fim);
    } else if (formato === 'csv') {
      return this.gerarCsvBeneficiosConcedidos(solicitacoes, inicio, fim);
    }
  }

  /**
   * Gera relatório de solicitações por status
   */
  async gerarRelatorioSolicitacoesPorStatus(options: {
    dataInicio: string;
    dataFim: string;
    unidadeId?: string;
    formato: 'pdf' | 'excel' | 'csv';
    user: any;
  }) {
    const { dataInicio, dataFim, unidadeId, formato, user } = options;
    
    // Verificar permissões do usuário
    if (![Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS, Role.COORDENADOR].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para gerar este relatório');
    }
    
    // Verificar permissão por unidade
    if (user.role === Role.COORDENADOR && (!unidadeId || unidadeId !== user.unidade_id)) {
      throw new UnauthorizedException('Você só pode gerar relatórios para sua unidade');
    }
    
    // Converter datas
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
    
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      throw new BadRequestException('Datas inválidas');
    }
    
    // Construir consulta
    const queryBuilder = this.solicitacaoRepository.createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .where('solicitacao.data_abertura BETWEEN :inicio AND :fim', { inicio, fim });
    
    if (unidadeId) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', { unidadeId });
    } else if (user.role === Role.COORDENADOR) {
      queryBuilder.andWhere('solicitacao.unidade_id = :unidadeId', { unidadeId: user.unidade_id });
    }
    
    // Executar consulta
    const solicitacoes = await queryBuilder.getMany();
    
    // Agrupar por status
    const agrupadas = solicitacoes.reduce((acc, solicitacao) => {
      if (!acc[solicitacao.status]) {
        acc[solicitacao.status] = [];
      }
      acc[solicitacao.status].push(solicitacao);
      return acc;
    }, {});
    
    // Gerar relatório no formato solicitado
    if (formato === 'pdf') {
      return this.gerarPdfSolicitacoesPorStatus(agrupadas, inicio, fim);
    } else if (formato === 'excel') {
      return this.gerarExcelSolicitacoesPorStatus(agrupadas, inicio, fim);
    } else if (formato === 'csv') {
      return this.gerarCsvSolicitacoesPorStatus(agrupadas, inicio, fim);
    }
  }

  /**
   * Gera relatório de atendimentos por unidade
   */
  async gerarRelatorioAtendimentosPorUnidade(options: {
    dataInicio: string;
    dataFim: string;
    formato: 'pdf' | 'excel' | 'csv';
    user: any;
  }) {
    const { dataInicio, dataFim, formato, user } = options;
    
    // Verificar permissões do usuário
    if (![Role.ADMIN, Role.GESTOR_SEMTAS].includes(user.role)) {
      throw new UnauthorizedException('Você não tem permissão para gerar este relatório');
    }
    
    // Converter datas
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999); // Ajusta para o final do dia
    
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      throw new BadRequestException('Datas inválidas');
    }
    
    // Buscar todas as unidades
    const unidades = await this.unidadeRepository.find({ where: { status: StatusUnidade.ATIVO } });
    
    // Definir a interface para o resultado
    interface RelatorioUnidade {
      unidade: Unidade;
      totalSolicitacoes: number;
      solicitacoesLiberadas: number;
      solicitacoesPendentes: number;
    }
    
    // Para cada unidade, contar solicitações
    const resultado: RelatorioUnidade[] = [];
    for (const unidade of unidades) {
      const totalSolicitacoes = await this.solicitacaoRepository.count({
        where: {
          unidade_id: unidade.id,
          data_abertura: Between(inicio, fim)
        }
      });
      
      const solicitacoesLiberadas = await this.solicitacaoRepository.count({
        where: {
          unidade_id: unidade.id,
          status: StatusSolicitacao.LIBERADA,
          data_abertura: Between(inicio, fim)
        }
      });
      
      const solicitacoesPendentes = await this.solicitacaoRepository.count({
        where: {
          unidade_id: unidade.id,
          status: StatusSolicitacao.PENDENTE,
          data_abertura: Between(inicio, fim)
        }
      });
      
      resultado.push({
        unidade,
        totalSolicitacoes,
        solicitacoesLiberadas,
        solicitacoesPendentes
      });
    }
    
    // Gerar relatório no formato solicitado
    if (formato === 'pdf') {
      return this.gerarPdfAtendimentosPorUnidade(resultado, inicio, fim);
    } else if (formato === 'excel') {
      return this.gerarExcelAtendimentosPorUnidade(resultado, inicio, fim);
    } else if (formato === 'csv') {
      return this.gerarCsvAtendimentosPorUnidade(resultado, inicio, fim);
    }
  }

  /**
   * Métodos privados para geração de relatórios em diferentes formatos
   */
  
  // Implementações de geração de PDF
  private gerarPdfBeneficiosConcedidos(solicitacoes, dataInicio, dataFim) {
    // Implementação da geração de PDF para benefícios concedidos
    // Esta é uma implementação básica que seria substituída por uma mais completa em produção
    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(16).text('Relatório de Benefícios Concedidos', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
    doc.moveDown();
    
    // Tabela de benefícios
    solicitacoes.forEach((solicitacao, index) => {
      doc.text(`${index + 1}. Protocolo: ${solicitacao.protocolo}`);
      doc.text(`   Beneficiário: ${solicitacao.beneficiario?.nome || 'N/A'}`);
      doc.text(`   Benefício: ${solicitacao.tipo_beneficio?.nome || 'N/A'}`);
      doc.text(`   Unidade: ${solicitacao.unidade?.nome || 'N/A'}`);
      doc.text(`   Data de Liberação: ${solicitacao.data_liberacao?.toLocaleDateString() || 'N/A'}`);
      doc.moveDown();
    });
    
    doc.end();
    
    return Buffer.concat(buffers);
  }
  
  private gerarPdfSolicitacoesPorStatus(agrupadas, dataInicio, dataFim) {
    // Implementação da geração de PDF para solicitações por status
    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(16).text('Relatório de Solicitações por Status', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
    doc.moveDown();
    
    // Para cada status
    Object.keys(agrupadas).forEach(status => {
      doc.fontSize(14).text(`Status: ${status} (${agrupadas[status].length} solicitações)`);
      doc.moveDown();
      
      // Listar solicitações
      agrupadas[status].forEach((solicitacao, index) => {
        doc.text(`${index + 1}. Protocolo: ${solicitacao.protocolo}`);
        doc.text(`   Beneficiário: ${solicitacao.beneficiario?.nome || 'N/A'}`);
        doc.text(`   Benefício: ${solicitacao.tipo_beneficio?.nome || 'N/A'}`);
        doc.text(`   Unidade: ${solicitacao.unidade?.nome || 'N/A'}`);
        doc.text(`   Data de Abertura: ${solicitacao.data_abertura?.toLocaleDateString() || 'N/A'}`);
        doc.moveDown();
      });
      
      doc.moveDown();
    });
    
    doc.end();
    
    return Buffer.concat(buffers);
  }
  
  private gerarPdfAtendimentosPorUnidade(resultado, dataInicio, dataFim) {
    // Implementação da geração de PDF para atendimentos por unidade
    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(16).text('Relatório de Atendimentos por Unidade', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);
    doc.moveDown();
    
    // Tabela de unidades
    resultado.forEach((item, index) => {
      doc.text(`${index + 1}. Unidade: ${item.unidade.nome}`);
      doc.text(`   Total de Solicitações: ${item.totalSolicitacoes}`);
      doc.text(`   Solicitações Liberadas: ${item.solicitacoesLiberadas}`);
      doc.text(`   Solicitações Pendentes: ${item.solicitacoesPendentes}`);
      doc.moveDown();
    });
    
    doc.end();
    
    return Buffer.concat(buffers);
  }
  
  // Implementações de geração de Excel
  private gerarExcelBeneficiosConcedidos(solicitacoes, dataInicio, dataFim) {
    // Implementação da geração de Excel para benefícios concedidos
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Benefícios Concedidos');
    
    // Configurar cabeçalhos
    worksheet.columns = [
      { header: 'Protocolo', key: 'protocolo', width: 20 },
      { header: 'Beneficiário', key: 'beneficiario', width: 30 },
      { header: 'Benefício', key: 'beneficio', width: 30 },
      { header: 'Unidade', key: 'unidade', width: 30 },
      { header: 'Data de Liberação', key: 'data_liberacao', width: 20 },
      { header: 'Valor', key: 'valor', width: 15 }
    ];
    
    // Adicionar título
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'Relatório de Benefícios Concedidos';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // Adicionar período
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = `Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    // Adicionar dados
    solicitacoes.forEach(solicitacao => {
      worksheet.addRow({
        protocolo: solicitacao.protocolo,
        beneficiario: solicitacao.beneficiario?.nome || 'N/A',
        beneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
        unidade: solicitacao.unidade?.nome || 'N/A',
        data_liberacao: solicitacao.data_liberacao?.toLocaleDateString() || 'N/A',
        valor: solicitacao.tipo_beneficio?.valor || 0
      });
    });
    
    // Retornar buffer
    return workbook.xlsx.writeBuffer();
  }
  
  private gerarExcelSolicitacoesPorStatus(agrupadas, dataInicio, dataFim) {
    // Implementação da geração de Excel para solicitações por status
    const workbook = new ExcelJS.Workbook();
    
    // Para cada status, criar uma planilha
    Object.keys(agrupadas).forEach(status => {
      const worksheet = workbook.addWorksheet(status);
      
      // Configurar cabeçalhos
      worksheet.columns = [
        { header: 'Protocolo', key: 'protocolo', width: 20 },
        { header: 'Beneficiário', key: 'beneficiario', width: 30 },
        { header: 'Benefício', key: 'beneficio', width: 30 },
        { header: 'Unidade', key: 'unidade', width: 30 },
        { header: 'Data de Abertura', key: 'data_abertura', width: 20 }
      ];
      
      // Adicionar título
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = `Solicitações com Status: ${status}`;
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Adicionar período
      worksheet.mergeCells('A2:E2');
      worksheet.getCell('A2').value = `Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`;
      worksheet.getCell('A2').font = { size: 12 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
      
      // Adicionar dados
      agrupadas[status].forEach(solicitacao => {
        worksheet.addRow({
          protocolo: solicitacao.protocolo,
          beneficiario: solicitacao.beneficiario?.nome || 'N/A',
          beneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
          unidade: solicitacao.unidade?.nome || 'N/A',
          data_abertura: solicitacao.data_abertura?.toLocaleDateString() || 'N/A'
        });
      });
    });
    
    // Retornar buffer
    return workbook.xlsx.writeBuffer();
  }
  
  private gerarExcelAtendimentosPorUnidade(resultado, dataInicio, dataFim) {
    // Implementação da geração de Excel para atendimentos por unidade
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Atendimentos por Unidade');
    
    // Configurar cabeçalhos
    worksheet.columns = [
      { header: 'Unidade', key: 'unidade', width: 30 },
      { header: 'Total de Solicitações', key: 'total', width: 20 },
      { header: 'Solicitações Liberadas', key: 'liberadas', width: 20 },
      { header: 'Solicitações Pendentes', key: 'pendentes', width: 20 },
      { header: 'Taxa de Aprovação (%)', key: 'taxa_aprovacao', width: 20 }
    ];
    
    // Adicionar título
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'Relatório de Atendimentos por Unidade';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // Adicionar período
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Período: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    // Adicionar dados
    resultado.forEach(item => {
      const taxaAprovacao = item.totalSolicitacoes > 0 
        ? ((item.solicitacoesLiberadas / item.totalSolicitacoes) * 100).toFixed(2) 
        : '0.00';
      
      worksheet.addRow({
        unidade: item.unidade.nome,
        total: item.totalSolicitacoes,
        liberadas: item.solicitacoesLiberadas,
        pendentes: item.solicitacoesPendentes,
        taxa_aprovacao: taxaAprovacao
      });
    });
    
    // Retornar buffer
    return workbook.xlsx.writeBuffer();
  }
  
  // Implementações de geração de CSV
  private gerarCsvBeneficiosConcedidos(solicitacoes, dataInicio, dataFim) {
    // Implementação da geração de CSV para benefícios concedidos
    const tempFile = path.join(process.cwd(), 'temp', `beneficios-concedidos-${Date.now()}.csv`);
    
    // Criar diretório temporário se não existir
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    const csvWriter = createObjectCsvWriter({
      path: tempFile,
      header: [
        { id: 'protocolo', title: 'Protocolo' },
        { id: 'beneficiario', title: 'Beneficiário' },
        { id: 'beneficio', title: 'Benefício' },
        { id: 'unidade', title: 'Unidade' },
        { id: 'data_liberacao', title: 'Data de Liberação' },
        { id: 'valor', title: 'Valor' }
      ]
    });
    
    const records = solicitacoes.map(solicitacao => ({
      protocolo: solicitacao.protocolo,
      beneficiario: solicitacao.beneficiario?.nome || 'N/A',
      beneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
      unidade: solicitacao.unidade?.nome || 'N/A',
      data_liberacao: solicitacao.data_liberacao?.toLocaleDateString() || 'N/A',
      valor: solicitacao.tipo_beneficio?.valor || 0
    }));
    
    return csvWriter.writeRecords(records)
      .then(() => {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile); // Remover arquivo temporário
        return buffer;
      });
  }
  
  private gerarCsvSolicitacoesPorStatus(agrupadas, dataInicio, dataFim) {
    // Implementação da geração de CSV para solicitações por status
    const tempFile = path.join(process.cwd(), 'temp', `solicitacoes-por-status-${Date.now()}.csv`);
    
    // Criar diretório temporário se não existir
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    const csvWriter = createObjectCsvWriter({
      path: tempFile,
      header: [
        { id: 'status', title: 'Status' },
        { id: 'protocolo', title: 'Protocolo' },
        { id: 'beneficiario', title: 'Beneficiário' },
        { id: 'beneficio', title: 'Benefício' },
        { id: 'unidade', title: 'Unidade' },
        { id: 'data_abertura', title: 'Data de Abertura' }
      ]
    });
    
    // Definir interface para os registros do CSV
    interface RegistroCSV {
      status: string;
      protocolo: string;
      beneficiario: string;
      beneficio: string;
      unidade: string;
      data_abertura: string;
    }
    
    const records: RegistroCSV[] = [];
    Object.keys(agrupadas).forEach(status => {
      agrupadas[status].forEach(solicitacao => {
        records.push({
          status,
          protocolo: solicitacao.protocolo,
          beneficiario: solicitacao.beneficiario?.nome || 'N/A',
          beneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
          unidade: solicitacao.unidade?.nome || 'N/A',
          data_abertura: solicitacao.data_abertura?.toLocaleDateString() || 'N/A'
        });
      });
    });
    
    return csvWriter.writeRecords(records)
      .then(() => {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile); // Remover arquivo temporário
        return buffer;
      });
  }
  
  private gerarCsvAtendimentosPorUnidade(resultado, dataInicio, dataFim) {
    // Implementação da geração de CSV para atendimentos por unidade
    const tempFile = path.join(process.cwd(), 'temp', `atendimentos-por-unidade-${Date.now()}.csv`);
    
    // Criar diretório temporário se não existir
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    const csvWriter = createObjectCsvWriter({
      path: tempFile,
      header: [
        { id: 'unidade', title: 'Unidade' },
        { id: 'total', title: 'Total de Solicitações' },
        { id: 'liberadas', title: 'Solicitações Liberadas' },
        { id: 'pendentes', title: 'Solicitações Pendentes' },
        { id: 'taxa_aprovacao', title: 'Taxa de Aprovação (%)' }
      ]
    });
    
    const records = resultado.map(item => {
      const taxaAprovacao = item.totalSolicitacoes > 0 
        ? ((item.solicitacoesLiberadas / item.totalSolicitacoes) * 100).toFixed(2) 
        : '0.00';
      
      return {
        unidade: item.unidade.nome,
        total: item.totalSolicitacoes,
        liberadas: item.solicitacoesLiberadas,
        pendentes: item.solicitacoesPendentes,
        taxa_aprovacao: taxaAprovacao
      };
    });
    
    return csvWriter.writeRecords(records)
      .then(() => {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile); // Remover arquivo temporário
        return buffer;
      });
  }
}
