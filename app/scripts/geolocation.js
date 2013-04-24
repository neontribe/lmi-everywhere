// Extend number to return radians
Number.prototype.toRad = function() {
    return this * Math.PI / 180;
}

/*
 * Convert latitude and longitude coordinates into OS grid references
 *
 * Code adapted from http://www.movable-type.co.uk/scripts/latlong-gridref.html
 */
function LatLongToOSGrid(p) {
    var lat = p.latitude.toRad(), lon = p.longitude.toRad();

    var a = 6377563.396, b = 6356256.910;          // Airy 1830 major & minor semi-axes
    var F0 = 0.9996012717;                         // NatGrid scale factor on central meridian
    var lat0 = (49).toRad(), lon0 = (-2).toRad();  // NatGrid true origin
    var N0 = -100000, E0 = 400000;                 // northing & easting of true origin, metres
    var e2 = 1 - (b*b)/(a*a);                      // eccentricity squared
    var n = (a-b)/(a+b), n2 = n*n, n3 = n*n*n;

    var cosLat = Math.cos(lat), sinLat = Math.sin(lat);
    var nu = a*F0/Math.sqrt(1-e2*sinLat*sinLat);              // transverse radius of curvature
    var rho = a*F0*(1-e2)/Math.pow(1-e2*sinLat*sinLat, 1.5);  // meridional radius of curvature
    var eta2 = nu/rho-1;

    var Ma = (1 + n + (5/4)*n2 + (5/4)*n3) * (lat-lat0);
    var Mb = (3*n + 3*n*n + (21/8)*n3) * Math.sin(lat-lat0) * Math.cos(lat+lat0);
    var Mc = ((15/8)*n2 + (15/8)*n3) * Math.sin(2*(lat-lat0)) * Math.cos(2*(lat+lat0));
    var Md = (35/24)*n3 * Math.sin(3*(lat-lat0)) * Math.cos(3*(lat+lat0));
    var M = b * F0 * (Ma - Mb + Mc - Md);              // meridional arc

    var cos3lat = cosLat*cosLat*cosLat;
    var cos5lat = cos3lat*cosLat*cosLat;
    var tan2lat = Math.tan(lat)*Math.tan(lat);
    var tan4lat = tan2lat*tan2lat;

    var I = M + N0;
    var II = (nu/2)*sinLat*cosLat;
    var III = (nu/24)*sinLat*cos3lat*(5-tan2lat+9*eta2);
    var IIIA = (nu/720)*sinLat*cos5lat*(61-58*tan2lat+tan4lat);
    var IV = nu*cosLat;
    var V = (nu/6)*cos3lat*(nu/rho-tan2lat);
    var VI = (nu/120) * cos5lat * (5 - 18*tan2lat + tan4lat + 14*eta2 - 58*tan2lat*eta2);

    var dLon = lon-lon0;
    var dLon2 = dLon*dLon, dLon3 = dLon2*dLon, dLon4 = dLon3*dLon, dLon5 = dLon4*dLon, dLon6 = dLon5*dLon;

    var N = I + II*dLon2 + III*dLon4 + IIIA*dLon6;
    var E = E0 + IV*dLon + V*dLon3 + VI*dLon5;

    return [E, N];
}

var regions = {
    'London': 1,
    'East Midlands': 6,
    'Eastern': 3,
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
}

function euroRegionToLMIregion(region) {
    return regions[region];
}

function getRegionName(id) {
    if (id) {
        return _.invert(saneRegions)[id.toString()];
    } else {
        return "the UK";
    }
    
};

function getUsersLocation(cb)
{
    if ('geolocation' in navigator) {

        var EN = null;

        navigator.geolocation.getCurrentPosition(function(pos){

            EN = LatLongToOSGrid(pos.coords);
            getRegionFromLatLong(EN, cb);

        }, function(error){
            cb(null);
        });

    } else {
        console.log('No geolocation');
    }
}

function getRegionFromLatLong(coords, cb)
{
    $.getJSON('http://mapit.mysociety.org/point/27700/'+coords[0]+','+coords[1]+'?type=EUR', function(data){
        $.each(data, function(){
            cb(euroRegionToLMIregion(this.name));
        });
    });
}
