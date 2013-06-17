'use strict';
var regions = {
    'London': 1,
    'East Midlands': 6,
    'East': 3,
    'North East': 9,
    'Northern Ireland': 12,
    'North West': 8,
    'Scotland': 11,
    'South East': 2,
    'South West': 4,
    'Wales': 10,
    'West Midlands': 5,
    'Yorkshire and the Humber': 7
  };

var mapitRegions = {
    '11806': 1,
    '11805': 6,
    '11804': 3,
    '11812': 9,
    '16869': 12,
    '11807': 8,
    '11808': 11,
    '11811': 2,
    '11814': 4,
    '11813': 10,
    '11809': 5,
    '11810': 7
  };


var saneRegions = {
    'London': 1,
    'the East Midlands': 6,
    'the Eastern Region': 3,
    'the North East': 9,
    'Northern Ireland': 12,
    'the North West': 8,
    'Scotland': 11,
    'the South East': 2,
    'the South West': 4,
    'Wales': 10,
    'the West Midlands': 5,
    'Yorkshire and the Humber': 7
  };

function getRegionName(id) {
    if (id) {
      return _.invert(saneRegions)[id.toString()];
    } else {
      return 'the UK';
    }
  }

function getUserLocation(cb) {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(function(pos){
      $.ajax({
        url: 'http://mapit.mysociety.org/point/4326/'+pos.coords.longitude+','+pos.coords.latitude+'?type=EUR',
        dataType: 'json'
      }).done(function(data){
        var mcode = $.map(data, function(loc,code){ return code; })[0];
        cb(mapitRegions[mcode]);
      });
    }, function(){
      cb(null);
    });
  } else {
    cb(null);
  }
}
