import { createServer, Server } from 'node:http';
import { describe, expect, it } from 'vitest';
import { resolveHttpServer } from './resolve_to_http_server';

describe('Http Server resolution', () => {

	it('creates a http server when true is given', async () => {
		const resolved = await resolveHttpServer(true);
		expect(resolved).toBeInstanceOf(Server);
	});


	it('uses the given server, either http or https', async () => {
		const server = createServer();
		const resolved = await resolveHttpServer(server);
		expect(resolved).toBe(server);
	});

	it('awaits the promised server value', async () => {
		const promiseServer = Promise.resolve(createServer());
		const resolvedPromise = resolveHttpServer(promiseServer);
		return  expect(resolvedPromise).resolves.toBeInstanceOf(Server);
	});

	it('throws when the promised value rejects', () => {
		const promiseReject = Promise.reject(new Error("Should not resolve!"));
		const rejectedPromise = resolveHttpServer(promiseReject);
		return expect(rejectedPromise).rejects.toThrowError();
	});

	it('calls the factory function to receive the server', async () => {
    let count = 0;
    const factory = () => {
      count++;
      return createServer();
    };

    const firstResolution = resolveHttpServer(factory);
    const secondResolution = resolveHttpServer(factory);

		expect(count).toBe(2);
    expect(firstResolution).not.toBe(secondResolution);

    await expect(firstResolution).resolves.toBeInstanceOf(Server);
    await expect(secondResolution).resolves.toBeInstanceOf(Server);
  });

	it('awaits the promised return of a factory function', async () => {
		const factory = () => {
			return Promise.resolve(createServer());
		};

		let firstResolution = resolveHttpServer(factory);

		return  expect(firstResolution).resolves.toBeInstanceOf(Server);
	});

	it('throws when the factory function fails', () => {
		const factory = () => {
			throw new Error('failed to create server');
		};

		let firstResolution = resolveHttpServer(factory);

		return expect(firstResolution).rejects.toThrow();
	});

	it('throws when the factory function returned promise rejects', () => {
		const factory = () => {
			return Promise.reject(new Error('failed to create server'));
		};

		let firstResolution = resolveHttpServer(factory);

		return expect(firstResolution).rejects.toThrow();
	});
});