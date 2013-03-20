Brackets-Tern
=============

Tern integration with brackets.  This is in early development stages, so I have not added the full feature set from tern or all brackets' hinting capabilities...<br><br>
Some bullet items are:

1. Integration with brackets' native hint manager system. So installing this extension will allow you to use tern as the hint provider instead of brackets' native js hint engine.
2. The code is setup to handle either remote tern server or directly loaded in brackets; this is ony switchable at code level and it is not a runtime setting.


Loading tern in brackets
=============

Requirements:<br>
1. We need nodejs because that's how tern is currently tracking dependencies.<br>
2. Github command line to get the dependencies.<br>

Setup:<br>
1. Download the extension and add it in brackets.<br>
2. Download https://github.com/marijnh/tern and place it in the same directory as the extension<br>
3. Go to tern directory and run "npm install". This will download acorn so you are set with dependencies<br>


Credit
=============

1. Brackets' javascript hinting has been used and code has been lifted and integrated into this extension.<br>
2. Code has been taken from tern demo.js in order to make tern integration possible.  Thanks Marijn!<br>



License
=============

Licensed under MIT
