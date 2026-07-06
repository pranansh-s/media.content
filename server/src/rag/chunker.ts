interface ChunkOptions {
  targetLength?: number;
  maxChunks?: number;
}

function splitLongParagraph(paragraph: string, targetLength: number): string[] {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > targetLength * 2) {
      pieces.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) pieces.push(current);
  return pieces.flatMap(piece =>
    piece.length > targetLength * 2
      ? Array.from({ length: Math.ceil(piece.length / (targetLength * 2)) }, (_, index) =>
          piece.slice(index * targetLength * 2, (index + 1) * targetLength * 2),
        )
      : [piece],
  );
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const { targetLength = 500, maxChunks = 100 } = options;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const pieces = paragraph.length > targetLength * 2 ? splitLongParagraph(paragraph, targetLength) : [paragraph];
    for (const piece of pieces) {
      if (current && current.length + piece.length + 2 > targetLength) {
        chunks.push(current);
        current = piece;
      } else {
        current = current ? `${current}\n\n${piece}` : piece;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, maxChunks);
}
