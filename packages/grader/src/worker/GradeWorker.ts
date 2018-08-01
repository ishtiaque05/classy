import * as fs from "fs-extra";
import {IDockerContainer} from "../docker/DockerContainer";
import {Repository} from "../git/Repository";
import Log from "../../../common/Log";
import {IContainerInput, IContainerOutput} from "../../../common/types/AutoTestTypes";
import {Workspace} from "../storage/Workspace";

export interface IGradeWorker {
    execute(): Promise<IContainerOutput>;
}

export class GradeWorker implements IGradeWorker {
    private readonly input: IContainerInput;
    private readonly workspace: Workspace;
    private readonly container: IDockerContainer;
    private readonly repo: Repository;
    private containerState: string;

    constructor(input: IContainerInput, workspace: Workspace, container: IDockerContainer, repo: Repository) {
        this.input = input;
        this.workspace = workspace;
        this.container = container;
        this.repo = repo;
    }

    public async execute(): Promise<IContainerOutput> {
        Log.info("GradeTask::execute() - start");
        const out: IContainerOutput = {
            timestamp: Date.now(),
            report: {
                scoreOverall: 0,
                scoreCover:   null,
                scoreTest:    null,
                feedback:     'Internal error: The grading service failed to handle the request.',
                passNames:    [],
                skipNames:    [],
                failNames:    [],
                errorNames:   [],
                custom:       {}
            },
            postbackOnComplete: false,
            custom: {},
            attachments: [],
            state: "FAIL"
        };

        try {
            await this.workspace.mkdir("output");

            Log.trace("GraderWorker::execute() - Clone repo " +
                this.input.pushInfo.cloneURL.match(/\/(.+)\.git/)[0] + " and checkout " +
                this.input.pushInfo.commitSHA.substring(0,6) + "."
            );
            const sha = await this.prepareRepo(this.input.pushInfo.cloneURL, `${this.workspace.rootDir}/assn`, this.input.pushInfo.commitSHA);

            if (this.input.pushInfo.commitSHA !== sha) {
                Log.warn("GradeTask::execute() - Failed to checkout commit. Requested: " +
                    this.input.pushInfo.commitSHA + " Actual: " + sha + ". Continuing to grade but results will likely" +
                    "be wrong.");
            }

            // Change the permissions so that the grading container can read the files.
            await this.workspace.chown();

            Log.trace("GradeTask::execute() - Create grading container.");
            //const container: IDockerContainer = new DockerContainer(this.input.containerConfig.dockerImage);
            try {
                // We set the custom field in the constructor.
                await this.container.create(this.input.containerConfig.custom);

                Log.trace("GradeTask::execute() - Start grading container " + this.container.shortId);
                const exitCode = await this.runContainer(this.container);
                Log.trace("GradeTask::execute() - Container " + this.container.shortId + " exited with code " +
                    exitCode + ".");

                Log.trace("GradeTask::execute() - Write log for container " + this.container.shortId + " to " +
                    this.workspace + "/" + "stdio.txt");
                const [, log] = await this.container.logs();
                await fs.writeFile(`${this.workspace.rootDir}/stdio.txt`, log);

                if (this.containerState === "TIMEOUT") {
                    out.report.feedback = "Container did not complete in the allotted time.";
                    out.postbackOnComplete = true;
                    out.state = "TIMEOUT";
                } else {
                    try {
                        out.report = await fs.readJson(`${this.workspace.rootDir}/output/report.json`);
                        out.postbackOnComplete = exitCode !== 0;
                        out.state = "SUCCESS";
                    } catch (err) {
                        Log.error(`GradeWorker::execute() - ERROR Reading grade report file produced be grading container ${this.container.shortId}. ${err}`);
                        out.report.feedback = "Failed to read grade report.";
                        out.state = "INVALID_REPORT";
                    }
                }
            } catch (err) {
                Log.error(`GradeWorker::execute() - ERROR Running grading container. ${err}`);
            } finally {
                try {
                    Log.trace("GradeTask::execute() - Remove container " + this.container.should);
                    await this.container.remove();
                } catch (err) {
                    Log.warn("GradeTask::execute() - Failed to remove container " + this.container.shortId + ". " + err);
                }
            }
        } catch (err) {
            Log.warn(`GradeWorker::execute() - ERROR Processing ${this.input.pushInfo.commitSHA.substring(0,6)}. ${err}`);
        } finally {
            try {
                Log.trace("GradeTask::execute() - Remove cloned repo.");
                await this.workspace.rmdir("assn");
            } catch (err) {
                Log.warn("GradeTask::execute() - Failed to remove cloned repo " + this.workspace.rootDir + "/assn. " + err);
            }
        }

        out.timestamp = Date.now();
        return out;
    }

