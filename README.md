Career Trax
===========
A prototype widget for distributing information from http://api.lmiforall.org.uk

Career Trax is a responsive application designed for easy resuse. Currently it prompts the viewer to imagine their future profession and then fetches and visualises data about the projected job market in an area.

It can either detect the viewers location or be configured to show data relevant to a specific area.

The widget can be seen [here](http://career-trax.herokuapp.com) or you can play with the [configurator and demonstrator](http://career-trax.herokuapp.com/generator.html)

To see how the widget might look on a third-party webside you can use a Chrome Extension to inject it into Rightmove property pages. [Download LMI Demonstrator for Google Chrome](https://raw.github.com/marxian/lmi-everywhere/master/career-trax-demonstrator.crx). Since this extension isn't public yet Chrome will warn you that it's unable to install from this website, but never fear, at the same time it has quietly saved the file to your usual location for downloaded files. Once you've downloaded the extension open Chrome's extensions management page from the tools menu (or by typing chrome://extensions in the URL bar) and drag and drop career-trax-demonstrator.crx onto the page from your downloads folder.

Here's a shot of the initial Chrome Browser extension version embedding the first version widget on www.rightmove.co.uk

![LMI Everywhere demo](https://raw.github.com/marxian/lmi-everywhere/develop/demo.png)

Developers
==========

Getting started:

    git clone git@github.com:marxian/lmi-everywhere.git
    cd lmi-everywhere
    npm install && bower install --dev
    grunt server

Requires node.js http://nodejs.org
Don't want node? It's only being used for dependency management and build tasks, we'll work something out...

