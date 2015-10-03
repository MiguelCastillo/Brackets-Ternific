Brackets-Tern
=============

[Tern](http://ternjs.net/) integration in brackets.<br>

1. Integration with brackets' native hint manager system.
2. By default this extension runs tern in a worker thread (a web worker).
3. You can also run a Tern server yourself. Soon to come, ability to fire up a tern server from the UI.
4. Per folder/project .tern-project.  Ternific will traverse the directory structure looking for the first available  .tern-project file. If no .tern-project is found, then a default .tern-project is loaded.
5. Live reload of .tern-project.  So, saving changes will automatically take effect without reloading Brackets. [Only for integrated tern and not for servers yet].
6. Support for Meteor plugin!  Thanks to Slava for https://github.com/Slava/tern-meteor.
7. ** Refactoring! To activate refactoring, place the editor's cursor on a variable/property and press `ctrl + r`.
8. Refactoring is supported across multiple files. EXPERIMENTAL
9. Set the sorting order of your hints!


FAQ
=============
1. Where is the default .tern-project?<br>
  Default .tern-project can be found in tern/.tern-project in ternific installation directory.
2. How do I add node or meteor support?<br>
  Node and meteor are loaded as plugins.  You need to add the correspoding entries to the plugins section in .tern-project.  You can use https://github.com/MiguelCastillo/Brackets-Ternific/blob/master/.tern-project as a template or just use the default .tern-project in tern's directory.
3. Why isn't the default .tern-project file not live reloading.<br>
  Live reload is only supported for project specific .tern-project.
4. Is there a way to enable logging for debug details?<br>
  Yes, you need to bring up Chrome Developer Tools and from the console, type `ternificLogger.enableAll()`.  And to disable it, use `ternificLogger.disableAll()`.
5. ES6 (ES2015) support?
  Yes! You will need to specify `es_modules` in your .tern-project to take advantage of the new module syntax. Take a look in [this sample file](https://github.com/MiguelCastillo/Brackets-Ternific/blob/master/.tern-project) in the plugins definition.


.tern-project
=============

`.tern-project` is the configuration file that ternific picks up to configure tern. This file can exist in any directory, and ternific will navigate up the directory hierarchy (up to the project), and use the first it finds.

You can specify all you standard [tern](http://ternjs.net/doc/manual.html#configuration) settings. Additionally, you can specify directory *path* for `libs`, which allows you to specify custom definitions in your project. Take a look at [this](https://github.com/MiguelCastillo/Brackets-Ternific/blob/master/.tern-project#L3) example where ternific itself ships with a couple of custom lib definitions.


Screenshots
=============

Ternific hints panel
![Ternific panel](https://raw.github.com/wiki/MiguelCastillo/Brackets-Ternific/images/ternific.gif)

Ternific refactoring
![Ternific panel](https://raw.github.com/wiki/MiguelCastillo/Brackets-Ternific/images/refactoring.gif)

Ternific Dark Theme
![Ternific panel](https://raw.github.com/wiki/MiguelCastillo/Brackets-Ternific/images/darktheme.png)

Credit
=============

1. Brackets' javascript hinting has been used and code has been lifted and integrated into this extension.<br>
2. Code has been taken from tern demo.js in order to make tern integration possible.<br>


License
=============

Licensed under MIT
