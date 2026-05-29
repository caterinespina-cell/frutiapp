import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Usuarios
  const [productor, tecnico, monitoreador] = await Promise.all([
    prisma.user.upsert({
      where: { email: "productor@frutiapp.uy" },
      update: {},
      create: { name: "Juan García", email: "productor@frutiapp.uy", password: await hash("productor123"), role: "productor" },
    }),
    prisma.user.upsert({
      where: { email: "tecnico@frutiapp.uy" },
      update: {},
      create: { name: "María López", email: "tecnico@frutiapp.uy", password: await hash("tecnico123"), role: "tecnico" },
    }),
    prisma.user.upsert({
      where: { email: "monitor@frutiapp.uy" },
      update: {},
      create: { name: "Carlos Pérez", email: "monitor@frutiapp.uy", password: await hash("monitor123"), role: "monitoreador" },
    }),
  ]);

  // Establecimiento
  const estab = await prisma.establecimiento.upsert({
    where: { codigo: "K28D052" },
    update: {},
    create: {
      codigo: "K28D052",
      nombre: "El Duraznal",
      direccion: "Cno Los Horneros 11600, Canelones",
      lat: -34.52,
      lng: -56.23,
      productorId: productor.id,
    },
  });

  // Cuadros
  const cuadro1 = await prisma.cuadro.upsert({
    where: { id: "cuadro-1" },
    update: {},
    create: {
      id: "cuadro-1",
      nombre: "Cuadro A",
      variedad: "Flordaprince",
      especie: "durazno",
      superficie: 2.5,
      coordenadas: JSON.stringify([[-34.520, -56.230], [-34.519, -56.228], [-34.521, -56.227], [-34.522, -56.229]]),
      marcadoMonitoreo: true,
      establecimientoId: estab.id,
    },
  });

  const cuadro2 = await prisma.cuadro.upsert({
    where: { id: "cuadro-2" },
    update: {},
    create: {
      id: "cuadro-2",
      nombre: "Cuadro B",
      variedad: "Elegant Lady",
      especie: "nectarino",
      superficie: 1.8,
      coordenadas: JSON.stringify([[-34.523, -56.232], [-34.522, -56.230], [-34.524, -56.229], [-34.525, -56.231]]),
      marcadoMonitoreo: true,
      establecimientoId: estab.id,
    },
  });

  // Trampa
  await prisma.trampa.upsert({
    where: { id: "trampa-1" },
    update: {},
    create: {
      id: "trampa-1",
      numero: "T-01",
      tipo: "Feromona Grafolita",
      lat: -34.5205,
      lng: -56.2285,
      cuadroId: cuadro1.id,
    },
  });

  // Productos fitosanitarios
  await prisma.producto.upsert({
    where: { id: "prod-1" },
    update: {},
    create: {
      id: "prod-1",
      nombre: "Clorpirifos 48 EC",
      principioActivo: "Clorpirifos",
      tipoProducto: "Insecticida",
      carencia: 21,
    },
  });

  await prisma.producto.upsert({
    where: { id: "prod-2" },
    update: {},
    create: {
      id: "prod-2",
      nombre: "Mancozeb 80 WP",
      principioActivo: "Mancozeb",
      tipoProducto: "Fungicida",
      carencia: 7,
    },
  });

  return NextResponse.json({
    ok: true,
    usuarios: [
      { email: "productor@frutiapp.uy", pass: "productor123", rol: "productor" },
      { email: "tecnico@frutiapp.uy", pass: "tecnico123", rol: "técnico" },
      { email: "monitor@frutiapp.uy", pass: "monitor123", rol: "monitoreador" },
    ],
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
