// === DEPENDENCIAS ===
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// === CONFIGURACIÓN DEL SERVIDOR ===
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// === VERIFICAR VARIABLES DE ENTORNO ===
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? '✓ Configurado' : '✗ NO configurado');
console.log('🔑 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ Configurado' : '✗ NO configurado');

// === CONFIGURAR TRANSPORTE DE CORREO ===
let transporter = null;

// Solo crear transporter si las credenciales están configuradas
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verificar configuración de correo
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Error en configuración de correo:', error.message);
      console.log('💡 Verifica que EMAIL_USER y EMAIL_PASSWORD estén correctamente configurados en .env');
      console.log('💡 Si usas Gmail, necesitas una "Contraseña de aplicación" (no tu contraseña normal)');
      transporter = null; // Deshabilitar transporter si falla
    } else {
      console.log('✅ Servidor de correo listo para enviar emails');
    }
  });
} else {
  console.warn('⚠️ Credenciales de correo no configuradas. La verificación por email no funcionará.');
  console.log('💡 Agrega EMAIL_USER y EMAIL_PASSWORD a tu archivo .env para habilitar la verificación por correo.');
}

// === FUNCIÓN PARA ENVIAR CORREO DE VERIFICACIÓN ===
async function enviarCorreoVerificacion(email, nombre, token) {
  // Verificar que el transporter esté configurado
  if (!transporter) {
    console.error('❌ Transporter no configurado. No se puede enviar correo.');
    return false;
  }

  const urlVerificacion = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificar.html?token=${token}`;
  
  const mailOptions = {
    from: `"UANFilms" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Verifica tu cuenta en UANFilms',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0366d6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #0366d6; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 UANFilms</h1>
          </div>
          <div class="content">
            <h2>¡Hola, ${nombre}!</h2>
            <p>Gracias por registrarte en UANFilms. Para completar tu registro, por favor verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
            
            <div style="text-align: center;">
              <a href="${urlVerificacion}" class="button">Verificar mi correo</a>
            </div>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="background: #fff; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${urlVerificacion}
            </p>
            
            <p><strong>Este enlace expirará en 24 horas.</strong></p>
            
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>© 2025 UANFilms - Tu plataforma de reseñas de películas</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo de verificación enviado a ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo:', error.message);
    return false;
  }
}

// === CONFIGURAR CONEXIÓN MYSQL (con soporte SSL para Azure) ===
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '2424',
  database: process.env.DB_NAME || 'uan_db',
  multipleStatements: false,
  charset: 'utf8mb4'
};

if ((dbConfig.host || '').includes('azure.com')) {
  try {
    dbConfig.ssl = {
      ca: fs.readFileSync(path.join(__dirname, 'DigiCertGlobalRootG2.crt.pem'))
    };
    console.log('🔒 SSL habilitado para conexión segura con Azure MySQL');
  } catch (err) {
    console.warn('⚠️ No se pudo leer el certificado SSL. Verifica la ruta del archivo.');
  }
}

// === CONEXIÓN A MYSQL ===
const db = mysql.createConnection(dbConfig);
db.connect(err => {
  if (err) console.error('❌ Error al conectar con MySQL:', err.message);
  else console.log(`✅ Conectado a la base de datos: ${dbConfig.database}`);
});

// === ARCHIVOS ESTÁTICOS ===
const publicDir = path.join(__dirname, '..', 'Frontend');
app.use(express.static(publicDir));

// === RUTA PRINCIPAL ===
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// === ENDPOINT DE PRUEBA ===
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

