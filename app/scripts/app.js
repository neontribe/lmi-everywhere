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

function regionTrendData(data)
{
    var regions = [];
    regions['0'] = []; // for all UK
    ukEmployment = [];

    $.each(data.predictedEmployment, function(){
        var year = this.year;

        $.each(this.breakdown, function(){

            if (typeof regions[this.code] !== 'object') {
                regions[this.code.toString()] = [];
            }

            regions[this.code.toString()].push({year:year, employment:this.employment});
        });
        // Add all regions (UK) as 0 to regions
        ukEmployment[year] = 0;// sum of all regions;
        $.each(regions, function(key, value){ //for each region
          $.each (value, function(k, v){ //for each year
            if (v.year == year) {
              //for each region employment, sum of employments
              ukEmployment[year] += v.employment;
            }
          });
        });
        regions['0'].push({year:year, employment:ukEmployment[year]});
    });
    return regions;
}

function getWageInfo(soc) {
  var d = $.Deferred();
	var wagesByRegion = {year:'', breakdown:[]};

	/* TODO cache wage data by soc */
	var filter = 'soc=' + soc + '&course=false&breakdown=region';
	$.ajax({
		url: 'http://api.lmiforall.org.uk/api/v1/ashe/estimatePay?' + filter,
		method: 'GET',
		dataType: 'json',
	}).done(function(wages){
		var year = wages.series[0].year;
		$.each(wages.series[0].breakdown, function(k,v) {
			wagesByRegion.year = year;
			wagesByRegion.breakdown[v.region] = v.estpay;
			});
		  var sum = wagesByRegion.breakdown.reduce(function(a,b) { return a+b });
			var avg = sum/(wagesByRegion.breakdown.length - 1);
		  wagesByRegion.breakdown[0] = Math.round(avg); // Avg for all UK.
			console.log(wagesByRegion, 'all wages');
			d.resolve(wagesByRegion);
		});
	return d.promise();
}


(function($, undefined){
    'use strict';

    var app = {
        search_term: null,
        soc: null,
        cache: {}
    };

    $(document).bind("mobileinit", function(){
        $.mobile.touchOverflowEnabled = true;
    });

    $(document).ready(function() {
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

        // Add region information.
        render($('p#region_information'), 'region_info', {regionName: getRegionName(app.region) });
    });


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

    function validateString(value, message) {
        if (value.length > 0 && value.match(/[a-z]/gi)) {
            return true;
        }

        if (!message) {
            showMessage('Invalid string value.');
        }
        else {
            showMessage(message);
        }
    }

    function showMessage(message) {
        // Show error message.
        $.mobile.showPageLoadingMsg( $.mobile.pageLoadErrorMessageTheme, message, true );

        // Hide after delay.
        setTimeout( $.mobile.hidePageLoadingMsg, 1500 );
    }

    /**
     * Set app.search_term when the search button is clicked
     */
    $('#search').on('keyup', 'input', function(evt){
        if (evt.which === 13) {
            var val = $(evt.delegateTarget).find('input[type=text]').val();
            if (!validateString(val, 'Invalid search term.')) {
                return false;
            }

            app.search_term = val;
            $.mobile.changePage('#list');
        }
    });
    $('#search').on('click', 'a', function(evt){
        var val = $(evt.delegateTarget).find('input[type=text]').val();
        if (!validateString(val, 'Invalid search term.')) {
            return false;
        }

        app.search_term = val;
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
                }).fail(function(){
                    d.reject();
                    window.location.href = window.location.protocol + "//" + window.location.host;
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
                        url: 'http://api.lmiforall.org.uk/api/v1/wf/predict/breakdown/region',
                        method: 'GET',
                        dataType: 'json',
                        data: {
                            soc: app.soc,
                            region: app.region || '',
                        }
                    }).done(function(data){
												getWageInfo(app.soc).then(function(wdata){
                        var trendByRegion = regionTrendData(data);
                        var trends = [];
                        var raw_trends = [];
                        $.each(trendByRegion, function(k, v) {
                          trends[k] = calculateTrend(v);
                          raw_trends[k] = calculateTrend(v, true);
                        });
                        // Re-assign null region (all UK) to 0 to correspond with regionTrendData array.
                        var regionID = ((app.region) ? app.region : 0);
                        var header = 'Opportunties for '+app.cache[app.soc].title.toLowerCase()+' in '+ getRegionName(app.region) +' are '+((trends[regionID] > 0)? 'increasing':'decreasing');
                        var explain = 'Currently there are approximately ' + Math.ceil(raw_trends[regionID][1][0]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' workers. By ' + Math.ceil(_.last(raw_trends[regionID][0])) + ' this will '+((trends[regionID] > 0)? 'increase':'decrease')+' to approximately ' + Math.ceil(_.last(raw_trends[regionID][1])).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' workers.';
											 var wages = wdata.breakdown;
											 var wage = 'The average weekly wage in ' + wdata.year +  ' was £' + wages[regionID] + '.';
											render($page.find('div[data-role=content]'), 'info_content', {
                           header: header,
                           explain: explain,
												   wage: wage
                       });
                        
                       var chart_data, chart, axes;
                        // mangle the data for the rickshaw chart
                        chart_data = $.map(trendByRegion[regionID], function(v){
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
						getWageInfo(app.soc).then(function(wdata){

							var region_years = regionTrendData(data);
							var region_trends = [];
							var region_wages = wdata.breakdown;

							$.each(regions, function(k, v){
								region_trends[v] = calculateTrend(region_years[v.toString()]);
							});
							var html = '<ul>';
							$.each(regions, function(name, id){
								var trend = ((region_trends[id] > 0) ? 'increasing' : 'decreasing');

							html += '<li>Opportunities in <strong>' + getRegionName(id) + '</strong> are <span class="' + trend + '">'+trend+'</span>. The average weekly wage in ' + wdata.year  + ' was £'+ region_wages[id]  + '.</li>';
						});
						html += '</ul>';

						$('#trends').html(html);

						d.resolve();
						});
					});
				});
			}).promise();
		$page.data('promise', promise);
		});

		// debug
		window.app = app;

})(jQuery);

