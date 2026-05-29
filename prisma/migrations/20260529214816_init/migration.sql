-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Establecimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "productorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Establecimiento_productorId_fkey" FOREIGN KEY ("productorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cuadro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "variedad" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "superficie" REAL NOT NULL,
    "coordenadas" TEXT NOT NULL DEFAULT '[]',
    "marcadoMonitoreo" BOOLEAN NOT NULL DEFAULT false,
    "establecimientoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cuadro_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "principioActivo" TEXT NOT NULL,
    "tipoProducto" TEXT NOT NULL,
    "carencia" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Aplicacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuadroId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "volumenCaldo" REAL NOT NULL,
    "temperatura" REAL,
    "viento" REAL,
    "humedad" REAL,
    "observaciones" TEXT,
    "tecnicoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Aplicacion_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Aplicacion_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AplicacionProducto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aplicacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "dosis" REAL NOT NULL,
    "unidadDosis" TEXT NOT NULL,
    CONSTRAINT "AplicacionProducto_aplicacionId_fkey" FOREIGN KEY ("aplicacionId") REFERENCES "Aplicacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AplicacionProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trampa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "cuadroId" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trampa_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LecturaTrampa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trampaId" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "actividad" TEXT NOT NULL,
    "cantidadPlagas" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    CONSTRAINT "LecturaTrampa_trampaId_fkey" FOREIGN KEY ("trampaId") REFERENCES "Trampa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LecturaTrampa_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaMonitoreo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisitaMonitoreo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "monitoreadorId" TEXT NOT NULL,
    "observacionesGenerales" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitaMonitoreo_monitoreadorId_fkey" FOREIGN KEY ("monitoreadorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitoreoBrote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuadroId" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "objetivo" TEXT NOT NULL,
    "arbolesControlados" INTEGER NOT NULL,
    "arbolesConDano" INTEGER NOT NULL,
    "brotesConDanoNuevo" INTEGER NOT NULL,
    "brotesConDanoViejo" INTEGER NOT NULL,
    "observaciones" TEXT,
    CONSTRAINT "MonitoreoBrote_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MonitoreoBrote_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaMonitoreo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitoreoFruto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuadroId" TEXT NOT NULL,
    "visitaId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "objetivo" TEXT NOT NULL,
    "frutosControlados" INTEGER NOT NULL,
    "danoNuevoVivo" INTEGER NOT NULL DEFAULT 0,
    "danoNuevoDano" INTEGER NOT NULL DEFAULT 0,
    "danoViejoMuerto" INTEGER NOT NULL DEFAULT 0,
    "danoViejoDano" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    CONSTRAINT "MonitoreoFruto_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MonitoreoFruto_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "VisitaMonitoreo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Establecimiento_codigo_key" ON "Establecimiento"("codigo");
