/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function (require /*, exports, module*/) {
    'use strict';

    var HintHelper = require("HintHelper");

    function TernTypes(ternProvider) {
        var _self = this;
        _self.ternProvider = ternProvider;
        _self._cm = null;
    }


    TernTypes.prototype.findType = function( cm ) {
        var _self = this;

        return _self.ternProvider.query(cm, "type")
            .then( function(data) {
                var findTypeType = HintHelper.typeDetails(data.type),
                    className = findTypeType.icon;

                if (data.guess) {
                    className += " Tern-completion-guess";
                }

                var _findType = {
                    value: data.name,
                    type: findTypeType.name,
                    icon: findTypeType.icon,
                    className: className,
                    _find: data,
                    _type: HintHelper.findTypeType
                };

                console.log(_findType);
                return _findType;
            },
            function( error ) {
                return error;
            });
    };


    return TernTypes;

});
