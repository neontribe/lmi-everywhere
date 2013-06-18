(function() {

    var mapitRegions = {
        '11806': '1',
        '11805': '6',
        '11804': '3',
        '11812': '9',
        '16869': '12',
        '11807': '8',
        '11808': '11',
        '11811': '2',
        '11814': '4',
        '11813': '10',
        '11809': '5',
        '11810': '7'
    };

    var base = "http://career-trax.herokuapp.com";

    //make an attempt to sniff the lat/lon from the google  map
    var map = $('#minimapwrapper img'), point;
    if (map) {
        point = $.deparam.querystring(map.attr('src')).center.split(',').reverse().join(',');
        $.ajax({
            url: 'http://mapit.mysociety.org/point/4326/'+point+'?type=EUR',
            dataType: 'json'
        }).done(function(data){
            var reg = $.map(data, function(loc,code){ return code; })[0],
                url = $.param.querystring(base, {region: mapitRegions[reg]});
            spawn(url);
        });
    } else {
        spawn(base);
    }

    function spawn(url){
        var iframe = $('<iframe>');
        iframe.attr('src', url);
        iframe.attr('width', "290");
        iframe.attr('height', "400");
        iframe.attr('scrolling', 'no');
        iframe.css('border', '3px solid #222');
        iframe.prependTo('div.secondarycontent');
    }


})()
