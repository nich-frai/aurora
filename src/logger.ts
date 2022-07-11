import type { AwilixContainer } from 'awilix';
import createLogger, { type Logger as Pino } from 'pino';
import kleur from 'kleur';

export class Logger {

	private static devOutput: boolean = false;

  static enableDevOutput() {
    Logger.devOutput = true;
  }

  static disableDevOutpu() {
    Logger.devOutput = false;
  }
  static #instance: Map<AwilixContainer, Pino> = new Map();

  private static getInstance(container: AwilixContainer) {
    if (!Logger.#instance.has(container)) {
      const loggerTransports = createLogger.transport(
        container.resolve("aurora.logger.config")
      );

      Logger.#instance.set(container, createLogger(loggerTransports));
    }

    return Logger.#instance.get(container)!;
  }

	#pino : Pino;

	constructor(
		private container : AwilixContainer, 
		private name : string
		) {
			this.#pino = Logger.getInstance(container);
	}
	
	log(msg: string, ...objs: unknown[]) {
    this.#pino.info(`[${kleur.bold(this.name)}] ${msg}`, ...objs);

    if (Logger.devOutput) {
      this.dev(
        `[${kleur.bold(this.name)}] (${this.displayTime()}) 📰 ${kleur
          .blue()
          .bold("INFO")}\n| ${msg}`,
        ...objs
      );
    }
  }

  info(msg: string, ...objs: unknown[]) {
    this.log(msg, ...objs);
  }

  warn(msg: string, ...objs: unknown[]) {
    this.#pino.warn(`[${kleur.bold(this.name)}] ${msg}`, ...objs);

    this.dev(
      `[${kleur.bold(this.name)}] (${this.displayTime()}) ⚠️ ${kleur
        .yellow()
        .bold("WARN")}\n| ${msg}`,
      ...objs
    );
  }

  error(msg: string, ...objs: unknown[]) {
    this.#pino.warn(`[${kleur.bold(this.name)}] ${msg}`, ...objs);

    this.dev(
      `[${kleur.bold(this.name)}] (${this.displayTime()}) 🚨 ${kleur
        .red()
        .bold("ERROR")}\n| ${msg}`,
      ...objs
    );
  }

  fatal(msg: string, ...objs: unknown[]) {
    this.#pino.fatal(`[${kleur.bold(this.name)}] ${msg}`, ...objs);

    this.dev(
      `[${kleur.bold(this.name)}] (${this.displayTime()}) 🧟 ${kleur
        .red()
        .bold("FATAL")}\n| ${msg}`,
      ...objs
    );
  }

  dev(msg: string, ...objs: unknown[]) {
    if (Logger.devOutput) {
      process.stdout.write(msg + "\n");
      objs.forEach((o) => {
        let out = prettyPrintJson(o);
        if (process.stdout.columns ?? 100 > inlineOutput(out).length) {
          process.stdout.write(inlineOutput(out));
        } else {
          process.stdout.write(out);
        }
        process.stdout.write("\n");
      });
    }
  }

  private displayTime() {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(
      2,
      "0"
    )}.${now.getMilliseconds()}`;
    return nowTime;
  }
}


function inlineOutput(out: string) {
  return out
    .replace(/\n/gm, "")
    .replace(/\s+/gm, " ")
    .replace(/(\[|{)\s+/gm, "$1");
}

const colorizer = kleur;

export function prettyPrintJson(value: any, depth = 0, inline = false) {
  let outBuffer: string = "";

  const print = (str: string) => {
    outBuffer += str;
    return outBuffer;
  };

  if (depth > 10) {
    return outBuffer;
  }

  const str = colorizer.green;
  const sym = colorizer.yellow;
  const num = colorizer.magenta;
  const date = (d: Date) => {
    return print(
      colorizer!.bold().red("Date(") +
        colorizer!.white('"' + d.toString() + '"') +
        colorizer!.bold().red(")")
    );
  };

  // TODO: colorize functions, arrays, classes and so on
  const arr = (arr: unknown[]) => {
    const jumpWhen = 5;
    print(colorizer!.yellow("[ "));
    const multilinePrint = arr.length >= jumpWhen;
    multilinePrint && print("\n");

    arr.forEach((v, i) => {
      const shouldJump = i % jumpWhen === jumpWhen - 1;
      const justJumped = i % jumpWhen === 0;

      multilinePrint && justJumped && print(" ".repeat((1 + depth) * 2));
      print(prettyPrintJson(v, depth + 1, true));
      print(", ");
      multilinePrint && shouldJump && print("\n");
    });
    multilinePrint && print("\n" + " ".repeat(depth * 2));
    return print(colorizer!.yellow("]"));
  };

  const obj = (obj: Record<string | number | symbol, unknown>, depth = 0) => {
    print(colorizer!.blue("{ "));
    inline || print("\n");

    // print regular keys
    Object.entries(obj).forEach(([k, v]) => {
      // print tab
      inline || print(" ".repeat(2 * (depth + 1)));
      // print key
      print(typeof k === "number" ? `${colorizer!.bold(k)}: ` : `"${k}": `);
      // print value
      print(prettyPrintJson(v, depth + 1, inline));
      print(", ");
      // jump a line
      inline || print("\n");
    });

    // print symbol keys
    Object.getOwnPropertySymbols(obj).forEach((s) => {
      const v = obj[s];
      // print tab
      inline || print(" ".repeat(2 * (depth + 1)));
      // print key
      print(`[${sym(s.description ?? "")}(symbol)]: `);
      // print value
      print(prettyPrintJson(v, depth + 1, inline));
      // jump a line
      print(",\n");
    });
    // print tab
    inline || print(" ".repeat(2 * depth));
    return print(colorizer!.blue("}"));
  };

  // TODO: pretty print function signature
  const fun = (str: string) => {
    return print(str + "\n");
  };

  // TODO: detect and pretty print class signatures
  const clas = (str: string) => {};

  if (typeof value === "string") {
    if (depth === 0) return print(value);
    return print('"' + str(value) + '"');
  }

  if (typeof value === "number") {
    return print(num(value));
  }

  if (value === undefined) {
    return print(num("undefined"));
  }

  if (value === null) {
    return print(num("undefined"));
  }

  if (typeof value === "object") {
    // is array?
    if (Array.isArray(value)) {
      return arr(value);
    }

    // is date°
    if (value instanceof Date) {
      return date(value);
    }

    return obj(value, depth);
  }

  if (typeof value === "function") {
    return fun(value.toString());
  }

  if (typeof value === "boolean") {
    return print(colorizer!.cyan(value ? "true" : "false"));
  }

  if (typeof value === "symbol") {
    return print(`[${sym(value.description!)}(symbol)]`);
  }

  return outBuffer;
}
export interface LoggerConfiguration {
	transports : [];
}