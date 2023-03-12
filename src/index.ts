import fs from "fs";
import {
  get as _get,
  has as _has,
  set as _set,
  clone,
  cloneDeep,
  isNil,
  isString,
} from "lodash";
import { resolve } from "path";

export interface DBOptions {
  dataDir: string;
  cloneLevel: "none" | "shallow" | "deep";
  proxy: boolean;
}

// private
const operations = {
  add: "+",
  addition: "+",
  sub: "-",
  subtract: "-",
  mult: "*",
  multiply: "*",
  div: "/",
  divide: "/",
  exp: "^",
  exponent: "^",
  mod: "%",
  modulo: "%",
} as const;

// public/enum
export const Operations = {
  Add: "+",
  Subtract: "-",
  Multiply: "*",
  Divide: "/",
  Exponent: "^",
  Modulo: "%",
} as const;

type ObjectValues<T> = T[keyof T];
type WordOperation = keyof typeof operations;
type SymbolOperations = ObjectValues<typeof operations>;
type Operation = WordOperation | SymbolOperations | "rand" | "random";

class JsonDB {
  private options: DBOptions = {
    dataDir: "./data",
    proxy: false,
    cloneLevel: "deep",
  };
  constructor(options?: Partial<DBOptions>) {
    if (options) {
      if (options.dataDir) {
        if (!fs.existsSync(options.dataDir))
          fs.mkdirSync(options.dataDir, { recursive: true });
        this.options.dataDir = options.dataDir;
      }
      if (options.proxy) this.options.proxy = options.proxy;
      if (options.cloneLevel) this.options.cloneLevel = options.cloneLevel;
    }

    return this;
  }

  private getPath(key: string) {
    return resolve(process.cwd(), this.options.dataDir, `${key}.json`);
  }
  private mathOp(base: number, op: Operation, opand: number): number | null {
    switch (op) {
      case "add":
      case "addition":
      case "+":
        return base + opand;
      case "sub":
      case "subtract":
      case "-":
        return base - opand;
      case "mult":
      case "multiply":
      case "*":
        return base * opand;
      case "div":
      case "divide":
      case "/":
        return base / opand;
      case "exp":
      case "exponent":
      case "^":
        return Math.pow(base, opand);
      case "mod":
      case "modulo":
      case "%":
        return base % opand;
      case "rand":
      case "random":
        return Math.floor(Math.random() * Math.floor(opand));
      default:
        return null;
    }
  }
  private clone(data: any) {
    if (this.options.cloneLevel === "none") return data;
    if (this.options.cloneLevel === "shallow") return clone(data);
    if (this.options.cloneLevel === "deep") return cloneDeep(data);
    throw new SyntaxError("Invalid cloneLevel.");
  }

  get(key: string, path?: string) {
    if (isNil(key)) return null;
    key = key.toString();

    const dbPath = this.getPath(key);

    let data;
    try {
      data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch {
      const dir = dbPath
        .split("/")
        .filter((x) => !x.endsWith(".json"))
        .join("/");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, "{}");
      data = {};
    }

    if (!isNil(path)) return _get(data, path);

    if (this.options.proxy)
      return new Proxy(data, {
        set(target, key, value) {
          target[key] = value as never;
          fs.writeFileSync(dbPath, JSON.stringify(target, null, 2));
          return true;
        },
      });
    else return data;
  }

  set(key: string, value: any, path?: string) {
    if (isNil(key) || !isString(key))
      throw new SyntaxError("Keys must always be strings.");
    key = key.toString();

    let data = this.get(key);
    if (!isNil(path)) {
      if (isNil(data)) data = {};
      _set(data, path, value);
    } else {
      data = value;
    }

    const dbPath = this.getPath(key);

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

    if (this.options.proxy)
      return new Proxy(data, {
        set(target, key, value) {
          target[key] = value as never;
          fs.writeFileSync(dbPath, JSON.stringify(target, null, 2));
          return true;
        },
      });
    else return data;
  }

  has(key: string, path?: string) {
    key = key.toString();
    if (!isNil(path)) {
      const data = this.get(key);
      return _has(data, path);
    } else return fs.existsSync(this.getPath(key));
  }

  ensure(key: string, defaultValue: any, path?: string) {
    if (isNil(defaultValue))
      throw new SyntaxError(
        `No default value was provided on ensure method for "${key}".`
      );

    if (!isNil(path)) {
      if (this.has(key, path)) return this.get(key, path);

      this.set(key, defaultValue, path);
      return defaultValue;
    }

    if (this.has(key)) return this.get(key);

    const clonedValue = this.clone(defaultValue);
    this.set(key, clonedValue);
    return clonedValue;
  }

  push(key: string, val: any, path?: string): this {
    const data = this.get(key, path);

    if (!isNil(path)) {
      const propValue = _get(data, path);
      propValue.push(val);
      _set(data, path, propValue);
    } else {
      data.push(val);
    }

    this.set(key, data);

    const dbPath = this.getPath(key);
    if (this.options.proxy)
      return new Proxy(data, {
        set(target, key, value) {
          target[key] = value as never;
          fs.writeFileSync(dbPath, JSON.stringify(target, null, 2));
          return true;
        },
      });
    else return data;
  }

  math(key: string, operation: Operation, operand: number, path?: string) {
    const data = this.get(key, path);
    return this.set(key, this.mathOp(data, operation, operand), path);
  }
}

export { JsonDB, JsonDB as default };
