-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "apiKey" TEXT,
    "type" TEXT NOT NULL DEFAULT 'openai',
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "policyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpLog" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "policyEval" TEXT,
    "duration" INTEGER,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "cost" DOUBLE PRECISION,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "conversationId" TEXT,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "url" TEXT,
    "request" TEXT NOT NULL,
    "response" TEXT,
    "status" INTEGER NOT NULL DEFAULT 200,
    "durationMs" INTEGER,
    "contentType" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientToken" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT,
    "logId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rules" TEXT NOT NULL DEFAULT '[]',
    "scope" TEXT NOT NULL DEFAULT 'global',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedTeamScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'prompt-injection',
    "framework" TEXT NOT NULL DEFAULT 'owasp',
    "frameworkId" TEXT,
    "prompt" TEXT NOT NULL,
    "expectedRisk" TEXT NOT NULL DEFAULT 'high',
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedTeamScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedTeamRun" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "risk" TEXT,
    "analysis" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedTeamRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "McpLog" ADD CONSTRAINT "McpLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientToken" ADD CONSTRAINT "ClientToken_logId_fkey" FOREIGN KEY ("logId") REFERENCES "BridgeLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedTeamRun" ADD CONSTRAINT "RedTeamRun_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedTeamRun" ADD CONSTRAINT "RedTeamRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RedTeamScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
