beforeEach(window.module(function($provide) {
    $provide.constant('lodash', window._);
}));

beforeEach(window.module('superdesk.mocks'));
beforeEach(window.module('superdesk.session'));
beforeEach(window.module('superdesk.services.storage'));

/**
 * Mock services that call server on init and thus would require mocking all the time
 */
angular.module('superdesk.mocks', [])
    .constant('config', {
        server: {url: null},
        editor: {},
        model: {
            dateformat: 'DD/MM/YYYY',
            timeformat: 'HH:mm:ss'
        },
        requiredMediaMetadata: ['headline', 'description_text', 'alt_text']
    })
    .service('features', function() {})
    .service('preferencesService', function($q) {
        this.mock = true;

        this.get = function() {
            return $q.when(null);
        };

        this.getActions = function() {
            return $q.when([]);
        };

        this.update = function() {
            return $q.when(null);
        };

        this.getPrivileges = function() {
            return $q.when({});
        };
    })
    .service('beta', function($q) {
        this.isBeta = function() {
            return $q.when(false);
        };
    });
