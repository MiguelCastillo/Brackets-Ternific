/**
 * Ternific Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require /*, exports, module*/) {
    "use strict";

    var _                   = brackets.getModule("thirdparty/lodash"),
        WorkspaceManager    = brackets.getModule("view/WorkspaceManager"),
        FindUtils           = brackets.getModule("search/FindUtils"),
        SearchModel         = brackets.getModule("search/SearchModel").SearchModel,
        SearchResultsView   = brackets.getModule("search/SearchResultsView").SearchResultsView,
        spromise            = require("libs/js/spromise"),
        menu                = require("Menu"),
        referencesTransform = require("ReferencesTransform");


    var tmpls = {
        ternific: require("text!views/tmpls/ternific.html"),
        hintdetails: require("text!views/tmpls/hintdetails.html"),
        references: require("text!views/tmpls/references.html")
    };


    /**
     * Controller for ternific's main UI
     *
     * @param {TernManager} ternManager is the access to the different part exposed for tern functionality
     */
    function Ternific(ternManager) {
        var _self = this;

        this.$ternific = $(tmpls.ternific);
        this.$container = null;
        this.$hints = null;
        this.$toolbarIcon = $("<a href='#' class='ternific-toolbar-icon' title='Ternific'></a>");
        this.hints = null;
        this.ternManager = ternManager;
        this._resultsView = null;
        this._replaceModel = null;


        //
        // Initialize controller
        //

        this.$toolbarIcon.appendTo($("#main-toolbar .buttons"));

        this.$container = $("<div id='ternific' class='bottom-panel'>").append(this.$ternific);
        this.bottomPanel = WorkspaceManager.createBottomPanel("ternific.manager", _self.$container, 100);

        // Initialize view for showing items to be replaced
        this._replaceModel = new SearchModel();
        this._resultsView = new SearchResultsView(this._replaceModel, "replace-instances", "replace-instances.results");

        $(this._resultsView)
            .on("replaceAll", function () {
                _self.finishReplaceAll();
            });

        $(menu)
            .on("ternific", function(/*evt*/) {
                _self.toggle(true);
            });

        $(document)
            .on("click", ".hintList li", function(/*evt*/) {
                _self.$hints.filter(".active").removeClass("active");
                _self.highlightHint( _self.hints[ _self.$hints.index( $(this).addClass("active") ) ] );
            })
            .on("click", "#ternific [data-action=close]", function (/*evt*/) {
                _self.toggle();
            })
            .on("click", "#ternific [data-sort]", function (evt) {
                _self.sort($(evt.target).attr("data-sort"));
            })
            .on("click", ".ternific-toolbar-icon", function(/*evt*/) {
                _self.toggle();
            })
            .on("submit", ".replace-form", function(evt) {
                _self.finishReplaceAll();
                evt.stopPropagation();
                return false;
            });


        ternManager.ternHints.events
            .on("highlight", function(evt, hint) {
                _self.highlightHint(hint);
            })
            .on("hints", function(evt, hintsList, hintsHtml) {
                _self.hints = hintsList;
                _self.$hints = $(hintsHtml);
                _self.$ternific.find(".hintList").html($("<ul>").append(_self.$hints));
            });


        ternManager.ternReferences.events
            .on("references", function(evt, fileProvider, references, token) {
                if (!token) {
                    _self._resultsView.close();
                    return;
                }

                _self.processReferences(fileProvider, references, token);
            })
            .on("documentChange", function(evt, currentDocument) {
                if (currentDocument && !_self._replaceModel.results[currentDocument.file._path]) {
                    _self._resultsView.close();
                }
            });
    }


    Ternific.prototype.highlightHint = function(hint) {
        this.$ternific.find(".hintDetails").html($(Mustache.render(tmpls.hintdetails, hint)));
    };


    Ternific.prototype.toggle = function (open) {
        if (open === undefined) {
            open = !this.bottomPanel.isVisible();
        }

        this.$toolbarIcon.toggleClass("active", open);
        this.bottomPanel.setVisible(open);
    };


    Ternific.prototype.sort = function(byType) {
        this.ternManager.ternHints.setSort(byType);
    };


    Ternific.prototype.processReferences = function(fileProvider, references, token) {
        var promises;
        var replaceModel = this._replaceModel,
            resultsView = this._resultsView;

        replaceModel.clear();
        replaceModel.setQueryInfo({query: token});
        replaceModel.isReplace = true;
        replaceModel.replaceText = "";

        promises = Object.keys(references).map(function(reference) {
            return fileProvider.getFile(reference).done(function(file) {
                var data = {
                    matches: [],
                    timestamp: file.docMeta.file._stat._mtime
                };

                references[reference].forEach(function(match) {
                    data.matches.push(referencesTransform(match, file.content));
                });

                replaceModel.setResults(file.docMeta.file._path, data);
            });
        });

        spromise.all(promises).done(function() {
            if (promises.length) {
                resultsView.open();
            }
            else {
                resultsView.close();
            }

            var $data = resultsView._$summary.find(".contracting-col");
            var $value = $data.eq(1);
            var $input = $("<input class='replace-references'>").val(token);
            $value.html($("<form class='replace-form'></form>").append($input));
            setTimeout($input.focus.bind($input), 0);
        });
    };


    Ternific.prototype.finishReplaceAll = function() {
        var replaceModel = this._replaceModel,
            resultsView = this._resultsView,
            resultsClone = _.cloneDeep(replaceModel.results);

        replaceModel.replaceText = resultsView._$summary.find(".replace-references").val();
        FindUtils.performReplacements(resultsClone, replaceModel.replaceText, { forceFilesOpen: true, isRegexp: false });
        resultsView.close();
    };



    return Ternific;
});
