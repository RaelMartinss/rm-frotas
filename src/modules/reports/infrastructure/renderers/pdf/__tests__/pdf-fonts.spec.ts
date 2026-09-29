import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { registerPdfFonts } from '../pdf-fonts';

describe('PDF Fonts (Static TTF & OFL Licenses)', () => {
  const fontsDir = path.join(__dirname, '..', 'fonts');

  it('deve garantir a presença dos 5 arquivos TTF estáticos oficiais', () => {
    const expectedFonts = [
      'Inter-Regular.ttf',
      'Inter-SemiBold.ttf',
      'Inter-Bold.ttf',
      'JetBrainsMono-Medium.ttf',
      'JetBrainsMono-Bold.ttf',
    ];

    for (const fontName of expectedFonts) {
      const fullPath = path.join(fontsDir, fontName);
      expect(fs.existsSync(fullPath), `Arquivo de fonte ausente: ${fontName}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100 * 1024); // TTFs reais têm centenas de KB
    }
  });

  it('deve conter as licenças SIL OFL v1.1 e o README de procedência', () => {
    const requiredDocs = ['LICENSE-Inter.txt', 'LICENSE-JetBrainsMono.txt', 'README.md'];
    for (const doc of requiredDocs) {
      const fullPath = path.join(fontsDir, doc);
      expect(fs.existsSync(fullPath), `Documento de licença/origem ausente: ${doc}`).toBe(true);
    }
  });

  it('deve registrar as famílias Inter e JetBrainsMono sem falhas', () => {
    expect(() => registerPdfFonts()).not.toThrow();
  });
});
