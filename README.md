<div align="center">
<img src="/docs/header.svg" width=500>

# NX Local

### Make your NX workspace faster with a self-hosted alternative to Nx Cloud

</div>

This project aims to provide a self-hosted alternative to [Nx Cloud](https://nx.app/). It is a work in progress, and is not yet ready for production use.

## Planned Features

- [x] Remote Caching
- [ ] Distributed Task Execution (via GitHub Actions)
- [ ] Simple UI for managing projects, runs, and caches

### Remote Caching

Want to share your cache with your team? NX Local provides a simple way to do that. Just run the server, and point your NX workspace to it.

Using the `nx-local` package, you can configure your workspace to use the remote cache:

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-local",
      "options": {
        "host": "http://your-nx-local-server.com/api/projects/<project-id>/"
      }
    }
  }
}
```

### Distributed Task Execution

NX Local will provide a way to run tasks across multiple machines, using GitHub Actions. This will allow you to run your tests, builds, and other tasks in parallel, without needing to set up your own infrastructure.

### Simple UI

NX Local will provide a simple web interface for managing your projects, runs, and caches. This will make it easy to see what's happening in your workspace, and to manage your cache.
