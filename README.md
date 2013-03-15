Brackets-Tern
=============

Really early development stages...  I have successfully integrated tern directly intro brackets using remote server calls and directly loading tern into brackets.  Loading tern into brackets directly requires changes in tern and acorn to support requirejs.<br>  So, I did the changes and have them in a separate branches.<br>
https://github.com/MiguelCastillo/acorn<br>
https://github.com/MiguelCastillo/tern<br>

I have been spending lots of time on cleanly integrating tern in brackets without requiring changes in brackets.  Hopefully we will get a full integration soon!


Loading tern in brackets
=============

Requirements:
1. We need nodejs because that how tern is currently tracking dependencies.
2. Github command line.

1. Download the extension and add it in brackets.
2. Download https://github.com/MiguelCastillo/tern in place it in the same directory as the extension
3. Go to tern directory and run "npm install"

That's it...  Place you cursor anywhere and press Ctrl-. to get your hints!


License
=============

Licensed under MIT
