import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const NOISE_MCP_METHODS = new Set(["initialize", "ping"]);

function isMcpNoise(log: any): boolean {
  if (!log.request) return false;
  try {
    const parsed = JSON.parse(log.request);
    const method = parsed?.method || "";
    if (NOISE_MCP_METHODS.has(method)) return true;
    if (method.startsWith("notifications/")) return true;
  } catch {}
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Number(searchParams.get("offset")) || 0;
  const excludeNoise = searchParams.get("excludeNoise") !== "false";

  const where: any = {};
  if (serverId) where.serverId = serverId;
  if (status) where.status = status;

  const [allLogs, total] = await Promise.all([
    prisma.mcpLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { server: { select: { name: true, url: true } } },
    }),
    prisma.mcpLog.count({ where }),
  ]);

  const logs = excludeNoise ? allLogs.filter((log) => !isMcpNoise(log)) : allLogs;

  return NextResponse.json({ logs, total });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ids = searchParams.get("ids");

  if (id) {
    await prisma.mcpLog.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: 1 });
  }

  if (ids) {
    const idList = ids.split(",").filter(Boolean);
    const result = await prisma.mcpLog.deleteMany({ where: { id: { in: idList } } });
    return NextResponse.json({ ok: true, deleted: result.count });
  }

  return NextResponse.json({ ok: false, error: "id or ids required" }, { status: 400 });
}