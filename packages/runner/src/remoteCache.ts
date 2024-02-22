import Axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import fs from 'fs/promises';
import type { Task } from 'nx/src/config/task-graph';
import { RemoteCache as NxRemoteCache } from 'nx/src/tasks-runner/default-tasks-runner';
import path from 'path';
import { Stream } from 'stream';
import { finished } from 'stream/promises';
import { create as tarCreate, extract as tarExtract } from 'tar';

export class RemoteCache implements NxRemoteCache {
  private readonly client: AxiosInstance;
  private readonly verbose: boolean;
  private readonly tasks: Task[];
  private uploadPromises: Promise<void>[] = [];

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

  private log(message: string): void {
    console.log(`${chalk.grey(`> nx-local`)} ${message}`);
  }

  private debug(message: string): void {
    if (this.verbose) {
      console.log(`${chalk.grey(`> nx-local:debug`)} ${message}`);
    }
  }

  async retrieve(hash: string, cacheDirectory: string): Promise<boolean> {
    try {
      this.debug(`Fetching ${hash} from remote...`);
      const response = await this.client.request<Stream>({
        method: 'get',
        url: `/cache/${hash}`,
        responseType: 'stream',
      });

      this.debug(`Fetched ${hash} from remote.`);

      await finished(
        response.data.pipe(
          tarExtract({
            filter: this.filterTar,
            cwd: cacheDirectory,
          }),
        ),
      );
      // Create a file to indicate that the hash has been committed to the cache
      await fs.writeFile(path.join(cacheDirectory, `${hash}.commit`), 'true');

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
      const tarStream = await tarCreate(
        {
          gzip: true,
          cwd: cacheDirectory,
          filter: this.filterTar,
        },
        [hash],
      );

      this.debug(`Uploading file ${hash} to the store.`);
      this.uploadPromises.push(
        this.client
          .request({
            url: `/cache/${hash}`,
            method: 'post',
            data: Stream.PassThrough.from(tarStream),
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Nx-Local-Project-Name': task?.target.project,
              'X-Nx-Local-Target': task?.target.target,
              'X-Nx-Local-Start-Time': task?.startTime,
            },
          })
          .then(() => {
            this.debug(`File ${hash} uploaded to the store.`);
          })
          .catch((err) => {
            this.debug(`Failed to upload file ${hash} to the store (error below).`);
            this.debug(String(err));
            throw err;
          }),
      );
      return true;
    } catch (err) {
      this.debug(`Failed to store Nx cache to remote (error below).`);
      this.debug(String(err));
      return false;
    }
  }

  private filterTar(filePath: string): boolean {
    const excludedPaths = [
      /**
       * The 'source' file is used by NX for integrity check purposes, but isn't utilized by custom cache providers.
       * Excluding it from the tarball saves space and avoids potential NX cache integrity issues.
       * See: https://github.com/bojanbass/nx-aws/issues/368 and https://github.com/nrwl/nx/issues/19159 for more context.
       */
      path.join(path.dirname(filePath), 'source'),
    ];

    return !excludedPaths.includes(filePath);
  }

  async finishUploadingCaches(): Promise<void> {
    await Promise.allSettled(this.uploadPromises);
  }
}
