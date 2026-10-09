import { useState } from 'react';
import { api } from './api';
import { Campo, useAccion, useAviso, useDatos, useForm, Vacio } from './ui';

function FormCrud({ columnas, inicial, pk, singular, ocupado, onGuardar, onCancelar }) {
  const [f, c] = useForm(inicial);
  return (
    <form className="panel" onSubmit={e => { e.preventDefault(); onGuardar(f); }}>
      <h3>{inicial[pk] ? 'Editar' : 'Nuevo'} {singular}</h3>
      <div className="grid">
        {columnas.map(col => (
          <Campo key={col.k} etiqueta={col.etiqueta + (col.req ? ' *' : '')}>
            {col.tipo === 'textarea'
              ? <textarea rows="2" {...c(col.k)} />
              : <input type={col.tipo || 'text'} required={col.req} {...c(col.k)} />}
          </Campo>
        ))}
      </div>
      <div className="acciones">
        <button disabled={ocupado}>Guardar</button>
        <button type="button" className="sec" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

// Pantalla CRUD reutilizable: sirve para proveedores, materiales y almacenes
export default function Crud({ recurso, pk, titulo, singular, columnas }) {
  const [filas, recargar] = useDatos(recurso, 'listar');
  const [ocupado, ejecutar] = useAccion();
  const aviso = useAviso();
  const [edit, setEdit] = useState(null);
  const nuevo = Object.fromEntries(columnas.filter(c => c.inicial).map(c => [c.k, c.inicial]));

  async function guardar(f) {
    if (await ejecutar(() => api(recurso, 'guardar', f), 'Guardado')) { setEdit(null); recargar(); }
  }
  async function eliminar(fila) {
    if (!confirm(`¿Eliminar "${fila[columnas[0].k]}"?`)) return;
    if (await ejecutar(() => api(recurso, 'eliminar', { id: fila[pk] }), 'Eliminado')) recargar();
  }

  return (
    <>
      <div className="encabezado">
        <h1>{titulo}</h1>
        {!edit && <button onClick={() => setEdit(nuevo)}>+ Nuevo {singular}</button>}
      </div>
      {edit && <FormCrud key={edit[pk] ?? 'nuevo'} {...{ columnas, pk, singular, ocupado }} inicial={edit} onGuardar={guardar} onCancelar={() => setEdit(null)} />}
      {filas === null ? <Vacio>Cargando…</Vacio> : filas.length === 0 ? <Vacio>Aún no hay registros.</Vacio> : (
        <div className="tabla-wrap"><table>
          <thead><tr>{columnas.filter(c => !c.oculta).map(c => <th key={c.k}>{c.etiqueta}</th>)}<th></th></tr></thead>
          <tbody>{filas.map(f => (
            <tr key={f[pk]}>
              {columnas.filter(c => !c.oculta).map(c => <td key={c.k}>{f[c.k]}</td>)}
              <td className="fila-acc">
                <button className="chico sec" onClick={() => { setEdit(f); window.scrollTo(0, 0); }}>Editar</button>
                <button className="chico peligro" onClick={() => eliminar(f)}>Eliminar</button>
              </td>
            </tr>))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
