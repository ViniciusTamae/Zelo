// Roda no navegador do inquilino: reduz a foto antes de enviar (lado maior de
// 1600 px, JPEG). Gasta menos dados móveis, cabe no limite de envio e, ao
// redesenhar a imagem, descarta os metadados (como a localização do GPS).
export async function reduzirFoto(arquivo: File, ladoMaximo = 1600, qualidade = 0.82) {
  try {
    const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext("2d")!.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    imagem.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", qualidade),
    );
    if (!blob) return arquivo;
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    // Formato que o navegador não abre: segue o original (o servidor decide).
    return arquivo;
  }
}
