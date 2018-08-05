import {expect} from "chai";
import "mocha";
import {AutoTestResultTransport} from "../../../../common/types/PortalTypes";
import {ResultsController} from "../../src/controllers/ResultsController";
import {Test} from "../GlobalSpec";

const loadFirst = require('../GlobalSpec');
const loadSecond = require('./CourseControllerSpec'); // make sure it runs before github controller (which should be last of the controllers)

describe("ResultController", () => {

    let rc: ResultsController;

    before(async () => {
    });

    beforeEach(() => {
        rc = new ResultsController();
    });

    it("Should be able to get all results, even if there are none.", async () => {
        let results = await rc.getAllResults();
        expect(results).to.have.lengthOf(0);
    });

    it("Should be able to save a result.", async () => {
        let results = await rc.getAllResults();
        expect(results).to.have.lengthOf(0);

        // const fullPath = __dirname + "/../../../../autotest/test/githubAutoTestData/outputRecords.json";
        // let data = fs.readJSONSync(fullPath);
        // let output = await rc.createResult(data[0]);
        // public static getResult(delivId: string, repoId: string, people: string[], score: number): Result {
        const result = Test.getResult(Test.DELIVID0, Test.REPONAME1, [Test.USERNAME1], 50);
        let output = await rc.createResult(result);
        expect(output).to.be.true;

        results = await rc.getAllResults();
        expect(results).to.have.lengthOf(1);
    });

    it("Should be able to invalidate bad results.", async () => {
        let deliv = await rc.validateAutoTestResult(undefined);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        deliv = await rc.validateAutoTestResult(null);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        let data: AutoTestResultTransport = {} as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {delivId: 'd0'} as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {delivId: 'd0', repoId: 'r1'} as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {delivId: 'd0', repoId: 'r1', commitURL: 'url'}as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {delivId: 'd0', repoId: 'r1', commitURL: 'url', commitSHA: 'sha'}as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {delivId: 'd0', repoId: 'r1', commitURL: 'url', commitSHA: 'sha', input: {}}as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {timestamp: Date.now()}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {timestamp: Date.now(), postbackOnComplete: false}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {timestamp: Date.now(), postbackOnComplete: false, attachments: []}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {timestamp: Date.now(), postbackOnComplete: false, attachments: [], state: 'SUCCESS'}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {timestamp: Date.now(), postbackOnComplete: false, attachments: [], state: 'SUCCESS', custom: {}}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        data = {
            delivId:   'd0',
            repoId:    'r1',
            commitURL: 'url',
            commitSHA: 'sha',
            input:     {delivId: 'd0', pushInfo: {}},
            output:    {timestamp: Date.now(), postbackOnComplete: false, attachments: [], state: 'SUCCESS', custom: {}, report: {}}
        }as AutoTestResultTransport;
        deliv = await rc.validateAutoTestResult(data);
        expect(deliv).to.not.be.null;
        expect(deliv).to.be.an('string');

        // more here
    });

});
