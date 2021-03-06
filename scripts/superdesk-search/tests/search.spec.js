'use strict';

describe('search service', function() {
    beforeEach(window.module('superdesk.templates-cache'));
    beforeEach(window.module('superdesk.search'));

    it('can create base query', inject(function(search, session) {
        session.identity = {_id: 'foo'};
        var query = search.query();
        var criteria = query.getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({not: {term: {state: 'spiked'}}});
        expect(filters).toContain({not: {and: [{term: {package_type: 'takes'}}, {term: {_type: 'archive'}}]}});
        expect(filters).toContain({not: {and: [{term: {_type: 'published'}},
                {term: {package_type: 'takes'}},
                {term: {last_published_version: false}}]}});
        expect(criteria.sort).toEqual([{versioncreated: 'desc'}]);
    }));

    it('can create query string query', inject(function($rootScope, search, session) {
        session.identity = {_id: 'foo'};
        var criteria = search.query({q: 'test'}).getCriteria();
        expect(criteria.query.filtered.query.query_string.query).toBe('test');
    }));

    it('can create query for from_desk', inject(function($rootScope, search, session) {
        // only from desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({from_desk: 'test-authoring'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'task.last_authoring_desk': 'test'}});
        criteria = search.query({from_desk: 'test-production'}).getCriteria();
        filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'task.last_production_desk': 'test'}});
    }));

    it('can create query for to_desk', inject(function($rootScope, search, session) {
        // only to desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({to_desk: '456-authoring'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'task.desk': '456'}});
        expect(filters).toContain({exists: {field: 'task.last_production_desk'}});
        criteria = search.query({to_desk: '456-production'}).getCriteria();
        filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'task.desk': '456'}});
        expect(filters).toContain({exists: {field: 'task.last_authoring_desk'}});
    }));

    it('can create query for from_desk and to_desk', inject(function($rootScope, search, session) {
        // both from desk and to desk are specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({from_desk: '123-authoring', to_desk: '456-production'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'task.last_authoring_desk': '123'}});
        expect(filters).toContain({term: {'task.desk': '456'}});
    }));

    it('can create query for original_creator', inject(function($rootScope, search, session) {
        // only to desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({original_creator: '123'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'original_creator': '123'}});
    }));

    it('can create query for ingest provider', inject(function($rootScope, search, session) {
        // only to desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({ingest_provider: '123'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'ingest_provider': '123'}});
    }));

    it('can create query for unique_name', inject(function($rootScope, search, session) {
        // only to desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({unique_name: '123'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({term: {'unique_name': '123'}});
    }));

    it('can sort items', inject(function(search, $location, $rootScope) {
        search.setSort('urgency');
        $rootScope.$digest();
        expect($location.search().sort).toBe('urgency:desc');
        expect(search.getSort()).toEqual({label: 'Urgency', field: 'urgency', dir: 'desc'});

        search.toggleSortDir();
        $rootScope.$digest();
        expect(search.getSort()).toEqual({label: 'Urgency', field: 'urgency', dir: 'asc'});
    }));

    it('can be watched for changes', inject(function(search, $rootScope, session) {
        session.identity = {_id: 'foo'};
        var criteria = search.query().getCriteria();
        expect(criteria).toEqual(search.query().getCriteria());
        expect(criteria).not.toEqual(search.query({q: 'test'}).getCriteria());
    }));

    it('can merge items', inject(function(search) {
        var nextItems;

        nextItems = search.mergeItems({_items: [{_id: 'foo'}]});
        expect(nextItems._items.length).toBe(1);

        nextItems = search.mergeItems({_items: [{_id: 'foo'}]}, {_items: [{_id: 'bar'}]});
        expect(nextItems._items.length).toBe(1);
        expect(nextItems._items[0]._id).toBe('foo');

        nextItems = search.mergeItems({_items: [{_id: 'foo'}]}, {_items: [{_id: 'bar'}]}, true);
        expect(nextItems._items.length).toBe(2);
        expect(nextItems._items[0]._id).toBe('bar');
        expect(nextItems._items[1]._id).toBe('foo');

        // return newItems when forced
        nextItems = search.mergeItems({_items: [{_id: 'foo'}]}, {_items: [{_id: 'bar'}]}, null, true);
        expect(nextItems._items.length).toBe(1);
        expect(nextItems._items[0]._id).toBe('foo');

        // can merge content updates from matching newItem
        nextItems = search.mergeItems({_items: [{_id: 'foo', _current_version: 2, slugline: 'slugline updated'}]},
            {_items: [{_id: 'foo', _current_version: 1, slugline: 'slugline'}]}, null, false);
        expect(nextItems._items.length).toBe(1);
        expect(nextItems._items[0].slugline).toBe('slugline updated');

    }));

    it('can evalute canShowRefresh for refresh button display', inject(function(search) {
        var newItems, scopeItems, scrollTop, isItemPreviewing, _data;
        newItems = {_items: [{_id: 'foo', _current_version: 1}]};
        scopeItems = {_items: [{_id: 'bar', _current_version: 1}]};
        // consider item is not currently previewing but scroll is not on top.
        scrollTop = 50;

        _data = prepareData(newItems, scopeItems, scrollTop, isItemPreviewing);
        expect(search.canShowRefresh(_data)).toBe(true);

        // consider published item ids are same, but version is different as in case of take/update.
        newItems = {_items: [{_id: 'foo', _current_version: 1, _type: 'published'}]};
        scopeItems = {_items: [{_id: 'foo', _current_version: 2, _type: 'published'}]};
        // consider scroll on Top but item is currently previewing.
        scrollTop = 0;
        isItemPreviewing = true;

        _data = prepareData(newItems, scopeItems, scrollTop, isItemPreviewing);
        expect(search.canShowRefresh(_data)).toBe(true);

        // consider newItems and scopeItems are same and scroll is on top and no item is currently previewing.
        newItems = {_items: [{_id: 'foo', _current_version: 1}]};
        scopeItems = {_items: [{_id: 'foo', _current_version: 1}]};

        _data = prepareData(newItems, scopeItems, scrollTop, isItemPreviewing);
        expect(search.canShowRefresh(_data)).toBe(undefined);

    }));

    it('can create query for notdesk facet', inject(function($rootScope, search, session) {
        // only to desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({notdesk: '["123"]'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({not: {terms: {'task.desk': ['123']}}});
    }));

    it('can create query for noturgency facet', inject(function($rootScope, search, session) {
        // only to desk is specified
        session.identity = {_id: 'foo'};
        var criteria = search.query({noturgency: '["1"]'}).getCriteria();
        var filters = criteria.query.filtered.filter.and;
        expect(filters).toContain({not: {terms: {urgency: ['1']}}});
    }));

    function prepareData(newItems, scopeItems, scrollTop, isItemPreviewing) {
        return {
            newItems: newItems,
            scopeItems: scopeItems,
            scrollTop: scrollTop,
            isItemPreviewing: isItemPreviewing
        };
    }

    describe('multi action bar directive', function() {

        var scope;

        beforeEach(window.module('superdesk.archive'));
        beforeEach(window.module('superdesk.packaging'));
        beforeEach(window.module('superdesk.authoring.multiedit'));

        beforeEach(inject(function($rootScope, $compile) {
            var elem = $compile('<div sd-multi-action-bar></div>')($rootScope.$new());
            scope = elem.scope();
            scope.$digest();
        }));

        it('can show how many items are selected', inject(function() {
            expect(scope.multi.count).toBe(0);

            scope.multi.toggle({_id: 1, selected: true});
            expect(scope.multi.count).toBe(1);

            scope.multi.reset();
            expect(scope.multi.count).toBe(0);
        }));

        it('can trigger multi editing', inject(function(multiEdit) {
            spyOn(multiEdit, 'create');
            spyOn(multiEdit, 'open');

            scope.multi.toggle({_id: 'foo', selected: true});
            scope.multi.toggle({_id: 'bar', selected: true});

            scope.action.multiedit();
            expect(multiEdit.create).toHaveBeenCalledWith(['foo', 'bar']);
            expect(multiEdit.open).toHaveBeenCalled();
        }));
    });
});

