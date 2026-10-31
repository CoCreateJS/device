# Contributing to CoCreate Device

Contributions are welcome. Please open an issue or pull request in the CoCreate Device repository and document user-facing behavior in the README.

## Development

Install dependencies and build the distribution:

```sh
yarn install
yarn build
```

Keep the envelope contract consistent across browser providers and native hosts. Requests use `method`, `uuid`, and a capability-specific `device` object; responses preserve the request UUID.

Use semantic commit messages so releases can be generated consistently.
