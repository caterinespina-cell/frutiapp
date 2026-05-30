import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PRODUCTOS_SATA_FRUTALES } from "@/lib/productosSATA";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "tecnico") {
    return NextResponse.json({ error: "Solo técnicos pueden cargar productos" }, { status: 403 });
  }

  let cargados = 0;
  let ya_existian = 0;

  for (const p of PRODUCTOS_SATA_FRUTALES) {
    const existe = await prisma.producto.findFirst({ where: { nombre: p.nombre } });
    if (!existe) {
      await prisma.producto.create({ data: p });
      cargados++;
    } else {
      ya_existian++;
    }
  }

  return NextResponse.json({
    ok: true,
    cargados,
    ya_existian,
    total: PRODUCTOS_SATA_FRUTALES.length,
    mensaje: `${cargados} productos cargados, ${ya_existian} ya existían`,
  });
}
