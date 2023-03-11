import fs from "fs";
import { get as _get, isNil, isString, set as _set } from "lodash";
import { resolve } from "path";

export interface DBOptions {
  dataDir: string;
  proxy: boolean;
}

class JsonDB {
  private options: DBOptions = {
    dataDir: "./data",
    proxy: false,
  };
  constructor(options?: Partial<DBOptions>) {
    if (options) {
      if (options.dataDir) {
        if (!fs.existsSync(options.dataDir))
          fs.mkdirSync(options.dataDir, { recursive: true });
        this.options.dataDir = options.dataDir;
      }
      if (options.proxy) this.options.proxy = options.proxy;
    }

    return this;
  }

  private getDbPath(key: string) {
    return resolve(process.cwd(), this.options.dataDir, `${key}.json`);
  }

  get(key: string, path?: string) {
    if (isNil(key)) return null;
    key = key.toString();

    const dbPath = this.getDbPath(key);

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

    const dbPath = this.getDbPath(key);
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
}

export { JsonDB, JsonDB as default };
