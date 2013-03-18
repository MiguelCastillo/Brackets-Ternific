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
	* Circular dependecies:
	* http://stackoverflow.com/questions/4881059/how-to-handle-circular-dependencies-with-requiesjs-amd
	*
	* Nice requireJs example:
	* http://stackoverflow.com/questions/11031485/require-js-is-hurting-my-brain-some-fundamental-questions-about-the-way-it-load
	*
	*/
  	//  I am really jumping through hoops here!

  	/*
    * requirejs support in tern
	*/
	var ternRequire = window.require.config({
	  	"baseUrl": require.toUrl("./tern"),
		"map":{
			"*": {
				"acorn/acorn": "node_modules/acorn/acorn",
				"acorn/acorn_loose": "node_modules/acorn/acorn_loose",
				"acorn/util/walk": "node_modules/acorn/util/walk"
			}
		},
		waitSeconds: 5
	});


	// Setup the dependencies for acorn...
	ternRequire(["tern"], function(tern) {
		console.log(tern);
	});


});


