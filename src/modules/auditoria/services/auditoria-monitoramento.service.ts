// Substituir o método onModuleInit em auditoria-monitoramento.service.ts

/**
 * Configura o agendamento quando o módulo é inicializado de forma assíncrona
 * CORREÇÃO: Não bloquear a inicialização do servidor
 */
async onModuleInit(): Promise<void> {
  this.logger.log('⏩ AuditoriaMonitoramentoService inicializado (configuração em background)');
  
  // CRÍTICO: Retornar IMEDIATAMENTE sem await
  // A configuração acontece em background
  Promise.resolve().then(async () => {
    try {
      this.logger.log('🔄 Configurando agendamento de estatísticas em background...');
      
      // Aguardar 30 segundos após o boot antes de coletar estatísticas
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Configurar a atualização de estatísticas a cada 15 minutos
      this.scheduleAdapter.scheduleInterval(
        'atualizar_estatisticas_auditoria',
        15 * 60 * 1000, // 15 minutos
        () => this.atualizarEstatisticas(),
      );

      this.logger.log('✅ Agendamento de estatísticas configurado com sucesso');
      
      // Executar primeira atualização após 1 minuto
      setTimeout(() => {
        this.atualizarEstatisticas().catch(error => {
          this.logger.error(`Erro na atualização inicial de estatísticas: ${error.message}`);
        });
      }, 60000);
      
    } catch (error) {
      this.logger.error(
        `Erro ao configurar agendamento de estatísticas: ${error.message}`,
      );
    }
  });
  
  // onModuleInit retorna IMEDIATAMENTE!
}
