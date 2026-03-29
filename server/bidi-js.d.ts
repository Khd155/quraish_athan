declare module 'bidi-js' {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  interface BidiInstance {
    getEmbeddingLevels(text: string, direction?: 'ltr' | 'rtl'): EmbeddingLevels;
    getReorderSegments(text: string, levels: EmbeddingLevels, start?: number, end?: number): Array<[number, number]>;
    getMirroredCharactersMap(text: string, levels: EmbeddingLevels): Map<number, string>;
  }
  function bidiFactory(): BidiInstance;
  export default bidiFactory;
}
