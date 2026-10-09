import { useState } from 'react';
import { api } from './api';
import { Campo, Selector, useAccion, useDatos, useForm, Vacio } from './ui';

function Ajuste({ fila, onListo, onCancelar }) {
  const [f, c] = useForm({ nuevo_stock: fila.cantidad, observacion: '' });
  const [ocupado, ejecutar] = useAccion();
  async function enviar(e) {
    e.preventDefault();
    const r = await ejecutar(() => api('inventario', 'ajuste', { id_almacen: fila.id_almacen, id_material: fila.id_material, ...f }), 'Stock ajustado');
    if (r) onListo();
  }
  return (
    <form className="panel" onSubmit={enviar}>
      <h3>Ajustar stock: {fila.material} ({fila.almacen})</h3>
      <p className="nota">Úsalo cuando el conteo físico no coincide con el sistema. Queda registrado en el Kardex.</p>
      <div className="grid">
        <Campo etiqueta={`Stock real contado (el sistema dice ${fila.cantidad})`}><input type="number" min="0" required {...c('nuevo_stock')} /></Campo>
        <Campo etiqueta="Motivo *"><input required placeholder="Ej: conteo de fin de mes" {...c('observacion')} /></Campo>
      </div>
      <div className="acciones"><button disabled={ocupado}>Guardar ajuste</button><button type="button" className="sec" onClick={onCancelar}>Cancelar</button></div>
    </form>
  );
}

export default function Stock() {
  const [stock, recargar] = useDatos('inventario', 'stock');
  const [almacenes] = useDatos('almacenes', 'listar');
  const [filtro, setFiltro] = useState({ almacen: '', q: '' });
  const [ajuste, setAjuste] = useState(null);

  const filas = (stock || []).filter(s =>
    (!filtro.almacen || s.id_almacen == filtro.almacen) && s.material.toLowerCase().includes(filtro.q.toLowerCase()));

  return (
    <>
      <div className="encabezado"><h1>Stock actual</h1></div>
      {ajuste && <Ajuste key={ajuste.id_material + '-' + ajuste.id_almacen} fila={ajuste} onCancelar={() => setAjuste(null)} onListo={() => { setAjuste(null); recargar(); }} />}
      <div className="filtros">
        <input placeholder="Buscar material…" value={filtro.q} onChange={e => setFiltro({ ...filtro, q: e.target.value })} />
        <Selector vacio="Todos los almacenes" value={filtro.almacen} onChange={e => setFiltro({ ...filtro, almacen: e.target.value })}
          opciones={(almacenes || []).map(a => ({ v: a.id_almacen, t: a.nombre }))} />
      </div>
      {stock === null ? <Vacio>Cargando…</Vacio> : filas.length === 0 ? <Vacio>No hay stock registrado. Registra una entrada para empezar.</Vacio> : (
        <div className="tabla-wrap"><table>
          <thead><tr><th>Material</th><th>Almacén</th><th className="num">En almacén</th><th className="num">Prestado</th><th className="num">Total del colegio</th><th></th></tr></thead>
          <tbody>{filas.map(s => (
            <tr key={s.id_almacen + '-' + s.id_material}>
              <td>{s.material}</td><td>{s.almacen}</td>
              <td className={'num ' + (s.cantidad == 0 ? 'stock-cero' : '')}><b>{s.cantidad}</b> {s.unidad}</td>
              <td className="num">{s.en_prestamo}</td>
              <td className="num">{Number(s.cantidad) + Number(s.en_prestamo)}</td>
              <td className="fila-acc"><button className="chico sec" onClick={() => { setAjuste(s); window.scrollTo(0, 0); }}>Ajustar</button></td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
