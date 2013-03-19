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


define(function(require, exports, module) {

	var ternRequire = window.require.config({
		"baseUrl": require.toUrl("./tern/"),
		"paths": {
			"acorn": "node_modules/acorn"
		},
		waitSeconds: 5
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

		ternRequire(["tern", "plugin/requirejs/requirejs"], function(tern) {

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
		var doc = this.findDocByName( query.query.file );

		if ( !query.files ) {
			query.files = [];
		}

		query.files.push({type: "full",
					name: doc.name,
					text: doc.doc.getValue()
				});


		this._server.request( query, function(error, data) {
			if (error) {
				promise.reject(error);
			}
			else {
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
			.reject(function(){
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


	exports.TernDocuments = {
		remote: remoteDocuments,
		local: localDocuments
	}


	return {
		remote: remoteDocuments,
		local: localDocuments
	}

});