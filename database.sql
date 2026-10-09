SET NAMES utf8mb4;
-- Importar DENTRO de la base de datos "almacen_colegio" (ver INSTALAR.html)

CREATE TABLE proveedores (
  id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
  entidad VARCHAR(150) NOT NULL,
  representante VARCHAR(120), contacto VARCHAR(50), email VARCHAR(120),
  direccion VARCHAR(200), fecha DATE NULL, comentario TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE materiales (
  id_material INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  unidad VARCHAR(30) NOT NULL DEFAULT 'unidad',
  descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE almacenes (
  id_almacen INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  ubicacion VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cuánto hay FÍSICAMENTE ahora mismo en cada almacén
CREATE TABLE stock (
  id_almacen INT NOT NULL, id_material INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  PRIMARY KEY (id_almacen, id_material),
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen),
  FOREIGN KEY (id_material) REFERENCES materiales(id_material)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kardex: cada entrada/salida/retorno queda registrado y nunca se borra
CREATE TABLE movimientos (
  id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo ENUM('entrada_externa','salida','retorno','baja','ajuste') NOT NULL,
  id_almacen INT NOT NULL, id_material INT NOT NULL,
  cantidad INT NOT NULL,                 -- ajuste: puede ser negativo
  saldo INT NOT NULL,                    -- stock del almacén DESPUÉS del movimiento
  pendiente INT NULL,                    -- solo salidas: cuánto falta devolver
  id_salida INT NULL,                    -- retorno/baja: a qué salida pertenece
  id_proveedor INT NULL, costo DECIMAL(10,2) NULL,
  docente VARCHAR(120), sesion_aprendizaje VARCHAR(200),
  grado VARCHAR(30), seccion VARCHAR(30), num_estudiantes INT NULL, nivel VARCHAR(20),
  observacion VARCHAR(255),
  FOREIGN KEY (id_almacen) REFERENCES almacenes(id_almacen),
  FOREIGN KEY (id_material) REFERENCES materiales(id_material),
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
  FOREIGN KEY (id_salida) REFERENCES movimientos(id_movimiento),
  INDEX (id_almacen, id_material), INDEX (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO almacenes (nombre, ubicacion) VALUES ('Sala de Cómputo', 'Sala de cómputo');
