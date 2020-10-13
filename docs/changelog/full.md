### 1.1.1

_Released 2020 Oct 13_

#### Fixes

- Fixed deprecation warning for `set-env` command. [[GH-10](https://github.com/AdoptOpenJDK/install-jdk/issues/10)]


---

### 1.1.0

_Released 2020 Apr 10_

#### Improvements

- Clarified `sourceType` inference and added a parameter to explicitly set it.
- Added `buildType` source type to support different JDK build types out of the
  box. [[GH-1](https://github.com/AdoptOpenJDK/install-jdk/issues/1)]
- Added `archiveBasePath` and `useArchiveBasePath` input parameters which allow
  specifying the archive layout for custom JDK sources.

#### Fixes

- JDK for macOS download from AdoptOpenJDK aren't installed properly. [[GH-3](https://github.com/AdoptOpenJDK/install-jdk/issues/3)]
    - The newly added `archiveBasePath` parameter defaults to `/Contents/Home/` on
      macOS to support OpenJDK builds from Oracle, and OpenJDK and OpenJ9 builds
      from AdoptOpenJDK out of the box. 
- Made the toolcache aware of the JDK implementation used (`impl` input
  parameter).


---

### 1.0.0

_Released 2020 Mar 17_

#### Overview

The initial stable release of `install-jdk`. A GitHub Action to automatically
download and setup JDKs for use in workflows.

This action is based on the [actions/setup-java](https://github.com/actions/setup-java)
action by GitHub which works perfectly fine for simple workflows but does not
scale and lacks configurability.

JDKs are downloaded from [AdoptOpenJDK](https://adoptopenjdk.net/).

For usage information please refer to [README.md](/README.md).