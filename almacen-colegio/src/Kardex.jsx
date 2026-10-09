import { useState } from 'react';
import { ETIQUETA, Selector, Vacio, cantidadConSigno, detalleMovimiento, fecha, useDatos } from './ui';

export function TablaMovimientos({ filas }) {
  return (
    <div className="tabla-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Material</th><th>Almacén</th><th className="num">Cantidad</th><th className="num">Saldo</th><th>Detalle</th></tr></thead>
      <tbody>{filas.map(m => {
        const q = cantidadConSigno(m);
        return (
          <tr key={m.id_movimiento}>
            <td>{fecha(m.fecha)}</td><td><span className={'etq ' + m.tipo}>{ETIQUETA[m.tipo]}</span></td>
            <td>{m.material}</td><td>{m.almacen}</td><td className={'num ' + q.cls}><b>{q.t}</b></td>
            <td className="num">{m.saldo}</td><td><small>{detalleMovimiento(m)}</small></td>
          </tr>);
      })}</tbody>
    </table></div>
  );
}

export default function Kardex() {
  const [filtro, setFiltro] = useState({ id_almacen: '', id_material: '', tipo: '' });
  const [almacenes] = useDatos('almacenes', 'listar');
  const [materiales] = useDatos('materiales', 'listar');
  const [mov] = useDatos('inventario', 'kardex', filtro);
  const cambiar = k => e => setFiltro({ ...filtro, [k]: e.target.value });
  return (
    <>
      <div className="encabezado"><h1>Kardex (registro de movimientos)</h1></div>
      <div className="filtros">
        <Selector vacio="Todos los almacenes" value={filtro.id_almacen} onChange={cambiar('id_almacen')} opciones={(almacenes || []).map(a => ({ v: a.id_almacen, t: a.nombre }))} />
        <Selector vacio="Todos los materiales" value={filtro.id_material} onChange={cambiar('id_material')} opciones={(materiales || []).map(m => ({ v: m.id_material, t: m.nombre }))} />
        <Selector vacio="Todos los tipos" value={filtro.tipo} onChange={cambiar('tipo')} opciones={Object.entries(ETIQUETA).map(([v, t]) => ({ v, t }))} />
      </div>
      {mov === null ? <Vacio>Cargando…</Vacio> : mov.length === 0 ? <Vacio>No hay movimientos con esos filtros.</Vacio> : <TablaMovimientos filas={mov} />}
      <p className="nota">Se muestran los 300 movimientos más recientes. “Saldo” es el stock del almacén justo después de cada movimiento.</p>
    </>
  );
}
