import { Pool } from 'pg';
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}
declare const app: import("express-serve-static-core").Express;
declare const pool: Pool;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export { app, server, pool };
//# sourceMappingURL=server.d.ts.map