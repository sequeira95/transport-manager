export const prerender = false;
import type { APIRoute } from 'astro';
import { hashPassword, createSessionToken, createCookieHeader } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as any)?.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare D1 Database binding "DB" is not available.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { nombre, email, password } = body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'El nombre debe tener al menos 2 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Por favor ingresa un correo electrónico válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 1. Verificar si el correo ya existe
    const usuarioExistente = await db
      .prepare('SELECT id FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    if (usuarioExistente) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una cuenta registrada con este correo electrónico.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Hashear contraseña
    const { hash, salt } = await hashPassword(password);

    // 3. Crear usuario en D1
    const result = await db
      .prepare(`
        INSERT INTO usuarios (nombre, email, password_hash, salt)
        VALUES (?, ?, ?, ?)
      `)
      .bind(nombre.trim(), emailNormalizado, hash, salt)
      .run();

    const nuevoUsuario: any = await db
      .prepare('SELECT id, nombre, email, creado_en FROM usuarios WHERE email = ?')
      .bind(emailNormalizado)
      .first();

    // 4. Crear token de sesión
    const token = await createSessionToken({
      userId: nuevoUsuario.id,
      email: nuevoUsuario.email,
      nombre: nuevoUsuario.nombre
    });

    const cookieHeader = createCookieHeader(token);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email
        },
        token
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader
        }
      }
    );
  } catch (error: any) {
    console.error('Error en POST /api/auth/register:', error);
    return new Response(
      JSON.stringify({ error: 'Error al registrar la cuenta.', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
