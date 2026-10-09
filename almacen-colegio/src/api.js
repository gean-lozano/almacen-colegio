// Todas las llamadas al servidor pasan por aquí
export async function api(recurso, accion, datos = {}) {
  let r;
  try {
    r = await fetch(`api.php?r=${recurso}&a=${accion}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
    });
  } catch { throw new Error('No hay conexión con el servidor'); }
  let j;
  try { j = await r.json(); } catch { throw new Error('Respuesta inválida del servidor. ¿Está PHP funcionando?'); }
  if (!r.ok || j.error) throw new Error(j.error || 'Error desconocido');
  return j;
}
