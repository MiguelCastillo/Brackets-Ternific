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
		_cm = null;


	/**
	*  Controls the interaction between codemirror and tern
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


	/**
	* Register a document with tern
	*
	* @param: cm is a code mirror instance we will be operating on.
	* We register listeners for keybinding and we also extract the
	* document content and feed it to tern.
	*
	* @param: file is just a file object.  The only thing we currenly
	* use is the fullPath, which also includes the file name.  We
	* map the code mirror instance to that file name.
	*
	*/
	ternManager.registerDoc = function ( cm, file ) {
		if (!cm) {
			throw new TypeError("CodeMirror instance must be valid");
		}

		if (!file) {
			throw new TypeError("File object must be valid");
		}

		// if already bound, then exit...
		if ( cm._ternBindings ){
			return;
		}

		_cm = cm;
		_cm._ternBindings = ternManager;

		var keyMap = {
			  "name": "ternBindings",
			  "Ctrl-I": ternManager.findType,
			  "Alt-.": ternManager.jumpToDef,
			  "Alt-,": ternManager.jumpBack,
			  "Ctrl-R": ternManager.renameVar
		};

		// Register key events
		_cm.addKeyMap(keyMap);
		_ternProvider.registerDoc(file.fullPath, cm.getDoc());
	}


	/**
	* Unregister a previously registered document.  We simply unbind
	* any keybindings we have registered
	*/
	ternManager.unregisterDoc = function ( cm ) {
		if ( !cm._ternBindings ) {
			return;
		}

		cm.removeKeyMap( "ternBindings" );
		delete cm._ternBindings;
	}


	/**
	* Utility function that helps determine if the the parameter _char
	* is one that we can start or continue hinting on.  There are some
	* characters that are not hintable.
	*/
	ternManager.canHint = function (_char, cm) {
		// Support for inner mode
		// var mode = CodeMirror.innerMode(cm.getMode(), token.state).mode;
		cm = cm || getCM();

		if (_char == null || maybeIdentifier(_char)) {
			var cursor = cm.getCursor();
			var token = cm.getTokenAt(cursor);
			return hintable(token);
		}

		return false;
	}


	/**
	* Inserts a hint from the hints object.
	* The idea here is that getHints is called first to build a valid list of hints.
	* Then select one of the hint items from hints returned by getHints.  The selected
	* hint and the hints object are the parameters you supply in insertHint.
	*
	* 1. call getHints.
	* 2. select a hint from the hints returned by getHints
	* 3. feed the selected hint and the list of hints back in insertHint
	*/
	ternManager.insertHint = function( hint, hints ) {
		if ( !hint || !hints ) {
			throw new TypeError("Must provide valid hint and hints object as they are returned by calling getHints");
		}

		cm = hints.cm || getCM();

		var completion  = hint.value,
			cursor      = cm.getCursor(),
			token       = cm.getTokenAt(cursor),
			query       = hints.query.details.text,
			start       = {line: cursor.line, ch: cursor.ch - query.length},
			end         = {line: cursor.line, ch: (token ? token.end : cursor.ch)};

		// Replace the current token with the completion
		cm.getDoc().replaceRange(completion, start, end);

		if ( ternManager.trace === true ) {
			console.log(hint, hints);
		}
	}


	/**
	* Interface to ask tern for hints.  You can pass in any particular code
	* mirror instance you want to operate on or let ternManager pick the last
	* code mirror instance that was registered via registerDoc.
	*/
	ternManager.getHints = function( cm ) {
		var query = buildQuery(cm, "completions");

		return _ternProvider.query(query.data)
			.pipe(function(data) {
				var completions = [];

				for (var i = 0; i < data.completions.length; i++) {
					var completion = data.completions[i],
						completionType = typeDetails(completion.type),
						className = completionType.icon;

					if (completion.guess) {
						className += " Tern-completion-guess";
					}

					var _completion = {
						value: completion.name,
						type: completionType.name,
						icon: completionType.icon,
						className: className,
						_completion: completion,
						_type: completionType
					};

					completions.push(_completion);
				}

				query.tern = data;
				query.details = queryDetails(query);

				var _hints = {
					list: completions,
					query: query,
					cm: query.cm
				};

				if ( ternManager.trace === true ) {
					console.log(_hints);
				}

				return _hints;
			},
			function(error) {
				return error;
			});
	}


	ternManager.findType = function( cm ) {
		var query = buildQuery(cm, "type");

		_ternProvider.query(query.data)
			.pipe( function(data) {
				var findTypeType = typeDetails(data.type),
					className = findTypeType.icon;

				if (data.guess) {
					className += " Tern-completion-guess";
				}

				var _findType = {
					value: data.name,
					type: findTypeType.name,
					icon: findTypeType.icon,
					className: className,
					query: query,
					_find: data,
					_type: findTypeType,
				};

				if ( ternManager.trace === true ) {
					console.log(_findType);
				}

				return _findType;
			},
			function( error ) {
				return error;
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

		_ternProvider.query(query.data)
			.pipe(function(data) {
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

				return perFile;
			},
			function(error) {
				return error;
			});
	}


	/**
	* Build a query that corresponds to the code mirror instance. The
	* returned object is an object with details that tern will use to
	* query the document.  The object returned also has the instance of
	* code mirror the query belongs to.  This is needed to complete the
	* full between a query and operating on the document the query of
	* done against.
	*/
	function buildQuery (cm, query) {
		cm = cm || getCM();

		if ( !cm ) {
			throw new TypeError("Invalid CodeMirror instance");
		}

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

		var doc = _ternProvider.findDocByInstance(cm.getDoc());
		query.file = doc.name;

		return {
			data: {
				query: query,
				files: files
			},
			cm: cm
		};
	}


	/**
	* Gets more details about the query itself.  One of the things it
	* provides is the text for the query...  E.g. What is tern searching
	* for when we are asking for feedback.
	*/
	function queryDetails( _query ) {
		if ( _query ) {
			var cm = _query.cm, query = _query.tern;
			var from = cm.posFromIndex(query.from), to = cm.posFromIndex(query.to);
			var queryText = cm.getDoc().getRange(from, to);

			var cursor = cm.getCursor();
			var _from = cm.indexFromPos(cursor);
			var pos = cm.posFromIndex(cursor);

			var details = {
				text: queryText,
				from: from,
				to: to
			};

			return details;
		}

		/**
		* This code is here just as a reference for myself...  I used something like
		* this at some point and don't want to remove it just yet.  I am testing performance
		* implication of calling getRange over calling getCursor + getTokenAt...
		else {
			var cm = getCM(), cursor = cm.getCursor(), token = cm.getTokenAt(cursor);
			var from = cm.indexFromPos(cm.getCursor());

			var queryText = "";

			if (token && token.string !== ".") {
				var length = token.string.length - (token.end - token.start);
				queryText = details.token.string.substring(0, length).trim();
			}

			// Find some details about the query
			var details = {
				text: queryText,
				from: from,
				to: {}
			};

			return details;
		}
		*/
	}


	function getCM( cm ) {
		return cm || _cm;
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
			name: suffix
		};
	}


	///
	///  The functions below were taken from brackets javascript hinting engine.
	///

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

