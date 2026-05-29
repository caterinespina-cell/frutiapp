# Deploy FrutiApp — Vercel + Supabase

## 1. Base de datos en Supabase (gratis)

1. Ir a https://supabase.com → New project
2. Elegir nombre: `frutiapp`, región: **South America (São Paulo)**
3. Guardar la contraseña del proyecto
4. En **Settings → Database → Connection string → URI** copiar la URL
   Formato: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

## 2. Ajustar schema para PostgreSQL

Antes de migrar, cambiar `schema.prisma`:
```
datasource db {
  provider = "postgresql"
}
```
Y en `prisma.config.ts` asegurarse que `url: process.env["DATABASE_URL"]`

Luego correr la migración apuntando a Supabase:
```bash
DATABASE_URL="tu-url-supabase" npx prisma migrate deploy
```

## 3. Deploy en Vercel

```bash
# Instalar CLI de Vercel
npm i -g vercel

# En la carpeta del proyecto
cd C:\Users\cate_\frutiapp
vercel

# Seguir el wizard:
# - Link to existing project? No → crear nuevo
# - Project name: frutiapp
# - Root directory: ./  (Enter)
# - Override settings? No
```

## 4. Variables de entorno en Vercel

En el dashboard de Vercel → Settings → Environment Variables:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:[PASS]@db.[ID].supabase.co:5432/postgres` |
| `JWT_SECRET` | Una clave larga y random (ej: `openssl rand -base64 32`) |

## 5. Re-deploy

```bash
vercel --prod
```

## 6. Datos iniciales en producción

Después del primer deploy, ejecutar:
```
POST https://tu-app.vercel.app/api/seed
```

---

## Checklist pre-deploy
- [ ] `DATABASE_URL` de Supabase configurada en Vercel
- [ ] `JWT_SECRET` configurada en Vercel
- [ ] Schema de Prisma cambiado a `postgresql`
- [ ] Migración ejecutada contra Supabase
- [ ] Seed de datos corrido en producción
