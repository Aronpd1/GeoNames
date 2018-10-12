//------------GLOBAL VARIABLES DECLARATION

var $topMaxRows = 500; //Max number of records to query for Top table (MAX 500)
var $sortOrder = 0; //Order magnitude asc(true) or desc (false) for Top earthquakes
var $topMagnitude = 6.9; //Set min Richter magnitude for top earthquakes (2.0 to 6.9 are minor, 7+ are mayor)
var $rectangle = ""; //Used to draw the boundaries on the map


//------------FUNCTIONS DECLARATION

//Write a generic error message inside an element for any given id
function genError(id) { 
    $(id).html("<p class='text-center font-italic'>An error has occurred, please try again later</p>");
}

//Sort one array asc(1) or desc (0) by one value key
function sortData(arr, val) {
    arr = arr.sort(function(a, b) {
        if ($sortOrder) return (a[val] > b[val]);
        else return (b[val] > a[val]);
    });
}

//Get current date allowing to substract n years and returning in GeoDate format
function geoDate(minus){
    var today = new Date();
    var day = today.getDate();
    var month = today.getMonth()+1;
    var year = today.getFullYear()-minus;

    if(minus>0){
        day = ((day==29)? day-1:day) //Handle leap year
    }
    return (year + '-' + month + '-' + day);
}

// Deletes all markers from map
function deleteMarkers(markers) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}

// Close all info windows shown in map
function closeInfoW(iWin) {
    for (var i = 0; i < iWin.length; i++) {
        iWin[i].close();
    }
}

//Paint a GoogleMaps rectangle around the city
function paintBound(map,place,markers){

    deleteMarkers(markers);//Delete any markers before moving to new location
    
    if($rectangle){
        $rectangle.setMap(null);//Erases any existing rectangle
    }
    var ne = place.geometry.viewport.getNorthEast();//Get NorthEast coordinates
    var sw = place.geometry.viewport.getSouthWest();//Get SouthWest coordinates
    $rectangle = new google.maps.Rectangle({//Draw rectangle
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF9900',
          fillOpacity: 0.35,
          map: map,
          bounds: {
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
          }
        });

    //Call function to put Earthquake markers on map
    paintEq(map,markers, ne.lat(), sw.lat(), ne.lng(), sw.lng());
}

//From Google:
// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
  function initAutocomplete() {
    var map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 25.6980338, lng: -100.3287375},
      zoom: 13,
      mapTypeId: 'roadmap'
    });

    // Create the search box and link it to the UI element.
    var input = document.getElementById('searchInput');
    var searchBox = new google.maps.places.SearchBox(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    var markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();

      if (places.length == 0) {
        return;
      }

      // Clear out the old markers.
      markers.forEach(function(marker) {
        marker.setMap(null);
      });
      markers = [];

      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();

      places.forEach(function(place) {
        if (!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }
        var icon = {
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(25, 25)
        };

        // Create a marker for each place.
        markers.push(new google.maps.Marker({
          map: map,
          icon: icon,
          title: place.name,
          position: place.geometry.location
        }));

        //Create bounding box and point the earthquakes on map
        paintBound(map,place,markers);

        if (place.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);
    });
  }    


//Paint the 10 monst recent earthquakes on the map
function paintEq(map,markers, north, south, east, west){
    $.ajax({        
        type: "GET"
        ,url: "http://api.geonames.org/earthquakesJSON"
        ,data: "north="+north+"&south="+south+"&east="+east+"&west="+west+"&username=aronpd1&date="+geoDate(0)
        ,dataType:"json"
        ,success: function(data) {
                var dataLength = data.earthquakes.length;
                if(dataLength > 0){
                  $('#errorSpan').html("");  
                    data = data.earthquakes;
                    var infoWins = [];
                    $.each(data,function(key,val){
                        var marker = new google.maps.Marker({
                            map: map,
                            position: {lat: val.lat, lng: val.lng},
                        });
                        var contentString = "<div><p>Date: "+val.datetime
                            +"</p><p>Latitude: "+val.lat
                            +"</p><p>Longitude: "+val.lng
                            +"</p><p>Magnitude: "+val.magnitude+"</p></div>";

                        var infowindow = new google.maps.InfoWindow({
                            content: contentString
                        });

                        marker.addListener('click', function() {
                            closeInfoW(infoWins);
                            infowindow.open(map, marker);
                        });

                        infoWins.push(infowindow);
                        markers.push(marker);
                    });
                }else{
                    $('#errorSpan').html("Nothing to show!");  
                }
            }
        ,error: function(jqXHR,textStatus,errorThrown){
            console.log(textStatus);
            console.log(errorThrown);
            alert("Connection Error: Unable to paint markers");
        }
    });
}

// BONUS Get the top 10 from last year
function topEarthquakes(){
    $.ajax({        
        type: "GET"
        ,url: "http://api.geonames.org/earthquakesJSON"
        ,data: "north=90&south=-90&east=180&west=-180&username=aronpd1&minMagnitude="+$topMagnitude+"&maxRows="+$topMaxRows+"&date="+geoDate(0)
        ,dataType:"json"
        ,success: function(data) {
                var dataLength = data.earthquakes.length;
                if(dataLength > 0){
                    data = data.earthquakes;
                    sortData(data,"magnitude");
                    $("#top10").removeAttr('hidden');
                    var i = 0, j = 0;
                    var dateAgo = new Date(geoDate(1));
                    while (i < 10 && i < dataLength && j < dataLength) {
                        var dataNowGeo = data[j]["datetime"].substring(0, 10);
                        var dateNow = new Date(dataNowGeo);
                        if(dateNow>=dateAgo){
                            $("#top10").append(
                                "<tr><td>"+ dataNowGeo +
                                "</td><td>"+ data[j]["magnitude"] +
                                "</td><td>" + data[j]["lng"] +
                                "</td><td>" + data[j]["lat"] + "</td><td></td><tr>")
                            i++
                        }
                         j++;
                    }
                }else{
                    $("#top10div").html("<p class='text-center font-italic'>Looks like no dangerous earthquakes have occurred this last year! :)</p>")
                }
            }
        ,error: function(jqXHR,textStatus,errorThrown){
            console.log(textStatus);
            console.log(errorThrown);
            genError("#top10div");
        }
    });
}

//------Execute Top10 once document has fully lodaded
$( document ).ready(function() {
    console.log( "Document Ready" );
    topEarthquakes();
});