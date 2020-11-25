/* eslint-env node */
'use strict';

const RSVP = require('rsvp');
const assert = require('../helpers/assert');
const subject = require('../../index');

const Promise = RSVP.Promise;

const stubProject = {
  name() {
    return 'my-project';
  },
};

describe('ember-cli-deploy-rest', function () {
  let mockUi;

  beforeEach(function () {
    mockUi = {
      verbose: true,
      messages: [],
      write: function () {},
      writeLine: function (message) {
        this.messages.push(message);
      },
    };
  });

  it('has a name', function () {
    let result = subject.createDeployPlugin({
      name: 'rest',
    });

    assert.equal(result.name, 'rest');
  });

  it('implements the correct hooks', function () {
    let plugin = subject.createDeployPlugin({
      name: 'rest',
    });
    assert.ok(plugin.upload);
    assert.ok(plugin.activate);
    assert.ok(plugin.didDeploy);
    assert.ok(plugin.fetchRevisions);
    assert.ok(plugin.willActivate);
  });

  describe('upload hook', function () {
    let plugin = null;
    let context = null;

    it('calls the hook', function () {
      plugin = subject.createDeployPlugin({ name: 'rest' });
      context = {
        ui: mockUi,
        project: stubProject,
        config: {
          rest: {
            keyPrefix: 'test-prefix',
            distDir: 'tests',
            filePattern: 'index.html',
            baseUrl: 'http://localhost/indices',
            username: 'user',
            password: 'secret',
            revisionKey: '123abc',
            restClient: function () {
              return {
                upload: function (keyPrefix, revisionKey) {
                  return Promise.resolve(keyPrefix + ':' + revisionKey);
                },
              };
            },
          },
        },
      };
      plugin.beforeHook(context);
      plugin.configure(context);

      return assert.isFulfilled(plugin.upload(context)).then(function (result) {
        assert.deepEqual(result, { key: 'test-prefix:123abc' });
      });
    });
  });
});
