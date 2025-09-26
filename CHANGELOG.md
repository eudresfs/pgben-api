# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.8.0](https://github.com/kemosoft-team/pgben-server/compare/v1.7.0...v1.8.0) (2025-09-26)


### Features

* **beneficio:** add benefit availability verification endpoint ([d9f0808](https://github.com/kemosoft-team/pgben-server/commit/d9f080854701ea83e94910fbd161a93e831aab53))
* **beneficio:** add resultado beneficio cessado feature ([9785404](https://github.com/kemosoft-team/pgben-server/commit/978540474836074ac647f1f85e6ca3278e32e6ba))
* **beneficio:** add transaction-safe createWithManager method and improve renovation process ([6d9ad77](https://github.com/kemosoft-team/pgben-server/commit/6d9ad777a79f38f45a180307cf32444c645c843f))
* **concessao:** improve search functionality with Brackets for advanced filters ([a2f1c8d](https://github.com/kemosoft-team/pgben-server/commit/a2f1c8db0b8c08cea6c90a937244ce4b219b59c0))
* **pagamento:** add payment history tracking and receipt invalidation ([d5c65d5](https://github.com/kemosoft-team/pgben-server/commit/d5c65d5d33fbd32b10b6b0ef5959f175b2001833))
* **pagamento:** add status change events to payment workflow ([635170c](https://github.com/kemosoft-team/pgben-server/commit/635170c0b6d6e3d57f1524c4091965284be269fa))
* **pagamento:** allow null payment value for strategy calculation ([8818aa4](https://github.com/kemosoft-team/pgben-server/commit/8818aa4cf62037cea27f5ad9ff25abc3b568ca26))
* **pagamento:** implement automatic concession termination on payment confirmation ([48e29d1](https://github.com/kemosoft-team/pgben-server/commit/48e29d1dddbd6872be712fe4eeb0cb800bf227b9))
* **pagamento:** implement benefit calculation strategies and data improvements ([dc9052c](https://github.com/kemosoft-team/pgben-server/commit/dc9052cf726555be0d6b5b3e10e51d29160bd575))
* **pagamento:** implement scheduled payment processing and next parcel filter ([b4c1d65](https://github.com/kemosoft-team/pgben-server/commit/b4c1d659d21af74371b761a41e2a9e2e5beae699))
* **payment:** add payment release DTO and implement release workflow ([d0fd22b](https://github.com/kemosoft-team/pgben-server/commit/d0fd22bed3ca7e6cb637c70ad50ddba488a0e15a))
* **pdf:** add support for cesta-basica payment receipts ([c992a5c](https://github.com/kemosoft-team/pgben-server/commit/c992a5ca417d2b9f21a0277f6fda257f3545f9a5))
* **rate-limiting:** implement intelligent user identification for rate limiting ([61cb018](https://github.com/kemosoft-team/pgben-server/commit/61cb0183c5155fb9112fff99617f71ef9833c345))
* **renovacao:** implement beneficio renovation feature ([9c04288](https://github.com/kemosoft-team/pgben-server/commit/9c04288931369af06e351c6c3478cf45469a3d6c))
* **renovation:** improve renovation process with status updates and validation ([0d65bc0](https://github.com/kemosoft-team/pgben-server/commit/0d65bc0d8165993ed46d65d67b1d5719f8fc2fae))
* **whatsapp-flows:** add initial whatsapp flows module with core functionality ([f147d6f](https://github.com/kemosoft-team/pgben-server/commit/f147d6fea3361df49095e48d0ac3b43ee74622f1))


### Bug Fixes

* **concessao:** replace LOWER with ILIKE for case-insensitive search ([2c105ab](https://github.com/kemosoft-team/pgben-server/commit/2c105ab868ddba283d132a36bc817ceac04ebb43))
* **pagamento:** change nome field selection from unidade to usuario ([59c280c](https://github.com/kemosoft-team/pgben-server/commit/59c280cef1f900e4feca753cb66df6ee6fd213a5))
* **pagamento:** change payment status from RECEBIDO to PAGO ([a68dbf8](https://github.com/kemosoft-team/pgben-server/commit/a68dbf8d60e24f7393fdb25a87b0ba25f1fb1839))
* **pagamento:** update payment status and fix circular dependency ([9bd6d23](https://github.com/kemosoft-team/pgben-server/commit/9bd6d23f5e5f1cd8242985a1a050f5d77762afb9))
* **payment:** update benefit configuration intervals and release days ([ccaf40b](https://github.com/kemosoft-team/pgben-server/commit/ccaf40b43c2ebe2a5368c5b678fdca66dec4435d))
* **rate-limiting:** temporarily disable rate limiting for investigation ([b24e40a](https://github.com/kemosoft-team/pgben-server/commit/b24e40ab430cb18ffba6cd43c5b31c5edfcf2444))
* **relatorios:** change content-disposition to inline for pdf reports ([8c4c670](https://github.com/kemosoft-team/pgben-server/commit/8c4c670559d72c12705603529996f3c9348596b2))

## [1.7.0](https://github.com/kemosoft-team/pgben-server/compare/v1.6.0...v1.7.0) (2025-09-15)


### Features

* **beneficio:** add priority field to benefit requests ([93f332a](https://github.com/kemosoft-team/pgben-server/commit/93f332a2c644cdc61ac7377edfd7edcd3308e0c3))
* **comprovante:** removido a data padrão "hoje" ([681d367](https://github.com/kemosoft-team/pgben-server/commit/681d3670638ca6b84364fd1492dcd13bdd6f2b1c))
* **documento-pdf:** change response to PDF download instead of JSON ([37b2ac5](https://github.com/kemosoft-team/pgben-server/commit/37b2ac5f38d0e16768b4cc3bade09c5ac1e98da2))
* **escolaridade:** Adição do novo valor ensino_infantil ([1fed4fb](https://github.com/kemosoft-team/pgben-server/commit/1fed4fb2b28533acc66cfe777e786ad29fa3a842))
* **pagamentos:** reativar endpoint de busca por id de solicitacao e concessao ([a15ec7d](https://github.com/kemosoft-team/pgben-server/commit/a15ec7dbc6a641ffb0bd71210ac0830994d6e387))
* **pagamentos:** reativar endpoint de busca por id de solicitacao e concessao ([cb510e4](https://github.com/kemosoft-team/pgben-server/commit/cb510e4e0d3cba5c0d4a2a51b6c35b0a2d489d3c))
* **pdf:** migrate PDF generation to common module ([84a57ec](https://github.com/kemosoft-team/pgben-server/commit/84a57ec335b0f172972e70f2d97b6896030c5fac))
* **relatorios:** implement pdf generation with advanced filters and templates ([8d00c0a](https://github.com/kemosoft-team/pgben-server/commit/8d00c0a20583643ee2abe04f518b0b8839d43d92))
* **relatorios:** migrate and consolidate relatorios-unificado module into relatorios ([d189074](https://github.com/kemosoft-team/pgben-server/commit/d1890744c7b4b09d3561fa5aac3d85b7ca01d3b5))


### Bug Fixes

* **documento:** make required fields mandatory in ataúde interfaces ([b7e1e14](https://github.com/kemosoft-team/pgben-server/commit/b7e1e14650d52345c254fd260fcb9ef346c74c23))
* **download:** change Content-Disposition from attachment to inline for file downloads ([1d86c14](https://github.com/kemosoft-team/pgben-server/commit/1d86c1476bd82112573db0d1d1b3fcfe487f0b64))
* **filtros:** Adicionar TECNICO SEMTAS à permissão do filtro de unidade ([7731276](https://github.com/kemosoft-team/pgben-server/commit/7731276175934bab646d7921011247e836df35bc))
* **pdf-template:** improve address formatting in aluguel-social template ([768d457](https://github.com/kemosoft-team/pgben-server/commit/768d457761694610d16298f5d5d37b4dfb34dbcf))

## [1.6.0](https://github.com/kemosoft-team/pgben-server/compare/v1.5.0...v1.6.0) (2025-09-08)


### Features

* **documento:** add PDF document generation for funeral benefit authorization ([f36b03a](https://github.com/kemosoft-team/pgben-server/commit/f36b03ac8098b263f9e7e940600b941da6ca2266))
* **documento:** add translado field and update urn descriptions ([104f467](https://github.com/kemosoft-team/pgben-server/commit/104f467abfcdc34cba959bc35d77c504cd3ed4c2))

## [1.5.0](https://github.com/kemosoft-team/pgben-server/compare/v1.4.0...v1.5.0) (2025-09-05)


### Features

* **document:** add file reuse functionality and audit type ([cf36ca3](https://github.com/kemosoft-team/pgben-server/commit/cf36ca375ca591db0aa8196dfdd6590c2490f460))


### Bug Fixes

* **documento-reuse:** disable document reuse to ensure all uploads are processed ([14ad655](https://github.com/kemosoft-team/pgben-server/commit/14ad655aa8d1e3e4d7aaa4e2b3d1e3856641e874))
* **solicitacao:** improve error message for beneficiary unit validation ([a8e5170](https://github.com/kemosoft-team/pgben-server/commit/a8e51702e0e66fb8f13e21b8a5c94beb2cc72d1c))

## [1.4.0](https://github.com/kemosoft-team/pgben-server/compare/v1.3.0...v1.4.0) (2025-09-04)


### Features

* **pendencia:** add optimistic locking and transaction handling for pendencia operations ([2b665e6](https://github.com/kemosoft-team/pgben-server/commit/2b665e6fb5884941ec360bb9e1a3a6d016b181a3))


### Bug Fixes

* **concessao:** change benefit end date calculation to use parcel count ([e8ff437](https://github.com/kemosoft-team/pgben-server/commit/e8ff43751083df7fd875be6091b4b202ddfedcc0))

## [1.3.0](https://github.com/kemosoft-team/pgben-server/compare/v1.2.0...v1.3.0) (2025-09-04)


### Features

* **cidadao:** implement soft delete and include_removed flag for queries ([2b2a7e0](https://github.com/kemosoft-team/pgben-server/commit/2b2a7e0692765c78f5518a0fc02ebadd5abadbe5))
* **documento:** add pendencia_id field to document response and persistence ([a195efa](https://github.com/kemosoft-team/pgben-server/commit/a195efa13d49d3055f83ee5d16d4b692b7edc55f))
* **pendencia:** add document support for pendencia entity ([c4f9e1b](https://github.com/kemosoft-team/pgben-server/commit/c4f9e1bfde60cf0804b0f6bfb587ca0f6f4dc5ac))
* **usuario:** add findByUnidade method and increase pagination limits ([6aa8538](https://github.com/kemosoft-team/pgben-server/commit/6aa8538c408b92a75593c964343f03fa58d9cb92))


### Bug Fixes

* **workflow:** add history entry for priority bypass cases ([1100446](https://github.com/kemosoft-team/pgben-server/commit/1100446880f7f51fa4f71d307103f34a7d26cabf))

## [1.2.0](https://github.com/kemosoft-team/pgben-server/compare/v1.1.0...v1.2.0) (2025-09-03)


### Features

* add CORS logging and approval tracking improvements ([d21c63c](https://github.com/kemosoft-team/pgben-server/commit/d21c63c487250a46a8a9c9b17be998973dac0edb))
* **metrics:** add specialized services for social impact and operational management metrics ([9d0108a](https://github.com/kemosoft-team/pgben-server/commit/9d0108a6e15d3ede03f2f7f294c259a18c2bc56b))
* **metrics:** implement real queries for dashboard metrics ([97e3e99](https://github.com/kemosoft-team/pgben-server/commit/97e3e99cd090b577b082fd7984095f81646f360e))
* **pagamento:** add parcelas support and update aluguel social rules ([ad86c48](https://github.com/kemosoft-team/pgben-server/commit/ad86c48a120000baa2b29a378e2819cb3d655448))
* **payment:** add diaLimite to benefit strategies ([fe7ae51](https://github.com/kemosoft-team/pgben-server/commit/fe7ae517b55171c314ae060e52a28074ca51853d))
* **pendencia:** add history tracking for status changes ([2e368fb](https://github.com/kemosoft-team/pgben-server/commit/2e368fb899d119a75aaf519d270e5ee3d1b997a0))
* **unidade:** add pagination metadata to findAll response ([ea3c932](https://github.com/kemosoft-team/pgben-server/commit/ea3c932d436cc73081bb95f1268b7056913332b1))


### Bug Fixes

* **pagamento:** update payment status transition rules ([0b42966](https://github.com/kemosoft-team/pgben-server/commit/0b429663cf713bdde84f675773c53fbe9f9f8cde))

## [1.1.0](https://github.com/kemosoft-team/pgben-server/compare/v0.1.15...v1.1.0) (2025-09-01)


### Features

* **feedback:** implement feedback module with entities, services and endpoints ([789f84d](https://github.com/kemosoft-team/pgben-server/commit/789f84d3946920414791529e1869fbac3e792548))
* **interceptor:** add text normalization interceptor for name fields ([9a20e64](https://github.com/kemosoft-team/pgben-server/commit/9a20e64d38e10cabd3b625d55f8a9bf148c12e1b))
* **notification:** implement standardized notification system ([c6654e9](https://github.com/kemosoft-team/pgben-server/commit/c6654e969d6ebf03b777fafe4f15c705dcc90043))
* **notifications:** implement event-driven notification system ([c72b63b](https://github.com/kemosoft-team/pgben-server/commit/c72b63b5b75d37d71e7291fd6452ca0dcdfd3ce5))
* **scoped-repository:** enhance scope context handling and logging ([b419a9a](https://github.com/kemosoft-team/pgben-server/commit/b419a9a678a4961ad9c920f3470dd690c7d71be2))
* **workflow:** add priority bypass for analysis submission ([d6b81e8](https://github.com/kemosoft-team/pgben-server/commit/d6b81e8f24cb3844f94f2d34142518d0b2013935))

### [0.1.15](https://github.com/kemosoft-team/pgben-server/compare/v0.1.14...v0.1.15) (2025-08-29)


### Features

* **concessao:** implement advanced filters for concession management ([dede910](https://github.com/kemosoft-team/pgben-server/commit/dede910ef2b370c8203ec1222044febcf66814a0))
* **filters:** implement advanced filtering system across modules ([990a999](https://github.com/kemosoft-team/pgben-server/commit/990a99947b887c43012c633798f78c7e9da10128))
* **monitoramento:** add agendamento history tracking system ([d6c2ad5](https://github.com/kemosoft-team/pgben-server/commit/d6c2ad5e1abb92790b64523a9ea6363bddef5842))
* **monitoramento:** rename ACOMPANHAMENTO to CONTINUIDADE visit type ([334a5c6](https://github.com/kemosoft-team/pgben-server/commit/334a5c63bb7b3bbea40c18383a7928b083e9038b))
* **pagamento:** add pagination to pending monitoring payments endpoint ([8a30c34](https://github.com/kemosoft-team/pgben-server/commit/8a30c349c9fc713da556d00fe5ef1821c5781931))
* **pagamento:** add tipo_concessao field to payment response ([10da0b2](https://github.com/kemosoft-team/pgben-server/commit/10da0b2af6f5b98d0d5eb676339605438e2a93a6))
* **pagamento:** enhance beneficiario data structure in response dto and mapper ([7f95650](https://github.com/kemosoft-team/pgben-server/commit/7f956504a1901745596c83f24f1ee67b354aa386))

### [0.1.14](https://github.com/kemosoft-team/pgben-server/compare/v0.1.13...v0.1.14) (2025-08-26)


### Features

* **aluguel-social:** add locator fields and judicial determination ([995e1bf](https://github.com/kemosoft-team/pgben-server/commit/995e1bfde13e93f14385767f10d679af6e1a2e56))
* **metrics:** implement real queries for dashboard metrics ([0fc4cf0](https://github.com/kemosoft-team/pgben-server/commit/0fc4cf02b3ab773d37b21d10271848f19808b2c3))
* **pagamento:** add release criteria calculation to payment lookup ([e67af4c](https://github.com/kemosoft-team/pgben-server/commit/e67af4ca9546ef40fc6dc2ce8560ba9699751b58))

### [0.1.13](https://github.com/kemosoft-team/pgben-server/compare/v0.1.12...v0.1.13) (2025-08-26)


### Features

* **metrics:** add endpoint to get solicitation count by status ([e64003e](https://github.com/kemosoft-team/pgben-server/commit/e64003e15efabe8a3f06e05c051ccb9e5b4b27a0))
* **pagamento:** add batch receipt generation functionality ([43864fe](https://github.com/kemosoft-team/pgben-server/commit/43864fe47d794ef1b6b0301cc4ddc73dc9a13052))

### [0.1.12](https://github.com/kemosoft-team/pgben-server/compare/v0.1.11...v0.1.12) (2025-08-26)


### Features

* **pagamento:** add filters for pending monitoring payments ([454c95b](https://github.com/kemosoft-team/pgben-server/commit/454c95bb16da8680c5e930c34c91ed8a4d64f63f))
* **pagamento:** add related entity joins to payment query ([cfce632](https://github.com/kemosoft-team/pgben-server/commit/cfce632694809057dd171f0eb2ca906a5146eed6))
* **pagamento:** make confirmation fields optional with defaults ([72fc4e1](https://github.com/kemosoft-team/pgben-server/commit/72fc4e15ed2eb1a31ff6e6f6be6e5f19401adc84))

### [0.1.11](https://github.com/kemosoft-team/pgben-server/compare/v0.1.10...v0.1.11) (2025-08-26)


### Features

* **dashboard:** add metrics dashboard service and endpoints ([8b0f966](https://github.com/kemosoft-team/pgben-server/commit/8b0f966d0d89f8bec4c7786a9cd44afea05de1b3))
* **metrics:** add advanced filtering support for dashboard metrics ([4439c0a](https://github.com/kemosoft-team/pgben-server/commit/4439c0acab603da5a4b592d0f0d4481da5853056))

### [0.1.10](https://github.com/kemosoft-team/pgben-server/compare/v0.1.9...v0.1.10) (2025-08-25)


### Features

* **aprovacao:** replace boolean 'ativo' with enum 'status' and add user relations ([1f39ec9](https://github.com/kemosoft-team/pgben-server/commit/1f39ec97bbfc898803a9f09a3515f14657426394))
* **audit:** add operation error handling in audit listener ([8712873](https://github.com/kemosoft-team/pgben-server/commit/8712873d97e468fc4345a954aa44df32ba4f6d2e))
* **audit:** enhance audit system with global interceptor and deduplication ([306956a](https://github.com/kemosoft-team/pgben-server/commit/306956af7f841c888582e6eb24409e90a39d3f6d))
* **auditoria:** add entity and operation decorators for audit logging ([1d00519](https://github.com/kemosoft-team/pgben-server/commit/1d00519a1ab410999235c87e2ef6cbf8291a2ad6))
* **monitoramento:** refactor agendamento to use pagamento_id instead of beneficiario_id ([79ac536](https://github.com/kemosoft-team/pgben-server/commit/79ac5367129b0cd1d7061da923458efa0132bcac))
* **pagination:** implement standardized pagination across repositories and services ([0416cd2](https://github.com/kemosoft-team/pgben-server/commit/0416cd27ce742c7d8662acdc277bb2cf792c8536))

### [0.1.9](https://github.com/kemosoft-team/pgben-server/compare/v0.1.8...v0.1.9) (2025-08-22)


### Bug Fixes

* **email:** correct email deduplication logic and add tests ([5e783e5](https://github.com/kemosoft-team/pgben-server/commit/5e783e50f24423acfb0bee1372c006b2d3d448c2))

### [0.1.8](https://github.com/kemosoft-team/pgben-server/compare/v0.1.7...v0.1.8) (2025-08-22)


### Features

* **approval:** add automatic permission registration for approvers ([01730df](https://github.com/kemosoft-team/pgben-server/commit/01730df274a2f468b699432c46044aaa4cbb2a0b))
* **cidadao:** add nacionalidade field and portal transparencia integration ([af45b30](https://github.com/kemosoft-team/pgben-server/commit/af45b30d980fed6acda49cad9c8cc6c7a6c34951))
* **monitoramento:** add monitoring module with visit scheduling and evaluation ([51d65ce](https://github.com/kemosoft-team/pgben-server/commit/51d65ceb6dedf9d467839ac3fc7b6459a5954f0e))
* **pagamento:** add payment release criteria and filtering options ([2aff515](https://github.com/kemosoft-team/pgben-server/commit/2aff515a768b911f1edf4449b1da3316fe2bfa9f))


### Bug Fixes

* **aprovacao:** prevent permission removal when user is still approver in other actions ([65b981e](https://github.com/kemosoft-team/pgben-server/commit/65b981e6dcecfe103e545e4cbda12626c8b9d351))

### [0.1.7](https://github.com/kemosoft-team/pgben-server/compare/v0.1.6...v0.1.7) (2025-08-20)


### Features

* **approval:** add notification service and enhance ably listener ([8d29c97](https://github.com/kemosoft-team/pgben-server/commit/8d29c978f959a25da69a0c1eb0e395c7403eadbe))
* **aprovacao-v2:** migrate approval system to v2 with simplified architecture ([970a8fc](https://github.com/kemosoft-team/pgben-server/commit/970a8fc48a1982b1eaf736324b751b7a03b574a5))
* **aprovacao:** implement approval module with entities, services and strategies ([237ff73](https://github.com/kemosoft-team/pgben-server/commit/237ff73e25955b6e61d2d2c158bcaf4c6ae3b26a))
* **aprovacao:** migrate aprovacao-v2 module to aprovacao with expanded functionality ([f90a6d7](https://github.com/kemosoft-team/pgben-server/commit/f90a6d7f8fda39835bd5c4f720a029ea2eda652f))
* **auth:** add scoped user lookup methods for authentication ([0a5fbac](https://github.com/kemosoft-team/pgben-server/commit/0a5fbac4ff1d1ff27d26f69a3e2674496bf9b53c))
* **cidadao:** implement upsert functionality for citizen creation ([214c28a](https://github.com/kemosoft-team/pgben-server/commit/214c28a75e172b85918c15fe9c2bf0205df0ea06))
* **minio:** improve configuration validation and error handling ([e694df6](https://github.com/kemosoft-team/pgben-server/commit/e694df6ec82c9d35e9427770b098aeaac2c53f05))
* **nginx:** add CORS headers and preflight handling ([115325b](https://github.com/kemosoft-team/pgben-server/commit/115325b9471a01c88d92a27af05d20984ec58b67))
* **pagamento:** add concessao status update for first installment ([ae750a6](https://github.com/kemosoft-team/pgben-server/commit/ae750a6bc19621b62a40ca0d512eb5b23877c37c))
* **pagamento:** add PDF receipt generation for social benefits ([037ac37](https://github.com/kemosoft-team/pgben-server/commit/037ac3775c7f60a0e711a57d5bfb6908715a6122))
* **payment:** add validation for previous installment confirmation ([d0692fa](https://github.com/kemosoft-team/pgben-server/commit/d0692fa0fec4b41b4d613dc3c424d9ed90007335))
* **role:** add codigo field to role entity and update references ([0a3e0af](https://github.com/kemosoft-team/pgben-server/commit/0a3e0aff1446aeb6bbc4e4a557c36a055e3a7668))
* **solicitacao:** add soft delete functionality for solicitacao ([5e21344](https://github.com/kemosoft-team/pgben-server/commit/5e21344c036b6b0ec35447acccce0b339dc30d42))
* **solicitacao:** add valor field to solicitacao entity and dto ([e99d81d](https://github.com/kemosoft-team/pgben-server/commit/e99d81d65e3539a4205ec4f484139b9c3628ac1c))


### Bug Fixes

* **comprovante:** update permission names ([ab4e217](https://github.com/kemosoft-team/pgben-server/commit/ab4e217d1866ad7d634c139e5ac02ed504e4a313))
* **concessao:** cancel linked payments when canceling concession ([a8dfaa3](https://github.com/kemosoft-team/pgben-server/commit/a8dfaa311eb908c9bece10058443d9d07e6df7b9))
* **cors:** add required headers for file downloads and skip rate limiting for preflight ([278e30a](https://github.com/kemosoft-team/pgben-server/commit/278e30a5e228263c7c7ee1ef8bce5c509fc26e61))
* **pagamento-validation:** update allowed status transitions for VENCIDO ([2d2afed](https://github.com/kemosoft-team/pgben-server/commit/2d2afede8a8a16e507dbe349c301f528a83ab78c))
* **usuario:** Adiciona relações à busca do usuário ([795c40c](https://github.com/kemosoft-team/pgben-server/commit/795c40cd07623bf0bfe6d057f3aa748ab8e49c14))

### [0.1.6](https://github.com/kemosoft-team/pgben-server/compare/v0.1.5...v0.1.6) (2025-08-07)


### Features

* **notificações:** implementar notificações agendadas e sistema de preferências ([afac0e2](https://github.com/kemosoft-team/pgben-server/commit/afac0e27e0ec59f0de35ceda4ccbfe2ac6409060))

### [0.1.5](https://github.com/kemosoft-team/pgben-server/compare/v0.1.4...v0.1.5) (2025-08-06)


### Features

* **documento:** add office document conversion and thumbnail improvements ([0d2827e](https://github.com/kemosoft-team/pgben-server/commit/0d2827e15a1614276c502d9fd37e8085561f86a6))

### [0.1.4](https://github.com/kemosoft-team/pgben-server/compare/v0.1.3...v0.1.4) (2025-08-06)


### Features

* **cidadao:** add family composition search to citizen query ([73252ab](https://github.com/kemosoft-team/pgben-server/commit/73252ab3cc4d7fb9f918ae815e2005c054895bc9))
* **cidadao:** add flag for citizens found via family composition ([428eeef](https://github.com/kemosoft-team/pgben-server/commit/428eeefc67595763f860c3ce0205da5e0ba9539d))
* **enums:** add new document type for identification ([bcb7610](https://github.com/kemosoft-team/pgben-server/commit/bcb76105760c46dde64dad0b61b40f5e4f9dd6e1))

### [0.1.3](https://github.com/kemosoft-team/pgben-server/compare/v0.1.2...v0.1.3) (2025-08-05)


### Features

* **metrics:** add comprehensive dashboard indicators and filtering system ([0f305d8](https://github.com/kemosoft-team/pgben-server/commit/0f305d8d771d7e6ec3dca50ffa3c0fa498a39101))

### 0.1.2 (2025-08-05)


### Features

* add new enums and update existing ones for benefit types ([690a3d3](https://github.com/kemosoft-team/pgben-server/commit/690a3d311903a268a06edd739c04499685cb51bf))
* adiciona configuração inicial da infraestrutura e documentação da API ([cd79183](https://github.com/kemosoft-team/pgben-server/commit/cd7918381272770a032b2a0f930562f37bd0e861))
* adiciona controllers de documento e monitoramento com rate limiting ([fecc0b6](https://github.com/kemosoft-team/pgben-server/commit/fecc0b6ccdeac37bf9f3d1e03d06c8ea475bbdcb))
* **audit:** implement Redis retry strategy and fallback logging ([1a192f0](https://github.com/kemosoft-team/pgben-server/commit/1a192f093caccc5c42e1ee55b10093b7b4b96aca))
* **auditoria:** implement new audit module structure and services ([11380c2](https://github.com/kemosoft-team/pgben-server/commit/11380c2655797c2e19c720e765b49c348e37f49a))
* **auth:** add role scope handling and permission decorators ([af9dde9](https://github.com/kemosoft-team/pgben-server/commit/af9dde96fc046ee033f1cc3c86116a6ba560ec45))
* **auth:** implement scope-based access control system ([c2d999a](https://github.com/kemosoft-team/pgben-server/commit/c2d999af0416b94fe5acf1c7b0002973ffce9c7c))
* **batch-download:** enhance job response with estimated size and count ([c93c3fe](https://github.com/kemosoft-team/pgben-server/commit/c93c3fefd8b629e53634c2a458d9cf3087c56c66))
* **batch-download:** implement streaming batch download with optimized memory usage ([9f5a5dc](https://github.com/kemosoft-team/pgben-server/commit/9f5a5dc22c904f969334810e51916b07c1d59797))
* **beneficio:** add endpoint to remove document requirement ([b72e414](https://github.com/kemosoft-team/pgben-server/commit/b72e414493d8957b5b97b6a22d3708398dd90de5))
* **beneficio:** add funeral benefit transfer type and addresses ([af45ff6](https://github.com/kemosoft-team/pgben-server/commit/af45ff619cff2ae3ffaa345cf2093a55e224db0a))
* **beneficio:** add template support for document requirements ([166f843](https://github.com/kemosoft-team/pgben-server/commit/166f843b3e81f5cacb84c7b1eb6c20b5bb5ac4ed))
* **beneficio:** implement upsert functionality in benefit data services ([7daffc0](https://github.com/kemosoft-team/pgben-server/commit/7daffc0078fe2ea6066648a3cf281cfef5497b6e))
* **cidadao:** add citizen unit transfer functionality ([b97b419](https://github.com/kemosoft-team/pgben-server/commit/b97b4195603a795c640adba68084b50aa0ab465b))
* **cidadao:** add contato and endereco relations to cidadao entity ([f5d4ef4](https://github.com/kemosoft-team/pgben-server/commit/f5d4ef4c1ea6914a65ab45c221e6cd15e780ca1a))
* **cidadao:** add situacao-moradia module with CRUD operations ([4430d34](https://github.com/kemosoft-team/pgben-server/commit/4430d34edca98a3b38ffa11ae74bca9ce1301059))
* **concessao:** add operation reasons enum and endpoint ([29023cf](https://github.com/kemosoft-team/pgben-server/commit/29023cf10be1f10057906212989bbca9a3ae531b))
* **concessao:** update status and payment generation logic ([17ed3d4](https://github.com/kemosoft-team/pgben-server/commit/17ed3d439ea7482869a5a132b09db777a4a854d0))
* configuração inicial da arquitetura do servidor PGBEN com monitoring e backup ([bdf8266](https://github.com/kemosoft-team/pgben-server/commit/bdf82664a8161e1f3f33501bd5e1e5718488b802))
* correção de transactions ([aa4df61](https://github.com/kemosoft-team/pgben-server/commit/aa4df612e9886bff7c0dbb673b3a1d3e8add9f8d))
* **deployment:** improve k8s deployment configuration and health checks ([09d6a68](https://github.com/kemosoft-team/pgben-server/commit/09d6a68180e3b1e7f39e53cdc07d09aaafc8fb04))
* **docker:** enable JWT key generation in entrypoint script and add test commands ([61dd45a](https://github.com/kemosoft-team/pgben-server/commit/61dd45ab6f359f7c162454e75cf313f628e95c0f))
* **document:** add security enhancements and document access control ([469b01c](https://github.com/kemosoft-team/pgben-server/commit/469b01c02449425aba3d22e6e6ee03f24700afb0))
* **documento:** implement batch download service with database integration ([eb056f3](https://github.com/kemosoft-team/pgben-server/commit/eb056f3ff74eaae6714e46a17dda63f70564dece))
* **documento:** implement thumbnail generation and public URLs for documents ([4d6dd51](https://github.com/kemosoft-team/pgben-server/commit/4d6dd51257801807595d16beaf0778414e6b033f))
* **documento:** improve batch download functionality ([4bac8ab](https://github.com/kemosoft-team/pgben-server/commit/4bac8abea9637405ef64efe0a85f5da9c7f78d29))
* **error-catalog:** enhance error handling with contextual messages ([adc97bc](https://github.com/kemosoft-team/pgben-server/commit/adc97bcf502142817c654cc5bdc3e12d7dae9718))
* implementa Fase 1 - Sprint 1.1 da refatoração do download em lote ([f044a17](https://github.com/kemosoft-team/pgben-server/commit/f044a17687165278039fc10503e495ac719dc258))
* implementa módulo easy-upload com serviços de token e QR code ([382a74e](https://github.com/kemosoft-team/pgben-server/commit/382a74e2687cc964f6b9a30806b806118c16eda0))
* implementa serviços de usuário e catálogo de erros com validações avançadas ([09a8934](https://github.com/kemosoft-team/pgben-server/commit/09a89340c6c07deac0ec7e144dc87f45a3ef369f))
* implementa sistema de benefícios com fluxo de pagamentos e solicitações ([933f1ca](https://github.com/kemosoft-team/pgben-server/commit/933f1cad5ef9a95a39db500ac4f604d9a266a4c3))
* implementar autenticação e notificações em tempo real com Ably ([052f410](https://github.com/kemosoft-team/pgben-server/commit/052f410439128d74a82c8e9525ef97206169141a))
* implementar módulo de cidadão com autenticação e cache otimizado ([31832c0](https://github.com/kemosoft-team/pgben-server/commit/31832c015c39193f91ef0ec37be1e1b6399ca53a))
* **interceptor:** add error handling interceptor with detailed logging ([fe6a99c](https://github.com/kemosoft-team/pgben-server/commit/fe6a99c02de7e055438477fb2590d81f2ca25569))
* **minio:** add region support and improve file integrity handling ([c0c2dbc](https://github.com/kemosoft-team/pgben-server/commit/c0c2dbc461c565c3999530185dce7abc15f741ab))
* **notificacao:** enhance notification system with email support and template updates ([fbc1e7c](https://github.com/kemosoft-team/pgben-server/commit/fbc1e7cd7024f044d3c779c72273b3fb8f754f1a))
* **notifications:** add support for urgent notifications and template improvements ([98c312e](https://github.com/kemosoft-team/pgben-server/commit/98c312e64571615cab1e3e25e6a0b19504f25540))
* **notifications:** implement event-driven notification system with SSE support ([9ec0e1e](https://github.com/kemosoft-team/pgben-server/commit/9ec0e1e4a37cc0e171c8fdedd4c229df56967954))
* otimizar Dockerfile com melhores práticas de segurança e DevOps ([a25b3c7](https://github.com/kemosoft-team/pgben-server/commit/a25b3c79f8edcd13734439d62aa92d3871da07dc))
* **pagamento:** add received and regularized payment statuses ([ba80292](https://github.com/kemosoft-team/pgben-server/commit/ba80292108413ae2734eebd42b512022dd268bb2))
* **pagamento:** implement strategy pattern for benefit payment calculations ([2b9f9f5](https://github.com/kemosoft-team/pgben-server/commit/2b9f9f5a4efad4312e466b767c756ee193197abd))
* **pendencia:** add status validation and synchronization with solicitacao ([e00d7cf](https://github.com/kemosoft-team/pgben-server/commit/e00d7cfb63904878aebc55c844763eed8768bc42))
* **performance:** implement comprehensive performance optimization system ([4e3b95d](https://github.com/kemosoft-team/pgben-server/commit/4e3b95d5b295ac2524ab13b25c60638d4e94a28d))
* Remover chaves jwt em arquivo e apenas chaves base64 ([67d0be1](https://github.com/kemosoft-team/pgben-server/commit/67d0be11ba094bdcbb502e1d0aae90ca933fe7f7))
* **repositories:** implement scoped repositories and auto-scoping ([e02730f](https://github.com/kemosoft-team/pgben-server/commit/e02730f9edade7cc15ddf28367e21fb4d7a57902))
* **scoped-repository:** enhance security with strict mode and context validation ([cbc60c7](https://github.com/kemosoft-team/pgben-server/commit/cbc60c733b2136610193c546e2d800d2f100b2cc))
* **scoped-repository:** implement performance optimizations and security enhancements ([6cda031](https://github.com/kemosoft-team/pgben-server/commit/6cda03102cad9a856e49f5c54de3c0e145b59f6b))
* **security:** add robust input validation and error handling for hash generation ([909d3bd](https://github.com/kemosoft-team/pgben-server/commit/909d3bd4e3c3a4900a191da21eca06075740d735))
* simplificação dados-sociais ([b1ce8ea](https://github.com/kemosoft-team/pgben-server/commit/b1ce8eae41d39a4e984061639e15664675770da1))
* simplificação do código do cidadao e composicao-familiar (service, repository, controller) ([e9f1ac6](https://github.com/kemosoft-team/pgben-server/commit/e9f1ac6e739b577315ed2e6d1ff5d887d03dfebb))
* **solicitacao:** add concessao join to solicitacao query ([3df48a6](https://github.com/kemosoft-team/pgben-server/commit/3df48a6bab16f9ccaa2546c098672a3c47232b5d))
* **solicitacao:** add determinacao_judicial_flag and prioridade fields ([7fbe6b6](https://github.com/kemosoft-team/pgben-server/commit/7fbe6b644fbd20db68748872f782440e25cc443e))
* **thumbnail:** implement lazy generation with aggressive caching ([33a38ec](https://github.com/kemosoft-team/pgben-server/commit/33a38ecaf1ec4589d45c62ef605d75a027fa34b2))
* **usuario:** add credentials resend functionality ([ad286cb](https://github.com/kemosoft-team/pgben-server/commit/ad286cbad82da77a3f47eacc2df24e815846621c))


### Bug Fixes

* adicionar validacoes opcionais para chaves JWT ([7843d83](https://github.com/kemosoft-team/pgben-server/commit/7843d837007d1c30398cdbbeb3de499197197625))
* beneficios ([363afde](https://github.com/kemosoft-team/pgben-server/commit/363afdefa1401492e9e4723a47d3bf7fb537ead2))
* beneficios ([28e8328](https://github.com/kemosoft-team/pgben-server/commit/28e83285f747d960a42f0a9e129da6cc81640f58))
* **cidadao:** remove redundant removed_at check for endereco ([e705b52](https://github.com/kemosoft-team/pgben-server/commit/e705b52aef6c5e3d0d12e27cf610a9b395b9ec54))
* composição familiar ([59ef2f3](https://github.com/kemosoft-team/pgben-server/commit/59ef2f32eeedad1f82f19906adac134b7d6317e9))
* composição familiar ([f32801d](https://github.com/kemosoft-team/pgben-server/commit/f32801d1f26bf97f7e063a22208f26402aa6b107))
* copiar scripts antes de gerar chaves JWT no Dockerfile ([48d51f9](https://github.com/kemosoft-team/pgben-server/commit/48d51f9bb9fcae7154bff93338d80fcd406c9d84))
* correções ([6443b7f](https://github.com/kemosoft-team/pgben-server/commit/6443b7f01fb066cd83b953822e61c9f1206150a7))
* correções ([7c43990](https://github.com/kemosoft-team/pgben-server/commit/7c439905f44da03f6e7e055689a274bcd7d4cdc2))
* correções ([1e78fae](https://github.com/kemosoft-team/pgben-server/commit/1e78fae8380cf8012b5662b3d3e937726191c1d9))
* correções das migrations, correção das responsabilidades dos módulos solicitação e beneficio |  new: modulo judicial ([c136c7f](https://github.com/kemosoft-team/pgben-server/commit/c136c7f48306e66a3efa12dde9ad1e06261ce3e0))
* correções das migrations, correção das responsabilidades dos módulos solicitação e beneficio |  new: modulo judicial ([c6c2344](https://github.com/kemosoft-team/pgben-server/commit/c6c234426c049e7efd6161a93115598892d5b738))
* corrige ordem dos parâmetros na chamada do método checkReusability ([05aa651](https://github.com/kemosoft-team/pgben-server/commit/05aa6510a8919ea5f1a0ad84b649b84af73cbc8f))
* corrigir instalacao de dependencias no Dockerfile para incluir devDependencies necessarias para build ([421357a](https://github.com/kemosoft-team/pgben-server/commit/421357a809398a4ae39ae003f36b77050336dace))
* corrigir sintaxe do comando COPY no Dockerfile ([d69ff24](https://github.com/kemosoft-team/pgben-server/commit/d69ff243e3d9b40e38987e6bcfe3f1a2a85aca47))
* dados sensiveis no response da solicitação removidos ([b2bc787](https://github.com/kemosoft-team/pgben-server/commit/b2bc787e8a65a81e5601513b5a50a8a97a3d2835))
* deploy.yml ([7e60149](https://github.com/kemosoft-team/pgben-server/commit/7e60149ffc75a35de086414c57e7088538aef2e1))
* deploy.yml ([951c4fd](https://github.com/kemosoft-team/pgben-server/commit/951c4fde540edd87c11711c7703915526214cd63))
* deploy.yml ([5c89062](https://github.com/kemosoft-team/pgben-server/commit/5c89062a8bb4915c43f4c3c32fe17245c400128d))
* deploy.yml ([e7e073c](https://github.com/kemosoft-team/pgben-server/commit/e7e073cad94dd708abef007c16acbf035a5457b7))
* deploy.yml ([eb1c91b](https://github.com/kemosoft-team/pgben-server/commit/eb1c91b7b95afe716f2c95b1ad45e6c61b9256fa))
* documentos ([b633425](https://github.com/kemosoft-team/pgben-server/commit/b63342578e6bf9dee98d4113053208ddeaa64b27))
* enums ([59d1ec7](https://github.com/kemosoft-team/pgben-server/commit/59d1ec7b6b1f1cd0eed4ced1d73fea77eed9e73e))
* gerar chaves jwt .pem ([b1d54cf](https://github.com/kemosoft-team/pgben-server/commit/b1d54cf27b39afa70bcfc983460096090b83bd04))
* health check ([0efbd1d](https://github.com/kemosoft-team/pgben-server/commit/0efbd1de08e39de4ca11acb750b3a45414ca74d6))
* health check ([4b7cf5b](https://github.com/kemosoft-team/pgben-server/commit/4b7cf5bf51533d37342e6cf89efda2fdcd543bd0))
* health check endpoint ([9f878f9](https://github.com/kemosoft-team/pgben-server/commit/9f878f9c292356cdb229c41a1c948bdfa8975be3))
* Implementa graceful shutdown melhorado para resolver travamento no deploy K8s ([e70f08b](https://github.com/kemosoft-team/pgben-server/commit/e70f08bcd1c73648faa70fa67412dcc983a6c0a4))
* Implementa graceful shutdown melhorado para resolver travamento no deploy K8s ([775bd62](https://github.com/kemosoft-team/pgben-server/commit/775bd6258a31d19a1bde02390cf9521464bd2465))
* listar pendências ([ccc17b7](https://github.com/kemosoft-team/pgben-server/commit/ccc17b780396634d018a95e485eda0e2d77250b2))
* melhorias deploy ([46038ef](https://github.com/kemosoft-team/pgben-server/commit/46038eff40b8324e93e3aaecd7b02f3ad917c8fe))
* melhorias deploy ([ff907ac](https://github.com/kemosoft-team/pgben-server/commit/ff907aca07db7aebc27db6af7887518c0cffdd69))
* melhorias deploy ([a8e1c47](https://github.com/kemosoft-team/pgben-server/commit/a8e1c47fbdc0870309790ecb24cf049b7f916cc7))
* melhorias deploy ([2e92ad2](https://github.com/kemosoft-team/pgben-server/commit/2e92ad2351e2bdc5e9ca182298be307b3db0810d))
* melhorias deploy ([c06be81](https://github.com/kemosoft-team/pgben-server/commit/c06be81ab97a75cbd690db9d8f7dc95447db799d))
* melhorias deploy ([1500c03](https://github.com/kemosoft-team/pgben-server/commit/1500c03ac378654b89dc8eb8ee1c395661912486))
* melhorias deploy ([088b643](https://github.com/kemosoft-team/pgben-server/commit/088b6439fb9032e435fb87181b3b09a6ac1ae7b7))
* melhorias deploy ([b77ddd2](https://github.com/kemosoft-team/pgben-server/commit/b77ddd29dd50daacdede7b867b69a29e4a34b140))
* melhorias deploy ([5d6ed8b](https://github.com/kemosoft-team/pgben-server/commit/5d6ed8bcd8e14ba3b72bb6e8d5e209152d4e9579))
* melhorias deploy ([1cdea29](https://github.com/kemosoft-team/pgben-server/commit/1cdea29a36d1e73491ddc5fbc22c3c898ba2eaa3))
* melhorias deploy ([68934af](https://github.com/kemosoft-team/pgben-server/commit/68934af28dec1c45e73225d5ef1b924e4f76b4d1))
* melhorias deploy ([46dec97](https://github.com/kemosoft-team/pgben-server/commit/46dec9719e07d3c545978b3c3c89002034399cef))
* melhorias deploy ([466ea3d](https://github.com/kemosoft-team/pgben-server/commit/466ea3d2dfe9a43c39679fa8bcbe982ab1a2649e))
* melhorias deploy ([68f45a9](https://github.com/kemosoft-team/pgben-server/commit/68f45a9e9ac5d76eddc9a6940667264355d87221))
* migrations ([382f6db](https://github.com/kemosoft-team/pgben-server/commit/382f6db42d4eedff083f3cd097c3220f8aec7477))
* migrations ([9d9bfea](https://github.com/kemosoft-team/pgben-server/commit/9d9bfea593a6688bad11b9b28f84b644fe229e60))
* migrations ([c9da19d](https://github.com/kemosoft-team/pgben-server/commit/c9da19d1547d283e37502583977a578c1eed2d6a))
* migrations, seeds, endpoints cidadao ([a1fe669](https://github.com/kemosoft-team/pgben-server/commit/a1fe6697f9bfb75f433bba55cc48e87becd68020))
* migrations, seeds, endpoints cidadao, entidades e enums centralizadas ([2c936e6](https://github.com/kemosoft-team/pgben-server/commit/2c936e604b290809970e2818955841baaba6b6af))
* **minio:** handle multiple metadata key formats for encrypted files ([fbf7b70](https://github.com/kemosoft-team/pgben-server/commit/fbf7b70fa6881181e5e84fd9571a8d35e37219ec))
* move JWT key generation to runtime in docker-entrypoint ([dd17b27](https://github.com/kemosoft-team/pgben-server/commit/dd17b27e8b6db76ea8fa699a39c96f58ec888ebb))
* mover cookie-parser para dependencies principais para resolver erro em produção ([f4e6cce](https://github.com/kemosoft-team/pgben-server/commit/f4e6cce953ab08ed1ddffcf5b1cef25574e9b59d))
* multer.File to any ([da63f2e](https://github.com/kemosoft-team/pgben-server/commit/da63f2edcf21559e56c4fca6448f0763899fb519))
* pagamentos ([0a84234](https://github.com/kemosoft-team/pgben-server/commit/0a842347900bc0900fed6feac64bc538af0bb93f))
* pagamentos swagger ([76cfedc](https://github.com/kemosoft-team/pgben-server/commit/76cfedc21602c08d7abfbf3773b660d3d3d7de14))
* papel_cidadao ([c87e29c](https://github.com/kemosoft-team/pgben-server/commit/c87e29cbe27021337066a10c554241c11fa7ce94))
* pendências ([d582b75](https://github.com/kemosoft-team/pgben-server/commit/d582b75a20476f5bf32a719286d10847cd494db9))
* redifinição de senha | atualização automática de status da solicitação quando preencher dados específicos do benefício ([c44a27d](https://github.com/kemosoft-team/pgben-server/commit/c44a27d51a723877262844e2fc32e513324bfa7b))
* roles ([d0571e4](https://github.com/kemosoft-team/pgben-server/commit/d0571e49b39f3decdb5fec7e09e4ab4afcf5a4db))
* schema beneficios ([4066766](https://github.com/kemosoft-team/pgben-server/commit/4066766e20f6e3a9018e116d84701d9f6cc3d541))
* unidade_id no jwt ([43e4516](https://github.com/kemosoft-team/pgben-server/commit/43e4516d4afcc85edf886b2655e413209a745d5a))
* update health check endpoints to use consistent paths ([1e04cb6](https://github.com/kemosoft-team/pgben-server/commit/1e04cb62909d55c68884a72e31546dc15c28f8c8))
* update prod credentials in docker-entrypoint ([e1ada05](https://github.com/kemosoft-team/pgben-server/commit/e1ada05af5ab0fe558b957a13052bfb6a7ca6f40))
