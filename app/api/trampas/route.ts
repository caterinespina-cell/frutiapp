import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "monitoreador") {
    return NextResponse.json({ error: "Solo monitoreadores pueden agregar trampas" }, { status: 403 });
  }

  const body = await req.json();

  const trampa = await prisma.trampa.create({
    data: {
      numero: body.numero,
      tipo: body.tipo,
      lat: body.lat,
      lng: body.lng,
      cuadroId: body.cuadroId,
    },
  });

  return NextResponse.json(trampa);
}
