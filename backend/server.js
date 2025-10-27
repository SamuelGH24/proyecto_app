// === DEPENDENCIAS ===
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN A MYSQL ===
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '2424',
  database: 'uan_db',
  multipleStatements: false
});

db.connect(err => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos: uan_db');
  }
});

// === ARCHIVOS ESTÁTICOS (AJUSTADO A CARPETA Frontend) ===
const publicDir = path.join(__dirname, '..', 'Frontend');
app.use(express.static(publicDir));

// === RUTA PRINCIPAL ===
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// === ENDPOINT DE PRUEBA ===
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

// === REGISTRO DE USUARIOS ===
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password)
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos.' });

    db.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) return res.status(409).json({ error: 'El correo ya está registrado.' });

      const hash = await bcrypt.hash(password, 10);
      db.query(
        'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
        [nombre, email, hash],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: 'Usuario registrado correctamente', id: result.insertId });
        }
      );
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === INICIO DE SESIÓN ===
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });

    db.query(
      'SELECT id, nombre, password_hash FROM usuarios WHERE email = ? LIMIT 1',
      [email],
      async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0)
          return res.status(401).json({ error: 'Credenciales inválidas.' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match)
          return res.status(401).json({ error: 'Credenciales inválidas.' });

        res.json({ id: user.id, nombre: user.nombre, email });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ENDPOINT: LISTAR PELÍCULAS ===
app.get('/api/peliculas', (req, res) => {
  const sql = `
    SELECT id, titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash
    FROM peliculas
    ORDER BY id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener películas:', err);
      return res.status(500).json({ error: 'Error al obtener películas' });
    }
    res.json(results);
  });
});

// === ENDPOINT: AGREGAR NUEVA PELÍCULA ===
app.post('/api/peliculas', (req, res) => {
  try {
    const { titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash } = req.body || {};

    if (!titulo || !anio || !director || !genero || !descripcion) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    const sql = `
      INSERT INTO peliculas (titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [titulo, anio, director, elenco || '', genero, descripcion, poster || '', codigo_hash || ''],
      (err, result) => {
        if (err) {
          console.error('❌ Error al agregar película:', err);
          return res.status(500).json({ error: 'Error al guardar película' });
        }
        res.json({ message: 'Película agregada correctamente', id: result.insertId });
      }
    );
  } catch (e) {
    console.error('❌ Error en /api/peliculas:', e);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// === ENDPOINT: OBTENER RESEÑAS DE UNA PELÍCULA ===
app.get('/api/resenas/:peliculaId', (req, res) => {
  const { peliculaId } = req.params;
  const sql = `
    SELECT r.id, r.texto, r.calificacion, r.fecha, u.nombre AS usuario_nombre
    FROM resenas r
    JOIN usuarios u ON r.usuario_id = u.id
    WHERE r.pelicula_id = ?
    ORDER BY r.fecha DESC
  `;
  db.query(sql, [peliculaId], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener reseñas:', err);
      return res.status(500).json({ error: 'Error al obtener reseñas' });
    }
    res.json(results);
  });
});

// === ENDPOINT: AGREGAR NUEVA RESEÑA ===
app.post('/api/resenas', (req, res) => {
  const { usuario_id, pelicula_id, texto, calificacion } = req.body || {};
  if (!usuario_id || !pelicula_id || !texto || !calificacion)
    return res.status(400).json({ error: 'Faltan campos requeridos.' });

  const sql = `
    INSERT INTO resenas (usuario_id, pelicula_id, texto, calificacion, fecha)
    VALUES (?, ?, ?, ?, NOW())
  `;
  db.query(sql, [usuario_id, pelicula_id, texto, calificacion], (err, result) => {
    if (err) {
      console.error('❌ Error al agregar reseña:', err);
      return res.status(500).json({ error: 'Error al guardar reseña' });
    }
    res.json({ message: 'Reseña guardada exitosamente', id: result.insertId });
  });
});

// === ENDPOINT: OBTENER RESEÑAS DE UN USUARIO ===
app.get('/api/resenas/usuario/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;
  const sql = `
    SELECT r.id, r.texto, r.calificacion, r.fecha, p.titulo AS pelicula_titulo
    FROM resenas r
    JOIN peliculas p ON r.pelicula_id = p.id
    WHERE r.usuario_id = ?
    ORDER BY r.fecha DESC
  `;
  db.query(sql, [usuarioId], (err, results) => {
    if (err) {
      console.error('❌ Error al obtener reseñas del usuario:', err);
      return res.status(500).json({ error: 'Error al obtener reseñas del usuario' });
    }
    res.json(results);
  });
});

// === MANEJO DE RUTAS NO EXISTENTES ===
app.use((req, res) => {
  if (req.path.endsWith('.html')) {
    const filePath = path.join(publicDir, req.path);
    return res.sendFile(filePath, err => {
      if (err) res.status(404).send('Página no encontrada');
    });
  }

  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta API no encontrada' });
  }

  res.sendFile(path.join(publicDir, 'index.html'));
});

// === INICIAR SERVIDOR ===
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
