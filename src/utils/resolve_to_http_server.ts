import { createServer, Server as HttpServer } from "node:http";
import { Server as HttpsServer } from "node:https";

export async function resolveHttpServer(
  from: TResolvesToHttpServer
): Promise<HttpServer | HttpsServer> {
	
	if(from === true) return createServer();

	if(typeof from ==='function') {
		try {
			from = from();
		} catch(err) {
			throw new Error(
        "The factory function that should produce a http or https server threw an exception!",
        { cause: err instanceof Error ? err : new Error(String(err)) }
      );
		}
	}

	if(from instanceof HttpServer || from instanceof HttpsServer) return from;

	if(from instanceof Promise) {
    return from.catch((err) => {
      throw new Error("");
    });
  }

	throw new Error(
    "Could not resolve the value given to a http server! Was expecting either:\n" 
		+ "1. a http or https server OR\n"
		+ "2. a promise that resolves to a http or https server OR \n"
		+ "3. a factory function thet returns either a http or https server OR\n"
		+ "4. a factory function thet returns a promise that resolve to a http or https server"
  );
}

export type TResolvesToHttpServer = 
| true
| HttpServer 
| HttpsServer 
| Promise<HttpServer | HttpsServer>
| ( () => HttpServer | HttpsServer)
| ( () => Promise<HttpServer | HttpsServer>)