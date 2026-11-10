import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// Importing from the 'lucide-react-native' entry point bundles ~2000 icons (~1.9 MB).
// Only src/components/icons.ts may touch the package, and only through per-icon paths
// (or `import type`, which is erased at build time).
describe('icon imports', () => {
  const root = join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  walk(root);

  it.each(files.map((f) => [relative(root, f).replace(/\\/g, '/'), f]))(
    '%s does not import the whole icon package',
    (_, file) => {
      const source = readFileSync(file, 'utf8');
      const valueImports = source.match(/^(?:import|export)(?! type)[^;]*from 'lucide-react-native';/gm) ?? [];
      expect(valueImports).toEqual([]);
    },
  );
});
