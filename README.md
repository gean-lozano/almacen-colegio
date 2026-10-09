# 📦 Instalación del Sistema de Almacén

Elige una de las siguientes opciones para poner en marcha el sistema:

- **Opción A:** Instalación en Windows usando **XAMPP** *(7 pasos, ~10 minutos)*.
- **Opción B:** Instalación rápida con **Docker** *(Recomendada para llevar el sistema a otro equipo sin repetir pasos)*.

---

## 🛠️ Opción A: Instalación con XAMPP (Windows)

### 1. Instala y enciende XAMPP
* Si no lo tienes, descárgalo de [apachefriends.org](https://www.apachefriends.org/) e instálalo (todo con *"Siguiente"*).
* Abre el **XAMPP Control Panel** y pulsa **Start** en **Apache** y en **MySQL**. Deben ponerse en verde.

### 2. Copia la carpeta del sistema
* Descomprime el `.zip`. Verás una carpeta llamada `almacen-colegio`.
* Cópiala dentro de `C:\xampp\htdocs\`. Debe quedar `C:\xampp\htdocs\almacen-colegio\index.html`.

### 3. Abre phpMyAdmin
* En el navegador entra a [http://localhost/phpmyadmin](http://localhost/phpmyadmin) (o pulsa **Admin** en la fila de MySQL de XAMPP).

### 4. Crea la base de datos (vacía)
* En el menú de la izquierda pulsa **Nueva**.
* En *Nombre de la base de datos* escribe exactamente: `almacen_colegio`
* Al lado, en el desplegable, elige `utf8mb4_unicode_ci`.
* Pulsa **Crear**.

### 5. Importa las tablas
* Haz clic en `almacen_colegio` en el menú izquierdo (que quede seleccionada).
* Arriba, entra a la pestaña **Importar**.
* Pulsa **Seleccionar archivo** y elige `database.sql` (está dentro de la carpeta del sistema).
* Baja hasta el final y pulsa **Importar** (o *"Continuar"*).

> **Verificación:** Si sale un recuadro verde con *"La importación se ha completado"*, ya está. A la izquierda verás 5 tablas dentro de `almacen_colegio`.

### 6. Comprueba que todo esté bien
* Abre [http://localhost/almacen-colegio/verificar.php](http://localhost/almacen-colegio/verificar.php)
* Debes ver todo con ✅. Si aparece algún ❌, ahí mismo te dice qué hacer.

### 7. ¡Usa el sistema!
* Entra a [http://localhost/almacen-colegio/](http://localhost/almacen-colegio/)
* **Primer uso, en este orden:**  
  `Proveedores` (por ejemplo *"Gobierno / UGEL"*) ➔ `Materiales` ➔ `Entradas` (registrar lo que llegó).  
  *Después ya puedes hacer Salidas y retornos.*

---

## 🐳 Opción B: Instalar con Docker

Sirve si prefieres no instalar XAMPP, o si quieres llevar el sistema a otro computador o servidor sin repetir pasos. Crea solo la base de datos y las tablas.

### 1. Instala Docker Desktop
* Descárgalo de [docker.com](https://www.docker.com/), instálalo y ábrelo. Espera a que diga *"Engine running"*.

### 2. Cambia la clave de MySQL
* Abre el archivo `.env` (en la carpeta del sistema) con el Bloc de notas y cambia `cambia-esta-clave` por una clave tuya.

> ⚠️ **Importante:** Hazlo antes del paso 3. MySQL guarda la clave la primera vez que arranca; si la cambias después, hay que borrar los datos y empezar de cero.

### 3. Enciende el sistema
* Abre una terminal (PowerShell) dentro de la carpeta del sistema.  
  *(Truco: en el Explorador de archivos, escribe `powershell` en la barra de direcciones y presiona Enter).*
* Ejecuta:
  ```bash
  docker compose up -d --build
  ```
*(La primera vez tarda unos minutos porque descarga PHP y MySQL).*

### 4. Entra al sistema
* Sistema: [http://localhost:8080/](http://localhost:8080/)
* Comprobar instalación: [http://localhost:8080/verificar.php](http://localhost:8080/verificar.php)
*(Las tablas ya están creadas, no hay que importar nada).*

---

### ⚙️ Comandos útiles de Docker

| Acción | Comando |
| :--- | :--- |
| **Apagar** *(los datos se conservan)* | `docker compose down` |
| **Volver a encender** | `docker compose up -d` |
| **Ver errores de web** | `docker compose logs web` |
| **Ver errores de la BD** | `docker compose logs db` |
| **Respaldo** *(hazlo seguido)* | `docker compose exec db sh -c "mysqldump -uroot -p$MYSQL_ROOT_PASSWORD almacen_colegio" > respaldo.sql` |
| **Si cambias archivos del sistema** | `docker compose up -d --build` |
| ⚠️ **Borrar todo y empezar de cero** | `docker compose down -v` *(¡esto borra los datos!)* |

> 💡 **Si el puerto 8080 está ocupado:**  
> En `docker-compose.yml` cambia `"8080:80"` por otro puerto, por ejemplo `"8081:80"`, y entra por `http://localhost:8081/`.

---

## ❓ Si algo falla

* **"Connection refused" / no abre la página:**  
  Apache no está encendido. Pulsa **Start** en Apache en el panel de XAMPP.

* **En `verificar.php` sale "MySQL está apagado":**  
  Pulsa **Start** en la fila de MySQL en el panel de XAMPP.

* **Sale "Usuario o contraseña incorrectos":**  
  Si le pusiste clave a MySQL, abre `config.php` con el Bloc de notas y escríbela en `DB_PASS`.

* **Sale "La base almacen_colegio no existe":**  
  Repite el paso 4. El nombre debe ser exactamente `almacen_colegio`, sin espacios ni mayúsculas.

* **Al importar sale un error rojo:**  
  Casi siempre es porque no seleccionaste la base antes de importar (paso 5, primer punto), o porque ya habías importado antes. Borra la base (pestaña *Operaciones* ➔ *"Eliminar la base de datos"*), créala de nuevo y vuelve a importar.

---

## 🌐 Quiero usarlo desde otro computador de la red del colegio

Deja el sistema instalado en un solo computador (el "servidor") y, desde los demás, abre `http://IP-DEL-SERVIDOR/almacen-colegio/`. La IP la ves en ese computador con el comando `ipconfig`. 

> 📌 **Importante:** El sistema no tiene clave de acceso, úsalo solo dentro de la red del colegio.

---

## 🛠️ No uso XAMPP (Laragon, hosting, etc.)

Es igual: crea una base de datos MySQL, importa `database.sql` en ella, y pon el nombre de la base, el usuario y la clave en `config.php`. Necesita **PHP 7.4 o superior**.
