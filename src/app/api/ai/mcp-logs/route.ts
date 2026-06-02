import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Number(searchParams.get("offset")) || 0;

  const where: any = {};
  if (serverId) where.serverId = serverId;
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.mcpLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { server: { select: { name: true, url: true } } },
    }),
    prisma.mcpLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total });
}