/// <reference types="vite/client" />

declare module '*.ink' {
  /** Compiled Ink story JSON (see the ink plugin in vite.config.ts). */
  const story: string;
  export default story;
}
