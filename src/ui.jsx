import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

export const AvisoCtx = createContext(() => {});
export const useAviso = () => useContext(AvisoCtx);

// Carga datos del servidor; devuelve [datos, recargar]. Se vuelve a pedir si cambian los parámetros.
export function useDatos(recurso, accion, params) {
  const [datos, setDatos] = useState(null);
  const aviso = useAviso();
  const clave = JSON.stringify(params ?? {});
  const cargar = useCallback(
    () => api(recurso, accion, params ?? {}).then(setDatos).catch(e => aviso(e.message, 'error')),
    [recurso, accion, clave]
  );
  useEffect(() => { cargar(); }, [cargar]);
  return [datos, cargar];
}

// Ejecuta una acción mostrando errores; devuelve el resultado o null si falló
export function useAccion() {
  const aviso = useAviso();
  const [ocupado, setOcupado] = useState(false);
  const ejecutar = async (fn, mensajeOk) => {
    setOcupado(true);
    try { const r = await fn(); if (mensajeOk) aviso(mensajeOk); return r; }
    catch (e) { aviso(e.message, 'error'); return null; }
    finally { setOcupado(false); }
  };
  return [ocupado, ejecutar];
}

// Estado de formulario: c('campo') devuelve {value, onChange}
export function useForm(inicial) {
  const [f, setF] = useState(inicial);
  const c = k => ({ value: f[k] ?? '', onChange: e => setF(x => ({ ...x, [k]: e.target.value })) });
  return [f, c, setF];
}

export const Campo = ({ etiqueta, children }) => (
  <label className="campo"><span>{etiqueta}</span>{children}</label>
);

export const Selector = ({ opciones, vacio = 'Seleccione…', ...props }) => (
  <select {...props}>
    <option value="">{vacio}</option>
    {(opciones || []).map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
  </select>
);

export const fecha = s => s ? new Date(s.replace(' ', 'T')).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '';
export const hoy = () => new Date().toISOString().slice(0, 10);
export const Vacio = ({ children }) => <p className="vacio">{children}</p>;

export const ETIQUETA = {
  entrada_externa: 'Entrada externa', salida: 'Salida', retorno: 'Retorno', baja: 'Baja (no vuelve)', ajuste: 'Ajuste',
};
export function cantidadConSigno(m) {
  const c = Number(m.cantidad);
  if (m.tipo === 'entrada_externa' || m.tipo === 'retorno') return { t: `+${c}`, cls: 'mas' };
  if (m.tipo === 'salida') return { t: `−${c}`, cls: 'menos' };
  if (m.tipo === 'ajuste') return { t: c > 0 ? `+${c}` : `−${Math.abs(c)}`, cls: c > 0 ? 'mas' : 'menos' };
  return { t: String(c), cls: 'neutro' };
}
export function detalleMovimiento(m) {
  const p = [];
  if (m.proveedor) p.push(m.proveedor);
  if (m.costo != null) p.push(`Costo S/ ${Number(m.costo).toFixed(2)}`);
  if (m.docente) p.push(m.docente);
  const aula = [m.grado && `${m.grado}°`, m.seccion].filter(Boolean).join(' ');
  if (aula) p.push(aula + (m.nivel ? ` (${m.nivel})` : ''));
  if (m.sesion_aprendizaje) p.push(m.sesion_aprendizaje);
  if (m.observacion) p.push(m.observacion);
  return p.join(' · ');
}
