import { Font } from '@react-pdf/renderer';
import * as path from 'path';
import * as fs from 'fs';

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) {
    return;
  }

  // Resolve diretório de fontes a partir do arquivo compilado ou fonte
  const candidates = [
    path.join(__dirname, 'fonts'),
    path.join(__dirname, '..', 'fonts'),
    path.join(process.cwd(), 'dist', 'modules', 'reports', 'infrastructure', 'renderers', 'pdf', 'fonts'),
    path.join(process.cwd(), 'src', 'modules', 'reports', 'infrastructure', 'renderers', 'pdf', 'fonts'),
  ];

  const fontsDir = candidates.find((dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'Inter-Regular.ttf')));

  if (!fontsDir) {
    console.warn('[PDF Fonts] Diretório de fontes TTF não localizado. Usando fontes padrão Helvetica/Courier.');
    return;
  }

  try {
    Font.register({
      family: 'Inter',
      fonts: [
        {
          src: path.join(fontsDir, 'Inter-Regular.ttf'),
          fontWeight: 400,
        },
        {
          src: path.join(fontsDir, 'Inter-SemiBold.ttf'),
          fontWeight: 600,
        },
        {
          src: path.join(fontsDir, 'Inter-Bold.ttf'),
          fontWeight: 700,
        },
      ],
    });

    Font.register({
      family: 'JetBrainsMono',
      fonts: [
        {
          src: path.join(fontsDir, 'JetBrainsMono-Medium.ttf'),
          fontWeight: 500,
        },
        {
          src: path.join(fontsDir, 'JetBrainsMono-Bold.ttf'),
          fontWeight: 700,
        },
      ],
    });

    fontsRegistered = true;
  } catch (err) {
    console.warn('[PDF Fonts] Falha ao registrar fontes personalizadas. Fallback para padrão do sistema:', err);
  }
}
