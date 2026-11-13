import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Every package the app imports must be declared in package.json. Native modules are linked
// from the declared dependencies, so a package that is only in node_modules bundles fine and
// then crashes on launch with "Cannot find native module" (v1.12.0 shipped that way).

const root = join(__dirname, '..', '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
const declared = new Set(Object.keys(pkg.dependencies));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

function packageOf(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

test('every package imported by app code is a declared dependency', () => {
  const missing = new Set<string>();
  for (const file of ['app', 'src', 'modules'].flatMap((d) => sourceFiles(join(root, d)))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:from|require\()\s*['"]([^'"]+)['"]/g)) {
      const name = packageOf(match[1]);
      if (name && name !== 'react' && !declared.has(name)) missing.add(`${name} (${file.slice(root.length + 1)})`);
    }
  }
  expect([...missing]).toEqual([]);
});
