import { SUCURSALES } from '@/constants';

/**
 * Resuelve los correos destinatarios EN EL SERVIDOR a partir del ID de sucursal.
 * Nunca se debe confiar en un campo `emails` enviado por el cliente: ese campo
 * podría manipularse para exfiltrar el formulario a un correo arbitrario.
 *
 * @param sucursalId  ID de sucursal (ej. "vista-hermosa"), no el nombre.
 * @returns Lista de correos de la sucursal, o `null` si el ID no existe.
 */
export function resolveRecipients(sucursalId: string): string[] | null {
  const sucursal = SUCURSALES.find((s) => s.id === sucursalId);
  return sucursal?.emails ?? null;
}
