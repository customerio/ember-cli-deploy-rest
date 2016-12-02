/* jshint node: true */
'use strict';

var Promise   = require('ember-cli/lib/ext/promise');
var path      = require('path');
var fs        = require('fs');

var denodeify = require('rsvp').denodeify;
var readFile  = denodeify(fs.readFile);

var DeployPluginBase = require('ember-cli-deploy-plugin');

module.exports = {
  name: 'ember-cli-deploy-rest',

  createDeployPlugin: function(options) {
    var RestClient = require('./lib/rest-client');

    var DeployPlugin = DeployPluginBase.extend({
      name: options.name,
      defaultConfig: {
        filePattern: 'index.html',
        distDir: function(context) {
          return context.distDir;
        },
        keyPrefix: function(context){
          return context.project.name();
        },
        didDeployMessage: function(context){
          var revisionKey = context.revisionData && context.revisionData.revisionKey;
          var activatedRevisionKey = context.revisionData && context.revisionData.activatedRevisionKey;
          if (revisionKey && !activatedRevisionKey) {
            return 'Deployed but did not activate revision ' + revisionKey + '. '
                 + 'To activate, run: '
                 + 'ember deploy:activate ' + context.deployTarget + ' --revision=' + revisionKey + '\n';
          }
        },
        revisionKey: function(context) {
          return context.commandOptions.revision || (context.revisionData && context.revisionData.revisionKey);
        },
        restClient: function(context) {
          return new RestClient(this);
        },
        revisionData: function(context) {
          return context.revisionData;
        }
      },

      requiredConfig: ['baseUrl', 'username', 'password'],

      upload: function(context) {
        var restClient   = this.readConfig('restClient');
        var revisionKey  = this.readConfig('revisionKey');
        var distDir      = this.readConfig('distDir');
        var filePattern  = this.readConfig('filePattern');
        var keyPrefix    = this.readConfig('keyPrefix');
        var revisionData = this.readConfig('revisionData');
        var filePath     = path.join(distDir, filePattern);

        this.log('Uploading `' + filePath + '`', { verbose: true });
        return this._readFileContents(filePath)
          .then(restClient.upload.bind(restClient, keyPrefix, revisionKey, revisionData))
          .then(this._uploadSuccessMessage.bind(this))
          .then(function(key) {
            return { key: key };
          })
          .catch(this._errorMessage.bind(this));
      },

      willActivate: function(/* context */) {
        var restClient = this.readConfig('restClient');
        var keyPrefix  = this.readConfig('keyPrefix');

        var revisionKey = restClient.activeRevision(keyPrefix);

        return {
          revisionData: {
            previousRevisionKey: revisionKey
          }
        };
      },

      activate: function(/* context */) {
        var restClient  = this.readConfig('restClient');
        var revisionKey = this.readConfig('revisionKey');
        var keyPrefix   = this.readConfig('keyPrefix');

        this.log('Activating revision `' + revisionKey + '`', { verbose: true });
        return Promise.resolve(restClient.activate(keyPrefix, revisionKey))
          .then(this.log.bind(this, '✔ Activated revision `' + revisionKey + '`', {}))
          .then(function(){
            return {
              revisionData: {
                activatedRevisionKey: revisionKey
              }
            };
          })
          .catch(this._errorMessage.bind(this));
      },

      didDeploy: function(/* context */){
        var didDeployMessage = this.readConfig('didDeployMessage');
        if (didDeployMessage) {
          this.log(didDeployMessage);
        }
      },

      fetchInitialRevisions: function(/* context */) {
        var restClient = this.readConfig('restClient');
        var keyPrefix = this.readConfig('keyPrefix');
        this.log('Listing initial revisions for key: `' + keyPrefix + '`', { verbose: true });
        return Promise.resolve(restClient.fetchRevisions(keyPrefix))
          .then(function(revisions) {
            return {
              initialRevisions: revisions
            };
          })
          .catch(this._errorMessage.bind(this));
      },

      fetchRevisions: function(/* context */) {
        var restClient = this.readConfig('restClient');
        var keyPrefix = this.readConfig('keyPrefix');

        this.log('Listing revisions for key: `' + keyPrefix + '`');
        return restClient.fetchRevisions(keyPrefix)
          .catch(this._errorMessage.bind(this));
      },

      _readFileContents: function(path) {
        return readFile(path)
          .then(function(buffer) {
            return buffer.toString();
          });
      },

      _uploadSuccessMessage: function(key) {
        this.log('Uploaded with key `' + key + '`', { verbose: true });
        return Promise.resolve(key);
      },

      _errorMessage: function(error) {
        this.log(error, { color: 'red' });
        return Promise.reject(error);
      }
    });

    return new DeployPlugin();
  }
};
