// Declarações globais de tipos para o ambiente Next.js

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
