(function($, undefined){

    var tag = _.template([
         '<script>',
         '(function() {',
         '  var script = document.createElement("script");',
         '  script.src = "<%= src %>";',
         '  script.async = true;',
         '   var entry = document.getElementsByTagName("script")[0];',
         '   entry.parentNode.insertBefore(script, entry);',
         '})();',
         '</script>'
         ].join('\n'));

    function gen(params){
        // get our own host
        var path = window.location.origin,
            loader = '/lmi-everywhere.js',
            src = $.param.querystring(path + loader, params);
        return tag({src: src});
    }

    $('#gen').on('click', '.generate', function(evt){
        evt.preventDefault();
        var loader = gen(
            $.deparam(
                $(this).parents('form').serialize()
            )
        );
        $('#output').text(loader);
        $('#demo').empty();
        $('#demo').html(loader);
        
    });

})(jQuery);