    protected async prepareRepo(url: string, dir: string, ref?: string): Promise<string> {
        await this.repo.clone(url, dir);
        if (typeof ref !== "undefined") {
            await this.repo.checkout(ref);
        }
        return this.repo.getSha();
    }

    protected async runContainer(container: IDockerContainer): Promise<number> {
        await container.start();

        // Set a timer to kill the container if it doesn't finish in the allotted time
        let didFinish = false;
        if (this.input.containerConfig.maxExecTime > 0) {
            setTimeout(async () => {
                if (!didFinish) {
                    Log.trace("GradeTask::runContainer(..) - Container " + container.shortId +
                        " was stopped after exceeding maxExecTime.");
                    this.containerState = "TIMEOUT";
                    const [exitCode, ] = await container.stop();
                    return exitCode;
                }
            }, this.input.containerConfig.maxExecTime);
        }

        // cmdOut is the exit code from the container
        const [, cmdOut] = await container.wait();
        didFinish = true;
        return Number(cmdOut);
    }

    // protected async runContainer(out: IContainerOutput): Promise<IContainerOutput> {
    //     const cntr: IDockerContainer = new DockerContainer(this.input.containerConfig.dockerImage);
    //
    //     let containerState: string;
    //
    //     try {
    //
    //         // We set the custom field in the constructor.
    //         await cntr.create(this.input.containerConfig.custom);
    //         await cntr.start();
    //         const [, cntrAddr] = await cntr.inspect("{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}");
    //
    //         Log.info(`Container ${cntr.id.substring(0, 7)} started with IP ${cntrAddr}`);
    //
    //         Log.info("Register timeout");
    //         // Set a timer to kill the container if it doesn't finish in the time alloted
    //         let didFinish = false;
    //         let didTimeout = false;
    //         if (this.input.containerConfig.maxExecTime > 0) {
    //             setTimeout(async () => {
    //                 if (!didFinish) {
    //                     didTimeout = true;
    //                     await cntr.stop();
    //                 }
    //             }, this.input.containerConfig.maxExecTime);
    //         }
    //
    //         const [, cmdOut] = await cntr.wait();
    //         const cntrCode = Number(cmdOut);
    //         Log.info("Container done with code " + cntrCode);
    //         didFinish = true;
    //         if (didTimeout) {
    //             containerState = "TIMEOUT";
    //         }
    //         let [, log] = await cntr.logs();
    //         await fs.writeFile(`${this.workspace}/stdio.txt`, log);
    //
    //         try {
    //             if (containerState === "TIMEOUT") {
    //                 out.report.feedback = "Container did not complete in the allotted time.";
    //                 out.postbackOnComplete = true;
    //                 out.containerState = "TIMEOUT";
    //             } else {
    //                 const report: IGradeReport = await fs.readJson(`${this.workspace}/output/report.json`);
    //                 out.report = report;
    //                 out.postbackOnComplete = cntrCode !== 0;
    //                 out.containerState = "SUCCESS";
    //             }
    //         } catch (err) {
    //             Log.warn(`RouteHandler::postGradingTask(..) - ERROR Reading grade report. ${err}`);
    //             out.report.feedback = "Failed to read grade report.";
    //             out.containerState = "INVALID_REPORT";
    //         }
    //     } catch (err) {
    //         Log.warn(`RouteHandler::postGradingTask(..) - ERROR Processing commit ${this.input.pushInfo.commitSHA}. ${err}`);
    //         out.report.feedback = "Error running container.";
    //         out.containerState = "FAIL";
    //     } finally {
    //         cntr.remove();
    //     }
    //
    //     return out;
    // }

    // protected async preRun(): Promise<void> {
    //     Log.info(`GradeTask::preRun() - Start`);
    //     const assnUrl = this.input.pushInfo.cloneURL;
    //     const assnDir = `${this.workspace}/assn`;
    //     const assnRef = this.input.pushInfo.commitSHA;
    //
    //     await fs.mkdirp(`${this.workspace}/output`);
    //     const assnRepo = await this.prepareRepo(assnUrl, assnDir, assnRef);
    //     await new Promise((resolve, reject) => {
    //         Log.trace(`GradeTask::preRun() - Changing ownership of ${this.workspace} to ${this.uid}.`);
    //         exec(`chown -R ${this.uid} ${this.workspace}`, (error) => {
    //             if (error) {
    //                 Log.error("GradeTask::preRun() - Failed to change owner. " + error);
    //                 reject(error);
    //             }
    //             resolve();
    //         });
    //     });
    // }
    //
    // protected async postRun(): Promise<void> {
    //     Log.info(`GradeTask::postRun() - Start`);
    //     return fs.remove(`${this.workspace}/assn`);
    // }
}
