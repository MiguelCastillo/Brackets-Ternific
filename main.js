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


/** Brackets Extension to load line navigator CodeMirror addon */
define(["require", "exports", "module"], function (require, exports, module) {
	"use strict";

	var DocumentManager     = brackets.getModule("document/DocumentManager"),
		EditorManager       = brackets.getModule("editor/EditorManager"),
		AppInit             = brackets.getModule("utils/AppInit"),
		FileUtils           = brackets.getModule("file/FileUtils"),
		ExtensionUtils      = brackets.getModule("utils/ExtensionUtils");


 	/*
	*  Had to modify tern and acorn to be able to make them requirejs friendly...
	*
	*/
	var ternRequire = window.require.config({
	  	"baseUrl": require.toUrl("./tern"),
		"map":{
			"*": {
				"acorn": "node_modules/acorn/acorn",
				"acorn/acorn_loose": "node_modules/acorn/acorn_loose",
				"acorn/util/walk": "node_modules/acorn/util/walk"
			}
		},
		"shim":{
			"acorn/acorn_loose": {
				deps: ["acorn"]
			},
			"tern": {
				deps: ["acorn", "infer", "condense", "env", "jsdoc" ]
			},
		  	"condense": {
			  	deps: ["infer"]
			},
		  	"env": {
			  	deps: ["infer"]
			},
            "jsdoc": {
                deps: ["infer"]
            },
		  	"infer": {
			 	deps: ["acorn/acorn_loose", "acorn/util/walk"]
			}
		},
		waitSeconds: 60
	});



  	/**
	* tern server, which manager all the processing with an in process
	* service.
	*/
	function ternDocuments (options) {
		var _self = this;
		this.ready = $.Deferred();
		this.docs = [];
		this.onReady = this.ready.promise().done;
	}


	ternDocuments.prototype.query = function( query ) {
		throw "Must implement";
	}


	ternDocuments.prototype.findDocByProperty = function(_propName, data) {
		for (var i = 0; i < this.docs.length; ++i) {
			if (this.docs[i][_propName] == data) {
				return this.docs[i];
			}
		}
	}


	ternDocuments.prototype.findDocByName = function(name) {
		return this.findDocByProperty("name", name);
	}


	ternDocuments.prototype.findDocByInstance = function(doc) {
		return this.findDocByProperty("doc", doc);
	}


	ternDocuments.prototype.registerDoc = function(name, doc) {
		var _self = this;

		this.addDoc({name: name,
					 doc: doc,
					 changed: null});

		CodeMirror.on(doc, "change", function(){
			_self.trackChange.apply(_self, arguments);
		});
	}


	ternDocuments.prototype.trackChange = function (doc, change) {
		var _doc = this.findDocByInstance(doc);

		var changed = _doc.changed;
		if (changed == null){
			_doc.changed = changed = {
				from: change.from.line,
				to: change.from.line
			};
		}

		var end = change.from.line + (change.text.length - 1);

		if (change.from.line < changed.to) {
			changed.to = changed.to - (change.to.line - end);
		}

		if (end >= changed.to) {
			changed.to = end + 1;
		}

		if (changed.from > change.from.line) {
			changed.from = change.from.line;
		}
	}



	/**
	*  Interface to operate against a local instance of tern
	*/
	function localDocuments() {
		ternDocuments.apply(this, arguments);
		var _self = this;

	  	ternRequire(["tern"], function(tern) {

		  	//
			// Load up all the definitions that we will need to start with.
			//
			require(["text!./tern/ecma5.json", "text!./tern/browser.json",
					 "text!./tern/plugin/requirejs/requirejs.json", "text!./tern/jquery.json"],
				function( _ecma5Env, _browserEnv, _requireEnv, _jQueryEnv ) {
					var environment = Array.prototype.slice.call(arguments, 0);
					$.each(environment.slice(0), function(index, item){
						environment[index] = JSON.parse(item);
					});

					_self._server = new tern.Server({
						getFile: function(){
							_self.getFile.apply(_self, arguments);
						},
						environment: environment
					});

					_self.ready.resolve(_self);
			});
		});
	}


	// Create a localDocument server.
	localDocuments.prototype = new ternDocuments;
	localDocuments.prototype.constructor = localDocuments;


	localDocuments.prototype.query = function( query ) {
		var promise = $.Deferred();

		this._server.request( query, function(error, data) {
			if (error) {
				promise.fail(error);
			}
			else {
				console.log(data);
				promise.resolve(data);
			}
		});

		return promise.promise();
	}


	localDocuments.prototype.addDoc = function (doc) {
		this.docs.push(doc);
		this._server.addFile(doc.name);
	}


	var httpCache = {};
	localDocuments.prototype.getFile = function (name, c) {
		if (/^https?:\/\//.test(name)) {
			if (httpCache[name]){
			  return c(null, httpCache[name]);
			}

			$.ajax({
				"url": name,
				"contentType": "text"
			})
			.done(function(data, status) {
				httpCache[name] = data;
				c(null, data);
			})
			.fail(function(){
				c(null, "");
			});
		}
		else {
			var doc = this.findDocByName(name);
			return c(null, doc ? doc.doc.getValue() : "");
		}
	}




	/**
	*  Interface to operate against a remote tern server
	*/
	function remoteDocuments() {
		ternDocuments.apply(this, arguments);
		var _self = this;

		setTimeout(function(){
			_self.ready.resolve(_self);
		}, 1);
	}


	remoteDocuments.prototype = new ternDocuments;
	remoteDocuments.prototype.constructor = remoteDocuments;


	remoteDocuments.prototype.ping = function (){
		return $.ajax({
			"url": "http://localhost:4943/ping",
			"type": "GET"
		})
		.promise();
	}


	remoteDocuments.prototype.query = function( query ) {


		//
		// Raw integration with the server... I have to send the file I am working with.
		//
		var doc = this.findDocByName( query.query.file );

		if ( !query.files ) {
			query.files = [];
		}

		query.files.push({type: "full",
					name: doc.name,
					text: doc.doc.getValue()
				});


		// Send query to the server
		return $.ajax({
			"url": "http://localhost:22922",
			"type": "POST",
			"contentType": "application/json; charset=utf-8",
			"data": JSON.stringify(query)
		})
		.pipe(function(data){
			console.log(data);
			return data;
		}, function(error){
			console.log(error);
		})
		.promise();
	}


	remoteDocuments.prototype.addDoc = function(doc) {
		this.docs.push(doc);
	}



	/**
	*  Controls the interaction between brackets and tern
	*/
	var ternManager = (function() {
		var onReady = $.Deferred();
		//var docs = new remoteDocuments();
		var docs = new localDocuments();
		docs.onReady(onReady.resolve);

		return {
			onReady: onReady.promise().done,
			_docs: docs
		};
	})();


	ternManager.initEditor = function ( ) {
		// Change the current editor in view
		var editor = EditorManager.getCurrentFullEditor();

		// Make sure we have a valid editor
		if (!editor && !editor._codeMirror) {
			return;
		}

		var cm = editor._codeMirror;

		// if already bound, then exit...
		if ( cm._ternBindings ){
			return;
		}

		cm._ternBindings = ternManager;

		var file = editor.document.file;
		var keyMap = {
			"name": "ternBindings",
			"Ctrl-I": ternManager.findType,
			"Ctrl-.": function(cm) {
				CodeMirror.showHint(cm, ternManager.showHint, {async: true});
			},
			"Alt-.": ternManager.jumpToDef,
			"Alt-,": ternManager.jumpBack,
			"Ctrl-R": ternManager.renameVar
		};

		// Register key events
		cm.addKeyMap(keyMap);
		ternManager._docs.registerDoc(file.fullPath, cm.getDoc());
	}


	ternManager.showHint = function(cm, c) {
		var query = ternManager.buildQuery(cm, "completions");

		ternManager._docs.query(query)
			.done(function(data) {
				var completions = [];
				for (var i = 0; i < data.completions.length; ++i) {
					var completion = data.completions[i], className = ternManager.typeToIcon(completion.type);
					if (data.guess) {
						className += " Tern-completion-guess";
					}
					completions.push({text: completion.name, className: className});
				}

				c({
					from: cm.posFromIndex(data.from),
					to: cm.posFromIndex(data.to),
					list: completions
				});
			})
			.fail(function(error){
				// TODO: Need to handle errors
				return null;
			});
	}


	ternManager.findType = function(cm) {
		var query = ternManager.buildQuery(cm, "type");

		ternManager._docs.query(query)
			.done( function(data) {
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
		var query = ternManager.buildQuery(cm, "refs");

		ternManager._docs.query(query)
			.done(function(data) {
				var perFile = {};

				for (var i = 0; i < data.refs.length; ++i) {
					var use = data.refs[i];
					(perFile[use.file] || (perFile[use.file] = [])).push(use);
				}

				for (var file in perFile) {
					var refs = perFile[file], doc = ternManager._docs.findDocByName(file).doc;
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


	ternManager.typeToIcon = function (type) {
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

		return "Tern-completion Tern-completion-" + suffix;
	}


	ternManager.buildQuery = function(cm, query) {
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

		var doc = ternManager._docs.findDocByInstance(cm.getDoc());
		query.file = doc.name;

		return {
			query: query,
			files: files
		};
	}


	var promises = [
		$.getScript(FileUtils.getNativeBracketsDirectoryPath() + "/thirdparty/CodeMirror2/addon/hint/show-hint.js").promise(),
		ExtensionUtils.addLinkedStyleSheet(FileUtils.getNativeBracketsDirectoryPath() + "/thirdparty/CodeMirror2/addon/hint/show-hint.css")
	];


	//
	// Synchronize all calls to load resources.
	//
	$.when.apply($, promises).done( function( ) {

		// Once the app is fully loaded, we will proceed to check the theme that
		// was last set
		AppInit.appReady(function () {
			ternManager.onReady(function(){
				// Initialize any already open document that's already in focus
				ternManager.initEditor();

				// Anytime a new doc is in view, register all the junk we need to
				$(DocumentManager).on("currentDocumentChange", ternManager.initEditor);
			});
		});
	});

});
