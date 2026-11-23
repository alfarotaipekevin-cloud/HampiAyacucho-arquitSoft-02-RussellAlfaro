import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * EQ-06 · Mantenibilidad: la regla de dependencias de Clean Architecture (ADR-002)
 * y el aislamiento entre módulos del monolito modular (ADR-001) se comprueban en cada cambio.
 */

const SRC = join(__dirname, '..', '..');
const archivos = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const ruta = join(dir, n);
  return statSync(ruta).isDirectory() ? archivos(ruta) : ruta.endsWith('.ts') ? [ruta] : [];
});
const codigo = archivos(SRC).filter((f) => !f.includes(`${sep}pruebas${sep}`));
const importsDe = (archivo: string) => [...readFileSync(archivo, 'utf8').matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
const capa = (archivo: string) => /[\\/](dominio|aplicacion|infraestructura|presentacion)[\\/]/.exec(archivo)?.[1];
const moduloDe = (archivo: string) => /modules[\\/](\w+)[\\/]/.exec(archivo)?.[1];
const resolver = (desde: string, imp: string) => (imp.startsWith('.') ? join(desde, '..', imp) : imp);

/** Librerías de framework o infraestructura que el núcleo no debe conocer. */
const LIBRERIAS_EXTERNAS = /^(express|pg|redis|jsonwebtoken|bcryptjs|pdfkit|qrcode|swagger-ui-express)$/;

describe('EQ-06 · Mantenibilidad: regla de dependencias y módulos aislados', () => {
  test('hay código en las cuatro capas de cada módulo con lógica', () => {
    for (const m of ['citas', 'identidad']) {
      for (const c of ['dominio', 'aplicacion', 'infraestructura', 'presentacion']) {
        expect(codigo.some((f) => moduloDe(f) === m && capa(f) === c)).toBe(true);
      }
    }
  });

  test('ningún archivo de dominio/ importa aplicación, infraestructura, presentación ni librerías externas', () => {
    const violaciones = codigo.filter((f) => capa(f) === 'dominio' || f.includes(`shared${sep}dominio`)).flatMap((f) =>
      importsDe(f).filter((i) => /(aplicacion|infraestructura|presentacion|http)[\\/]?/.test(resolver(f, i)) || LIBRERIAS_EXTERNAS.test(i))
        .map((i) => `${relative(SRC, f)} → ${i}`));
    expect(violaciones).toEqual([]);
  });

  test('aplicacion/ (casos de uso) no depende de infraestructura, presentación ni de Express/pg/Redis', () => {
    const violaciones = codigo.filter((f) => capa(f) === 'aplicacion').flatMap((f) =>
      importsDe(f).filter((i) => /(infraestructura|presentacion)/.test(resolver(f, i)) || LIBRERIAS_EXTERNAS.test(i))
        .map((i) => `${relative(SRC, f)} → ${i}`));
    expect(violaciones).toEqual([]);
  });

  test('un módulo solo usa otro módulo a través de su index.ts (API pública)', () => {
    const violaciones = codigo.filter((f) => moduloDe(f)).flatMap((f) =>
      importsDe(f).map((i) => ({ i, destino: resolver(f, i) }))
        .filter(({ destino }) => {
          const otro = moduloDe(destino + sep);
          if (!otro || otro === moduloDe(f)) return false;
          return !/modules[\\/]\w+[\\/]?(index)?$/.test(destino);
        })
        .map(({ i }) => `${relative(SRC, f)} → ${i}`));
    expect(violaciones).toEqual([]);
  });

  test('la caché (ADR-004) entra como decorador: los casos de uso no la conocen', () => {
    const casosDeUso = codigo.filter((f) => capa(f) === 'aplicacion');
    for (const f of casosDeUso) expect(readFileSync(f, 'utf8')).not.toMatch(/cache|redis/i);
  });
});
