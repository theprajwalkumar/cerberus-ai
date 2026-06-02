import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const server = await prisma.mcpServer.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(server);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const body = await request.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.url !== undefined) data.url = body.url;
  if (body.apiKey && body.apiKey.trim() !== "") data.apiKey = body.apiKey;
  if (body.type !== undefined) data.type = body.type;
  if (body.status !== undefined) data.status = body.status;
  if (body.policyId !== undefined) data.policyId = body.policyId;

  const server = await prisma.mcpServer.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(server);
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  await prisma.mcpServer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}