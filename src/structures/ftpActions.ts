import FTPClient from "ftp";
import { stringifyStream } from "#util";
import type { FSServer } from "#typings";

export class FTPActions extends FTPClient {
    public constructor(private config: FSServer["ftp"], private keepAlive = false) {
        super();
    }

    public async login() {
        super.connect(this.config);

        await new Promise<void>(res => this.on("ready", res));
    }

    public async get(path: string) {
        if (!this.keepAlive) await this.login();

        const data = await new Promise<string>((res, rej) => super.get(
            this.config.path + path,
            async (err, stream) => err ? rej(err) : res(await stringifyStream(stream))
        ));

        if (!this.keepAlive) super.end();

        return data;
    }

    public async put(data: NodeJS.ReadableStream | string | Buffer, path: string) {
        if (!this.keepAlive) await this.login();

        await new Promise<void>((res, rej) => super.put(
            data,
            this.config.path + path,
            (err) => err ? rej(err) : res()
        ));

        if (!this.keepAlive) super.end();
    }

    public async delete(path: string) {
        if (!this.keepAlive) await this.login();

        await new Promise<void>((res, rej) => super.delete(
            this.config.path + path,
            (err) => err ? rej(err) : res()
        ));

        if (!this.keepAlive) super.end();
    }
}