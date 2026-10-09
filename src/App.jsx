import { useEffect, useState } from 'react';
import { AvisoCtx } from './ui';
import Inicio from './Inicio';
import Stock from './Stock';
import Entradas from './Entradas';
import Salidas from './Salidas';
import Kardex from './Kardex';
import Crud from './Crud';

const proveedores = { recurso: 'proveedores', pk: 'id_proveedor', titulo: 'Proveedores', singular: 'proveedor', columnas: [
  { k: 'entidad', etiqueta: 'Entidad', req: true }, { k: 'representante', etiqueta: 'Representante' }, { k: 'contacto', etiqueta: 'Contacto' },
  { k: 'email', etiqueta: 'Email', tipo: 'email' }, { k: 'direccion', etiqueta: 'Dirección' }, { k: 'fecha', etiqueta: 'Fecha', tipo: 'date' },
  { k: 'comentario', etiqueta: 'Comentario', tipo: 'textarea', oculta: true }] };
const materiales = { recurso: 'materiales', pk: 'id_material', titulo: 'Materiales', singular: 'material', columnas: [
  { k: 'nombre', etiqueta: 'Nombre', req: true }, { k: 'unidad', etiqueta: 'Unidad (unidad, caja, par…)', req: true }, { k: 'descripcion', etiqueta: 'Descripción' }] };
const almacenes = { recurso: 'almacenes', pk: 'id_almacen', titulo: 'Almacenes', singular: 'almacén', columnas: [
  { k: 'nombre', etiqueta: 'Nombre', req: true }, { k: 'ubicacion', etiqueta: 'Ubicación' }] };

materiales.columnas[1].inicial = 'unidad';

const MENU = [
  ['inicio', 'Inicio'], ['stock', 'Stock actual'], ['entradas', 'Entradas'], ['salidas', 'Salidas y retornos'], ['kardex', 'Kardex'],
  null, ['proveedores', 'Proveedores'], ['materiales', 'Materiales'], ['almacenes', 'Almacenes'],
];

export default function App() {
  const [vista, setVista] = useState(() => location.hash.slice(1) || 'inicio');
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const f = () => setVista(location.hash.slice(1) || 'inicio');
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  const ir = v => { location.hash = v; };
  const mostrar = (texto, tipo = 'ok') => setAviso({ texto, tipo });

  const pantallas = {
    inicio: <Inicio ir={ir} />, stock: <Stock />, entradas: <Entradas ir={ir} />, salidas: <Salidas />, kardex: <Kardex />,
    proveedores: <Crud {...proveedores} />, materiales: <Crud {...materiales} />, almacenes: <Crud {...almacenes} />,
  };

  return (
    <AvisoCtx.Provider value={mostrar}>
      <div className="container">
        <nav className="sidebar">
          <h2>Almacén escolar</h2>
          <ul>{MENU.map((m, i) => m === null
            ? <li key={i} className="sep">Catálogos</li>
            : <li key={m[0]}><a href={'#' + m[0]} className={vista === m[0] ? 'activo' : ''}>{m[1]}</a></li>)}</ul>
        </nav>
        <main className="content">{pantallas[vista] ?? pantallas.inicio}</main>
      </div>
      {aviso && <div className={'aviso ' + aviso.tipo} onClick={() => setAviso(null)}>{aviso.texto}</div>}
    </AvisoCtx.Provider>
  );
}
