let tempDirectory = process.env["RUNNER_TEMP"] || "";

import * as core from "@actions/core";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import * as fs from "fs";
import * as path from "path";

const IS_WINDOWS = process.platform === "win32";
let OS = IS_WINDOWS ? "windows" : process.platform === "darwin" ? "mac" : "linux";

if (!tempDirectory) {
    let baseLocation;

    if (IS_WINDOWS) {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env["USERPROFILE"] || "C:\\";
    } else if (process.platform === "darwin") {
        baseLocation = "/Users";
    } else {
        baseLocation = "/home";
    }

    tempDirectory = path.join(baseLocation, "actions", "temp");
}

export async function installJDK(
    version: string,
    arch: string,
    source: string,
    sourceType: string,
    archiveBasePath: string,
    useArchiveBasePath: boolean,
    archiveExtension: string,
    targets: string,
    impl: string
): Promise<void> {
    const cacheEntry = `jdk-${version}-${impl}`; // Trick the caching system for more flexibility
    let toolPath = tc.find(cacheEntry, "1.0.0", arch);

    if (toolPath) {
        core.debug(`JDK found in cache: ${toolPath}`);
    } else {
        /*
         * The archiveBasePath is set by default on macOS only, to support OpenJDK builds from Oracle, and OpenJDK and
         * OpenJ9 builds from AdoptOpenJDK (the default source of builds used by install-jdk).
         */
        if (useArchiveBasePath && !archiveBasePath && OS === "mac") archiveBasePath = "/Contents/Home/";

        let jdkFile;
        let jdkDir;
        let compressedFileExtension;

        if (!sourceType) {
            if (source.startsWith("http://") || source.startsWith("https://")) {
                sourceType = "url";
            } else if (source && fs.existsSync(source)) {
                sourceType = "file";
            } else {
                sourceType = "buildType";
            }
        }

        if (sourceType === "url") {
            core.debug(`Attempting to use JDK from URL source: ${source}`);
            if (!archiveExtension) core.error("archiveExtension must be set explicitly when source is an URL");

            core.debug(`Downloading JDK from explicit source: ${source}`);

            jdkFile = await tc.downloadTool(source);
            compressedFileExtension = archiveExtension;
        } else if (sourceType == "file") {
            core.debug(`Attempting to use JDK from file source: ${source}`);

            jdkFile = source;
        } else if (sourceType === "buildType") {
            if (!source) {
                // This should be impossible since source defaults to "releases".
                core.error("Source was not specified for buildType source");
                return;
            }

            let buildType;

            if (source === "releases") {
                buildType = "ga";
            } else if (source === "nightly") {
                buildType = "ea";
            } else {
                core.debug(`Attempting to use unknown buildType source: '${source}'`);
                buildType = source;
            }

            core.debug(`Downloading JDK from AdoptOpenJDK (${buildType})`);
            jdkFile = await tc.downloadTool(`https://api.adoptopenjdk.net/v3/binary/latest/${normalize(version)}/${buildType}/${OS}/${arch}/jdk/${impl}/normal/adoptopenjdk`);

            compressedFileExtension = archiveExtension || IS_WINDOWS ? ".zip" : ".tar";
        } else {
            core.error(`Unsupported sourceType: '${sourceType}'`);
            return;
        }

        compressedFileExtension = compressedFileExtension || getNormalizedCompressedFileExtension(jdkFile);

        let tempDir: string = path.join(tempDirectory, "temp_" + Math.floor(Math.random() * 2000000000));
        jdkDir = await decompressArchive(jdkFile, compressedFileExtension, archiveBasePath, useArchiveBasePath, tempDir);
        toolPath = await tc.cacheDir(
            jdkDir,
            cacheEntry,
            "1.0.0",
            arch
        );
    }

    targets.split(";").forEach(function (value) {
        if (value === "JAVA_HOME") core.addPath(path.join(toolPath, "bin"));
        core.exportVariable(value, toolPath);
    });
}

function getNormalizedCompressedFileExtension(file: string): string {
    if (file.endsWith(".tar") || file.endsWith(".tar.gz")) {
        return ".tar";
    } else if (file.endsWith(".zip")) {
        return ".zip";
    } else {
        return ".7z";
    }
}

async function decompressArchive(
    repoRoot: string,
    fileEnding: string,
    archiveBasePath: string,
    useArchiveBasePath: boolean,
    destinationFolder: string
): Promise<string> {
    await io.mkdirP(destinationFolder);

    const jdkFile = path.normalize(repoRoot);
    const stats = fs.statSync(jdkFile);

    if (stats.isFile()) {
        await extractFiles(jdkFile, fileEnding, destinationFolder);

        let jdkDirectory = path.join(destinationFolder, fs.readdirSync(destinationFolder)[0]);
        if (useArchiveBasePath && archiveBasePath) jdkDirectory = path.join(jdkDirectory, archiveBasePath);

        await unpackJars(jdkDirectory, path.join(jdkDirectory, "bin"));

        return jdkDirectory;
    } else if (stats.isDirectory()) {
        return jdkFile;
    } else {
        throw new Error(`Argument is neither a directory, nor a supported archive: ${jdkFile}`);
    }
}

async function extractFiles(
    file: string,
    fileEnding: string,
    destinationFolder: string
): Promise<void> {
    const stats = fs.statSync(file);
    if (!stats) {
        throw new Error(`Failed to extract ${file} - it doesn"t exist`);
    } else if (stats.isDirectory()) {
        throw new Error(`Failed to extract ${file} - it is a directory`);
    }

    if (fileEnding == ".tar") {
        core.debug(`Decompressing .tar archive: ${file}`);
        await tc.extractTar(file, destinationFolder);
    } else if (fileEnding == ".zip") {
        core.debug(`Decompressing .zip archive: ${file}`);
        await tc.extractZip(file, destinationFolder);
    } else {
        core.debug(`Attempting to decompress unknown archive using 7z: ${file}`);
        await tc.extract7z(file, destinationFolder);
    }
}

// This method recursively finds all .pack files under fsPath and unpacks them with the unpack200 tool
async function unpackJars(fsPath: string, javaBinPath: string) {
    if (fs.existsSync(fsPath)) {
        if (fs.lstatSync(fsPath).isDirectory()) {
            for (const file in fs.readdirSync(fsPath)) {
                const curPath = path.join(fsPath, file);
                await unpackJars(curPath, javaBinPath);
            }
        } else if (path.extname(fsPath).toLowerCase() === ".pack") {
            // Unpack the pack file synchronously
            const p = path.parse(fsPath);
            const toolName = IS_WINDOWS ? "unpack200.exe" : "unpack200";
            const args = IS_WINDOWS ? '-r -v -l ""' : "";
            const name = path.join(p.dir, p.name);
            await exec.exec(`"${path.join(javaBinPath, toolName)}"`, [
                `${args} "${name}.pack" "${name}.jar"`
            ]);
        }
    }
}

function normalize(version: string): string {
    if (version == "1.8") return "8";
    return version;
}