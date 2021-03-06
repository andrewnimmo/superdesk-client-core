DeskeditMacros.$inject = ['macros', 'WizardHandler'];

/**
 * @memberof superdesk.desks
 * @ngdoc directive
 * @name sdDeskeditMacros
 * @description
 *   Fetches and stores a list of macros for the current desk (if set,
 *   otherwise all macros), and defines the "previous" and "next"
 *   methods in the element's scope used by the Wizard handler.
 */
export function DeskeditMacros(macros, WizardHandler) {
    return {
        link: function(scope) {
            if (scope.desk && scope.desk.edit) {
                macros.getByDesk(scope.desk.edit.name, true).then(function(macros) {
                    scope.macros = macros;
                });
            } else {
                macros.get().then(function (macroList) {
                    scope.macros = macroList;
                });
            }

            scope.save = function () {
                WizardHandler.wizard('desks').finish();
            };
        }
    };
}
