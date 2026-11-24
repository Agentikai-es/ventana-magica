// Integración de index.html: ids que usa el script existen y los imports apuntan a exports reales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

test('cada id que usa el script existe en el HTML', () => {
  const usados = new Set([...html.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]));
  const definidos = new Set([...html.matchAll(/\sid="([\w-]+)"/g)].map((m) => m[1]));
  assert.ok(usados.size > 10);
  for (const id of usados) assert.ok(definidos.has(id), `falta id="${id}"`);
});

test('cada import del HTML existe en su módulo', async () => {
  const imports = [...html.matchAll(/import \{([^}]+)\} from '\.\/([\w.]+)'/g)];
  assert.ok(imports.length >= 7);
  for (const [, nombres, archivo] of imports) {
    const mod = await import(new URL(`./${archivo}`, import.meta.url));
    for (const n of nombres.split(',').map((s) => s.trim()).filter(Boolean)) {
      assert.ok(n in mod, `${archivo} no exporta ${n}`);
    }
  }
});
