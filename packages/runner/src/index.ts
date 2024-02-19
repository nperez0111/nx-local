import { NxJsonConfiguration } from 'nx/src/config/nx-json';
import { ProjectGraph } from 'nx/src/config/project-graph';
import type { Task, TaskGraph } from 'nx/src/config/task-graph';
import { DaemonClient } from 'nx/src/daemon/client/client';
import { TaskHasher } from 'nx/src/hasher/task-hasher';
import { RemoteCache as NxRemoteCache } from 'nx/src/tasks-runner/default-tasks-runner';
import { LifeCycle } from 'nx/src/tasks-runner/life-cycle';
import { TaskOrchestrator } from 'nx/src/tasks-runner/task-orchestrator.js';
import { NxArgs } from 'nx/src/utils/command-line-utils';

import { RemoteCache } from './remoteCache';

const tasksRunner = async (
  tasks: Task[],
  options: {
    parallel?: number;
    cacheableOperations?: string[];
    cacheableTargets?: string[];
    runtimeCacheInputs?: string[];
    cacheDirectory?: string;
    remoteCache?: NxRemoteCache;
    lifeCycle: LifeCycle;
    captureStderr?: boolean;
    skipNxCache?: boolean;
    batch?: boolean;
    host?: string;
  },
  context: {
    target: string;
    initiatingProject?: string;
    projectGraph: ProjectGraph;
    nxJson: NxJsonConfiguration;
    nxArgs: NxArgs;
    taskGraph: TaskGraph;
    hasher: TaskHasher;
    daemon: DaemonClient;
  },
) => {
  if (options.host) {
    options.remoteCache = new RemoteCache({
      host: options.host,
      verbose: Boolean(context.nxArgs.verbose),
      tasks,
    });
  } else {
    console.warn('Missing `host` configuration, skipping remote cache.');
  }

  options['parallel'] = options['parallel'] || parseInt(process.env['NX_PARALLEL'] || '') || 3;

  options.lifeCycle.startCommand?.();
  const orchestrator = new TaskOrchestrator(
    context.hasher,
    context.initiatingProject,
    context.projectGraph,
    context.taskGraph,
    options,
    Boolean(context.nxArgs?.nxBail),
    context.daemon,
  );

  try {
    const res = await orchestrator.run();
    return res;
  } finally {
    options.lifeCycle.endCommand?.();
  }
};

export default tasksRunner;
