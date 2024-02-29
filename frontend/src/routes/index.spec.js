/* eslint-disable func-names */

const chai = require('chai');
const { expect } = require('chai');
const chaiHTTP = require('chai-http');
const sinon = require('sinon');
const got = require('got');

const app = require('../app');

chai.use(chaiHTTP);

describe('Using APIs', function () {
    it('and stubbing the http call', function (done) {
        const args = {
            title: 'hello',
            body: 'hello',
            userId: 'hello',
        };

        const stub = sinon.stub(got, 'post');

        stub.resolves({
            body: {
                ...args,
            },
        });

        chai.request(app)
            .post('/')
            .send(args)
            .end((error, response) => {
                expect(response.statusCode).to.equal(200);
                expect(response.body).to.be.an('object');
                expect(response).to.have.property('body');
                expect(response.body).to.have.property('title').and.be.equal(args.title);
                expect(response.body).to.have.property('body').and.be.equal(args.body);
                expect(response.body).to.have.property('userId').and.be.equal(args.userId);
                stub.restore();
                done();
            });
    });
    it('and failing the internal HTTP Call', function (done) {
        const args = {
            title: 'hello',
            body: 'hello',
            userId: 'hello',
        };

        const stub = sinon.stub(got, 'post');

        const errorMessage = 'Error occurred';
        stub.rejects(Error(errorMessage));

        chai.request(app)
            .post('/')
            .send(args)
            .end((error, response) => {
                expect(response.statusCode).to.equal(500);
                expect(response.body).to.be.an('object');
                expect(response).to.have.property('body');
                expect(response.body).to.have.property('error');
                expect(response.body.error).to.be.equal(errorMessage);
                stub.restore();
                done();
            });
    });
});
