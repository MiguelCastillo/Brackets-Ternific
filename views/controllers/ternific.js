/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module) {
    "use strict";

    var _                   = brackets.getModule("thirdparty/lodash"),
        PanelManager        = brackets.getModule("view/PanelManager"),
        Resizer             = brackets.getModule("utils/Resizer"),
        FindUtils           = brackets.getModule("search/FindUtils"),
        SearchModel         = brackets.getModule("search/SearchModel").SearchModel,
        SearchResultsView   = brackets.getModule("search/SearchResultsView").SearchResultsView,
        spromise            = require("libs/js/spromise"),
        menu                = require("Menu"),
        ternHints           = require("TernHints"),
        ternReferences      = require("TernReferences"),
        referencesTransform = require("ReferencesTransform");

    var $container, $hints, hints, _resultsView, _replaceModel;

    var tmpls = {
        $ternific: $(require("text!views/tmpls/ternific.html")),
        hintdetails: require("text!views/tmpls/hintdetails.html"),
        references: require("text!views/tmpls/references.html")
    };


    $(menu)
        .on("ternific", function(evt) {
            toggle(true);
        });


    $(document)
        .on("click", ".hintList li", function(evt) {
            $hints.filter(".active").removeClass("active");
            highlightHint( hints[ $hints.index( $(this).addClass("active") ) ] );
        })
        .on("click", ".ternific-toolbar-icon", function(evt) {
            toggle(true);
        });


    $(ternHints)
        .on("highlight", function(evt, hint) {
            highlightHint(hint);
        })
        .on("hints", function(evt, hintsList, hintsHtml) {
            hints = hintsList;
            $hints = $(hintsHtml);
            tmpls.$ternific.find(".hintList").html($("<ul>").append($hints));
        });


    $(ternReferences)
        .on("references", function(evt, fileProvider, references, token) {
            if (!token) {
                _resultsView.close();
                return;
            }

            processReferences(fileProvider, references, token);
        });


    function highlightHint(hint) {
        tmpls.$ternific.find(".hintDetails").html($(Mustache.render(tmpls.hintdetails, hint)));
    }


    function toggle(open) {
        if (open === undefined) {
            open = !$container.hasClass("open");
        }

        open ?
            ($container.addClass("open") && Resizer.show($container)) :
            ($container.removeClass("open") && Resizer.hide($container));
    }


    function processReferences(fileProvider, references, token) {
        var promises;

        _replaceModel.clear();
        _replaceModel.setQueryInfo({query: token});
        _replaceModel.isReplace = true;
        _replaceModel.replaceText = "";

        promises = Object.keys(references).map(function(reference) {
            return fileProvider.getFile(reference).done(function(file) {
                var data = {
                    matches: [],
                    timestamp: file.docMeta.file._stat._mtime
                };

                references[reference].forEach(function(match) {
                    data.matches.push(referencesTransform(match, file.content));
                });

                _replaceModel.setResults(file.docMeta.file._path, data);
            });
        });

        spromise.all(promises).done(function() {
            if (promises.length) {
                _resultsView.open();
            } else {
                _resultsView.close();
            }

            var $data = _resultsView._$summary.find(".contracting-col");
            var $value = $data.eq(1);
            var $input = $("<input class='replace-references'>").val(token);
            $value.html($input);
        });
    }


    function finishReplaceAll() {
        _replaceModel.replaceText = _resultsView._$summary.find(".replace-references").val();

        var resultsClone = _.cloneDeep(_replaceModel.results),
            replacedFiles = Object.keys(resultsClone).filter(function (path) {
                return FindUtils.hasCheckedMatches(resultsClone[path]);
            });

        FindUtils.performReplacements(resultsClone, _replaceModel.replaceText, { forceFilesOpen: true, isRegexp: false });
        _resultsView.close();
    }


    function init() {
        $container = $("<div id='ternific' class='bottom-panel vert-resizable top-resizer'>").append(tmpls.$ternific);
        $container.on("click", ".close", function (evt) {toggle(false);});
        PanelManager.createBottomPanel("ternific.manager", $container, 100);

        $("#main-toolbar .buttons").append("<a href='#' class='ternific-toolbar-icon' title='Ternific'></a>");

        // Initialize view for showing items to be replaced
        _replaceModel = new SearchModel();
        _resultsView = new SearchResultsView(_replaceModel, "replace-instances", "replace-instances.results");

        $(_resultsView)
            .on("replaceAll", function () {
                finishReplaceAll();
            })
            .on("close", function () {
                _replaceModel.clear();
            });
    }


    exports.init = init;
});