// === REGISTRO DE USUARIOS (ACTUALIZADO CON VERIFICACIÓN) ===
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body || {};
    if (!nombre || !email || !password)
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos.' });

    // Verificar si el correo ya existe
    db.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) return res.status(409).json({ error: 'El correo ya está registrado.' });

      // Generar token de verificación
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      // Hash de la contraseña
      const hash = await bcrypt.hash(password, 10);

      // Insertar usuario con token
      const sql = `
        INSERT INTO usuarios (nombre, email, password_hash, email_verificado, token_verificacion, token_expiracion)
        VALUES (?, ?, ?, FALSE, ?, ?)
      `;

      db.query(sql, [nombre, email, hash, token, tokenExpiracion], async (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });

        // Intentar enviar correo de verificación
        if (transporter) {
          const emailEnviado = await enviarCorreoVerificacion(email, nombre, token);

          if (!emailEnviado) {
            console.warn('⚠️ Usuario registrado pero el correo no se pudo enviar');
            return res.status(500).json({ 
              error: 'Usuario registrado pero no se pudo enviar el correo de verificación. Contacta a soporte.' 
            });
          }

          res.json({ 
            message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
            id: result.insertId,
            email_enviado: true
          });
        } else {
          // Si no hay transporter configurado, aceptar el registro sin verificación
          console.warn('⚠️ Correo no configurado. Usuario registrado sin verificación.');
          
          // Marcar como verificado automáticamente si no hay sistema de correo
          db.query('UPDATE usuarios SET email_verificado = TRUE WHERE id = ?', [result.insertId], (errUpdate) => {
            if (errUpdate) console.error('Error al auto-verificar:', errUpdate);
          });

          res.json({ 
            message: 'Usuario registrado exitosamente.',
            id: result.insertId,
            email_enviado: false,
            auto_verificado: true
          });
        }
      });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ENDPOINT: VERIFICAR EMAIL ===
app.get('/api/verificar-email', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token no proporcionado.' });
  }

  // Buscar usuario con ese token
  const sql = `
    SELECT id, nombre, email, token_expiracion 
    FROM usuarios 
    WHERE token_verificacion = ? AND email_verificado = FALSE
    LIMIT 1
  `;

  db.query(sql, [token], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(400).json({ error: 'Token inválido o ya utilizado.' });
    }

    const usuario = results[0];

    // Verificar si el token expiró
    if (new Date() > new Date(usuario.token_expiracion)) {
      return res.status(400).json({ error: 'El token ha expirado. Solicita uno nuevo.' });
    }

    // Actualizar usuario como verificado
    const updateSql = `
      UPDATE usuarios 
      SET email_verificado = TRUE, token_verificacion = NULL, token_expiracion = NULL 
      WHERE id = ?
    `;

    db.query(updateSql, [usuario.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      console.log(`✅ Email verificado para: ${usuario.email}`);
      res.json({ 
        message: 'Email verificado correctamente. Ya puedes iniciar sesión.',
        nombre: usuario.nombre,
        email: usuario.email
      });
    });
  });
});

