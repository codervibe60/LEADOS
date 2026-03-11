import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      status: p.status,
      config: p.config ? JSON.parse(p.config) : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const project = await prisma.project.create({
    data: {
      name: body.name || 'Untitled Project',
      description: body.description || null,
      type: body.type || 'external',
      config: body.config ? JSON.stringify(body.config) : null,
    },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    type: project.type,
    status: project.status,
    config: body.config || null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
