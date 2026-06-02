import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const policies = await prisma.aiPolicy.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(policies);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const policy = await prisma.aiPolicy.create({
    data: {
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? true,
      rules: JSON.stringify(body.rules || []),
      scope: body.scope || "global",
      priority: body.priority || 0,
    },
  });
  return NextResponse.json(policy, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const policy = await prisma.aiPolicy.update({
    where: { id: body.id },
    data: {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      rules: body.rules ? JSON.stringify(body.rules) : undefined,
      scope: body.scope,
      priority: body.priority,
    },
  });
  return NextResponse.json(policy);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.aiPolicy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}