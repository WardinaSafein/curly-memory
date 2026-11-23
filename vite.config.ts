/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { Compiler } from 'inkjs/full';

/** Compiles `.ink` story files to Ink JSON at import time, so writers edit plain text. */
function inkPlugin(): Plugin {
  return {
    name: 'cyberwr-ink',
    transform(source, id) {
      if (!id.endsWith('.ink')) return null;
      const compiler = new Compiler(source);
      const story = compiler.Compile();
      if (compiler.errors.length > 0) {
        this.error(`Ink compile errors in ${id}:\n${compiler.errors.join('\n')}`);
      }
      for (const warning of compiler.warnings) this.warn(`${id}: ${warning}`);
      return { code: `export default ${JSON.stringify(story.ToJson())};`, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [inkPlugin()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
