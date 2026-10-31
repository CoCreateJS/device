# Windows host

The planned Windows host is a packaged WinUI 3 app using WebView2. It will load the CoCreate web assets, expose the common device envelope bridge to JavaScript, and implement capabilities with Windows APIs. Microsoft documents WebView2 as the embedded web control for WinUI 3; the target machine also needs the WebView2 Runtime.

Setup and package commands:

```powershell
yarn device:windows:setup
yarn device:windows:build:debug
yarn device:windows:build
```

Setup uses WinGet to install .NET 10 and validates Windows App Development CLI 0.6 or newer. It does not initialize or change app sources; SDK references will be restored from the future project. The build scripts expect a WinUI `.csproj` in this directory; that host project has not been scaffolded yet.

See [`scripts/windows/`](../../../scripts/windows/) and [`scripts/README.md`](../../../scripts/README.md). The Windows App Development CLI is currently in public preview; check its current documentation before refreshing the setup workflow.
