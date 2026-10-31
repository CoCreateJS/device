# Build scripts

Run package commands with `npm run <command>` or `yarn <command>` from the repository root.

| Command | Purpose |
| --- | --- |
| `device:prepare` | Build the native JS bundle and stage the configured app assets. |
| `device:prepare:assets` | Stage app assets with an existing native bundle. |
| `device:android:doctor` | Report local tools, configuration, and project status without installing. |
| `device:android:setup` | Install JDK/SDK tools on Debian/Ubuntu x86_64 and present SDK licenses. |
| `device:android:build:debug` / `device:android:build` | Invoke the future Gradle host for APK/AAB builds. |
| `device:ios:doctor` | Report local Xcode and project status. |
| `device:ios:setup` | Check full Xcode locally on macOS or over SSH. |
| `device:ios:build:simulator` / `device:ios:build` | Build the simulator target or archive locally/on a Mac. |
| `device:ios:export` | Export an archive with a build-host ExportOptions.plist. |
| `device:windows:doctor` | Report local Windows tools and project status. |
| `device:windows:setup` | Provision .NET 10 and validate winapp CLI without modifying app sources. |
| `device:windows:build:debug` | Build and launch the future Windows app in Debug. |
| `device:windows:build` | Package the future app as unsigned MSIX. |

The host projects remain to be implemented under `src/native/<platform>`. Build commands identify missing projects rather than claiming setup has made an app build possible.

Android command-line tools are checksum-pinned in `android/setup-linux.sh`. Setup does not silently accept SDK licenses. Host project SDK/plugin versions will be pinned with the projects. Use `JAVA_HOME`/`ANDROID_SDK_ROOT` to select installed tools; invalid JAVA_HOME is reported explicitly.

iOS project selection excludes internal project workspaces and rejects multiple candidates. `COCREATE_IOS_PROJECT` selects a local app explicitly. Remote execution requires matching committed clean checkouts, SSH, and rsync. `COCREATE_DEVICE_ASSETS` optionally supplies a prepared web directory for transfer; artifact collection uses `build/ios/`. The host project must still be taught to consume that directory. Setup checks Xcode; it does not install Xcode.

Windows source and platform SDK references will live in the app project. Tool installation is separate from app initialization. The CLI is in preview and its version is checked. Final signing and Store packaging need a real Windows project and runner.

[App configuration example](../device.config.example.json), [review status](../docs/review.md), [roadmap](../docs/roadmap.md).
