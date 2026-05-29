import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const productos = await prisma.producto.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(productos);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "tecnico") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const producto = await prisma.producto.create({
    data: {
      nombre: body.nombre,
      principioActivo: body.principioActivo,
      tipoProducto: body.tipoProducto,
      carencia: body.carencia,
    },
  });

  return NextResponse.json(producto);
}
