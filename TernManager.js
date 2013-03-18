/*
 * Copyright (c) 2013 Miguel Castillo.
 *
 * Licensed under MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */


define(["require", "exports", "module", "TernProvider"], function(require, exports, module, TernProvider) {

	/**
	*  Controls the interaction between brackets and tern
	*/
	var _editor = null;
	var ternManager = (function() {
		var onReady = $.Deferred();
		//var ternProvider = new TernProvider.remote();
		var ternProvider = new TernProvider.local();
		ternProvider.onReady(onReady.resolve);

		return {
			onReady: onReady.promise().done,
			_ternProvider: ternProvider
		};
	})();


	ternManager.registerEditor = function ( editor ) {
		// Make sure we have a valid editor
		if (!editor || !editor._codeMirror) {
			return;
		}

		var cm = editor._codeMirror;
	  	_editor = editor;

		// if already bound, then exit...
		if ( cm._ternBindings ){
			return;
		}

		cm._ternBindings = ternManager;

		var file = editor.document.file;
		var keyMap = {
			"name": "ternBindings",
			"Ctrl-I": ternManager.findType,
			"Alt-.": ternManager.jumpToDef,
			"Alt-,": ternManager.jumpBack,
			"Ctrl-R": ternManager.renameVar
		};

		// Register key events
		cm.addKeyMap(keyMap);
		ternManager._ternProvider.registerDoc(file.fullPath, cm.getDoc());
	}


    ternManager.unregisterEditor = function ( editor ) {
		// Make sure we have a valid editor
		if (!editor || !editor._codeMirror) {
			return;
		}

		var cm = editor._codeMirror;

		// if already bound, then exit...
		if ( !cm._ternBindings ) {
			return;
		}

        cm.removeKeyMap( "ternBindings" );
        delete cm._ternBindings;
    }



	ternManager.getHints = function(cm, c) {
	  	cm = cm || _editor._codeMirror;
		var query = ternManager.buildQuery(cm, "completions");

		return ternManager._ternProvider.query(query).pipe(function(data) {
			var completions = [];
			for (var i = 0; i < data.completions.length; ++i) {
				var completion = data.completions[i],
					completionType = typeDetails(completion.type),
					className = completionType.icon;

				if (data.guess) {
					className += " Tern-completion-guess";
				}

				completions.push($.extend({value: completion.name, type: completionType.type, icon: completionType.icon}, {completion: completion, type: completionType}));
			}

			var response = {
				from: cm.posFromIndex(data.from),
				to: cm.posFromIndex(data.to),
				list: completions
			};

			if ( typeof c === "" ) {
				c(response);
			}

			return response;
		}, function(error){
			return null;
		});
	}


	ternManager.findType = function(cm) {
	  	cm = cm || _editor._codeMirror;
		var query = ternManager.buildQuery(cm, "type");

		ternManager._ternProvider.query(query)
			.done( function(data) {
			})
			.fail(function( error ){
			});
	}


	ternManager.jumpToDef = function(cm) {
	  	cm = cm || _editor._codeMirror;
		console.log("jumpToDef");
	}


	ternManager.jumpBack = function(cm) {
	  	cm = cm || _editor._codeMirror;
		console.log("jumpBack");
	}


	ternManager.renameVar = function(cm) {
	  	cm = cm || _editor._codeMirror;
		var query = ternManager.buildQuery(cm, "refs");

		ternManager._ternProvider.query(query)
			.done(function(data) {
				var perFile = {};

				for (var i = 0; i < data.refs.length; ++i) {
					var use = data.refs[i];
					(perFile[use.file] || (perFile[use.file] = [])).push(use);
				}

				for (var file in perFile) {
					var refs = perFile[file], doc = ternManager._ternProvider.findDocByName(file).doc;
					refs.sort(function(a, b) { return b.start - a.start; });

					for (var i = 0; i < refs.length; ++i) {
						console.log(refs[i]);
						//doc.replaceRange(newName, doc.posFromIndex(refs[i].start), doc.posFromIndex(refs[i].end));
					}
				}
			})
			.fail(function(error) {

			});
	}


	ternManager.buildQuery = function(cm, query) {
	  	cm = cm || _editor._codeMirror;
		var startPos, endPos, offset = 0, files = [];

		// 1. Let's make sure we have a query object
		//
		if (typeof query == "string") {
			query = {
				type: query
			};
		}

		// 2. Define a range where the intellence will be applied on
		//
		if (query.end == null && query.start == null) {
			endPos = cm.getCursor("end");
			query.end = cm.indexFromPos(endPos);

			if (cm.somethingSelected()) {
				startPos = cm.getCursor("start")
				query.start = cm.indexFromPos(startPos);
			}
		}
		else {
			endPos = query.end
			query.end = cm.indexFromPos(endPos);

			if (query.start != null) {
				startPos = query.start;
				query.start = cm.indexFromPos(startPos);
			}
		}

		if ( !startPos ) {
			startPos = endPos;
		}

		var doc = ternManager._ternProvider.findDocByInstance(cm.getDoc());
		query.file = doc.name;

		return {
			query: query,
			files: files
		};
	}


	function typeDetails (type) {
		var suffix;

		if (type == "?") {
			suffix = "unknown";
		}
		else if (type == "number" || type == "string" || type == "bool") {
			suffix = type;
		}
		else if (/^fn\(/.test(type)) {
			suffix = "fn";
		}
		else if (/^\[/.test(type)) {
			suffix = "array";
		}
		else {
			suffix = "object";
		}

		return {
		  	icon: "Tern-completion Tern-completion-" + suffix,
		  	type: suffix
		};
	}


    exports.ternManager = ternManager;
    return ternManager;

});