// === ENDPOINT: REENVIAR CORREO DE VERIFICACIÓN ===
app.post('/api/reenviar-verificacion', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido.' });
  }

  if (!transporter) {
    return res.status(503).json({ error: 'Servicio de correo no disponible. Contacta al administrador.' });
  }

  const sql = `
    SELECT id, nombre, email_verificado 
    FROM usuarios 
    WHERE email = ? 
    LIMIT 1
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const usuario = results[0];

    if (usuario.email_verificado) {
      return res.status(400).json({ error: 'Este correo ya está verificado.' });
    }

    // Generar nuevo token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updateSql = `
      UPDATE usuarios 
      SET token_verificacion = ?, token_expiracion = ? 
      WHERE id = ?
    `;

    db.query(updateSql, [token, tokenExpiracion, usuario.id], async (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const emailEnviado = await enviarCorreoVerificacion(email, usuario.nombre, token);

      if (!emailEnviado) {
        return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta más tarde.' });
      }

      res.json({ message: 'Correo de verificación reenviado. Revisa tu bandeja de entrada.' });
    });
  });
});

// === INICIO DE SESIÓN (ACTUALIZADO - REQUIERE VERIFICACIÓN) ===
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });

    db.query(
      'SELECT id, nombre, email, password_hash, foto_perfil, email_verificado FROM usuarios WHERE email = ? LIMIT 1',
      [email],
      async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0)
          return res.status(401).json({ error: 'Credenciales inválidas.' });

        const user = results[0];

        // Verificar contraseña
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match)
          return res.status(401).json({ error: 'Credenciales inválidas.' });

        // Verificar si el email está verificado (solo si el sistema de correo está activo)
        if (!user.email_verificado && transporter) {
          return res.status(403).json({ 
            error: 'Debes verificar tu correo antes de iniciar sesión.',
            email_no_verificado: true,
            email: email
          });
        }

        res.json({ 
          id: user.id, 
          nombre: user.nombre, 
          email,
          foto_perfil: user.foto_perfil || null
        });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ACTUALIZAR FOTO DE PERFIL ===
app.put('/api/usuarios/:id/foto', (req, res) => {
  try {
    const { id } = req.params;
    const { foto_perfil } = req.body || {};
    
    if (!id) {
      return res.status(400).json({ error: 'ID de usuario requerido.' });
    }
    
    if (!foto_perfil) {
      return res.status(400).json({ error: 'Imagen requerida.' });
    }
    
    if (!foto_perfil.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Formato de imagen inválido.' });
    }
    
    if (foto_perfil.length > 7000000) {
      return res.status(400).json({ error: 'La imagen es muy grande. Máximo 5MB.' });
    }
    
    const sql = 'UPDATE usuarios SET foto_perfil = ? WHERE id = ?';
    
    db.query(sql, [foto_perfil, id], (err, result) => {
      if (err) {
        console.error('Error al actualizar foto:', err);
        return res.status(500).json({ error: 'Error al guardar la foto.' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      
      console.log(`✅ Foto actualizada para usuario ${id}`);
      res.json({ 
        message: 'Foto actualizada correctamente',
        foto_perfil: foto_perfil 
      });
    });
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
    if (err) return res.status(500).json({ error: 'Error al obtener películas' });
    res.json(results);
  });
});

// === ENDPOINT: AGREGAR NUEVA PELÍCULA ===
app.post('/api/peliculas', (req, res) => {
  const { titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash } = req.body || {};
  if (!titulo || !anio || !director || !genero || !descripcion)
    return res.status(400).json({ error: 'Faltan campos requeridos.' });

  const sql = `
    INSERT INTO peliculas (titulo, anio, director, elenco, genero, descripcion, poster, codigo_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [titulo, anio, director, elenco || '', genero, descripcion, poster || '', codigo_hash || ''], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al guardar película' });
    res.json({ message: 'Película agregada correctamente', id: result.insertId });
  });
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
    if (err) return res.status(500).json({ error: 'Error al obtener reseñas' });
    res.json(results);
  });
});

// === ENDPOINT: AGREGAR NUEVA RESEÑA ===
app.post('/api/resenas', async (req, res) => {
  const { usuario_id, pelicula_id, texto, calificacion } = req.body || {};
  if (!usuario_id || !pelicula_id || !texto || !calificacion)
    return res.status(400).json({ error: 'Faltan campos requeridos.' });

  const sql = `
    INSERT INTO resenas (usuario_id, pelicula_id, texto, calificacion, fecha)
    VALUES (?, ?, ?, ?, NOW())
  `;
  db.query(sql, [usuario_id, pelicula_id, texto, calificacion], async (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al guardar reseña' });
    
    const resenaId = result.insertId;
    
    // Llamar a Azure Function para procesar la reseña
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 'http://localhost:7071/api/ProcessResena';
      
      const functionResponse = await fetch(azureFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resena_id: resenaId,
          texto: texto,
          pelicula_id: pelicula_id,
          usuario_id: usuario_id
        })
      });

      if (functionResponse.ok) {
        console.log(`✅ Azure Function procesó reseña ${resenaId}`);
      } else {
        console.warn(`⚠️ Azure Function no pudo procesar reseña ${resenaId}`);
      }
    } catch (functionError) {
      console.error('❌ Error al llamar Azure Function:', functionError.message);
      // No falla la creación de reseña si falla la función
    }

    res.json({ message: 'Reseña guardada exitosamente', id: resenaId });
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
    if (err) return res.status(500).json({ error: 'Error al obtener reseñas del usuario' });
    res.json(results);
  });
});

