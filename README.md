# install-jdk

An action to download and install JDKs for use in workflows.

This action is based on the [actions/setup-java](https://github.com/actions/setup-java)
action by GitHub which works perfectly fine for simple workflows but does not
scale and lacks configurability.

JDKs are downloaded from [AdoptOpenJDK](https://adoptopenjdk.net/).


## Usage

See [action.yml](action.yml)

#### Basic

```
steps:
- uses: actions/checkout@v1
- uses: AdoptOpenJDK/install-jdk@v1
  with:
    version: '13'
    architecture: x64
```

#### Multiple JDKs

Some projects may require multiple JDK versions to build. `install-jdk` supports
installing JDKs to one (or more) given `target` environment variables.

```
- uses: AdoptOpenJDK/install-jdk@v1
  with:
    version: '8'
    architecture: x64
- uses: AdoptOpenJDK/install-jdk@v1
  with:
    version: '13'
    architecture: x64
    targets: 'JDK_13'
```


### Configuration:

| Parameter            | Default                        |
|----------------------|--------------------------------|
| `version`            |                                |
| `architecture`       | `x64`                          |
| `source`             | `releases`                     |
| `sourceType`         |                                |
| `archiveBasePath`    | `/Contents/Home/` (macOS only) |
| `useArchiveBasePath` | `true`                         |
| `archiveExtension`   |                                |
| `targets`            | `JAVA_HOME`                    |
| `impl   `            | `hotspot`                      |

#### `version`

The Java version to install a JDK for. (Supported values are: `1.8`, `8`, `9`,
`10`, `11`, `12`, `13`, ...)

By default, this action will try to install the latest JDK release for the
specified version from AdoptOpenJDK. Alternatively, a `source` can be specified
explicitly.

The `version` key should be set accordingly for custom downloads since it is
used to cache JDKs which are used multiple times during the workflow.

#### `architecture`

The target architecture of the JDK to install.

Defaults to `x64`.

#### `source`

A custom source for a JDK. (See `sourceType` for supported values.)

#### `sourceType`

The type of the `source` parameter. Supported source types are:

- `url` - HTTP and HTTPS URL sources
- `file` - local directories, or compressed archives
- `buildType` - AdoptOpenJDK build types ("nightly", or "releases".)

The property may be set to empty, to automatically infer the type. The inferred
type is:

1. `url`, if `source` starts with "http://" or "https://",
2. `file`, if `source` resembles a valid local file path and the file exists, 
3. or `buildType` otherwise.

#### `archiveBasePath`

install-jdk expects a single top-level folder in archive packages. This property
may be used to specify the subdirectory of said folder in which the JDK resides.
This must be empty, or a `/`-separated path.

By default, this property is set to `/Contents/Home/` on macOS only to support
OpenJDK builds from Oracle, and OpenJDK and OpenJ9 builds from AdoptOpenJDK
out of the box.

When using builds from other sources, it may be necessary to disable use of this
property since the action cannot differentiate between empty and unspecified
parameters. (See `useArchiveBasePath`.)

#### `useArchiveBasePath`

Disables use of the `archiveBasePath` property. This must be a boolean value.

Build archives from custom other may have different directory structures for
which the default configuration would fail.
E.g.: For Azul's Zulu builds it should be set to false (`useArchiveBasePath : 'false'`).

#### `archiveExtension`

The extension of the JDK archive. (Supported values are: `.zip`, `.tar`, `.7z`)

Specifying this property is required when a custom `source` is set.

#### `targets`

A semicolon-separated list of environment variables which will be set up to
point to the installation directory of the JDK.

By default, this is set to `JAVA_HOME`. Keep in mind that this is overwritten
when specifying targets explicitly. Thus, if you want to make a JDK available
from - say - `JDK_X` and `JAVA_HOME`, you would need to specify:

    targets: 'JDK_X;JAVA_HOME'

#### `impl`

JVM implementation. (Supported values are: `hotspot`, `openj9`)