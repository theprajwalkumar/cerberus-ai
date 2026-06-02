import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "24h";

  const now = Date.now();
  const periods: Record<string, number> = {
    "1h": 3600000,
    "6h": 21600000,
    "24h": 86400000,
    "7d": 604800000,
    "30d": 2592000000,
  };
  const range = periods[period] || periods["24h"];
  const since = new Date(now - range);

  const [
    mcpTotal, mcpBlocked, mcpError, mcpLogs,
    serverCount,
    bridgeTotal, bridgeLogs,
    recentMcp, recentBridge,
  ] = await Promise.all([
    prisma.mcpLog.count({ where: { createdAt: { gte: since } } }),
    prisma.mcpLog.count({ where: { createdAt: { gte: since }, status: "blocked" } }),
    prisma.mcpLog.count({ where: { createdAt: { gte: since }, status: "error" } }),
    prisma.mcpLog.findMany({
      where: { createdAt: { gte: since } },
      select: { duration: true, tokensIn: true, status: true },
    }),
    prisma.mcpServer.count(),
    prisma.bridgeLog.count({ where: { createdAt: { gte: since } } }),
    prisma.bridgeLog.findMany({
      where: { createdAt: { gte: since } },
      select: { durationMs: true, status: true },
    }),
    prisma.mcpLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, duration: true, createdAt: true, serverId: true },
    }),
    prisma.bridgeLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, durationMs: true, createdAt: true, method: true, url: true },
    }),
  ]);

  const mcpDurations = mcpLogs.filter(l => l.duration != null).map(l => l.duration as number);
  const mcpAvg = mcpDurations.length > 0 ? mcpDurations.reduce((a, b) => a + b, 0) / mcpDurations.length : 0;
  const mcpSuccess = mcpLogs.filter(l => l.status === "success").length;

  const bridgeDurations = bridgeLogs.filter(l => l.durationMs != null).map(l => l.durationMs as number);
  const bridgeAvg = bridgeDurations.length > 0 ? bridgeDurations.reduce((a, b) => a + b, 0) / bridgeDurations.length : 0;
  const bridgeSuccess = bridgeLogs.filter(l => l.status === 200).length;

  const totalRequests = mcpTotal + bridgeTotal;

  const hourlyBuckets: Record<string, { mcp: number; bridge: number }> = {};
  for (let i = 0; i < 24; i++) {
    const h = new Date(now - i * 3600000);
    const key = `${h.getHours()}:00`;
    hourlyBuckets[key] = { mcp: 0, bridge: 0 };
  }

  const [mcpHourLogs, bridgeHourLogs] = await Promise.all([
    prisma.mcpLog.findMany({
      where: { createdAt: { gte: new Date(now - 86400000) } },
      select: { createdAt: true },
    }),
    prisma.bridgeLog.findMany({
      where: { createdAt: { gte: new Date(now - 86400000) } },
      select: { createdAt: true },
    }),
  ]);

  for (const l of mcpHourLogs) {
    const h = new Date(l.createdAt).getHours();
    const key = `${h}:00`;
    if (hourlyBuckets[key]) hourlyBuckets[key].mcp++;
  }
  for (const l of bridgeHourLogs) {
    const h = new Date(l.createdAt).getHours();
    const key = `${h}:00`;
    if (hourlyBuckets[key]) hourlyBuckets[key].bridge++;
  }
  const hourly = Object.entries(hourlyBuckets)
    .map(([hour, counts]) => ({ hour, mcp: counts.mcp, bridge: counts.bridge, total: counts.mcp + counts.bridge }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return NextResponse.json({
    period,
    summary: {
      totalRequests,
      mcpRequests: mcpTotal,
      bridgeRequests: bridgeTotal,
      successRate: totalRequests > 0 ? Math.round(((mcpSuccess + bridgeSuccess) / totalRequests) * 100) : 100,
      blockedCount: mcpBlocked,
      errorCount: mcpError,
      avgResponseTime: totalRequests > 0
        ? Math.round((mcpAvg * mcpTotal + bridgeAvg * bridgeTotal) / totalRequests)
        : 0,
      activeServers: serverCount,
      uniqueServers: await prisma.mcpLog.groupBy({ by: ["serverId"], _count: true, where: { createdAt: { gte: since } } }).then(r => r.length),
    },
    hourly,
    recentMcp: recentMcp.map(l => ({ id: l.id, status: l.status, duration: l.duration, createdAt: l.createdAt, type: "mcp" })),
    recentBridge: recentBridge.map(l => ({ id: l.id, status: l.status, duration: l.durationMs, createdAt: l.createdAt, method: l.method, url: l.url, type: "bridge" })),
  });
}
