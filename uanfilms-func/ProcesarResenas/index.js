module.exports = async function (context, myBlob) {
  const name = context.bindingData.name;
  context.log(`🟢 Archivo detectado: ${name}`);
  context.log(`Tamaño del archivo: ${myBlob.length} bytes`);

  // Leer el contenido como texto
  const contenido = myBlob.toString();

  // Simular censura de palabras (puedes cambiarlo)
  const censurado = contenido.replace(/(malo|feo|tonto)/gi, "***");

  context.log("Contenido procesado:");
  context.log(censurado.substring(0, 150) + "...");

  // Si quisieras guardar el resultado modificado, podrías usar el SDK de Azure Storage
  // pero para la entrega basta con mostrar en logs que el archivo fue detectado y procesado
};
