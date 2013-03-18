Brackets-Tern
=============

Really early development stages...  I have successfully integrated tern directly intro brackets using remote server calls and directly loading tern into brackets.  Loading tern into brackets directly requires changes in tern and acorn to support requirejs.<br>  So, I did the changes and have them in a separate branches.<br>
https://github.com/MiguelCastillo/acorn<br>
https://github.com/MiguelCastillo/tern<br>

I have been spending lots of time on cleanly integrating tern in brackets without requiring changes in brackets.  Hopefully we will get a full integration soon!


Loading tern in brackets
=============

Requirements:<br>
1. We need nodejs because that's how tern is currently tracking dependencies.<br>
2. Github command line.<br>

Setup:<br>
1. Download the extension and add it in brackets.<br>
2. Download https://github.com/MiguelCastillo/tern in place it in the same directory as the extension<br>
3. Go to tern directory and run "npm install"<br>

That's it...  Place you cursor anywhere and press Ctrl-. to get your hints!


License
=============

Licensed under MIT
