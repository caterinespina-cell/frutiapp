import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Productos fitosanitarios registrados en Uruguay (Guía SATA - MGAP)
// Uso frecuente en frutales de carozo: durazno, nectarino, ciruela, damasco
const PRODUCTOS_SATA = [
  // ── INSECTICIDAS ──────────────────────────────────────────────
  { nombre: "Clorpirifos 48 EC", principioActivo: "Clorpirifos", tipoProducto: "Insecticida", carencia: 21 },
  { nombre: "Lorsban 48 E", principioActivo: "Clorpirifos", tipoProducto: "Insecticida", carencia: 21 },
  { nombre: "Decis 2.5 EC", principioActivo: "Deltametrina", tipoProducto: "Insecticida", carencia: 14 },
  { nombre: "Karate Zeon 5 CS", principioActivo: "Lambda-cihalotrina", tipoProducto: "Insecticida", carencia: 14 },
  { nombre: "Confidor 35 SC", principioActivo: "Imidacloprid", tipoProducto: "Insecticida", carencia: 28 },
  { nombre: "Gaucho 35 FS", principioActivo: "Imidacloprid", tipoProducto: "Insecticida", carencia: 28 },
  { nombre: "Mospilan 20 SP", principioActivo: "Acetamiprid", tipoProducto: "Insecticida", carencia: 14 },
  { nombre: "Epik 20 SP", principioActivo: "Acetamiprid", tipoProducto: "Insecticida", carencia: 14 },
  { nombre: "Spintor 480 SC", principioActivo: "Spinosad", tipoProducto: "Insecticida", carencia: 7 },
  { nombre: "Success 480 SC", principioActivo: "Spinosad", tipoProducto: "Insecticida", carencia: 7 },
  { nombre: "Tracer 120 SC", principioActivo: "Spinosad", tipoProducto: "Insecticida", carencia: 7 },
  { nombre: "Coragen 200 SC", principioActivo: "Clorantraniliprole", tipoProducto: "Insecticida", carencia: 7 },
  { nombre: "Rynaxypyr 200 SC", principioActivo: "Clorantraniliprole", tipoProducto: "Insecticida", carencia: 7 },
  { nombre: "Movento 150 SC", principioActivo: "Espinetoram", tipoProducto: "Insecticida", carencia: 7 },
  { nombre: "Exirel 100 SE", principioActivo: "Ciantraniliprole", tipoProducto: "Insecticida", carencia: 3 },
  { nombre: "Dimilin 25 WP", principioActivo: "Diflubenzuron", tipoProducto: "Insecticida", carencia: 14 },
  { nombre: "Buldock 025 EC", principioActivo: "Beta-ciflutrina", tipoProducto: "Insecticida", carencia: 14 },

  // ── ACARICIDAS ────────────────────────────────────────────────
  { nombre: "Vertimec 18 EC", principioActivo: "Abamectina", tipoProducto: "Acaricida", carencia: 14 },
  { nombre: "Abamec 18 EC", principioActivo: "Abamectina", tipoProducto: "Acaricida", carencia: 14 },
  { nombre: "Nissorum 10 WP", principioActivo: "Hexitiazox", tipoProducto: "Acaricida", carencia: 30 },
  { nombre: "Omite 570 EW", principioActivo: "Propargita", tipoProducto: "Acaricida", carencia: 21 },
  { nombre: "Sanmite 20 WP", principioActivo: "Piridaben", tipoProducto: "Acaricida", carencia: 14 },
  { nombre: "Envidor 240 SC", principioActivo: "Spirodiclofen", tipoProducto: "Acaricida", carencia: 7 },
  { nombre: "Masai 20 WP", principioActivo: "Tebufenpirad", tipoProducto: "Acaricida", carencia: 14 },

  // ── FUNGICIDAS ────────────────────────────────────────────────
  { nombre: "Mancozeb 80 WP", principioActivo: "Mancozeb", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Dithane M-45", principioActivo: "Mancozeb", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Captan 50 WP", principioActivo: "Captan", tipoProducto: "Fungicida", carencia: 3 },
  { nombre: "Captan 83 WG", principioActivo: "Captan", tipoProducto: "Fungicida", carencia: 3 },
  { nombre: "Folicur 250 EW", principioActivo: "Tebuconazol", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Elite 450 EC", principioActivo: "Tebuconazol + Triadimenol", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Tilt 250 EC", principioActivo: "Propiconazol", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Bumper 25 EC", principioActivo: "Propiconazol", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Score 250 EC", principioActivo: "Difenoconazol", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Rovral 500 SC", principioActivo: "Iprodiona", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Botran 75 WP", principioActivo: "Dicloran", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Scala 40 SC", principioActivo: "Pirimetanil", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Switch 62.5 WG", principioActivo: "Ciprodinil + Fludioxonil", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Mythos 30 SC", principioActivo: "Pirimetanil", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Curzate M-72 WP", principioActivo: "Cimoxanil + Mancozeb", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Chorus 50 WG", principioActivo: "Ciprodinil", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Benlate 50 WP", principioActivo: "Benomil", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Thiram 70 WP", principioActivo: "Tiram", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Ziram 76 WG", principioActivo: "Ziram", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Topsin M 70 WP", principioActivo: "Tiofanato metílico", tipoProducto: "Fungicida", carencia: 14 },
  { nombre: "Kocide 2000", principioActivo: "Hidróxido de cobre", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Cupravit OB 21", principioActivo: "Oxicloruro de cobre", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Caldo bordelés", principioActivo: "Sulfato de cobre + Cal", tipoProducto: "Fungicida", carencia: 7 },
  { nombre: "Microthiol Disperss", principioActivo: "Azufre", tipoProducto: "Fungicida", carencia: 3 },
  { nombre: "Kumulus DF", principioActivo: "Azufre", tipoProducto: "Fungicida", carencia: 3 },

  // ── BACTERICIDAS ──────────────────────────────────────────────
  { nombre: "Agrimycin 17 WP", principioActivo: "Estreptomicina", tipoProducto: "Bactericida", carencia: 21 },
  { nombre: "Kasugamycin 2 SL", principioActivo: "Kasugamicina", tipoProducto: "Bactericida", carencia: 14 },

  // ── REGULADORES ───────────────────────────────────────────────
  { nombre: "Dormex 520 SL", principioActivo: "Cianamida de hidrógeno", tipoProducto: "Regulador de crecimiento", carencia: 60 },
  { nombre: "Cytadel 52 SC", principioActivo: "Cianamida de hidrógeno", tipoProducto: "Regulador de crecimiento", carencia: 60 },
  { nombre: "Promalin", principioActivo: "BA + Giberelina", tipoProducto: "Regulador de crecimiento", carencia: 7 },
  { nombre: "Maxcel", principioActivo: "6-Benciladenina", tipoProducto: "Regulador de crecimiento", carencia: 7 },

  // ── KAOLÍN ────────────────────────────────────────────────────
  { nombre: "Surround WP", principioActivo: "Caolín", tipoProducto: "Protector físico", carencia: 0 },
];

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "tecnico") {
    return NextResponse.json({ error: "Solo técnicos pueden cargar productos" }, { status: 403 });
  }

  let cargados = 0;
  let ya_existian = 0;

  for (const p of PRODUCTOS_SATA) {
    const existe = await prisma.producto.findFirst({
      where: { nombre: p.nombre },
    });
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
    total: PRODUCTOS_SATA.length,
    mensaje: `${cargados} productos cargados, ${ya_existian} ya existían`,
  });
}
