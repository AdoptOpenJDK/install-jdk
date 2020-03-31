import * as core from "@actions/core";
import * as installer from "./installer";

async function run() {
    try {
        let version = core.getInput("version", { required: true });
        let arch = core.getInput("architecture", { required: false });
        let source = core.getInput("source", { required: false });
        let impl = core.getInput("impl", { required: false });

        let archiveBasePath = core.getInput("archiveBasePath", { required: false });
        let useArchiveBasePath = core.getInput("useArchiveBasePath", { required: false }) != "false";

        let archiveExtension = core.getInput("archiveExtension", { required: false });
        if (archiveExtension
            && archiveExtension != ".zip"
            && archiveExtension != ".tar"
            && archiveExtension != ".7z") {
            core.error(`archiveExtension should be one of [.zip, .tar, .7z]. Found: ${archiveExtension}`);
        }

        let targets = core.getInput("targets", { required: false });

        if (!arch) arch = "x64";
        if (!targets) targets = "JAVA_HOME";
        if (!impl) impl = 'hotspot';

        await installer.installJDK(version, arch, source, archiveBasePath, useArchiveBasePath, archiveExtension, targets, impl);

//        const matchersPath = path.join(__dirname, '..', '.github');
//        console.log(`##[add-matcher]${path.join(matchersPath, 'java.json')}`);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();