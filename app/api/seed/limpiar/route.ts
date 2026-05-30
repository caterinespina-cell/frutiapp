import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Borrar en orden por dependencias
    await prisma.lecturaTrampa.deleteMany({});
    await prisma.monitoreoBrote.deleteMany({});
    await prisma.monitoreoFruto.deleteMany({});
    await prisma.visitaMonitoreo.deleteMany({});
    await prisma.aplicacionProducto.deleteMany({});
    await prisma.aplicacion.deleteMany({});
    await prisma.trampa.deleteMany({});
    await prisma.cuadro.deleteMany({});

    return NextResponse.json({ ok: true, mensaje: "Cuadros y trampas borrados" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
