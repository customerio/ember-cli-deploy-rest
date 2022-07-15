/* eslint-env node */

var CoreObject = require('core-object');
var Promise = require('rsvp').Promise;
var denodeify = require('rsvp').denodeify;
var request = require('request');

module.exports = CoreObject.extend({
  init: function (options) {
    this._super.apply(this, arguments);

    this._options = options;
    this._request = request.defaults({
      baseUrl: options.baseUrl,
      uri: '',
      auth: {
        username: options.username,
        password: options.password,
      },
      json: true,
    });
  },

  upload: function (keyPrefix, revisionKey, revisionData, value) {
    var uploadKey = this._uploadKey(keyPrefix, revisionKey);

    var requestBody = {
      id: uploadKey,
      body: value,
    };

    if (revisionData) {
      requestBody.revision_data = revisionData;
    }

    return denodeify(this._request.post)({ body: requestBody }).then(function () {
      return uploadKey;
    });
  },

  activate: function (keyPrefix, revisionKey) {
    return this._listRevisions(keyPrefix)
      .then(this._validateRevisionKey.bind(this, keyPrefix, revisionKey))
      .then(this._activateRevision.bind(this, keyPrefix, revisionKey));
  },

  fetchRevisions: function (keyPrefix) {
    return this._listRevisions(keyPrefix).then(function (revisions) {
      return {
        revisions: revisions,
      };
    });
  },

  activeRevision: function (keyPrefix) {
    return this._listRevisions(keyPrefix).then(function (revisions) {
      var i;

      for (i = 0; i < revisions.length; i++) {
        if (revisions[i].active) {
          return revisions[i].version;
        }
      }
    });
  },

  _listRevisions: function (keyPrefix) {
    var qs = {};

    if (keyPrefix) {
      qs.prefix = keyPrefix;
    }

    return denodeify(this._request.get)({ qs: qs }).then(function (response) {
      return response.body.map(function (revision) {
        // ember-cli-deploy-display-revisions expects the timestamp to be either
        // a JS Date object or the number of milliseconds since 1970-01-01T00:00:00
        var revisionData = Object.assign({}, revision.revision_data, {
          timestamp: new Date(revision.revision_data.timestamp),
        });

        return {
          revision: revision.id,
          revisionData: revisionData,
          timestamp: new Date(revision.created_at * 1000),
          active: revision.current,
        };
      });
    });
  },

  _validateRevisionKey: function (keyPrefix, revisionKey, revisions) {
    var uploadKey = this._uploadKey(keyPrefix, revisionKey);
    var isPresent = revisions.some(function (revision) {
      return revision.revision === uploadKey;
    });

    return isPresent ? Promise.resolve() : Promise.reject('`' + uploadKey + '` is not a valid revision key');
  },

  _activateRevision: function (keyPrefix, revisionKey) {
    var uploadKey = this._uploadKey(keyPrefix, revisionKey);

    return denodeify(this._request.put)({ uri: uploadKey });
  },

  _uploadKey: function (keyPrefix, revisionKey) {
    if (keyPrefix) {
      return keyPrefix + ':' + revisionKey;
    } else {
      return revisionKey;
    }
  },
});
