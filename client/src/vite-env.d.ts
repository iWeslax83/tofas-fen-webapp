/// <reference types="vite/client" />

/* eslint-disable @typescript-eslint/no-unused-vars */
interface ImportMetaEnv {
  readonly NODE_ENV: string
  // more env variables...
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string
    }
  }

  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: {
        event_category?: string;
        value?: number;
        event_label?: string;
        non_interaction?: boolean;
        [key: string]: unknown;
      }
    ) => void;
  }
}

export { };
