import { useEffect } from 'react';
import { api } from './api';
import { Campo, Selector, Vacio, fecha, hoy, useAccion, useDatos, useForm } from './ui';

const INICIAL = { id_almacen: '', id_material: '', id_proveedor: '', cantidad: '', costo: '', fecha: hoy(), observacion: '' };

export default function Entradas({ ir }) {
  const [almacenes] = useDatos('almacenes', 'listar');
  const [materiales] = useDatos('materiales', 'listar');
  const [proveedores] = useDatos('proveedores', 'listar');
  const [historial, recargar] = useDatos('inventario', 'kardex', { tipo: 'entrada_externa', limite: 50 });
  const [f, c, setF] = useForm(INICIAL);
  const [ocupado, ejecutar] = useAccion();

  useEffect(() => {
    if (almacenes?.length === 1) setF(x => ({ ...x, id_almacen: almacenes[0].id_almacen }));
  }, [almacenes]);

  async function enviar(e) {
    e.preventDefault();
    if (await ejecutar(() => api('inventario', 'entrada', f), 'Entrada registrada')) {
      setF({ ...INICIAL, id_almacen: f.id_almacen, fecha: hoy() });
      recargar();
    }
  }

  const faltan = materiales && proveedores && (materiales.length === 0 || proveedores.length === 0);
  return (
    <>
      <div className="encabezado"><h1>Entradas desde fuera</h1></div>
      <p className="nota">Registra aquí lo que llega al colegio (gobierno, donaciones, compras). Se suma al stock del almacén elegido.</p>
      {faltan && (
        <div className="panel">Antes necesitas {proveedores.length === 0 && <>un <a href="#proveedores">proveedor</a></>}
          {proveedores.length === 0 && materiales.length === 0 && ' y '}{materiales.length === 0 && <>un <a href="#materiales">material</a></>} en los catálogos.</div>
      )}
      <form className="panel" onSubmit={enviar}>
        <div className="grid">
          <Campo etiqueta="Almacén de destino *"><Selector required {...c('id_almacen')} opciones={(almacenes || []).map(a => ({ v: a.id_almacen, t: a.nombre }))} /></Campo>
          <Campo etiqueta="Material *"><Selector required {...c('id_material')} opciones={(materiales || []).map(m => ({ v: m.id_material, t: m.nombre }))} /></Campo>
          <Campo etiqueta="Proveedor / origen *"><Selector required {...c('id_proveedor')} opciones={(proveedores || []).map(p => ({ v: p.id_proveedor, t: p.entidad }))} /></Campo>
          <Campo etiqueta="Cantidad recibida *"><input type="number" min="1" required {...c('cantidad')} /></Campo>
          <Campo etiqueta="Costo total (S/)"><input type="number" min="0" step="0.01" {...c('costo')} /></Campo>
          <Campo etiqueta="Fecha de recepción"><input type="date" max={hoy()} {...c('fecha')} /></Campo>
          <Campo etiqueta="Observación"><input {...c('observacion')} /></Campo>
        </div>
        <div className="acciones"><button disabled={ocupado}>Registrar entrada</button></div>
      </form>

      <h2>Últimas entradas</h2>
      {historial === null ? <Vacio>Cargando…</Vacio> : historial.length === 0 ? <Vacio>Aún no hay entradas.</Vacio> : (
        <div className="tabla-wrap"><table>
          <thead><tr><th>Fecha</th><th>Material</th><th>Almacén</th><th className="num">Cantidad</th><th>Proveedor</th><th className="num">Costo</th></tr></thead>
          <tbody>{historial.map(m => (
            <tr key={m.id_movimiento}><td>{fecha(m.fecha)}</td><td>{m.material}</td><td>{m.almacen}</td>
              <td className="num mas">+{m.cantidad}</td><td>{m.proveedor}</td><td className="num">{m.costo != null ? 'S/ ' + Number(m.costo).toFixed(2) : ''}</td></tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
