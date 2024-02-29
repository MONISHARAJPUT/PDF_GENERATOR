/* eslint-disable func-names */

const { expect } = require('chai');
const sinon = require('sinon');
const got = require('got');

const httpOperations = require('.');

describe('Making a http call', function () {
    it('with fake data should return back a response', function (done) {
        const args = {
            title: 'hello',
            body: 'hello',
            userId: 123,
        };

        const stub = sinon.stub(got, 'post');
        stub.resolves({
            body: {
                ...args,
            },
        });

        httpOperations.makeHttpCall(args).then((response) => {
            expect(response).to.have.property('body').and.be.equal(args.body);
            stub.restore();
            done();
        });
    });
    it('and handling errors', function (done) {
        const args = {
            title: 'hello',
            body: 'hello',
            userId: 123,
        };

        const errorMessage = 'Bad Request';

        const stub = sinon.stub(got, 'post');
        stub.rejects(Error(errorMessage));

        httpOperations.makeHttpCall(args).catch((error) => {
            expect(error).to.have.property('message').and.be.equal(errorMessage);
            stub.restore();
            done();
        });
    });
});
