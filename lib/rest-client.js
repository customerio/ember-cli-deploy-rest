var CoreObject = require('core-object');
var Promise    = require('ember-cli/lib/ext/promise');
var denodeify  = require('rsvp').denodeify;
var request    = require('request');

module.exports = CoreObject.extend({
  init: function(options) {
    this._super.apply(this, arguments);

    this._options = options;
    this._request = request.defaults({
      baseUrl: options.baseUrl,
      uri: '',
      auth: {
        username: options.username,
        password: options.password
      },
      json: true
    });
  },

  upload: function(keyPrefix, revisionKey, revisionData, value) {
    var uploadKey = keyPrefix + ':' + revisionKey;
    var requestBody = {
      id: uploadKey,
      body: value
    };

    if(revisionData) {
      requestBody.revision_data = JSON.stringify(revisionData);
    }

    return denodeify(this._request.post)({ body: requestBody })
      .then(function() {
        return uploadKey;
      });
  },

  activate: function(keyPrefix, revisionKey) {
    return this._listRevisions(keyPrefix)
      .then(this._validateRevisionKey.bind(this, keyPrefix, revisionKey))
      .then(this._activateRevision.bind(this, keyPrefix, revisionKey));
  },

  fetchRevisions: function(keyPrefix) {
    return this._listRevisions(keyPrefix).then(function(revisions) {
      return {
        revisions: revisions
      };
    });
  },

  activeRevision: function(keyPrefix) {
    return this._listRevisions(keyPrefix).then(function(revisions) {
      var i;

      for (i = 0; i < revisions.length; i++) {
        if (revisions[i].active) {
          return revision.version;
        }
      }
    });
  },

  _listRevisions: function(keyPrefix) {
    var qs = { prefix: keyPrefix };

    return denodeify(this._request.get)({ qs: qs })
      .then(function(response) {
        return response.body.map(function(revision) {
          return {
            revision: revision.id,
            revision_data: JSON.parse(revision.revision_data || '{}'),
            timestamp: new Date(revision.created_at),
            active: revision.current
          };
        });
      });
  },

  _validateRevisionKey: function(keyPrefix, revisionKey, revisions) {
    var uploadKey = keyPrefix + ':' + revisionKey;
    var isPresent = revisions.some(function(revision) {
      return revision.revision === uploadKey;
    });

    return isPresent ? Promise.resolve() : Promise.reject('`' + uploadKey + '` is not a valid revision key');
  },

  _activateRevision: function(keyPrefix, revisionKey) {
    var uploadKey = keyPrefix + ':' + revisionKey;

    return denodeify(this._request.put)({ uri: uploadKey });
  }
});
