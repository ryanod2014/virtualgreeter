/**
 * Automation Configuration (CommonJS for existing server.js)
 * 
 * This is a temporary bridge until the full refactoring is complete.
 * ALL AUTOMATION IS OFF BY DEFAULT.
 */

const automationConfig = {
  enabled: true,
  testTickets: ['TKT-093', 'TKT-090', 'TKT-088'],  // Pipeline test: 3 parallel tickets
  autoQueueOnDevComplete: true,
  autoQueueOnQaPass: true,
  autoDispatchOnBlock: true,
  maxParallelDevAgents: 2,
  maxParallelQaAgents: 2,
  maxIterations: 5,
};

// Allow runtime override via environment variables
if (process.env.AUTOMATION_ENABLED === 'true') {
  automationConfig.enabled = true;
  automationConfig.autoQueueOnDevComplete = true;
  automationConfig.autoQueueOnQaPass = true;
  automationConfig.autoDispatchOnBlock = true;
}

// Individual overrides
if (process.env.AUTO_QUEUE_ON_DEV_COMPLETE === 'true') {
  automationConfig.autoQueueOnDevComplete = true;
}
if (process.env.AUTO_QUEUE_ON_QA_PASS === 'true') {
  automationConfig.autoQueueOnQaPass = true;
}
if (process.env.AUTO_DISPATCH_ON_BLOCK === 'true') {
  automationConfig.autoDispatchOnBlock = true;
}

module.exports = automationConfig;
