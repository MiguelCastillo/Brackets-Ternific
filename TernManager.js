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

	var EditorManager   = brackets.getModule("editor/EditorManager");

	var SINGLE_QUOTE    = "\'",
		DOUBLE_QUOTE    = "\"";

	var _ternProvider = null,
		_editor = null;


	/**
	*  Controls the interaction between brackets and tern
	*/
	var ternManager = (function() {
		var onReady = $.Deferred();

		//_ternProvider = new TernProvider.remote();
		_ternProvider = new TernProvider.local();
		_ternProvider.onReady(onReady.resolve);

		return {
			onReady: onReady.promise().done
		};
	})();


	ternManager.registerEditor = function ( editor ) {
		// Make sure we have a valid editor
		if (!editor || !editor._codeMirror) {
			return;
		}

		var cm = editor._codeMirror;

		// if already bound, then exit...
		if ( cm._ternBindings ){
			return;
		}

		_editor = editor;
		cm._ternBindings = ternManager;

		var file = editor.document.file,
			keyMap = {
			  "name": "ternBindings",
			  "Ctrl-I": ternManager.findType,
			  "Alt-.": ternManager.jumpToDef,
			  "Alt-,": ternManager.jumpBack,
			  "Ctrl-R": ternManager.renameVar
		  };

		// Register key events
		cm.addKeyMap(keyMap);
		_ternProvider.registerDoc(file.fullPath, cm.getDoc());
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


	ternManager.canHint = function (_char) {
		// Support for inner mode
		// var mode = CodeMirror.innerMode(cm.getMode(), token.state).mode;
		var cm = getCM();

		if (_char == null || maybeIdentifier(_char)) {
			var cursor = cm.getCursor();
			var token = cm.getTokenAt(cursor);
			return hintable(token);
		}

		return false;
	}


	ternManager.getHints = function(cm) {
		cm = cm || getCM();
		var query = buildQuery(cm, "completions");

		return _ternProvider.query(query).pipe(function(data) {
			var completions = [];

			for (var i = 0; i < data.completions.length; ++i) {
				var completion = data.completions[i],
					completionType = typeDetails(completion.type),
					className = completionType.icon;

				if (completion.guess) {
					className += " Tern-completion-guess";
				}

				var _completion = {
					value: completion.name,
					type: completionType.type,
					icon: completionType.icon,
					className: className
				};

				$.extend(_completion, {
					completion: completion,
					type: completionType
				});

				completions.push(_completion);
			}

			var hints = {
				from: cm.posFromIndex(data.from),
				to: cm.posFromIndex(data.to),
				list: completions,
				query: query
			};

			return hints;
		},
		function(error) {
			return error;
		});
	}


	ternManager.findType = function(cm) {
		var query = buildQuery(cm, "type");

		_ternProvider.query(query)
			.done( function(data) {
				var findTypeType = typeDetails(data.type),
					className = findTypeType.icon;

				if (data.guess) {
					className += " Tern-completion-guess";
				}

				var _findType = {
					value: data.name,
					type: findTypeType.type,
					icon: findTypeType.icon,
					className: className
				};

				$.extend(_findType, {
					find: data
				});

				console.log(_findType);
			})
			.fail(function( error ){
			});
	}


	ternManager.jumpToDef = function(cm) {
		console.log("jumpToDef");
	}


	ternManager.jumpBack = function(cm) {
		console.log("jumpBack");
	}


	ternManager.renameVar = function(cm) {
		var query = buildQuery(cm, "refs");

		_ternProvider.query(query)
			.done(function(data) {
				var perFile = {};

				for (var i = 0; i < data.refs.length; ++i) {
					var use = data.refs[i];
					(perFile[use.file] || (perFile[use.file] = [])).push(use);
				}

				for (var file in perFile) {
					var refs = perFile[file], doc = _ternProvider.findDocByName(file).doc;
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


	function buildQuery (cm, query) {
		cm = cm || getCM();

		if ( !cm ) {
			throw new TypeError("Invalid CodeMirror instance");
		}

		var startPos, endPos, offset = 0, files = [];
		var cursor = cm.getCursor(), token = cm.getTokenAt(cursor);

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

		var doc = _ternProvider.findDocByInstance(cm.getDoc());
		query.file = doc.name;


		// Find some details about the query
		var details = {
			text: "",
			cursor: cursor,
			token: token
		};

		if (details.token) {
			if (details.token.string !== ".") {
				var length = details.token.string.length - (details.token.end - details.cursor.ch);
				details.text = details.token.string.substring(0, length).trim();
			}
		}

		return {
			query: query,
			files: files,
			details: details
		};
	}


	function getCM(cm) {
		if ( !cm ) {
			// Change the current editor in view
			cm = _editor && _editor._codeMirror;
		}

		return cm;
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


	/**
	 * Is the string key perhaps a valid JavaScript identifier?
	 *
	 * @param {string} key - the string to test
	 * @return {boolean} - could key be a valid identifier?
	 */
	function maybeIdentifier(key) {
		return (/[0-9a-z_.\$]/i).test(key) ||
			(key.indexOf(SINGLE_QUOTE) === 0) ||
			(key.indexOf(DOUBLE_QUOTE) === 0);
	}


	/**
	 * Is the token's class hintable? (A very conservative test.)
	 *
	 * @param {Object} token - the token to test for hintability
	 * @return {boolean} - could the token be hintable?
	 */
	function hintable(token) {
		switch (token.className) {
		case "comment":
		case "number":
		case "regexp":
			return false;
		default:
			return true;
		}
	}


	exports.ternManager = ternManager;
	return ternManager;

});

