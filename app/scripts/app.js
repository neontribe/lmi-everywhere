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
	var filter = 'soc=' + soc + '&coarse=false&breakdown=region';
	$.ajax({
		url: 'http://api.lmiforall.org.uk/api/v1/ashe/estimatePay?' + filter,
		method: 'GET',
		dataType: 'jsonp'
	}).done(function(wages){
		var year = wages.series[0].year;
		$.each(wages.series[0].breakdown, function(k,v) {
			wagesByRegion.year = year;
			wagesByRegion.breakdown[v.region] = v.estpay;
    });
    var sum = wagesByRegion.breakdown.reduce(function(a,b) { return a+b });
		var numofvalues = 0;
		$.each(wagesByRegion.breakdown, function (k, v) {
		// Count only regions with wage info
			if (v !=0) {
			  numofvalues++;
			}
		});
    var avg = sum/(numofvalues - 1);
    wagesByRegion.breakdown[0] = Math.round(avg); // Avg for all UK.
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

    function updateRegion(region){
      if (region) {
        app.region = region;
      }
      render($('#search').find('#region'), 'region_select', {regions: regions, sel: app.region});
      if ($('#search').find('.ui-select').length) {
        $('#search').find('select').selectmenu('refresh');
      } else {
        $('#search').find('select').selectmenu();
      }
    }

    $(document).ready(function() {
        $.mobile.defaultPageTransition = 'flow';
        // Grab config from our URL
        $.extend(true, app, $.deparam.querystring(true));

        if (!app.region) {
          getUserLocation(function(region){
              updateRegion(region);
          });
        };


        // Pick a starting page TODO: de-uglify this.
        if (app.search_term) {
          window.location.hash = 'list';
        }
        if (app.soc) {
          window.location.hash = 'info';
        }

        if (!app.soc && !app.search_term) {
          window.location.hash = 'search';
        }

        // Init jQM
        $.mobile.initializePage();
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
    window.render = render;

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

    function showMessage(message, timeout) {
        // Show error message.
        $.mobile.showPageLoadingMsg( $.mobile.pageLoadErrorMessageTheme, message, true );

				// Hide after delay.
				if (timeout) {
					setTimeout( $.mobile.hidePageLoadingMsg, timeout );
				} else {
          setTimeout( $.mobile.hidePageLoadingMsg, 1500 );
				}
		}

		function showPopup(message) {
			message += '<a href="#" onclick="$(\'#region-popup\').popup(\'close\')" class="popup-close">X</a>';
		  $('#region-popup').html(message).popup("open");
			
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
            app.region = $(evt.delegateTarget).find('select[name=region]').val();

            $.mobile.changePage('#list');
        }
    });
    $('#search').on('click', 'a', function(evt){
        var val = $(evt.delegateTarget).find('input[type=text]').val();
        if (!validateString(val, 'Invalid search term.')) {
            return false;
        }

        app.search_term = val;
        app.region = $(evt.delegateTarget).find('select[name=region]').val() || '';
    });

    $('#list').on('click', '.ui-content a', function(evt){
        var soc = _.findWhere(app.search_results, { soc: $(this).data('soc')});
        app.soc = soc.soc;
        app.cache[app.soc] = soc;
    });

    /**
     * Initialise region selection on pageinit.
     */
    $('#search').on('pageinit', function(){
        var $page = $(this);
        updateRegion();
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
                    dataType: 'jsonp',
                    data: {
                        // Format our query as an instersected AND
                        q: app.search_term.split(' ').join(' AND ')
                    }
                }).done(function(data){
                    app.search_results = data;
                    render($page.find('div[data-role="content"]'), 'list_content', {jobs: data});
                    $page.find('div[data-role="content"] ul').listview();
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
                dataType: 'jsonp'
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
                        dataType: 'jsonp',
                        data: {
                            soc: app.soc,
                            region: app.region || ''
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

                        if (!app.search_term) {
                          app.search_term = app.cache[app.soc].title;
                        }

                        // Re-assign null region (all UK) to 0 to correspond with regionTrendData array.
                        var regionID = ((app.region) ? app.region : 0);
                        var header = 'Opportunities for '+app.cache[app.soc].title.toLowerCase()+' in '+ getRegionName(app.region) +' are '+((trends[regionID] > 0)? 'increasing':'decreasing');
                        var explain = 'Currently there are approximately ' 
													+ (Math.round((raw_trends[regionID][1][0])/10)*10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") 
													+ ' workers. By ' + Math.ceil(_.last(raw_trends[regionID][0])) 
													+ ' this is expected to '+((trends[regionID] > 0)? 'increase':'decrease')
													+' to approximately ' 
													+ (Math.round((_.last(raw_trends[regionID][1]))/10)*10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") 
													+ ' workers.';
 											  var wages = wdata.breakdown;

                        var wage = 'No wage info available.';
                        if (wages[regionID]) {
											    wage = 'The average weekly wage in ' + wdata.year +  ' was &pound;' + wages[regionID] + '.';
                        }

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

                        // Draw graph.
                        if (typeof Rickshaw !== 'undefined') {
                          // Use Rickshaw for supported browsers.
                          chart = new Rickshaw.Graph( {
                              element: $page.find('.chart')[0],
                              min: 'auto',
                              width: $('body').width(),
                              height: $(window).height() * 0.45,
                              series: [{
                                color: '#FF6600',
                                data: chart_data
                              }]
                          });
                          axes = new Rickshaw.Graph.Axis.Time( { graph: chart } );
                          chart.render();
                        }
                        else {
                          // Use flot graph.

                          // Add flot-chart class for CSS styling.
                          $('.chart').addClass('flot-chart');

                          var $placeholder = $page.find('.chart')[0];

                          var x = [];
                          $.each( chart_data, function(k, v) {
                            x[k] = [v.x, v.y];
                          });

                          var plot_data = [
                            { data: x, label: "Data" }
                          ];

                          var options = {
                            series: {
                              lines: { show: true },
                              points: { show: true },
                              fill: true,
                              color: "#FF6600"
                            },
                            canvas: true,
                            xaxes: [ { position: "top" } ],
                            yaxes: [ { }, { position: "right", alignTicksWithAxis: 1 } ],
                            legend: { show: false },
                            grid: { show: false }
                          }

                          /**
                           * TODO Currently the dimention style overriding does not work in IE7 and
                           * instead relies on the CSS values.
                           */
                          var width = $('body').width(),
                              height = $(window).height() * 0.45;

                          $placeholder.setAttribute("style", "width:" + width + "px; height:" + height + "px");
                          $.plot($placeholder, plot_data, options);
                        }
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
					dataType: 'jsonp',
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
                  out[region].id = this.code; // Add region code to get wage info
                  out[region].soc = data.soc;
									out[region].data.push({year:self.year, employment:this.employment});
								});
							});
							$.each(out, function(k,v) {
								v.trend = calculateTrend(v.data);
                getWageInfo(v.soc).then(function(wdata){
 									var wages = wdata;             
                  v.wage = {year:wages.year, wage:wages.breakdown[v.id]};
							 });
							});
							return out;
						}(data);

						function getTrendOutput(name){
							var trend = trends[name.toLowerCase()];
							var rtrend = (trend.trend > 0)? 'increasing':'decreasing'; 
							var output  = '<div class ="' + rtrend + '">';
									output += '<h3>' + name + '</h3>';
									output += '<p>Opportunities: <span>'	+ rtrend + '</span><br />';
								if (trend.wage.wage) {
									output += trend.wage.year + ' Avg weekly wage: &pound;'
										+ trend.wage.wage + '</div>';
								} else {
								  output += 'No wage info available.</div>';
								}
							return '</p>' + output;
						}

						// Connect a resizer
						// Can we not replace this mechanism with cunning CSS?
						//d3.select(window)
							//.on("resize", sizeChange);

						// Add title with job title info
						var pagetitle = '<h2>Trends&#58;<br />' 
							+ app.cache[app.soc].title.toLowerCase() + '</h2>';
					
						// Clear existing html and add page title to regionmap div
						$("#region-map").html(pagetitle);

						// Build our base svg
						var svg = d3.select("#region-map").append("svg").append("g");

            // Resize svg element to show widget correctly in Firefox browser.
            $('svg', '#region-map').attr("width", window.innerWidth).attr("height", window.innerHeight)

						// Fetch a topojson file of UK EU regions
						d3.json("uk_euregions.json", function(error, uk) {
							var width = $(window).width();
							var height = $(window).height();
							var regions = topojson.feature(uk, uk.objects.uk_regions);
							var projection = d3.geo.albers()
							.center([2.1, 54.4])
							.rotate([4.4, 0])
							.parallels([50, 60])
							.scale(4.1 * height)
						  .translate([width/2, height/2]);
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
						.attr("d", path).on('click', function(d){
							showPopup(getTrendOutput(d.id));
						});
						// Draw some boundaries
						svg.append("path")
							.datum(topojson.mesh(uk, uk.objects.uk_regions, function(a, b) { return a !== b; }))
							.attr("d", path)
							.attr("class", "region-boundary");
						});
							function sizeChange() {
								d3.select("g").attr("transform", "scale(" + $("#region-map").width()/900 + ")");
								$("svg").height($("#region-map").height());
							};

							d.resolve();
					
					});
				});
			}).promise();
		$page.data('promise', promise);
		});

		// debug
		window.app = app;

})(jQuery);

