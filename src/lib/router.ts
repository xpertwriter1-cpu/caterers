import type { SessionData, ViewName } from "./types";

export interface RequestContext {
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, string>;
  rawBody?: Buffer;
  webhook?: { event?: string; data?: { reference?: string } };
  session: SessionData & {
    regenerate(callback: (error?: Error) => void): void;
    destroy(callback: (error?: Error) => void): void;
  };
  get(name: string): string | undefined;
}
export interface ResponseContext {
  status(code: number): ResponseContext;
  set(name: string, value: string): ResponseContext;
  render(view: ViewName, data: Record<string, unknown>): void;
  redirect(path: string): void;
  redirect(code: number, path: string): void;
  send(message: string): void;
  sendStatus(code: number): void;
  json(data: unknown): void;
  clearCookie(name: string): void;
}
export type Handler = (
  request: RequestContext,
  response: ResponseContext,
  next: (error?: unknown) => Promise<void>,
) => unknown;
export interface MatchedRoute {
  handlers: Handler[];
  params: Record<string, string>;
}

// Preserve existing URLs and business handlers behind Next's native API/SSR entry points.
export class Router {
  private routes: { method: string; path: string; handlers: Handler[] }[] = [];
  get(path: string, ...handlers: Handler[]) {
    this.routes.push({ method: "GET", path, handlers });
  }
  post(path: string, ...handlers: Handler[]) {
    this.routes.push({ method: "POST", path, handlers });
  }
  match(method: string, pathname: string): MatchedRoute | undefined {
    const segments = pathname.split("/").filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const pattern = route.path.split("/").filter(Boolean);
      if (pattern.length !== segments.length) continue;
      const params: Record<string, string> = {};
      if (
        pattern.every((part, index) => {
          if (!part.startsWith(":")) return part === segments[index];
          params[part.slice(1)] = segments[index];
          return true;
        })
      )
        return { handlers: route.handlers, params };
    }
  }
  async run(
    route: MatchedRoute,
    request: RequestContext,
    response: ResponseContext,
  ) {
    let index = 0;
    const next = async (error?: unknown): Promise<void> => {
      if (error) throw error;
      const handler = route.handlers[index++];
      if (handler) await handler(request, response, next);
    };
    await next();
  }
}
