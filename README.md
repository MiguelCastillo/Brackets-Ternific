Brackets-Tern
=============

[Tern](http://ternjs.net/) integration with brackets.<br>

1. Integration with brackets' native hint manager system.
2. Run Tern as a server or integrated instance, which runs in a web worker.  Soon to come, ability to fire up a tern server from the UI.
3. Per folder/project .tern-project.  Ternific will traverse the directory structure looking for the first available  .tern-project file. If no .tern-project is found, then a default .tern-project is loaded.
4. Live reload of .tern-project.  So, saving changes will automatically take effect without reloading Brackets. [Only for integrated tern and not for servers yet].
5. Support for Meteor plugin!  Thanks to Slava for https://github.com/Slava/tern-meteor.


FAQ
=============
1. Where is the default .tern-project?<br>
  Default .tern-project can be found in tern/.tern-project in ternific installation directory.
2. How do I add node or meteor support?<br>
  Node and meteor are loaded as plugins.  You need to add the correspoding entries to the plugins section in .tern-project.  You can use https://github.com/MiguelCastillo/Brackets-Ternific/blob/master/.tern-project as a template or just use the default .tern-project in tern's directory.
3. Why isn't the default .tern-project file not live reloading.<br>
  Live reload is only supported for project specific .tern-project.


Screenshots
=============
Tern hints on a string
![Tern hints on a string](https://raw.github.com/wiki/MiguelCastillo/Brackets-Ternific/images/HintTypes.png)


Credit
=============

1. Brackets' javascript hinting has been used and code has been lifted and integrated into this extension.<br>
2. Code has been taken from tern demo.js in order to make tern integration possible.<br>


License
=============

Licensed under MIT
