document.addEventListener("DOMContentLoaded", function() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiMjFpc3IwNTciLCJhIjoiY2x2a2swZTNxMXd2ZTJpbzRvcW95amRtMSJ9.rkkQ3GsFRB4DKOCdj_bc0w';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [77.5802, 11.2735], // Your fixed location
        zoom: 12
    });

    var myLocation = [77.5185, 11.2400];
    map.on('load', function() {
        var destination = [77.6070, 11.2742];

        // Add marker for your location
        var elMyLocation = document.createElement('div');
        elMyLocation.className = 'current-location-marker';
        var myLocationMarker = new mapboxgl.Marker(elMyLocation)
            .setLngLat(myLocation)
            .addTo(map);

        map.on('zoom', function() {
            // Update myLocation marker position on zoom
            myLocationMarker.setLngLat(myLocation);
        });

        var startingLocations = [
            { id: "65", coordinates: [77.5047, 11.2425], destination: destination, stops: [
                { stop: [77.5198, 11.2453], visibility: true },
                { stop: [77.5383, 11.2485], visibility: true },
                { stop: [77.5844, 11.2755], visibility: true }
            ] }, 
            { id: "43", coordinates: [77.7172, 11.3428], destination: destination, stops: [
                { stop: [77.7300, 11.3400], visibility: true },
                { stop: [77.7350, 11.3450], visibility: true },
                { stop: [77.7400, 11.3500], visibility: true }
            ] }, 
            { id: "20", coordinates: [77.6511, 11.1654], destination: destination, stops: [
                { stop: [77.6600, 11.1600], visibility: true },
                { stop: [77.6650, 11.1650], visibility: true },
                { stop: [77.6700, 11.1700], visibility: true }
            ] }, 
            { id: "12", coordinates: [77.6772, 11.3205], destination: destination, stops: [
                { stop: [77.6900, 11.3200], visibility: true },
                { stop: [77.6950, 11.3250], visibility: true },
                { stop: [77.7000, 11.3300], visibility: true }
            ] } 
        ];

        var busMarkers = [];
        startingLocations.forEach(function(location, index) {
            var el = document.createElement('div');
            el.className = 'bus-marker';

            var marker = new mapboxgl.Marker(el)
                .setLngLat(location.coordinates)
                .addTo(map);
                marker.busId = index; // Store the bus ID in the marker

                // Add click event listener to the marker to show route path
                marker.getElement().addEventListener('click', function() {
                    showRoutePath(index);
                });
            busMarkers.push({ marker: marker, destination: location.destination, stops: location.stops, id: index });
        });

        function showRoutePath(busId) {
            // Remove existing route layers and stop markers
            var existingLayers = map.getStyle().layers.filter(layer => layer.id.startsWith('route-') || layer.id.startsWith('stop-'));
            existingLayers.forEach(layer => map.removeLayer(layer.id));
            existingLayers.forEach(layer => map.removeSource(layer.id));

            var bus = busMarkers.find(bus => bus.id === busId);
            var currentLngLat = bus.marker.getLngLat();
            var destination = bus.destination;

            var directionsRequest = 'https://api.mapbox.com/directions/v5/mapbox/driving/' +
                currentLngLat.lng + ',' + currentLngLat.lat + ';' + destination[0] + ',' + destination[1] +
                '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;

            axios.get(directionsRequest)
                .then(response => {
                    var route = response.data.routes[0];
                    var routeGeometry = route.geometry;

                    // Set myLocation to a coordinate along the route path
                    var index = Math.floor(routeGeometry.coordinates.length / 2); // Get the middle index of the coordinates array
                    myLocation = routeGeometry.coordinates[index]; // Set myLocation to the coordinate at the middle index

                    // Add the route layer to the map
                    map.addLayer({
                        'id': 'route-' + bus.id,
                        'type': 'line',
                        'source': {
                            'type': 'geojson',
                            'data': {
                                'type': 'Feature',
                                'properties': {},
                                'geometry': {
                                    'type': 'LineString',
                                    'coordinates': routeGeometry.coordinates
                                }
                            }
                        },
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': '#0000FF', // Blue color
                            'line-width': 4
                        }
                    });

                    // Add markers for the stops
                    bus.stops.forEach((stop, stopIndex) => {
                        var stopEl = document.createElement('div');
                        stopEl.className = 'stop-marker';
                        stopEl.style.backgroundColor = stop.visibility ? 'green' : 'red'; // Set color based on visibility

                        var stopMarker = new mapboxgl.Marker(stopEl)
                            .setLngLat(stop.stop)
                            .addTo(map);

                        // Add click event listener to show/hide the stop
                        stopMarker.getElement().addEventListener('click', function() {
                            stop.visibility = !stop.visibility;
                            showRoutePath(busId); // Refresh the route path to reflect the stop visibility changes
                        });

                        // Add the stop marker to the map
                        map.addLayer({
                            'id': 'stop-' + bus.id + '-' + stopIndex,
                            'type': 'circle',
                            'source': {
                                'type': 'geojson',
                                'data': {
                                    'type': 'Feature',
                                    'properties': {},
                                    'geometry': {
                                        'type': 'Point',
                                        'coordinates': stop.stop
                                    }
                                }
                            },
                            'paint': {
                                'circle-radius': 6,
                                'circle-color': stop.visibility ? 'green' : 'red' // Set color based on visibility
                            }
                        });
                    });

                    // Update the myLocation marker
                    if (map.getSource('myLocation')) {
                        map.getSource('myLocation').setData({
                            'type': 'FeatureCollection',
                            'features': [{
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': myLocation
                                }
                            }]
                        });
                    }
                })
                .catch(error => console.error('Error fetching directions:', error));
        }

        function moveBuses() {
            busMarkers.forEach(function(bus) {
                var currentLngLat = bus.marker.getLngLat();
                var destination = bus.destination;
                var stops = bus.stops;

                var directionsRequest = 'https://api.mapbox.com/directions/v5/mapbox/driving/' +
                    currentLngLat.lng + ',' + currentLngLat.lat + ';' + destination[0] + ',' + destination[1] +
                    '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;

                axios.get(directionsRequest)
                    .then(response => {
                        var route = response.data.routes[0];
                        var routeGeometry = route.geometry;

                        map.addLayer({
                            'id': 'route-' + bus.id,
                            'type': 'line',
                            'source': {
                                'type': 'geojson',
                                'data': {
                                    'type': 'Feature',
                                    'properties': {},
                                    'geometry': {
                                        'type': 'LineString',
                                        'coordinates': routeGeometry.coordinates
                                    }
                                }
                            },
                            'layout': {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            'paint': {
                                'line-color': '#0000FF', // Blue color
                                'line-width': 4
                            }
                        });

                        var i = 0;
                        var interval = setInterval(function() {
                            if (i >= routeGeometry.coordinates.length) {
                                clearInterval(interval);
                                return;
                            }
                        
                            var newPosition = routeGeometry.coordinates[i];
                            bus.marker.setLngLat(newPosition);
                            i++;

                            // Check if bus is at a stopping point
                            var currentStop = stops.find(stop => {
                                var stopDistance = turf.distance(
                                    turf.point(stop.stop),
                                    turf.point([newPosition[0], newPosition[1]])
                                ) * 1000; // Convert distance to meters
                                return stopDistance < 400; // Adjust the distance threshold to 400 meters
                            });

                            if (currentStop) {
                                // Show popup message when near a stop
                                alert('Stopping');

                                // Change plot visibility
                                bus.marker.getElement().style.visibility = currentStop.visibility ? 'visible' : 'hidden';
                            }

                            // If the distance is less than 2000 meters (2km), mark the bus green
                            var distance = turf.distance(
                                turf.point([newPosition[0], newPosition[1]]),
                                turf.point([myLocation[0], myLocation[1]])
                            ) * 1000; // Convert distance to meters

                            if (distance < 2000) {
                                bus.marker.getElement().style.backgroundImage = "url('img/2.png')"; // Change bus marker to green
                            } else {
                                bus.marker.getElement().style.backgroundImage = "url('img/1.png')"; // Change bus marker to red
                            }
                        }, 2000); // Adjust the interval for slower/faster movement
                    })
                    .catch(error => console.error('Error fetching directions:', error));
            });
        }
        moveBuses();
    });
});
