function calculateTrend(data, raw) {
  'use strict';
  var x = [];
  var y = [];
  $.each(data, function () {
      x.push(this.year);
      y.push(this.employment);
    });
  var a = 0;
  var b = 0;
  var bX = 0;
  var bY = 0;
  var c = 0;
  var d = 0;

  for (var i = 0; i < x.length; i++) {
    a = a + (x[i] * y[i]);
    bX = bX + x[i];
    bY = bY + y[i];
    c = c + (x[i] ^ 2);
    d = d + x[i];
  }
  a = a * x.length;
  b = bX * bY;
  c = x.length * c;
  d = d ^ 2;

  if (raw !== undefined) {
    return [x, y];
  }
  return ((a - b) / (c - d));
}

function regionTrendData(data) {
  'use strict';
  var regions = [],
    ukEmployment = [];
  regions['0'] = []; // for all UK

  $.each(data.predictedEmployment, function () {
      var year = this.year;
      $.each(this.breakdown, function () {
          if (typeof regions[this.code] !== 'object') {
            regions[this.code.toString()] = [];
          }
          regions[this.code.toString()].push({year: year, employment: this.employment});
        });
      // Add all regions (UK) as 0 to regions
      ukEmployment[year] = 0;// sum of all regions;
      $.each(regions, function(key, value){ //for each region
        $.each (value, function(k, v){ //for each year
          if (v.year === year) {
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
  'use strict';
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
    var sum = wagesByRegion.breakdown.reduce(function(a,b) { return a+b; });
		var numofvalues = 0;
		$.each(wagesByRegion.breakdown, function (k, v) {
		// Count only regions with wage info
			if (v !== 0) {
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
        searchTerm: null,
        soc: null,
        cache: {}
      };

    $(document).bind('mobileinit', function(){
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
        // Toggle info display over graph.
        $('#info_btn_desc').on('click', function() {
          $('.rubric > p').slideToggle();
        });

        $.mobile.defaultPageTransition = 'flow';
        // Grab config from our URL
        $.extend(true, app, $.deparam.querystring(true));

        if (app.region === '' || app.region === undefined) {
          getUserLocation(function(region){
              updateRegion(region);
            });
        }

        // Pick a starting page TODO: de-uglify this.
        if (app.searchTerm) {
          window.location.hash = 'list';
        }
        if (app.soc) {
          window.location.hash = 'info';
        }
        if (!app.soc && !app.searchTerm) {
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
    function render(target, templateId, data) {
        var content = _.template($('#'+templateId).html(), data);
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

      // Create temporary semi-transparent background overlay.
      $('body').append('<div class="custom-overlay" />');

			// Hide after delay.
			if (timeout) {
				setTimeout(hideMessage, timeout);
			} else {
        setTimeout(hideMessage, 1500);
			}

      // Hide overlay and message.
      function hideMessage() {
        $('.custom-overlay').remove();
        $.mobile.hidePageLoadingMsg();
      }
		}

		function showPopup(message, elem) {
      if (!elem) {
        elem = '#region-popup';
      }

			message += '<a href="#" onclick="$(\'#region-popup\').popup(\'close\')" class="popup-close">X</a>';
		  $(elem).html(message).popup().popup('open');
		}
    /**
     * Set app.searchTerm when the search button is clicked
     */
    $(document).on('keyup', '#search input', function(evt){
      if (evt.which === 13) {
        var val = $(evt.delegateTarget).find('input[type=text]').val();
        if (!validateString(val, 'Invalid search term.')) {
          return false;
        }

        app.searchTerm = val;
        app.region = $(evt.delegateTarget).find('select[name=region]').val();

        $.mobile.changePage('#list');
      }
    });
    $(document).on('click', '#search .ui-content a', function(evt){
      var val = $(evt.delegateTarget).find('input[type=text]').val();
      if (!validateString(val, 'Invalid search term.')) {
        return false;
      }

      app.searchTerm = val;
      app.region = $(evt.delegateTarget).find('select[name=region]').val() || '';
    });

    $(document).on('click', '#list .ui-content a.result-view', function(){
      var soc = _.findWhere(app.searchResults, { soc: $(this).data('soc')});
      app.soc = soc.soc;
      app.cache[app.soc] = soc;
    });

    /**
     * Initialise region selection on pageinit.
     */
    $(document).on('pageinit', '#search', function(){
      updateRegion();
    });

    $('a[data-role="button"]', '#list').on('click', function(){
      $(this).parent().find('.job-description').slideToggle();
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
                q: app.searchTerm.split(' ').join(' AND ')
              }
            }).done(function(data){
              app.searchResults = data;
              render($page.find('div[data-role="content"]'), 'list_content', {jobs: data});
              $page.find('div[data-role="content"] ul').listview();
              $page.find('.noresults a').button();
              d.resolve();
            }).fail(function(){
              d.reject();
              window.location.href = window.location.protocol + '//' + window.location.host;
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
                  var rawTrends = [];
                  $.each(trendByRegion, function(k, v) {
                    trends[k] = calculateTrend(v);
                    rawTrends[k] = calculateTrend(v, true);
                  });

                  if (!app.searchTerm) {
                    app.searchTerm = app.cache[app.soc].title;
                  }

                  // Re-assign null region (all UK) to 0 to correspond with regionTrendData array.
                  var regionID = ((app.region) ? app.region : 0);
                  var header = 'Opportunities for '+app.cache[app.soc].title.toLowerCase()+' in '+ getRegionName(app.region) +' are '+((trends[regionID] > 0)? 'increasing':'decreasing');
                  var explain = 'Currently there are approximately ' +
                    (Math.round((rawTrends[regionID][1][0])/10)*10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
                    ' workers. By ' + Math.ceil(_.last(rawTrends[regionID][0])) +
                    ' this is expected to '+((trends[regionID] > 0)? 'increase':'decrease') +
                    ' to approximately ' +
                    (Math.round((_.last(rawTrends[regionID][1]))/10)*10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
                    ' workers.';
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

                  var chartData, chart, xaxis, yaxis;

                  // mangle the data for the rickshaw chart
                  chartData = $.map(trendByRegion[regionID], function(v){
                    return {
                      x: new Date(v.year.toString(), '').getTime() / 1000,
                      y: v.employment
                    };
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
                        data: chartData
                      }]
                    });
                    xaxis = new Rickshaw.Graph.Axis.Time( { graph: chart } );
                    yaxis = new Rickshaw.Graph.Axis.Y({
                      graph: chart,
                      orientation: 'right',
                      //tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
                      tickFormat: function(y) {
                        return y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      },
                      element: document.getElementById('y_axis')
                    });

                    chart.render();
                  }
                  else {
                    // Use flot graph.

                    // Add flot-chart class for CSS styling.
                    $('.chart').addClass('flot-chart');

                    var $placeholder = $page.find('.chart')[0];

                    var x = [];
                    $.each( chartData, function(k, v) {
                      x[k] = [v.x, v.y];
                    });

                    var plotData = [
                      { data: x, label: 'Data'}
                    ];

                    var options = {
                      series: {
                        lines: { show: true },
                        points: { show: true },
                        fill: true,
                        color: '#FF6600'
                      },
                      canvas: true,
                      xaxes: [ { position: 'top' } ],
                      yaxes: [ { }, { position: 'right', alignTicksWithAxis: 1 } ],
                      legend: { show: false },
                      grid: { show: false }
                    };

                    /**
                     * TODO Currently the dimention style overriding does not work in IE7 and
                     * instead relies on the CSS values.
                     */
                    var width = $('body').width(),
                        height = $(window).height() * 0.45;

                    $placeholder.setAttribute('style', 'width:' + width + 'px; height:' + height + 'px');
                    $.plot($placeholder, plotData, options);
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
						var trends = (function(data) {
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
						}(data));

						function getTrendOutput(name){
							var trend = trends[name.toLowerCase()];
							var rtrend = (trend.trend > 0)? 'increasing':'decreasing';
							var currentemp = (Math.round((trend.data[0].employment)/10)*10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              var lastemp   = (Math.round((trend.data[trend.data.length - 1].employment)/10)*10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

              // Show percentage increase/decrease.
              var a = parseInt(currentemp.replace(/,/g, ''));
              var b = parseInt(lastemp.replace(/,/g, ''));
              var change = Math.abs((((b - a) / a) * 100)).toFixed(2);
              rtrend += ' ' + change + '%';

							var output  = '<div class ="' + rtrend + '">';
							output += '<h3>' + name + '</h3>';
							output += 'Workers ' + trend.data[0].year + ': approx. <b>' + currentemp + '</b><br />';
              output += 'Workers ' + trend.data[trend.data.length - 1].year + ': approx. <b>' + lastemp + '</b><br />';
							output += '<p class="opportunities">Opportunities:<br /><span>'	+ rtrend + '</span></p><p>';

						  if (trend.wage.wage) {
								output += trend.wage.year + ' Avg weekly wage: <b>&pound;' + trend.wage.wage + '</b></p></div>';
							} else {
							  output += 'No wage info available.</p></div>';
							}
 
              // Link region popup header to #info page in selected region.
              $(document).on('click', '#moreinfo h3', function() {
                app.region = regions[$(this).text()];
                $.mobile.changePage('#info');
              });
 
							return output;
						}

						// Add title with job title info
						var pagetitle = '<h2>Trends&#58;<br />' +
							app.cache[app.soc].title.toLowerCase() + '</h2>';

						// Clear existing html and add page title to regionmap div
						$('#region-map').html(pagetitle);

						// Build our base svg
						var svg = d3.select('#region-map').append('svg').append('g');

            // Resize svg element to show widget correctly in Firefox browser.
            $('svg', '#region-map').attr('width', window.innerWidth).attr('height', window.innerHeight);

						// Fetch a topojson file of UK EU regions
						d3.json('uk_euregions.json', function(error, uk) {
							var width = $(window).width();
							var height = $(window).height();
							var regions = topojson.feature(uk, uk.objects['uk_regions']);
							var dcolor = d3.scale.linear().domain([-1,0])
                            .range(['#ff0000', '#ff9999']);
	            var icolor = d3.scale.linear().domain([1,0])
                            .range(['#ffa500', '#ffdb99']);

              var projection = d3.geo.albers()
							 .center([2.1, 54.4])
							 .rotate([4.4, 0])
							 .parallels([50, 60])
							 .scale(4.1 * height)
						    .translate([width/2, height/2]);
						  var path = d3.geo.path()
							 .projection(projection);

						  svg.append('path')
							 .datum(regions)
							 .attr('d', path);

						  svg.selectAll('.region')
							 .data(topojson.feature(uk, uk.objects['uk_regions']).features)
							 .enter()
							 .append('path')
							 .classed('region', true)
							 .style('fill', function(d) {
                  var trendCalc = trends[d.id.toLowerCase()].trend;
                  if (trendCalc > 0) {  // trend increasing
                    return icolor(trendCalc);
                  }
                  else if (trendCalc < 0) { // trend increasing
                    return dcolor(trendCalc);
                  }
                  else if (trendCalc === 0) { // trend stable
                    return 'white'; // TODO What do we want to do with stable?
                  }
                })
                .on('mouseover', function(){
                  d3.select(this).style('fill', '#cccc99');
                })
                .on('mouseout', function(){
                  d3.select(this)
                    .style('fill', function(d) {
                      var trendCalc = trends[d.id.toLowerCase()].trend;
                      if (trendCalc > 0) {  // trend increasing
                        return icolor(trendCalc);
                      }
                      if (trendCalc < 0) { // trend increasing
                        return dcolor(trendCalc);
                      }
                      if (trendCalc === 0) { // trend stable
                        return 'white'; // TODO What do we want to do with stable?
                      }
                    }
                    );
                })
						  .attr('d', path).on('click', function(d){
                showPopup(getTrendOutput(d.id));
              });
				      // Append plus and minus to regions
						  d3.selectAll('.region').each(function(reg){
							  var trend = trends[reg.id.toLowerCase()].trend;
							  var centre = path.centroid(reg.geometry);
							  if (trend < 0) {
								  svg.append('rect').style('fill', 'white').style('stroke', '#7a7a5b')
									 .attr('x', function(reg) { return centre[0]-5; })
									 .attr('y', function(reg) { return centre[1]-2; })
									 .attr('width', 10)
									 .attr('height', 4)
                   .on('click', function() {
                     showPopup(getTrendOutput(reg.id));
                   });
							  }
							  if (trend > 0) {
								  svg.append('path').style('fill', 'white').style('stroke', '#7a7a5b')
									 .attr('transform', function() {
										return 'translate(' + centre[0] + ',' + centre[1] + ')';
									})
								.attr('d', d3.svg.symbol().type('cross'))
                .on('click', function() {
                    showPopup(getTrendOutput(reg.id));
                  });
							  }
						  });

						  // Draw some boundaries
						  svg.append('path')
							 .datum(topojson.mesh(uk, uk.objects['uk_regions'], function(a, b) { return a !== b; }))
               .attr('id', 'mysvg')
							 .attr('d', path)
							 .attr('class', 'region-boundary');

              // Draw key.
              var colours = [['#ff0000', '#ff9999'], ['#ffa500', '#ffdb99']];
              var texts   = [['High Decrease', 'Low Decrease'], ['High Increase', 'Low Increase']];

              var i = 1,
                  size = 12, // color block size
                  offset = { x: 0, y: 210 },
                  key = svg.append('g');

              $.each(colours, function(k, v) {
                var a = v[0];
                var b = v[1];

                key.append('rect')
                  .attr('x', offset.x)
                  .attr('y', offset.y + i * size + (i * 5))
                  .attr('height', size)
                  .attr('width', size)
                  .style('fill', a);

                key.append('text')
                  .attr('x', offset.x + size + 3)
                  .attr('y', offset.y + i * size + (i * 5) + 11)
                  .attr('font-size', '0.8em')
                  .text(texts[k][0]);

                i++;

                key.append('rect')
                  .attr('x', offset.x)
                  .attr('y', offset.y + i * size + (i * 5))
                  .attr('height', size)
                  .attr('width', size)
                  .style('fill', b);

                key.append('text')
                  .attr('x', offset.x + size + 3)
                  .attr('y', offset.y + i * size + (i * 5) + 11)
                  .attr('font-size', '0.8em')
                  .text(texts[k][1]);

                i++;
              });
						});
            d.resolve();
					});
				});
			}).promise();
		  $page.data('promise', promise);
		});

		// debug
		window.app = app;

  })(jQuery);

