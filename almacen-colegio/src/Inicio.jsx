import { TablaMovimientos } from './Kardex';
import { Vacio, useDatos } from './ui';

export default function Inicio({ ir }) {
  const [stock] = useDatos('inventario', 'stock');
  const [activas] = useDatos('inventario', 'salidas_activas');
  const [mov] = useDatos('inventario', 'kardex', { limite: 8 });
  const suma = k => (stock || []).reduce((t, s) => t + Number(s[k]), 0);
  const tarjetas = [
    ['Tipos de material', stock?.length ?? '…'],
    ['Unidades en almacén', stock ? suma('cantidad') : '…'],
    ['Unidades prestadas', stock ? suma('en_prestamo') : '…'],
    ['Salidas por devolver', activas?.length ?? '…'],
  ];
  return (
    <>
      <div className="encabezado"><h1>Sistema de Almacén</h1></div>
      <div className="tarjetas">{tarjetas.map(([t, v]) => <div className="tarjeta" key={t}><b>{v}</b><span>{t}</span></div>)}</div>
      <div className="acciones">
        <button onClick={() => ir('entradas')}>+ Registrar entrada</button>
        <button onClick={() => ir('salidas')}>Registrar salida / retorno</button>
      </div>
      <h2>Últimos movimientos</h2>
      {mov === null ? <Vacio>Cargando…</Vacio> : mov.length === 0 ? <Vacio>Todavía no hay movimientos.</Vacio> : <TablaMovimientos filas={mov} />}
    </>
  );
}
