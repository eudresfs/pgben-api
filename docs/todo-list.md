55 results - 23 files

.git\hooks\sendemail-validate.sample:
  26  	file="$1"
  27: 	# TODO: Replace with appropriate checks (e.g. spell checking).
  28  	true

  34  	git am -3 "$file" || return
  35: 	# TODO: Replace with appropriate checks for this patch
  36  	# (e.g. checkpatch.pl).

  40  validate_series () {
  41: 	# TODO: Replace with appropriate checks for the whole series
  42  	# (e.g. quick build, coding style checks, etc.).

src\auth\controllers\jwt-blacklist.controller.ts:
  208  
  209:     // TODO: Buscar tokens ativos do usuário do RefreshTokenService
  210      // Por enquanto, retornamos uma resposta simulada

src\auth\services\auth.service.ts:
  186              reason: 'invalid_password',
  187:             consecutiveFailures: 1, // TODO: implementar contador
  188            },

src\common\services\query-optimizer.service.ts:
  318        size,
  319:       hitRate: 0, // TODO: Implementar tracking de hit rate
  320        memoryUsage,

src\modules\auditoria\core\repositories\audit-core.repository.ts:
  331          lgpdEvents,
  332:         averageProcessingTime: 0, // TODO: Calcular tempo médio de processamento
  333          topEntities,

