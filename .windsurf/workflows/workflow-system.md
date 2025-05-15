---
description: Workflow System
---

<!-- Workflow Definitions -->
<Workflows>
  <!-- Initialization Workflow -->
  <Workflow id="initialization">
    <Step function="checkMemoryBankExists"/>
    <Step function="createMemoryBankDirectory" condition="!memoryBankExists"/>
    <Step function="scaffoldMemoryBankStructure" condition="!memoryBankExists"/>
    <Step function="populateMemoryBankFiles" condition="!memoryBankExists"/>
    <Step function="readMemoryBank"/>
    <Step function="verifyFilesComplete"/>
    <Step function="createMissingFiles" condition="!filesComplete"/>
    <Step function="verifyContext"/>
    <Step function="developStrategy"/>
  </Workflow>

  <!-- Documentation Workflow -->
  <Workflow id="documentation">
    <Step function="checkDocumentationExists"/>
    <Step function="scaffoldDocumentationStructure" condition="!documentationExists"/>
    <Step function="generateDocumentation"/>
    <Step function="selfEvaluateDocumentation"/>
    <Step function="reviewDocumentation"/>
    <Step function="reviseDocumentation" condition="reviewScore < 4"/>
    <Step function="updateMemoryBank" condition="reviewScore >= 4"/>
    <Step function="calculateDocumentationQualityScore"/>
  </Workflow>

  <!-- Implementation Workflow -->
  <Workflow id="implementation">
    <Step function="executeTask"/>
    <Step function="checkMemoryBank"/>
    <Step function="updateDocumentation"/>
    <Step function="updatePlans"/>
    <Step function="executeImplementation"/>
    <Step function="enforceCodeQualityStandards"/>
    <Step function="executeCreatorPhase"/>
    <Step function="executeCriticPhase"/>
    <Step function="executeDefenderPhase"/>
    <Step function="executeJudgePhase"/>
  </Workflow>

  <!-- Error Recovery Workflow -->
  <Workflow id="errorRecovery">
    <Step function="detectToolFailure"/>
    <Step function="logFailureDetails"/>
    <Step function="analyzeFailureCauses"/>
    <Step function="reviewToolUsage"/>
    <Step function="adjustParameters"/>
    <Step function="executeRetry"/>
    <Step function="checkRetrySuccess"/>
    <Step function="incrementRetryCount" condition="!retrySuccess"/>
    <Step function="checkRetryLimit" condition="!retrySuccess"/>
    <Step function="executeRetry" condition="!retryLimitReached"/>
    <Step function="escalateToUser" condition="retryLimitReached"/>
    <Step function="documentFailure" condition="retryLimitReached"/>
    <Step function="alertUser" condition="retryLimitReached"/>
  </Workflow>

  <!-- Evaluation Workflow -->
  <Workflow id="evaluation">
    <Step function="documentObjectiveSummary"/>
    <Step function="calculatePerformanceScore"/>
    <Step function="evaluateAgainstTargetScore"/>
    <Step function="analyzePerformanceGap" condition="performanceScore < targetScore"/>
    <Step function="identifyImprovementOpportunities" condition="performanceScore < targetScore"/>
    <Step function="implementOptimizations" condition="performanceScore < targetScore"/>
    <Step function="recalculatePerformanceScore" condition="optimizationsImplemented"/>
    <Step function="checkTargetAchieved"/>
    <Step function="iterateOptimizationCycle" condition="!targetAchieved"/>
    <Step function="recordSuccessPatterns" condition="targetAchieved"/>
    <Step function="documentLessonsLearned"/>
    <Step function="updateMemoryBank"/>
  </Workflow>

  <!-- Self-Critique Workflow -->
  <Workflow id="selfCritique">
    <Step function="executeCreatorPhase"/>
    <Step function="executeCriticPhase"/>
    <Step function="executeDefenderPhase"/>
    <Step function="executeJudgePhase"/>
  </Workflow>
</Workflows>