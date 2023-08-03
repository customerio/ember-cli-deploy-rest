/* eslint-env node */

var CoreObject = require('core-object');
var Promise = require('rsvp').Promise;
var denodeify = require('rsvp').denodeify;
var request = require('request');

module.exports = CoreObject.extend({
  init: function (options) {
    this._super.apply(this, arguments);

    this._options = options;

    var auth =
      options.useBearerToken === true &&
      options.bearer !== undefined &&
      options.bearer !== null &&
      options.bearer.length !== 0
        ? { bearer: options.bearer }
        : { username: options.username, password: options.password };

    this._request = request.defaults({
      baseUrl: options.baseUrl,
      uri: '',
      auth: auth,
      json: true,
    });
  },

  uploadAppRelease: function (keyPrefix, revisionKey, appName, value) {
    var version = this._uploadKey(keyPrefix, revisionKey);

    var requestBody = {
      id: version,
      body: value,
      app: appName,
    };

    return denodeify(this._request.post)({ body: requestBody }).then(function () {
      return version;
    });
  },

  uploadHydraRelease: function (keyPrefix, revisionKey, value) {
    var version = this._uploadKey(keyPrefix, revisionKey);

    var requestBody = {
      id: version,
      body: value,
    };

    return denodeify(this._request.post)({ body: requestBody }).then(function () {
      return version;
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

  activate: function (keyPrefix, revisionKey, useHydra) {
    return this._listRevisions(keyPrefix, useHydra)
      .then(this._validateRevisionKey.bind(this, keyPrefix, revisionKey))
      .then(this._activateRevision.bind(this, keyPrefix, revisionKey, useHydra));
  },

  fetchRevisions: function (keyPrefix, useHydra) {
    return this._listRevisions(keyPrefix, useHydra).then(function (revisions) {
      return {
        revisions: revisions,
      };
    });
  },

  activeRevision: function (keyPrefix, useHydra) {
    return this._listRevisions(keyPrefix, useHydra).then(function (revisions) {
      var i;

      for (i = 0; i < revisions.length; i++) {
        if (revisions[i].active) {
          return revisions[i].version;
        }
      }
    });
  },

  _listRevisions: function (keyPrefix, useHydra) {
    var qs = {};

    if (keyPrefix) {
      qs.prefix = keyPrefix;
    }

    return denodeify(this._request.get)({ qs: qs }).then(function (response) {
      var responseBody = useHydra ? response.body.filter((rev) => rev.app === 'journeys') : response.body;

      return responseBody.map(function (revision) {
        // ember-cli-deploy-display-revisions expects the timestamp to be either
        // a JS Date object or the number of milliseconds since 1970-01-01T00:00:00
        var revisionData = null;
        if (revision.revision_data) {
          revisionData = Object.assign({}, revision.revision_data, {
            timestamp: new Date(revision.revision_data.timestamp),
          });
        }

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

  _activateRevision: function (keyPrefix, revisionKey, useHydra) {
    var uri = this._uploadKey(keyPrefix, revisionKey);

    if (useHydra) {
      uri = `journeys/${uri}/activate`;
    }

    return denodeify(this._request.put)({ uri });
  },

  _uploadKey: function (keyPrefix, revisionKey) {
    if (keyPrefix) {
      return keyPrefix + ':' + revisionKey;
    } else {
      return revisionKey;
    }
  },
});
