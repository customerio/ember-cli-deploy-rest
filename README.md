[![Build Status](https://travis-ci.org/customerio/ember-cli-deploy-rest.svg?branch=master)](https://travis-ci.org/customerio/ember-cli-deploy-rest)

# ember-cli-deploy-rest

An ember-cli-deploy plugin to upload index.html files to a REST API. This is useful if you wrap your Ember app in a traditional web app, such as Rails.

## API requirements

Your REST API should follow the spec below. Note that the base URL is configurable; for these examples we assume it's `https://yourapp.com/ember-revisions`.

- Authenticate with basic auth (please use HTTPS!)
- `GET /ember-revisions`: returns a JSON array of objects for the stored revisions. Fields are `id` (revision key), `created_at` (upload timestamp), `revision_data` (usually contains revision metadata) and `current` (boolean)
- `POST /ember-revisions`: expects a JSON body with fields `id` (revision key) and `body` (the index.html contents)
- `PUT /ember-revisions/<id>`: activates the revision with key `id`

## Quick Start

To get up and running quickly, do the following:

- Ensure [ember-cli-deploy-build][4] is installed and configured.

- Install this plugin

```bash
$ ember install ember-cli-deploy-rest
```

- Place the following configuration into `config/deploy.js`

```javascript
ENV.rest = {
  baseUrl: 'https://yourapp.com/ember-revisions',
  username: '<your-deploy-username>'
  password: '<your-deploy-password>'
}
```

- Run the pipeline

```bash
$ ember deploy
```

## ember-cli-deploy Hooks Implemented

For detailed information on what plugin hooks are and how they work, please refer to the [Plugin Documentation][2].

- `upload`
- `willActivate`
- `activate`
- `didDeploy`
- `fetchInitialRevisions`
- `fetchRevisions`

## TODO

- [ ] Better tests for `upload` hook
- [ ] Add unit tests for `activate` and `fetchRevisions` hooks
- [ ] Add HTTP-mocked tests for REST client

See the [Contributing](CONTRIBUTING.md) guide for details.

## Credits

Inspired by and based on [ember-cli-redis](https://github.com/ember-cli-deploy/ember-cli-deploy-redis) by Aaron Chambers and the ember-cli-deploy team. Thanks!
