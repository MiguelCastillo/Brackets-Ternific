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


define(["require", "exports", "module"], function(require, exports, module) {


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


	ternDocuments.prototype.findDocByCM = function(cm) {
		return this.findDocByProperty("cm", cm);
	}


	ternDocuments.prototype.register = function(cm, name) {
		var _self = this;

		this.addDoc({name: name,
					 cm: cm,
					 doc: cm.getDoc(),
					 changed: null});
	}


	ternDocuments.prototype.unregister = function(cm) {

	}


	/**
	* Build a query that corresponds to the code mirror instance. The
	* returned object is an object with details that tern will use to
	* query the document.  The object returned also has the instance of
	* code mirror the query belongs to.  This is needed to complete the
	* full between a query and operating on the document the query of
	* done against.
	*/
	ternDocuments.prototype.buildQuery = function( cm, query ) {
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

		var doc = this.findDocByCM(cm);
		query.file = doc.name;

		return {
			data: {
				query: query,
				files: files
			},
			doc: doc
		};
	}


	/**
	*  Interface to operate against a local instance of tern
	*/
	function localDocuments() {
		ternDocuments.apply(this, arguments);
		var _self = this;

		var ternRequire = window.require.config({
			"baseUrl": require.toUrl("./tern/"),
			"paths": {
				"acorn": "node_modules/acorn"
			},
			waitSeconds: 5
		});

		ternRequire(["tern", "plugin/requirejs/requirejs"], function(tern) {

			//
			// Load up all the definitions that we will need to start with.
			//
			require(["text!./reserved.json", "text!./tern/ecma5.json", "text!./tern/browser.json",
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


	localDocuments.prototype.query = function( cm, settings ) {
		var promise = $.Deferred();
		var query = this.buildQuery( cm, settings ), queryData = query.data, queryDoc = query.doc;

		if ( !queryData.files ) {
			queryData.files = [];
		}

		queryData.files.push({type: "full",
					name: queryDoc.name,
					text: queryDoc.doc.getValue()
				});


		this._server.request( queryData, function(error, data) {
			if (error) {
				promise.reject(error);
			}
			else {
				query.result = data;
				query.details = queryDetails(query);
				promise.resolve(data, query);
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


	remoteDocuments.prototype.query = function( cm, settings ) {
		var query = this.buildQuery( cm, settings ), queryData = query.data, queryDoc = query.doc;

		if ( !queryData.files ) {
			queryData.files = [];
		}

		queryData.files.push({type: "full",
					name: queryDoc.name,
					text: queryDoc.doc.getValue()
				});

		// Send query to the server
		return $.ajax({
			"url": "http://localhost:22922",
			"type": "POST",
			"contentType": "application/json; charset=utf-8",
			"data": JSON.stringify(queryData)
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
	* Gets more details about the query itself.  One of the things it
	* provides is the text for the query...  E.g. What is tern searching
	* for when we are asking for feedback.
	*/
	function queryDetails( query ) {
		if ( query ) {
			var cm = query.doc.cm, result = query.result;
			var start = cm.posFromIndex(result.start), end = cm.posFromIndex(result.end);
			var queryText = cm.getDoc().getRange(start, end);

			var details = {
				text: queryText,
				start: start,
				end: end
			};

			return details;
		}
	}


	exports.TernDocuments = {
		remote: remoteDocuments,
		local: localDocuments
	}


	return {
		remote: remoteDocuments,
		local: localDocuments
	}

});