// === AGREGAR A VER MÁS TARDE ===
app.post('/api/ver-mas-tarde', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;
  
  if (!usuario_id || !pelicula_id) {
    return res.status(400).json({ message: 'Faltan campos requeridos.' });
  }

  const checkQuery = 'SELECT id FROM ver_mas_tarde WHERE usuario_id = ? AND pelicula_id = ?';
  
  db.query(checkQuery, [usuario_id, pelicula_id], (err, results) => {
    if (err) {
      console.error('Error al verificar duplicado:', err);
      return res.status(500).json({ message: 'Error en el servidor' });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ message: 'Esta película ya está en tu lista' });
    }
    
    const insertQuery = 'INSERT INTO ver_mas_tarde (usuario_id, pelicula_id, fecha_agregado) VALUES (?, ?, NOW())';
    
    db.query(insertQuery, [usuario_id, pelicula_id], (err2, result) => {
      if (err2) {
        console.error('Error al insertar:', err2);
        return res.status(500).json({ message: 'Error al guardar en ver más tarde.' });
      }
      
      res.json({ 
        message: 'Película agregada a tu lista de ver más tarde.',
        id: result.insertId 
      });
    });
  });
});

// === OBTENER LISTA VER MÁS TARDE ===
app.get('/api/ver-mas-tarde/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;
  
  const sql = `
    SELECT 
      v.id as id,
      v.pelicula_id,
      p.titulo,
      p.anio,
      p.genero,
      p.director,
      p.poster,
      p.descripcion,
      v.fecha_agregado
    FROM ver_mas_tarde v
    INNER JOIN peliculas p ON v.pelicula_id = p.id
    WHERE v.usuario_id = ?
    ORDER BY v.fecha_agregado DESC
  `;
  
  db.query(sql, [usuario_id], (err, results) => {
    if (err) {
      console.error('Error al obtener lista:', err);
      return res.status(500).json({ error: 'Error al obtener la lista.' });
    }
    
    console.log(`📋 Lista para usuario ${usuario_id}:`, results.length, 'películas');
    res.json(results);
  });
});

// === ELIMINAR DE VER MÁS TARDE ===
app.delete('/api/ver-mas-tarde/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'DELETE FROM ver_mas_tarde WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar:', err);
      return res.status(500).json({ error: 'Error al eliminar de la lista.' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No se encontró la película en tu lista.' });
    }
    
    res.json({ message: 'Película eliminada de tu lista.', deleted: true });
  });
});

// === ENDPOINT: PERFIL DE USUARIO ===
app.get('/api/usuario/perfil', (req, res) => {
  const usuarioId = req.query.id || 1;
  const sqlUsuario = 'SELECT id, nombre, email, foto_perfil FROM usuarios WHERE id = ? LIMIT 1';
  const sqlPeliculas = `
    SELECT p.id, p.titulo, p.descripcion, p.poster AS imagen
    FROM ver_mas_tarde v
    JOIN peliculas p ON v.pelicula_id = p.id
    WHERE v.usuario_id = ?
    ORDER BY v.fecha_agregado DESC
  `;

  db.query(sqlUsuario, [usuarioId], (err, userResult) => {
    if (err) return res.status(500).json({ error: err.message });
    if (userResult.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

    db.query(sqlPeliculas, [usuarioId], (err2, peliculasResult) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({
        usuario: userResult[0],
        peliculas: peliculasResult
      });
    });
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
app.listen(port, () => console.log(`🚀 Servidor corriendo en http://localhost:${port}`));

