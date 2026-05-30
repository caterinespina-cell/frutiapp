import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Usuarios
  const [productor, tecnico, monitoreador] = await Promise.all([
    prisma.user.upsert({
      where: { email: "productor@frutibook.uy" },
      update: {},
      create: { name: "Juan García", email: "productor@frutibook.uy", password: await hash("productor123"), role: "productor" },
    }),
    prisma.user.upsert({
      where: { email: "tecnico@frutibook.uy" },
      update: {},
      create: { name: "María López", email: "tecnico@frutibook.uy", password: await hash("tecnico123"), role: "tecnico" },
    }),
    prisma.user.upsert({
      where: { email: "monitor@frutibook.uy" },
      update: {},
      create: { name: "Carlos Pérez", email: "monitor@frutibook.uy", password: await hash("monitor123"), role: "monitoreador" },
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
      coordenadas: JSON.stringify([[-34.774, -56.050], [-34.773, -56.047], [-34.776, -56.046], [-34.777, -56.049]]),
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
      coordenadas: JSON.stringify([[-34.778, -56.053], [-34.777, -56.050], [-34.780, -56.049], [-34.781, -56.052]]),
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
      lat: -34.7745,
      lng: -56.0485,
      cuadroId: cuadro1.id,
    },
  });

  // Productos fitosanitarios — Lista SATA MGAP Uruguay (se cargan si no existen)
  const productosSATA = [
    { nombre: "Clorpirifos 48 EC", principioActivo: "Clorpirifos", tipoProducto: "Insecticida", carencia: 21 },
    { nombre: "Lorsban 48 E", principioActivo: "Clorpirifos", tipoProducto: "Insecticida", carencia: 21 },
    { nombre: "Decis 2.5 EC", principioActivo: "Deltametrina", tipoProducto: "Insecticida", carencia: 14 },
    { nombre: "Karate Zeon 5 CS", principioActivo: "Lambda-cihalotrina", tipoProducto: "Insecticida", carencia: 14 },
    { nombre: "Confidor 35 SC", principioActivo: "Imidacloprid", tipoProducto: "Insecticida", carencia: 28 },
    { nombre: "Mospilan 20 SP", principioActivo: "Acetamiprid", tipoProducto: "Insecticida", carencia: 14 },
    { nombre: "Spintor 480 SC", principioActivo: "Spinosad", tipoProducto: "Insecticida", carencia: 7 },
    { nombre: "Tracer 120 SC", principioActivo: "Spinosad", tipoProducto: "Insecticida", carencia: 7 },
    { nombre: "Coragen 200 SC", principioActivo: "Clorantraniliprole", tipoProducto: "Insecticida", carencia: 7 },
    { nombre: "Exirel 100 SE", principioActivo: "Ciantraniliprole", tipoProducto: "Insecticida", carencia: 3 },
    { nombre: "Movento 150 SC", principioActivo: "Espinetoram", tipoProducto: "Insecticida", carencia: 7 },
    { nombre: "Dimilin 25 WP", principioActivo: "Diflubenzuron", tipoProducto: "Insecticida", carencia: 14 },
    { nombre: "Buldock 025 EC", principioActivo: "Beta-ciflutrina", tipoProducto: "Insecticida", carencia: 14 },
    { nombre: "Vertimec 18 EC", principioActivo: "Abamectina", tipoProducto: "Acaricida", carencia: 14 },
    { nombre: "Nissorum 10 WP", principioActivo: "Hexitiazox", tipoProducto: "Acaricida", carencia: 30 },
    { nombre: "Omite 570 EW", principioActivo: "Propargita", tipoProducto: "Acaricida", carencia: 21 },
    { nombre: "Envidor 240 SC", principioActivo: "Spirodiclofen", tipoProducto: "Acaricida", carencia: 7 },
    { nombre: "Sanmite 20 WP", principioActivo: "Piridaben", tipoProducto: "Acaricida", carencia: 14 },
    { nombre: "Masai 20 WP", principioActivo: "Tebufenpirad", tipoProducto: "Acaricida", carencia: 14 },
    { nombre: "Mancozeb 80 WP", principioActivo: "Mancozeb", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Dithane M-45", principioActivo: "Mancozeb", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Captan 50 WP", principioActivo: "Captan", tipoProducto: "Fungicida", carencia: 3 },
    { nombre: "Captan 83 WG", principioActivo: "Captan", tipoProducto: "Fungicida", carencia: 3 },
    { nombre: "Folicur 250 EW", principioActivo: "Tebuconazol", tipoProducto: "Fungicida", carencia: 14 },
    { nombre: "Tilt 250 EC", principioActivo: "Propiconazol", tipoProducto: "Fungicida", carencia: 14 },
    { nombre: "Score 250 EC", principioActivo: "Difenoconazol", tipoProducto: "Fungicida", carencia: 14 },
    { nombre: "Rovral 500 SC", principioActivo: "Iprodiona", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Scala 40 SC", principioActivo: "Pirimetanil", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Switch 62.5 WG", principioActivo: "Ciprodinil + Fludioxonil", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Chorus 50 WG", principioActivo: "Ciprodinil", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Botran 75 WP", principioActivo: "Dicloran", tipoProducto: "Fungicida", carencia: 14 },
    { nombre: "Topsin M 70 WP", principioActivo: "Tiofanato metílico", tipoProducto: "Fungicida", carencia: 14 },
    { nombre: "Kocide 2000", principioActivo: "Hidróxido de cobre", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Cupravit OB 21", principioActivo: "Oxicloruro de cobre", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Caldo bordelés", principioActivo: "Sulfato de cobre + Cal", tipoProducto: "Fungicida", carencia: 7 },
    { nombre: "Microthiol Disperss", principioActivo: "Azufre", tipoProducto: "Fungicida", carencia: 3 },
    { nombre: "Kumulus DF", principioActivo: "Azufre", tipoProducto: "Fungicida", carencia: 3 },
    { nombre: "Agrimycin 17 WP", principioActivo: "Estreptomicina", tipoProducto: "Bactericida", carencia: 21 },
    { nombre: "Dormex 520 SL", principioActivo: "Cianamida de hidrógeno", tipoProducto: "Regulador de crecimiento", carencia: 60 },
    { nombre: "Surround WP", principioActivo: "Caolín", tipoProducto: "Protector físico", carencia: 0 },
  ];

  for (const p of productosSATA) {
    const existe = await prisma.producto.findFirst({ where: { nombre: p.nombre } });
    if (!existe) await prisma.producto.create({ data: p });
  }

  return NextResponse.json({
    ok: true,
    usuarios: [
      { email: "productor@frutibook.uy", pass: "productor123", rol: "productor" },
      { email: "tecnico@frutibook.uy", pass: "tecnico123", rol: "técnico" },
      { email: "monitor@frutibook.uy", pass: "monitor123", rol: "monitoreador" },
    ],
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