src\modules\auditoria\core\services\audit-core.service.ts:
  551    ): Promise<CreateAuditLogDto> {
  552:     // TODO: Implementar compressão real
  553      // Por enquanto, apenas marca como comprimido

  569    ): Promise<CreateAuditLogDto> {
  570:     // TODO: Implementar assinatura digital real
  571      // Por enquanto, apenas adiciona hash simulado

src\modules\auditoria\queues\jobs\audit-processing.job.ts:
  233    private async compressData(data: any): Promise<any> {
  234:     // TODO: Implementar compressão real (gzip, lz4, etc.)
  235      // Por enquanto, apenas marca como comprimido

  247    private async signData(data: any): Promise<any> {
  248:     // TODO: Implementar assinatura digital real
  249      // Por enquanto, apenas adiciona hash simulado

  271  
  272:     // TODO: Implementar notificação real (email, Slack, etc.)
  273    }

  285  
  286:     // TODO: Implementar verificações de conformidade LGPD
  287      // - Verificar base legal

  295    private async updateMetrics(event: AuditEvent): Promise<void> {
  296:     // TODO: Implementar atualização de métricas
  297      // - Contadores por tipo de evento

src\modules\auditoria\queues\processors\audit.processor.ts:
  337  
  338:     // TODO: Implementar dead letter queue real
  339      // Por enquanto, apenas log crítico

src\modules\configuracao\services\integracao.service.ts:
  249      // Para simplificar neste momento, apenas serializa para JSON
  250:     // TODO: Implementar criptografia real
  251      this.logger.log('Criptografando credenciais sensíveis');

  264      // Para simplificar neste momento, apenas deserializa de JSON
  265:     // TODO: Implementar descriptografia real
  266      try {

src\modules\documento\services\documento.service.ts:
  343              userId: usuarioId,
  344:             userRoles: [], // TODO: Implementar roles
  345:             ip: 'unknown', // TODO: Capturar IP
  346:             userAgent: 'unknown', // TODO: Capturar User Agent
  347            },

  417            userId: usuarioId,
  418:           userRoles: [], // TODO: Implementar roles
  419:           ip: 'unknown', // TODO: Capturar IP
  420:           userAgent: 'unknown', // TODO: Capturar User Agent
  421          },

src\modules\documento\services\thumbnail\thumbnail-queue.service.ts:
  464          successRate: 0.95, // 95% de taxa de sucesso
  465:         totalProcessed: 0, // TODO: Implementar contador persistente
  466        },

src\modules\documento\services\thumbnail\thumbnail.service.ts:
  990      // Para documentos Office, usamos thumbnails padrão por enquanto
  991:     // TODO: Implementar conversão real usando LibreOffice ou similar
  992      return this.getDefaultThumbnail(type);

src\modules\notificacao\controllers\notification-template.controller.ts:
   20  import { Roles } from '../../../auth/decorators/role.decorator';
   21: // import { NotificationManagerService } from '../services/notification-manager.service'; // TODO: Reativar após resolver dependência circular
   22  import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';

   34  
   35:   constructor() {} // private readonly notificationManagerService: NotificationManagerService, // TODO: Reativar após resolver dependência circular
   36  

   50      this.logger.log(`Criando novo template: ${createTemplateDto.nome}`);
   51:     // TODO: Reativar após resolver dependência circular
   52      // return this.notificationManagerService.criarTemplate(createTemplateDto);

   72    ) {
   73:     // TODO: Reativar após resolver dependência circular
   74      // return this.notificationManagerService.listarTemplates({

   98    async buscarTemplatePorId(@Param('id') id: string) {
   99:     // TODO: Reativar após resolver dependência circular
  100      // return this.notificationManagerService.buscarTemplatePorId(id);

  117      this.logger.log(`Ativando template ID: ${id}`);
  118:     // TODO: Reativar após resolver dependência circular
  119      // return this.notificationManagerService.ativarTemplate(id);

  136      this.logger.log(`Desativando template ID: ${id}`);
  137:     // TODO: Reativar após resolver dependência circular
  138      // return this.notificationManagerService.desativarTemplate(id);

src\modules\notificacao\listeners\usuario-events.listener.ts:
    2  import { OnEvent } from '@nestjs/event-emitter';
    3: // import { NotificationManagerService } from '../services/notification-manager.service'; // TODO: Reativar após resolver dependência circular
    4  import { CanalNotificacao } from '../../../entities/notification-template.entity';

   13  
   14:   constructor() {} // private readonly notificationManager: NotificationManagerService, // TODO: Reativar após resolver dependência circular
   15  

   32      try {
   33:       // TODO: Reativar após resolver dependência circular
   34        // await this.notificationManager.criarNotificacao({

   72      try {
   73:       // TODO: Reativar após resolver dependência circular
   74        // await this.notificationManager.criarNotificacao({

  112      try {
  113:       // TODO: Reativar após resolver dependência circular
  114        // await this.notificationManager.criarNotificacao({

src\modules\notificacao\listeners\workflow-proativo.listener.ts:
  343    }) {
  344:     // TODO: Implementar busca de administradores
  345      // const administradores = await this.usuarioService.buscarAdministradores();

  366    }) {
  367:     // TODO: Implementar busca de usuários do setor financeiro
  368      this.logger.debug(

  382    }) {
  383:     // TODO: Implementar notificação em massa
  384      this.logger.debug(

  396  
  397:     // TODO: Implementar agendamento de notificação de acompanhamento
  398      // Por enquanto, apenas logamos a intenção

src\modules\notificacao\services\notificacao-preferencias.service.ts:
  107    constructor(
  108:     // TODO: Criar entidade PreferenciasNotificacao quando necessário
  109      // @InjectRepository(PreferenciasNotificacao)

  127  
  128:     // TODO: Buscar do banco de dados quando entidade estiver criada
  129      // const preferencias = await this.preferenciasRepository.findOne({

  157  
  158:     // TODO: Salvar no banco de dados
  159      // await this.preferenciasRepository.save(preferenciasAtualizadas);

  528    ): Promise<number> {
  529:     // TODO: Implementar consulta real ao banco
  530      // Por enquanto, retornar 0

src\modules\notificacao\services\notificacao-proativa.service.ts:
  299        solicitacoesVencidas,
  300:       pagamentosAtrasados: 0, // TODO: Implementar quando módulo de pagamentos estiver disponível
  301:       documentosPendentes: 0, // TODO: Implementar quando módulo de documentos estiver disponível
  302        usuariosAtivos,

src\modules\notificacao\services\notification-manager.service.ts:
  706  
  707:       // TODO: Configurar job para verificar notificações pendentes periodicamente
  708        // Temporariamente desabilitado - depende do ScheduleAdapter

src\modules\pagamento\handlers\get-pagamentos.handler.ts:
  227        if (pagamentoId) {
  228:         // TODO: Implementar invalidação de cache por padrão
  229          // const pattern = `pagamento:${pagamentoId}:*`;

  232  
  233:       // TODO: Implementar invalidação de cache por padrão
  234        // await this.cacheService.deleteByPattern('pagamento:pagamentos:*');

src\modules\pagamento\interceptors\pagamento-performance.interceptor.ts:
  272        if (url.includes('/pagamentos')) {
  273:         // TODO: Implementar invalidação de cache por padrão
  274          // await this.cacheService.clear(); // Alternativa temporária

  282        if (url.includes('/comprovantes')) {
  283:         // TODO: Implementar invalidação de cache por padrão
  284          // await this.cacheService.clear(); // Alternativa temporária

src\modules\pagamento\mappers\pagamento-unified.mapper.ts:
  290        id: documento.id,
  291:       pagamento_id: '', // TODO: Implementar busca do pagamento_id
  292        nome_original: documento.nome_original,

src\modules\pagamento\services\pagamento-workflow.service.ts:
  677      // Buscar recibos de aluguel através do DocumentoRepository
  678:     // TODO: Implementar busca de documentos por pagamento_id
  679      const recibos = [];

src\modules\solicitacao\services\pendencia.service.ts:
  210  
  211:     // TODO: Implementar verificação de permissões específicas para solicitação
  212      // Por enquanto, a verificação é feita pelo PermissionGuard no controller
