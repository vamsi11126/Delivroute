import { Role } from '@prisma/client';

declare module 'express' {
  export interface Request {
    body: any;
    headers: Record<string, string | string[] | undefined>;
    params: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
    user?: {
      id: string;
      role: Role;
      storeId: string | null;
    };
  }

  export interface Response {
    json(body: any): Response;
    send(body?: any): Response;
    status(code: number): Response;
  }

  export type NextFunction = (err?: unknown) => void;

  export interface Application {
    get(...args: any[]): Application;
    listen(...args: any[]): any;
    patch(...args: any[]): Application;
    post(...args: any[]): Application;
    set(...args: any[]): Application;
    use(...args: any[]): Application;
  }

  export interface Router {
    get(...args: any[]): Router;
    patch(...args: any[]): Router;
    post(...args: any[]): Router;
    use(...args: any[]): Router;
  }

  export function Router(): Router;
  export function json(): any;
  export function urlencoded(options?: { extended?: boolean }): any;

  const express: {
    (): Application;
    json: typeof json;
    Router: typeof Router;
    urlencoded: typeof urlencoded;
  };

  export default express;
}

declare module 'morgan' {
  interface MorganOptions {
    stream?: {
      write(message: string): void;
    };
  }

  function morgan(format?: string, options?: MorganOptions): any;

  export default morgan;
}

declare module 'bcrypt' {
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hash(data: string, saltOrRounds: number): Promise<string>;

  const bcrypt: {
    compare: typeof compare;
    hash: typeof hash;
  };

  export default bcrypt;
}

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: unknown;
  }

  export interface SignOptions {
    algorithm?: string;
    expiresIn?: string | number;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string,
    options?: SignOptions,
  ): string;
  export function verify(token: string, secretOrPublicKey: string, options?: object): string | JwtPayload;

  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };

  export default jwt;
}
