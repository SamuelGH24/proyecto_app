const { BlobServiceClient } = require('@azure/storage-blob');
const mysql = require('mysql2/promise');

module.exports = async function (context, req) {
  context.log('🔵 Azure Function: ProcessResena iniciada');

  try {
    const { resena_id, texto, pelicula_id, usuario_id } = req.body;

    if (!resena_id || !texto) {
      context.res = {
        status: 400,
        body: { error: 'Se requiere resena_id y texto' }
      };
      return;
    }

    context.log(`📝 Procesando reseña ID: ${resena_id}`);

    // 1️⃣ Convertir texto a minúsculas
    const textoMinusculas = texto.toLowerCase();

    // 2️⃣ Crear nombre único del archivo
    const nombreArchivo = `resena_${resena_id}_${Date.now()}.txt`;

    // 3️⃣ Conectar a Blob Storage
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = 'resenas';

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();
    await containerClient.setAccessPolicy('blob'); // acceso público

    // 4️⃣ Subir archivo
    const buffer = Buffer.from(textoMinusculas, 'utf8');
    const blockBlobClient = containerClient.getBlockBlobClient(nombreArchivo);
    await blockBlobClient.uploadData(buffer);

    const archivoUrl = blockBlobClient.url;
    context.log(`☁️ Archivo subido: ${archivoUrl}`);

    // 5️⃣ Guardar URL en MySQL
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    const updateQuery = `
      UPDATE resenas
      SET archivo_url = ?, archivo_procesado = TRUE
      WHERE id = ?
    `;
    await connection.execute(updateQuery, [archivoUrl, resena_id]);
    await connection.end();

    context.log('💾 URL guardada en la base de datos');

    // 6️⃣ Respuesta exitosa
    context.res = {
      status: 200,
      body: {
        message: 'Reseña procesada exitosamente',
        resena_id,
        archivo_url: archivoUrl
      }
    };

  } catch (error) {
    context.log.error('❌ Error al procesar reseña:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Error al procesar la reseña',
        details: error.message
      }
    };
  }
};
