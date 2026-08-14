import type { NextFunction, Request, Response } from 'express';

/**
 * Gateway para la interfaz web: la web habla ÚNICAMENTE con este backend
 * (http://localhost:3000/plant-service/*) y aquí se reenvía a plant-service
 * (http://localhost:8000/api/v1/*). Así el frontend tiene un único origen y
 * plant-service sigue siendo un servicio independiente (el ESP lo consume
 * directamente, no vía este proxy).
 *
 > * El sufijo de la URL se conserva tal cual: `/plant-service/api/v1/crops`
 * → `http://localhost:8000/api/v1/crops`.
 */
function collectRawBody(req: Request): Promise<Buffer | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
      total += chunk.length;
    });
    req.on('end', () => resolve(total ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}

export function createPlantProxy(getTarget: () => string) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    // El prefijo del gateway se elimina: /plant-service/api/v1/crops
    // → http://localhost:8000/api/v1/crops
    const upstreamPath = req.originalUrl.replace(/^\/plant-service/, '') || '/';
    const upstream = `${getTarget()}${upstreamPath}`;

    const headers: Record<string, string> = {};
    if (req.headers['content-type'])
      headers['content-type'] = String(req.headers['content-type']);
    if (req.headers.accept) headers.accept = String(req.headers.accept);
    if (req.headers['x-api-key']) headers['x-api-key'] = String(req.headers['x-api-key']);

    // Cuerpo: si Nest ya lo parseó (express.json) usamos req.body; si no,
    // leemos el stream crudo para reenviar los bytes exactos.
    let body: string | Buffer | undefined;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body !== undefined) {
        body = Object.keys(req.body).length
          ? JSON.stringify(req.body)
          : undefined;
      } else {
        body = await collectRawBody(req);
      }
    }

    try {
      const response = await fetch(upstream, {
        method: req.method,
        headers,
        body: body as BodyInit | undefined,
        signal: AbortSignal.timeout(30_000),
      });
      const text = await response.text();
      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('content-type', contentType);
      res.status(response.status).send(text);
    } catch (err) {
      console.error(`[plant-proxy] plant-service no disponible: ${(err as Error).message}`);
      res.status(502).json({
        detail: `plant-service no disponible: ${(err as Error).message}`,
      });
    }
  };
}
