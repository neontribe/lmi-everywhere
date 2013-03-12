'use strict';

angular.module('lmiApp')
    .controller('SocView', function ($scope, $resource, $location, $cookieStore) {
        var Socq = $resource('http://api.lmiforall.org.uk/api/soc/search');
        var Soc = $resource('http://api.lmiforall.org.uk/api/soc/code/:soc')
        var Wfp = $resource('http://api.lmiforall.org.uk/api/wf/predict');
        var chart = null;
        $scope.results = [];
        $scope.search = function() {
            $.mobile.loading('show');
            $scope.results = Socq.query({q:$scope.query});
            var timer = setInterval(function(){
                $('#list ul').listview('refresh');
                if ($('#list ul').hasClass('ui-listview') && ($('#list ul li').length > 1)) {
                    clearInterval(timer);
                }
            }, 100);
            
          };
        $scope.choose = function(code) {
            $.mobile.loading('show');
            $scope.soc = Soc.get({soc: code});
            
            $cookieStore.put('soc', code);
            $scope.prediction = Wfp.get({soc: code, region: 3}, function(pred) {
                var data = $.map(pred.predictedEmployment, function(v){
                    return {
                        x: new Date(v.year.toString()).getTime() / 1000,
                        y: v.employment
                    }
                });
                $('#chart').empty();
                chart = new Rickshaw.Graph( {
                    element: document.querySelector("#chart"),
                    min: 'auto',
                    width: $('body').width(),
                    height: $(window).height() * 0.45,
                    series: [{
                        color: 'steelblue',
                        data: data
                    }]
                } );
                var axes = new Rickshaw.Graph.Axis.Time( { graph: chart } );
                chart.render();
            });
            
          };

        $scope.clear = function() {
            $cookieStore.remove('soc');
          };

        if ($cookieStore.get('soc')) {
          $scope.choose($cookieStore.get('soc'));
          setTimeout(function(){
            jQuery.mobile.changePage('#info');
          }, 1000);
        }
      });