describe('sdSearchPanel directive', function () {
    var desks,
        facetsInit,
        fakeApi,
        fakeMetadata,
        isoScope,
        $element;  // directive's DOM element

    beforeEach(window.module(
        'superdesk.authoring.metadata',
        'superdesk.searchProviders',
        'superdesk.search',
        'superdesk.templates-cache'  // needed so that directive's template is placed into
                     // $templateCache, avoiding the "Unexpected request" error
    ));

    /**
     * Mock some of the dependencies of the parent directives.
     */
    beforeEach(window.module(function ($provide) {
        $provide.constant('config', {
            model: {
                timeformat: 'HH:mm:ss',
                dateformat: 'DD/MM/YYYY'
            },
            view: {
                timeformat: 'HH:mm',
                dateformat: 'MM/DD/YYYY'
            },
            defaultTimezone: 'Europe/London',
            server: {url: undefined}
        });

        fakeApi = {
            ingestProviders: {
                query: jasmine.createSpy()
            }
        };

        fakeMetadata = {
            values: {subjectcodes: []},
            fetchSubjectcodes: jasmine.createSpy()
        };

        $provide.value('metadata', fakeMetadata);
    }));

    /**
     * Mock some of the dependencies of the tag service
     */
    beforeEach(inject(function($q) {
        fakeMetadata.fetchSubjectcodes.and.returnValue($q.when());
    }));

    /**
     * Mock even more dependencies and compile the directive under test.
     */
    beforeEach(inject(function (
        $templateCache, $compile, $rootScope, $q, _desks_, tags, search
    ) {
        var html,
            scope;

        // more services mocking...
        spyOn(search, 'getSubjectCodes').and.returnValue([]);

        desks = _desks_;
        spyOn(desks, 'initialize').and.returnValue($q.when([]));

        facetsInit = $q.defer();
        spyOn(tags, 'initSelectedFacets').and.returnValue(facetsInit.promise);

        fakeApi.ingestProviders.query.and.returnValue(
            $q.when({_items: [{foo: 'bar'}]})
        );

        // directive compilation...
        html = [
            '<div sd-search-container>',
            '    <div sd-search-panel></div>',
            '</div>'
        ].join('');

        scope = $rootScope.$new();

        $element = $compile(html)(scope).find('div[sd-search-panel]');
        scope.$digest();

        isoScope = $element.isolateScope();
    }));

    describe('reacting to changes in the item list', function () {

        beforeEach(function () {
            isoScope.items = {
                _aggregations: {
                    desk: {buckets: []},
                    type: {buckets: []},
                    category: {buckets: []},
                    genre: {buckets: []},
                    urgency: {buckets: []},
                    priority: {buckets: []},
                    source: {buckets: []},
                    day: {buckets: []},
                    week: {buckets: []},
                    month: {buckets: []},
                    stage: {buckets: []}
                }
            };
        });

        xit('does not throw an error if desk not in deskLookup', function () {
            isoScope.desk = null;

            isoScope.items._aggregations.desk.buckets = [
                {doc_count: 123, key: 'abc123'}
            ];

            desks.deskLookup = {
                otherDesk: {}  // desk abc123 not present in deskLookup
            };

            try {
                facetsInit.resolve();
                isoScope.$digest();
            } catch (ex) {
                fail('A desk not in deskLookup should not cause an error.');
            }
        });

        xit('outputs a warning if desk not in deskLookup', function () {
            isoScope.desk = null;

            isoScope.items._aggregations.desk.buckets = [
                {doc_count: 123, key: 'abc123'}
            ];

            desks.deskLookup = {
                otherDesk: {}  // desk abc123 not present in deskLookup
            };

            spyOn(console, 'warn');

            facetsInit.resolve();
            isoScope.$digest();

            expect(console.warn).toHaveBeenCalledWith(
                'Desk (key: abc123) not found in deskLookup, ' +
                'probable storage inconsistency.'
            );
        });
    });

});
