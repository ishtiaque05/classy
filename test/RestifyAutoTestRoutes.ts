const loadFirst = require('./GlobalSpec');


import BackendServer from "../src/BackendServer";
import Log from "../src/util/Log";
import {Test} from "./GlobalSpec";

import {expect} from "chai";
import "mocha";
import restify = require('restify');

const request = require('supertest');
const https = require('https');


describe('REST Routes for AutoTest', function () {

    var app: restify.Server = null;


    before(function () {
        Log.test('RestifyAutoTestRoutes::before - start');
        var server = new BackendServer(false);

        return server.start().then(function () {
            Log.test('RestifyAutoTestRoutes::before - server started');
            Log.test('orgName: ' + Test.ORGNAME);
            app = server.getServer();
        });
    });

    it('Should respond to a valid defaultDeliverable request', async function () {

        let response = null;
        const url = '/defaultDeliverable/' + Test.ORGNAME;
        try {
            response = await request(app).get(url);
        } catch (err) {
            Log.test('ERROR: ' + err);
        }
        expect(response.status).to.equal(200);
        expect(response.body.delivId).to.not.be.undefined;
        expect(response.body.delivId).to.equal('d0');
        Log.test(response.status + " -> " + response.body.delivId);
    });

    it('Should respond to a valid isStaff request for staff', async function () {

        let response = null;
        const url = '/isStaff/' + Test.ORGNAME + '/rtholmes';
        try {
            response = await request(app).get(url);
        } catch (err) {
            Log.test('ERROR: ' + err);
        }
        expect(response.status).to.equal(200);
        expect(response.body.isStaff).to.not.be.undefined;
        expect(response.body.isStaff).to.be.true;
        Log.test(response.status + " -> " + response.body.isStaff);
    });

    it('Should respond to a valid isStaff request for non-staff', async function () {

        let response = null;
        const url = '/isStaff/' + Test.ORGNAME + '/INVALIDUSERNAME';
        try {
            response = await request(app).get(url);
        } catch (err) {
            Log.test('ERROR: ' + err);
        }
        expect(response.status).to.equal(200);
        expect(response.body.isStaff).to.not.be.undefined;
        expect(response.body.isStaff).to.be.false;
        Log.test(response.status + " -> " + response.body.isStaff);
    });

    it('Should respond to a valid container request for a deliverable', async function () {

        let response = null;
        const url = '/container/' + Test.ORGNAME + '/d0';
        try {
            response = await request(app).get(url);
        } catch (err) {
            Log.test('ERROR: ' + err);
        }
        expect(response.status).to.equal(200);
        expect(response.body.dockerImage).to.not.be.undefined;
        expect(response.body.studentDelay).to.not.be.undefined;
        expect(response.body.maxExecTime).to.not.be.undefined;
        expect(response.body.regressionDelivIds).to.not.be.undefined;
        Log.test(response.status + " -> " + response.body);
    });

    it('Should respond to an invalid container request', async function () {

        let response = null;
        const url = '/container/INVALIDORG/d0';
        try {
            response = await request(app).get(url);
        } catch (err) {
            Log.test('ERROR: ' + err);
        }
        expect(response.status).to.equal(400);
        expect(response.body.message).to.not.be.undefined;
        Log.test(response.status + " -> " + response.body);
    });

});

