import Axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import type { Task } from 'nx/src/config/task-graph';
import { RemoteCache as NxRemoteCache } from 'nx/src/tasks-runner/default-tasks-runner';
import { Stream } from 'stream';
import { create as tarCreate, extract as tarExtract } from 'tar';

export class RemoteCache implements NxRemoteCache {
  private readonly client: AxiosInstance;
  private readonly verbose: boolean;
  private readonly tasks: Task[];

  constructor({
    host,
    tasks,
    verbose = false,
  }: {
    host: string;
    tasks: Task[];
    verbose?: boolean;
  }) {
    this.client = Axios.create({ baseURL: host });
    this.tasks = tasks;
    this.verbose = verbose;
  }

  log(message: string): void {
    console.log(`${chalk.grey(`> nx-local`)} ${message}`);
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(`${chalk.grey(`> nx-local:debug`)} ${message}`);
    }
  }

  async retrieve(hash: string, cacheDirectory: string): Promise<boolean> {
    console.log(this.tasks.find((task) => task.hash === hash));
    try {
      this.debug(`Fetching ${hash} from remote...`);
      const response = await this.client.request<Stream>({
        method: 'get',
        url: `/cache/${hash}`,
        responseType: 'stream',
      });
      this.debug(`Fetched ${hash} from remote.`);

      await new Promise((resolve, reject) =>
        response.data
          .pipe(
            tarExtract({
              cwd: cacheDirectory,
            }),
          )
          .on('finish', resolve)
          .on('error', reject),
      );
      this.debug(`File ${hash} extracted to the cache directory.`);

      return true;
    } catch (err) {
      this.debug(`Failed to retrieve file ${hash} from remote (error below).`);
      this.debug(String(err));
      return false;
    }
  }

  async store(hash: string, cacheDirectory: string): Promise<boolean> {
    this.debug(`Uploading result to remote...`);
    const task = this.tasks.find((task) => task.hash === hash);

    try {
      const tarStream = await tarCreate({ gzip: true, cwd: cacheDirectory }, [
        `./${hash}`,
        `./${hash}.commit`,
      ]);

      return await new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chunks: any[] = [];

        tarStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        tarStream.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            this.debug(`Uploading file ${hash} to the S3 bucket.`);

            await this.client.request({
              method: 'post',
              url: `/cache/${hash}`,
              data: buffer,
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': String(buffer.length),
                'X-Nx-Local-Project-Name': task?.target.project,
                'X-Nx-Local-Target': task?.target.target,
                'X-Nx-Local-Start-Time': task?.startTime,
              },
            });

            this.debug(`File ${hash} uploaded to the S3 bucket.`);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        });
      });
    } catch (err) {
      this.debug(`Failed to store Nx cache to remote (error below).`);
      this.debug(String(err));
      return false;
    }
  }
}
