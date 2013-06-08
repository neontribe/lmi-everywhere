function calculateTrend(data, raw)
{
    'use strict';
    var x = [];
    var y = [];

    $.each(data, function(){
        x.push(this.year);
        y.push(this.employment);
      });

    var a = 0;
    var b = 0;
    var b_x = 0;
    var b_y = 0;
    var c = 0;
    var d = 0;

    for (var i = 0; i < x.length; i++) {
        a = a + (x[i] * y[i]);
        b_x = b_x + x[i];
        b_y = b_y + y[i];
        c = c + (x[i] ^ 2);
        d = d + x[i];
    }
    a = a*x.length;
    b = b_x * b_y;
    c = x.length * c;
    d = d ^ 2;

    if (raw !== undefined) {
        return [x, y];
    }

    return ((a-b)/(c-d));
}

(function($, undefined){
    'use strict';

    var app = {
        search_term: null,
        soc: null,
        cache: {}
    };
    $.mobile.defaultPageTransition = 'flow';
    // Grab config from our URL
    $.extend(true, app, $.deparam.querystring(true));
    if (app.region !== null) {
        app.region = app.region || getUsersLocation(function(region){
            app.region = region;
        });
    }

    // Pick a starting page TODO: de-uglify this.
    if (app.search_term) {
        window.location.hash = 'list';
    }
    if (app.soc) {
        window.location.hash = 'info';
    }
    // Init jQM
    $.mobile.initializePage();

    /**
     * Provide a custom transistion handler to let us load and render api data before page show
     * I'm always surprised that tis sort of thing is necessary with jQuery Mobile. I'm probably missing something :-)
     */
    var oldDefaultTransitionHandler = $.mobile.defaultTransitionHandler;
    $.mobile.defaultTransitionHandler = function(name, reverse, $to, $from) {
        var promise = $to.data('promise');
        if (promise) {
            $to.removeData('promise');
            $.mobile.loading('show');
            return promise.then(function() {
                $.mobile.loading('hide');
                return oldDefaultTransitionHandler(name, reverse, $to, $from);
            });
        }
        return oldDefaultTransitionHandler(name, reverse, $to, $from);
    };

    /**
     * Simple templte renderer
     * @param  {[Element]} target      [a jQuery wrapped element to accept the content]
     * @param  {[String]} template_id [the id of script element with type=text/template]
     * @param  {[Object]} data        [data to pass to the template]
     * @return
     */
    function render(target, template_id, data) {
        var content = _.template(
            $('#'+template_id).html(),
            data
        );
        target.html(content);
    }

    /**
     * Set app.search_term when the search button is clicked
     */
    $('#search').on('keyup', 'input', function(evt){
        if (evt.which === 13) {
            app.search_term = $(evt.delegateTarget).find('input[type=text]').val();
            $.mobile.changePage('#list');
        }
    });
    $('#search').on('click', 'a', function(evt){
        app.search_term = $(evt.delegateTarget).find('input[type=text]').val();
    });

    $('#list').on('click', 'a', function(evt){
        var soc = _.findWhere(app.search_results, { soc: $(this).data('soc')});
        app.soc = soc.soc;
        app.cache[app.soc] = soc;
    });

    /**
     * Fetch search results and render a template before showing the list view
     */
    $(document).on('pagebeforeshow', '#list', function() {
        var $page = $(this),
            promise = $.Deferred(function(d){
                $.ajax({
                    url: 'http://api.lmiforall.org.uk/api/v1/soc/search',
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        q: app.search_term
                    }
                }).done(function(data){
                    app.search_results = data;
                    render($page.find('ul'), 'list_content', {jobs: data});
                    $page.find('ul').listview('refresh');
                    d.resolve();
                });
            }).promise();
        // Save promise on page so the transition handler can find it.
        $page.data('promise', promise);
    });

    function fetchSOC(code) {
        var d = $.Deferred();
        if (!app.cache[code]) {
            $.ajax({
                url: 'http://api.lmiforall.org.uk/api/v1/soc/code/' + code,
                method: 'GET',
                dataType: 'json',
            }).done(function(soc){
                app.cache[code] = soc;
                d.resolve();
            });
        } else {
            d.resolve();
        }
        return d.promise();
    }

    /**
     * Fetch working futures predictions and prepare the info view
     */
    $(document).on('pagebeforeshow', '#info', function(){
        var $page = $(this),
            promise = $.Deferred(function(d){
                fetchSOC(app.soc).then(function(){
                    $.ajax({
                        url: 'http://api.lmiforall.org.uk/api/v1/wf/predict',
                        method: 'GET',
                        dataType: 'json',
                        data: {
                            soc: app.soc,
                            region: app.region || ''
                        }
                    }).done(function(data){

                        var trend = calculateTrend(data.predictedEmployment);
                        var raw_trend = calculateTrend(data.predictedEmployment, true);

                        var header = 'Opportunties for '+app.cache[app.soc].title.toLowerCase()+' in '+ getRegionName(app.region) +' are '+((trend > 0)? 'increasing':'decreasing');
                        var explain = 'Currently there are approximately ' + Math.ceil(raw_trend[1][0]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' workers. By ' + Math.ceil(_.last(raw_trend[0])) + ' this will '+((trend > 0)? 'increase':'decrease')+' to approximately ' + Math.ceil(_.last(raw_trend[1])).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' workers.';

                       render($page.find('div[data-role=content]'), 'info_content', {
                           header: header,
                           explain: explain
                       });

                        var chart_data, chart, axes;
                        // mangle the data for the rickshaw chart
                        chart_data = $.map(data.predictedEmployment, function(v){
                            return {
                                x: new Date(v.year.toString()).getTime() / 1000,
                                y: v.employment
                            }
                        });
                        // Clear any previous chart. This is less than elegant...
                        $page.find('.chart').empty();
                        chart = new Rickshaw.Graph( {
                            element: $page.find('.chart')[0],
                            min: 'auto',
                            width: $('body').width(),
                            height: $(window).height() * 0.45,
                            series: [{
                                color: 'steelblue',
                                data: chart_data
                            }]
                        });
                        axes = new Rickshaw.Graph.Axis.Time( { graph: chart } );
                        chart.render();
                        d.resolve();
                    });
                });
            }).promise();
        $page.data('promise', promise);
    });

    /**
     * Fetch working futures predictions and prepare the info view
     */
    $(document).on('pagebeforeshow', '#moreinfo', function(){
        var $page = $(this),
            promise = $.Deferred(function(d){
                fetchSOC(app.soc).then(function(){
                    $.ajax({
                        url: 'http://api.lmiforall.org.uk/api/v1/wf/predict/breakdown/region',
                        method: 'GET',
                        dataType: 'json',
                        data: {
                            soc: app.soc
                        }
                    }).done(function(data){
                        /* Calculate trends per-region */
                        var trends = function(data) {
                            var out = {};
                            $.each(data.predictedEmployment, function(){
                                var self = this;
                                $.each(this.breakdown, function(){
                                    // Normalise fucking region names
                                    var region = _.invert(regions)[this.code].toLowerCase();
                                    out[region] = out[region] || {data:[]};
                                    out[region].data.push({year:self.year, employment:this.employment});
                                });
                            });
                            $.each(out, function(k,v){
                                v.trend = calculateTrend(v.data);
                            });
                            return out;
                        }(data);

                        // Connect a resizer
                        // Can we not replace this mechanism with cunning CSS?
                        d3.select(window)
                            .on("resize", sizeChange);

                        // Build our base svg
                        var svg = d3.select("#trends").append("svg").append("g");

                        // Fetch a topojson file of UK EU regions
                        d3.json("uk_euregions.json", function(error, uk) {
                            var regions = topojson.feature(uk, uk.objects.uk_regions);
                            var projection = d3.geo.albers()
                                .center([0, 55.4])
                                .rotate([4.4, 0])
                                .parallels([50, 60])
                                .scale(2100);
                                //.translate([width / 2, height / 2]);
                            var path = d3.geo.path()
                                .projection(projection);

                            svg.append("path")
                                .datum(regions)
                                .attr("d", path);

                            svg.selectAll(".region")
                                .data(topojson.feature(uk, uk.objects.uk_regions).features)
                                .enter().append("path")
                                .attr("class", function(d) { 
                                    // Calculate trend class here - better to use d3 scale?
                                    var trend = trends[d.id.toLowerCase()].trend,
                                        trendClass = (trend === 0) ? 'Stable' : (trend > 0 ? 'Increasing' : 'Decreasing');
                                    return "region trend" + trendClass; 
                                })
                                .attr("d", path);
                            // Draw some boundaries
                            svg.append("path")
                                .datum(topojson.mesh(uk, uk.objects.uk_regions, function(a, b) { return a !== b; }))
                                .attr("d", path)
                                .attr("class", "region-boundary");
                        });

                        function sizeChange() {
                            d3.select("g").attr("transform", "scale(" + $("#trends").width()/900 + ")");
                            $("svg").height($("#trends").height());
                        }

                        d.resolve();
                    });
                });
            }).promise();
        $page.data('promise', promise);
    });

    // debug
    window.app = app;

})(jQuery);

