# Sistema de Gamificación — Guía de instalación

## Stack
- Supabase (base de datos + auth gratis)
- Vercel (servidor edge gratis)
- Resend (emails gratis hasta 3.000/mes)

## Pasos en orden

1. Crear cuenta en supabase.com → nuevo proyecto
2. Ejecutar el SQL de `supabase/schema.sql`
3. Crear cuenta en resend.com → conseguir API key
4. Crear cuenta en vercel.com → conectar tu repo
5. Configurar variables de entorno en Vercel (ver abajo)
6. Copiar `frontend/gameEngine.js` a tu web
7. Listo

## Variables de entorno en Vercel

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...  (la service_role key, no la anon)
RESEND_API_KEY=re_xxxx
SITE_URL=https://tuweb.com
