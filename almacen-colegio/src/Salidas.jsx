import { useEffect, useState } from 'react';
import { api } from './api';
import { Campo, Selector, Vacio, fecha, useAccion, useDatos, useForm } from './ui';

const INICIAL = { id_almacen: '', id_material: '', cantidad: '', docente: '', sesion_aprendizaje: '', grado: '', seccion: '', num_estudiantes: '', nivel: '' };

function FormSalida({ stock, almacenes, onListo }) {
  const [f, c, setF] = useForm(INICIAL);
  const [ocupado, ejecutar] = useAccion();
  useEffect(() => {
    if (almacenes?.length === 1) setF(x => ({ ...x, id_almacen: almacenes[0].id_almacen }));
  }, [almacenes]);

  const disponibles = (stock || []).filter(s => s.id_almacen == f.id_almacen && s.cantidad > 0);
  const sel = disponibles.find(s => s.id_material == f.id_material);

  async function enviar(e) {
    e.preventDefault();
    if (await ejecutar(() => api('inventario', 'salida', f), 'Salida registrada')) {
      setF({ ...INICIAL, id_almacen: f.id_almacen });
      onListo();
    }
  }
  return (
    <form className="panel" onSubmit={enviar}>
      <h3>Registrar salida a un docente</h3>
      <div className="grid">
        <Campo etiqueta="Almacén *"><Selector required value={f.id_almacen} onChange={e => setF({ ...f, id_almacen: e.target.value, id_material: '' })}
          opciones={(almacenes || []).map(a => ({ v: a.id_almacen, t: a.nombre }))} /></Campo>
        <Campo etiqueta="Material *"><Selector required vacio={f.id_almacen ? 'Seleccione…' : 'Primero elija el almacén'} {...c('id_material')}
          opciones={disponibles.map(s => ({ v: s.id_material, t: `${s.material} (disp: ${s.cantidad})` }))} /></Campo>
        <Campo etiqueta={'Cantidad * ' + (sel ? `(máx. ${sel.cantidad})` : '')}><input type="number" min="1" max={sel?.cantidad} required {...c('cantidad')} /></Campo>
        <Campo etiqueta="Docente *"><input required {...c('docente')} /></Campo>
        <Campo etiqueta="Sesión de aprendizaje"><input {...c('sesion_aprendizaje')} /></Campo>
        <Campo etiqueta="Grado"><input {...c('grado')} /></Campo>
        <Campo etiqueta="Sección"><input {...c('seccion')} /></Campo>
        <Campo etiqueta="N.º de estudiantes"><input type="number" min="1" {...c('num_estudiantes')} /></Campo>
        <Campo etiqueta="Nivel"><Selector vacio="—" {...c('nivel')} opciones={[{ v: 'primario', t: 'Primario' }, { v: 'secundario', t: 'Secundario' }]} /></Campo>
      </div>
      <div className="acciones"><button disabled={ocupado}>Registrar salida</button></div>
    </form>
  );
}

function PanelCierre({ accion, onListo, onCancelar }) {
  const { tipo, salida } = accion;
  const esRetorno = tipo === 'retorno';
  const [f, c] = useForm({ cantidad: salida.pendiente, observacion: '' });
  const [ocupado, ejecutar] = useAccion();
  async function enviar(e) {
    e.preventDefault();
    const r = await ejecutar(() => api('inventario', tipo, { id_movimiento: salida.id_movimiento, ...f }), esRetorno ? 'Retorno registrado' : 'Baja registrada');
    if (r) onListo();
  }
  return (
    <form className="panel" onSubmit={enviar}>
      <h3>{esRetorno ? 'Registrar devolución' : 'Dar de baja (no volverá)'}: {salida.material} — {salida.docente}</h3>
      <p className="nota">{esRetorno ? 'Lo devuelto vuelve al stock del almacén.' : 'Para lo consumido, perdido o malogrado. No vuelve al stock, pero queda registrado.'}</p>
      <div className="grid">
        <Campo etiqueta={`Cantidad (pendiente: ${salida.pendiente})`}><input type="number" min="1" max={salida.pendiente} required {...c('cantidad')} /></Campo>
        <Campo etiqueta={esRetorno ? 'Observación' : 'Motivo *'}><input required={!esRetorno} {...c('observacion')} /></Campo>
      </div>
      <div className="acciones"><button disabled={ocupado}>Confirmar</button><button type="button" className="sec" onClick={onCancelar}>Cancelar</button></div>
    </form>
  );
}

export default function Salidas() {
  const [stock, recargarStock] = useDatos('inventario', 'stock');
  const [almacenes] = useDatos('almacenes', 'listar');
  const [activas, recargarActivas] = useDatos('inventario', 'salidas_activas');
  const [cierre, setCierre] = useState(null);
  const recargar = () => { recargarStock(); recargarActivas(); };

  return (
    <>
      <div className="encabezado"><h1>Salidas y retornos</h1></div>
      <FormSalida stock={stock} almacenes={almacenes} onListo={recargar} />
      {cierre && <PanelCierre key={cierre.salida.id_movimiento + cierre.tipo} accion={cierre} onCancelar={() => setCierre(null)} onListo={() => { setCierre(null); recargar(); }} />}
      <h2>Pendientes de devolución</h2>
      {activas === null ? <Vacio>Cargando…</Vacio> : activas.length === 0 ? <Vacio>No hay materiales prestados. Todo está en el almacén.</Vacio> : (
        <div className="tabla-wrap"><table>
          <thead><tr><th>Fecha</th><th>Material</th><th>Docente</th><th>Aula</th><th>Sesión</th><th className="num">Salió</th><th className="num">Falta devolver</th><th></th></tr></thead>
          <tbody>{activas.map(s => (
            <tr key={s.id_movimiento}>
              <td>{fecha(s.fecha)}</td><td>{s.material}<br /><small>{s.almacen}</small></td><td>{s.docente}</td>
              <td>{[s.grado && `${s.grado}°`, s.seccion].filter(Boolean).join(' ')} {s.nivel && <small>({s.nivel})</small>}</td>
              <td>{s.sesion_aprendizaje}</td><td className="num">{s.cantidad}</td><td className="num"><b>{s.pendiente}</b></td>
              <td className="fila-acc">
                <button className="chico" onClick={() => { setCierre({ tipo: 'retorno', salida: s }); window.scrollTo(0, 0); }}>Devolver</button>
                <button className="chico sec" onClick={() => { setCierre({ tipo: 'baja', salida: s }); window.scrollTo(0, 0); }}>Baja</button>
              </td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
