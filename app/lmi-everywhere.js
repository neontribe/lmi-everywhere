(function(){
    function getScriptUrl() {
        var scripts = document.getElementsByTagName('script');
        var element;
        var src;
        for (var i = 0; i < scripts.length; i++) {
            element = scripts[i];
            src = element.src;

            if (src && /lmi-everywhere\.js/.test(src)) {
                return src;
            }
        }
        return null;
    }

    function getQueryParameters(query) {
        var args = query.split('&'),
            params = {},
            pair,
            key,
            value;
        function decode(string) {
            return decodeURIComponent(string || '').replace('+', ' ');
        }
        for (var i = 0; i < args.length; i++) {
            pair = args[i].split('=');
            key = decode(pair[0]);
            value = decode(pair[1]);
            params[key] = value;
        }
        return params;
    }

    var url = getScriptUrl();
    var params = getQueryParameters(url.replace(/^.*\?/, ''));
    var iframe = document.createElement('iframe');
    var target = document.getElementsByTagName('script')[0]

    iframe.src = "./index.html?" + url.replace(/^.*\?/, '');
    iframe.style.width = params.width || '250px';
    iframe.style.height = params.height || '300px';
    iframe.style.border = 'none';
    iframe.scrolling = 'no';
    target.parentNode.insertBefore(iframe, target);
})();