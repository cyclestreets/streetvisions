// Streetvisions implementation code

/*jslint browser: true, white: true, single: true, for: true, long: true */
/*global $, alert, console, window, jQuery, L, Tipped */

var streetvisions = (function ($) {
	
	'use strict';
	
	var _settings = {
		
		// CycleStreets API; obtain a key at https://www.cyclestreets.net/api/apply/
		cyclestreetsApiBaseUrl: 'https://api.cyclestreets.net',
		cyclestreetsApiKey: 'YOUR_API_KEY',

		// Geocoder API URL; re-use of settings values represented as placeholders {%cyclestreetsApiBaseUrl}, {%cyclestreetsApiKey}, {%autocompleteBbox}, are supported
		geocoderApiUrl: '{%cyclestreetsApiBaseUrl}/v2/geocoder?key={%cyclestreetsApiKey}&bounded=1&bbox={%autocompleteBbox}',
		
		// BBOX for autocomplete results biasing
		autocompleteBbox: '-6.6577,49.9370,1.7797,57.6924',
		
		// Initial map location
		defaultLatitude: false,
		defaultLongitude: false,
		defaultZoom: false,
		
		// Tiles
		tileUrl: false,
		
		// Data
		geojsonData: {}
	};

	// Properties/state
	var _initialToolPosition = null; // Store the initial dragged position of a tool
	var _draggedTool = null; // Div of the tool being dragged
	var _draggedToolObject = null; // Object containing information about the tool being dragged
	var _map; // Class property Leaflet map
	var _leafletMarkers = []; // User-added map markers
	
	// Properties - budgetting feature
	var _startingBudget = 300000; // Original budget
	var _currentBudget = 0; // Remaining budget
	var throttleInProgress = 0; // For throttling budget update
	var _budgetCurrency = '£'; // Budget currency
	
	var _builderInputs = {
		title: [
			{
				element: 'input',
				className: 'vision-title',
				placeholder: 'Name your vision'
			},
			{
				element: 'textarea',
				className: 'vision-description',
				placeholder: 'Click to add a description of your vision'
			},
		],
		questionnaire: {
			questions: [
				'How does your design ensure that people with disabilities are not disadvantaged?',
				'What effects, if any, would your design have on any local businesses, e.g. on deliveries and customer access?',
				'How does your design ensure that access to properties remains possible (even if through-traffic is not permitted)?'
			],
			questionPlaceholder: 'Click to add your answer',
			titleElement: 'h4',
			answerElement: 'input'
		}
	};
	
	// Definitions
	var _toolboxObjects = [
		{
			type: 'cycleParking', 
			description: 'A parking area for bicycles. When bicycle parking facilities are scarce or inadequate, nearby trees or parking meters are often used instead.',
			images: [
				'https://cyclesafe.com/wp-content/uploads/2018/07/urban-bike-parking-cities.jpg',
				'http://njbikeped.org/wp-content/uploads/2017/02/loop.jpg'
			],
			groups: 'cycling',
			icon: 'fa-parking',
			colour: '#069BED',
			price: '10000'
		},
		{
			type: 'cycleLane', 
			description: 'Separated cycle lanes are good for business, reduce congestion, are fantastic value for money, get more people cycling and are what the public wants.',
			images: [
				'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/image_data/file/49647/S113_Salford_Liverpool_Street_trial_site_stop_line_approach_960x640.jpg',
			],
			groups: 'cycling',
			icon: 'fa-road',
			colour: '#433C96',
			price: '75000'
		},
		{
			type: 'pointClosure', 
			description: 'Stop through-traffic to open up the space for cycling and walking',
			images: [
				'https://assets.change.org/photos/8/pw/nx/QCPWnXjnlwmWCUa-800x450-noPad.jpg?1589791887'
			],
			groups: ['walking', 'cycling', 'driving'],
			icon: 'fa-hand-paper',
			colour: '#D52506',
			price: '50000'
		},
		{
			type: 'carParking', 
			description: 'Parking space or spaces for cars.',
			images: [
				'https://i.dailymail.co.uk/i/pix/2012/08/05/article-2184174-005AF28B00000258-584_468x269.jpg'
			],
			groups: 'driving',
			icon: 'fa-parking',
			colour: '#3D6B94',
			price: '35000'
		},
		{
			type: 'disabledParking',
			description: 'A specially reserved parking space.',
			images: ['http://www.airport-parking-shop.co.uk/blog/wp-content/uploads/2014/06/DisabledCarParking.jpg'],
			groups: 'driving',
			icon: 'fa-parking',
			colour: '#2563C5',
			price: '5000'
		},
		{
			type: 'slowerSpeeds',
			description: 'Lowered speed limit.',
			images: [
			],
			groups: 'driving',
			icon: 'fa-car',
			colour: 'gray',
			price: '5000'
		},
		{
			type: 'deliveryBay', 
			description: 'A delivery bay is a space where delivery vehicles can temporarily park while engaging in deliveries, without blocking the pavement.',
			images: [
				'https://i.dailymail.co.uk/i/pix/2012/08/05/article-2184174-005AF28B00000258-584_468x269.jpg'
			],
			groups: 'driving',
			icon: 'fa-truck',
			colour: '#42268C',
			price: '15000'
		},
		{
			type: 'chargingPoint', 
			description: 'A charging station for vehicles.',
			images: [
				'https://images-e.jpimedia.uk/imagefetch/f_auto,ar_3:2,q_auto:low,c_fill/if_h_lte_200,c_mfit,h_201/https://www.scotsman.com/webimage/1.4283675.1478762062!/image/image.jpg'
			],
			groups: ['driving'],
			icon: 'fa-plug',
			colour: '#A745A5',
			price: '20000'
		},
		{
			type: 'trafficCalming', 
			description: 'A device like a road hump, that causes traffic to slow.',
			images: [
				'https://www.weeklygripe.co.uk/AImg/measures.jpg',
				'https://live.staticflickr.com/153/433692163_626384f64c_n.jpg',
			],
			groups: 'driving',
			icon: 'fa-traffic-light',
			colour: '#B13110',
			price: '25000'
		},
		{
			type: 'plantingArea', 
			description: 'Small area for greenery',
			images: [
				'https://www.cis-streetfurniture.co.uk/masterpages/planters/pix/700SS.jpg',
				'https://grassrootsfund.org/sites/default/files/styles/flexslider_full/public/images/groups/blue_hill_raised_garden_beds_summer_2019.jpg?itok=smITpTXj'
			],
			groups: ['publicSpace'],
			icon: 'fa-seedling',
			colour: '#83AD1F',
			price: '8000'
		},
		{
			type: 'tree',
			description: '',
			images: [
				'https://envirotecmagazine.com/wp-content/uploads/2015/09/trees-image.jpg'
			],
			groups: 'publicSpace',
			icon: 'fa-tree',
			colour: '#82CA13',
			price: '3000'
		},
		{
			type: 'crossing',
			description: 'Pedestrian crossing',
			images: [
				'http://www.bridgepointroadmarkings.com/wp-content/uploads/2012/07/pedestrian-crossing.jpg'
			],
			groups: 'walking',
			icon: 'fa-traffic-light',
			colour: '#1650A7',
			price: '15000'
		},
		{
			type: 'pavementImprovement', 
			description: '',
			images: [
				'http://www.basii.org.uk/wp-content/uploads/2014/04/coombe-street-narrow-pavement-300x225.jpeg',
				'https://static.wixstatic.com/media/2cb403_b919ec3607a54f718f5fd0f1c16430e3~mv2.jpg/v1/fill/w_480,h_360,al_c,q_80,usm_0.66_1.00_0.01/2cb403_b919ec3607a54f718f5fd0f1c16430e3~mv2.jpg'
			],
			groups: 'walking',
			icon: 'fa-walking',
			colour: '#1AA8D0',
			price: '27500'
		},
		{
			type: 'parklet', 
			description: 'A parklet is a sidewalk extension that provides more space and amenities for people using the street. Usually parklets are installed on parking lanes and use several parking spaces. Parklets typically extend out from the sidewalk at the level of the sidewalk to the width of the adjacent parking space.',
			images: [
				'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/SFParklet.jpg/220px-SFParklet.jpg'
			],
			groups: 'walking',
			icon: 'fa-cubes',
			colour: '#27824C',
			price: '20000'
		},
		{
			type: 'seating',
			description: 'Public outdoor seating, like a bench or seat.',
			images: [
				'https://www.urbaneffects.co.nz/wp-content/uploads/2016/03/kingsgrove-196x196.png',

			],
			groups: ['walking', 'publicSpace'],
			icon: 'fa-chair',
			colour: '#1A8D8A',
			price: '8000'
		},
		{
			type: 'playArea', 
			description: '',
			images: ['https://www.poole.gov.uk/_resources/assets/inline/full/0/45828.jpg'],
			groups: 'publicSpace',
			icon: 'fa-snowman',
			colour: '#1CBF22',
			price: '32000'
		},
		{
			type:'cafeSpace', 
			description: 'External seating and tables for nearby café/restaurant.',
			images: ['https://i.pinimg.com/originals/f4/64/25/f46425e17f75b496002807d482b6c4b1.jpg'],
			groups: 'publicSpace',
			icon: 'fa-coffee',
			colour: '#0B986B',
			price: '22000'
		},
		{
			type: 'parkingRestriction', 
			description: '',
			images: ['http://thumbs.dreamstime.com/t/parking-restriction-sign-rectangular-yellow-no-waiting-monday-to-saturday-41370190.jpg'],
			groups: 'driving',
			icon: 'fa-parking',
			colour: '#DB9020',
			price: '8000'
		},
		{
			type: 'bollard', 
			description: '',
			images: ['http://www.bollardsolutions.com/wp-content/uploads/2016/08/Automatic-Bollard-BMW-Entrance.png'],
			groups: 'driving',
			icon: 'fa-car-crash',
			colour: '#B13110',
			price: '12000'
		}
	];
	var _toolboxGroupEmoji = {
		cycling: '&#128690;',
		walking: '&#128694;',
		driving: '&#128663;',
		publicSpace: '&#127795;',
	};

	
	return {
		
	// Public functions
		
		// Main function
		initialise: function (config, action)
		{
			// Merge the configuration into the settings
			$.each (_settings, function (setting, value) {
				if (config.hasOwnProperty(setting)) {
					_settings[setting] = config[setting];
				}
			});
			
			// Populate pretty names, adding these to the definitions
			$.each (_toolboxObjects, function (index, tool) {
				_toolboxObjects[index].prettyName = streetvisions.convertCamelCaseToSentence (tool.type);
			});
			
			// Run action, if defined and existing
			if (action) {
				if (typeof streetvisions[action] === 'function') {
					streetvisions[action] ();
				}
			}
			
			// Replace title attribute with better tooltips
			streetvisions.enableTooltips ();
		},
		
		
		// Tooltips
		enableTooltips: function ()
		{
			// Enable tooltips for links with a title, if loaded
			if (typeof Tipped != 'undefined') {
				Tipped.create ('a[title]');
			}
		},
		
		
		// List schemes
		schemeslist: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();

			// Search
			streetvisions.initSearch ();
			
			// Initialise map for each scheme
			$.each (_settings.geojsonData, function (mapId, boundary) {
				streetvisions.leafletMap (mapId, boundary, true);
			});
		},
		
		
		// Add scheme
		schemeadd: function ()
		{
			// Initialise map
			streetvisions.leafletMap ('map');
			
			// Enable drawing
			streetvisions.enableDrawing ();
		},
		
		
		// Drawing
		enableDrawing: function ()
		{
			// FeatureGroup is to store editable layers
			var editableLayers = new L.FeatureGroup ();
			_map.addLayer (editableLayers);
			
			// Define a drawing control
			var drawControl = new L.Control.Draw ({
				position: 'topright',
				edit: {
					featureGroup: editableLayers
				},
				draw: {
					polyline: false,
					circle: false,
					circlemarker: false,
					rectangle: false,
					marker: false
				}
			});
			
			// Helper sub-function to clear existing data
			var clearExisting = function () {
				editableLayers.eachLayer (function (layer) {
					editableLayers.removeLayer (layer);
				});
			}
			
			// Helper sub-function to update the value
			var updateDrawInputValue = function () {
				var data = editableLayers.toGeoJSON ();
				data = JSON.stringify (data);
				$('#form_boundary').val (data);
			};
			
			// Clear on deletion, immediately on using the button; see: https://stackoverflow.com/questions/21125543/
			L.EditToolbar.Delete.include ({
				enable: function () {
					this.options.featureGroup.clearLayers ();
					clearExisting ();
					updateDrawInputValue ();
				}
			});
			
			// Add the control
			_map.addControl (drawControl);
			
			// Set initial value (empty GeoJSON)
			updateDrawInputValue ();
			
			// Function to enable the polygon drawing control; see: https://stackoverflow.com/questions/15775103/
			var enableDrawingControl = function () {
				new L.Draw.Polygon (_map, drawControl.options.polygon).enable ();
			};
			
			// Ensure minimum zoom level
			$(map).click (function () {
				var requireZoom = 16;
				var currentZoom = _map.getZoom ();
				if (currentZoom < requireZoom) {
					var newZoom = Math.min (requireZoom, (currentZoom + 2));
					_map.setZoom (newZoom);
					if (newZoom >= requireZoom) {
						enableDrawingControl ();
						$(map).off ('click');
					}
				} else {
					enableDrawingControl ();
					$(map).off ('click');
				}
			});
			
			// Process the result; see: https://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html#l-draw
			_map.on ('draw:created', function (e) {
				editableLayers.addLayer (e.layer);
				updateDrawInputValue ();
			});
			
			// Process the result
			_map.on ('draw:edited', function (e) {
				clearExisting ();
				e.layers.eachLayer (function (layer) {
					editableLayers.addLayer (layer);
				});
				updateDrawInputValue ();
			});
			
			// Clear existing on draw start
			_map.on ('draw:drawstart', function (e) {
				clearExisting ();
				updateDrawInputValue ();
			});
		},
		
		
		// Show vision
		visionshow: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();
			
			// Discussion
			streetvisions.initDiscussion ();
			
			// Map
			streetvisions.leafletMap ('leaflet', _settings.geojsonData);
			
			// Enable drag to hide panel on mobile
			$('.pull-handle, .expand-handle').on('click', function () {
				$('.header-content').slideToggle();
				$('.expand-handle').toggle();
				$('.map-header h1').toggle();
			});
		},
		
		
		// Show scheme
		schemeshow: function ()
		{
			// Segmented controls
			streetvisions.segmentedControl ();

			// Enable filtering options on scroll
			$(document).scroll(function() {
				var y = $(this).scrollTop();
				if (y > 200) {
					$('.segmented-control-container').fadeIn();
				} else {
					$('.segmented-control-container').fadeOut();
				}
			});
			
			// Add a map into the specified ID with the specified data
			streetvisions.leafletMap ('map', _settings.geojsonData.scheme);
			
			// Initialise map for each scheme
			$.each (_settings.geojsonData.visions, function (mapId, boundary) {
				streetvisions.leafletMap (mapId, boundary, true);
			});

		},
		
		
		// Add vision
		visionadd: function ()
		{
			// Init modal
			streetvisions.initModal ();
			
			// Add toolbox objects from defintion
			streetvisions.populateToolbox ();
			
			// Toolbox drawers
			streetvisions.toolbox ();
			
			// Start Leaflet
			streetvisions.leafletMap ('leaflet', _settings.geojsonData);
			
			// Builder options
			streetvisions.initBuilder ();
			
			// Contextual data
			streetvisions.contextualData ();
		},
		
		
		// Leaflet map
		leafletMap: function (divId, geojsonData, disableInteractivity)
		{
			// Create a map
			_map = L.map (divId).setView ([_settings.defaultLatitude, _settings.defaultLongitude], _settings.defaultZoom);
			
			// Add tile background
			L.tileLayer (_settings.tileUrl, {
				attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
				id: 'mapbox/streets-v11'
			}).addTo (_map);
			
			// Add a layer group to manage dropped tools
			L.layerGroup().addTo (_map);
			
			// Create a lookup of toolbar types to icons
			var toolIcons = {};
			var toolColours = {};
			var toolPrettyNames = {};
			$.each (_toolboxObjects, function (index, tool) {
				toolIcons[tool.type] = tool.icon;
				toolColours[tool.type] = tool.colour;
				toolPrettyNames[tool.type] = tool.prettyName;
			});
			
			// Add the GeoJSON to the map
			if (geojsonData && Object.entries(geojsonData).length) {
				var features = L.geoJSON (geojsonData, {
					
					// Set the correct icon
					pointToLayer: function (feature, latlng) {
						var type = feature.properties.type;
						var icon = streetvisions.fontAwesomeIcon ({icon: toolIcons[type], colour: toolColours[type]});
						return L.marker (latlng, {icon: icon});
					},
					
					// Add the metadata to each popup
					onEachFeature: function (feature, layer) {
						if (!disableInteractivity) {	// If an interactive map
							if (feature.properties) {
								var popupHtml = '<h3>' + streetvisions.htmlentities (toolPrettyNames[feature.properties.type]) + '</h3>';
								popupHtml += '<p>' + streetvisions.htmlentities (feature.properties.description) + '</p>';
								layer.bindPopup (popupHtml);
							}
						}
					}
				});
				features.addTo (_map);
				_map.fitBounds (features.getBounds());
			}
			
			// Disable interactivity if required
			if (disableInteractivity) {
				_map.removeControl (_map.zoomControl);
				_map._handlers.forEach (function (handler) {
					handler.disable ();
				});
			}
		},
		
		
		// Segmented control
		segmentedControl: function ()
		{
			// Constants
			const SEGMENTED_CONTROL_BASE_SELECTOR = ".ios-segmented-control";
			const SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR = ".ios-segmented-control .option input";
			const SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR = ".ios-segmented-control .selection";
			
			forEachElement (SEGMENTED_CONTROL_BASE_SELECTOR, function (elem) {
				elem.addEventListener ('change', updatePillPosition);
			});
			window.addEventListener ('resize',
				updatePillPosition
			); // Prevent pill from detaching from element when window resized. Becuase this is rare I haven't bothered with throttling the event
			
			function updatePillPosition () {
				forEachElement (SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR, function (elem, index) {
					if (elem.checked) {
						moveBackgroundPillToElement (elem, index);
					}
				});
			}
		
			function moveBackgroundPillToElement (elem, index) {
				document.querySelector (SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR).style.transform = 'translateX(' + (elem.offsetWidth * index) + 'px)';
			}
			
			// Helper functions
			function forEachElement (className, fn) {
				Array.from (document.querySelectorAll (className)).forEach (fn);
			}
		},


		populateToolbox: function ()
		{
			// Iterate through each of the toolbox objects
			var html;
			var toolboxGroup;
			var toolboxOpen;
			var toolboxPrettyName;			
			_toolboxObjects.map (function (tool, i) {
				
				// If groups is a string, convert it into an array
				var groups = (!Array.isArray (tool.groups) ? [tool.groups] : tool.groups);
				
				// Iterate through the groups
				var emoji;
				groups.map (function (group) {
					toolboxGroup = $('.toolbox .' + group);
					toolboxPrettyName = streetvisions.convertCamelCaseToSentence (group);
					
					// If there is no toolbox-header for this group, add it. 
					if (toolboxGroup.length === 0) {
						// If this is the first toolbox group, have it open by default
						toolboxOpen = ($('.toolbox-header').length == 0 ? 'toolbox-open' : '');
						
						// Determine the emoji to use for this group
						emoji = _toolboxGroupEmoji[group];
						
						// Build the HTML for the toolbox drawer
						html = `
							<div class="toolbox-header ${group} ${toolboxOpen}">
							<i class="fa fa-chevron-down"></i>
							<h3>${toolboxPrettyName} ${emoji}</h3>
							<div class="group-contents"><ul></ul></div></div>
						`;
						
						// Add this to the toolbox 
						$('div.toolbox').append(html);
					}
					
					// Add this tool to the existing header
					var toolboxGroupUl = $('.toolbox .' + group + ' ul');
					var style = (tool.hasOwnProperty('colour') ? tool.colour : getColourCSS (i, _toolboxObjects.length))
					var price = Number (tool.price).toLocaleString ();
					$(toolboxGroupUl).append (
						`<li data-tool="${tool.type}" class="tool tool-${tool.type}" style="background-color: ${style}; color: white;">
							<i class="info-icon info-${tool.type} fa fa-info-circle"></i>
							<i class="fa ${tool.icon}"></i>
							<p>${tool.prettyName}</p>
							<p class="price">${_budgetCurrency}${price}</p>
						</li>`
					);
				});
			});

			// Generate tooltips for these tools
			var htmlContent = '';
			_toolboxObjects.map (function (tool, i) {
				htmlContent = `
					<h1><i class="fa ${tool.icon}"></i> ${streetvisions.convertCamelCaseToSentence(tool.type)}</h1>
					<p>${tool.description}</p>
				`
				if (tool.hasOwnProperty('images')) {
					tool.images.map (function (image) {
						htmlContent += `<img src=${image} />`
					});
				}
				Tipped.create (`.info-icon.info-${tool.type}`, htmlContent, {skin: 'light', hideOthers: true, padding: '20px', size: 'small',});
			});

			// Generate random colour for tools
			function getColourCSS (i, length) {
				const randomInt = function (min, max) {
					return Math.floor(Math.random() * (max - min + 1)) + min;
				};
				var h = randomInt(0, 360);
				var s = randomInt(42, 98);
				var l = randomInt(30, 50);
				return `hsl(${h},${s}%,${l}%)`;
			}
		},


		capitalizeFirstLetter: function (string) 
		{
			return string.charAt(0).toUpperCase() + string.slice(1);
		},


		convertCamelCaseToSentence: function (string){
			return (string
				.replace(/^[a-z]|[A-Z]/g, function(v, i) {
					return (i === 0 ? v.toUpperCase() : " " + v.toLowerCase());
				})
			);
		},


		// Enable toolbox drawers
		toolbox: function ()
		{
			// Ensure correct default position
			$.each($('.toolbox-header'), function (indexInArray, toolboxHeader) {
				
				// If any of these are NOT set to be open
				if (!$(toolboxHeader).hasClass('toolbox-open')) {
					
					// Hide the contents
					$(toolboxHeader).find ('.group-contents').hide ();

					// Add chevron to the right >
					$(toolboxHeader).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(toolboxHeader).find ('.group-contents').show ();

					// Add down chevron, indicating open
					$(toolboxHeader).find ('i').removeClass ('rotated');
				}
			});

			// Enable toolbox headers to be clickable
			$('.toolbox-header > h3').on ('click', function (event) {
				toggleToolbox (event);
			});

			// Enable toolbox chevrons to be clickable
			$('.toolbox-header > i').on ('click', function (event) {
				toggleToolbox (event);
			});
			
			// Function to toggle a toolbox open or closed
			var toggleToolbox = function (event) {
				
				// Get current toolbox drawer status
				var toolboxHeader = $($(event.target)).closest ('.toolbox-header').first();
				var isCurrentlyOpen = $(toolboxHeader).hasClass ('toolbox-open');
				
				// Close action
				if (isCurrentlyOpen) {
					$(toolboxHeader).removeClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().addClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				
				// Open action
				} else {	// If currently closed
					
					// Close any existing first
					$('.toolbox .toolbox-header i').addClass ('rotated');
					$('.toolbox .toolbox-header.toolbox-open .group-contents').slideUp ();
					$('.toolbox .toolbox-header.toolbox-open').removeClass ('toolbox-open');
					
					// Open new current
					$(toolboxHeader).addClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().removeClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				}
			};
			
			// Enable the toolbox card to be closed
			$('.close-card').on ('click', function (){
				hideHelpCard ();
			});

			// Initially, hide the toolbox popup
			$('.toolbox-card').hide ();

			// Hide help card
			function hideHelpCard () {
				$('.toolbox-card').slideUp ();
			}

			// When clicking a tool, populate the help box
			$('.toolbox .group-contents ul li').on ('click', function () {
				
				var toolType = $(this).data('tool');
				Tipped.show(`.info-icon.info-${toolType}`);
			});
		},


		// Helper function to implement settings placeholder substitution in a string
		settingsPlaceholderSubstitution: function (string, supportedPlaceholders)
		{
			// Substitute each placeholder
			var placeholder;
			$.each(supportedPlaceholders, function (index, field) {
				placeholder = '{%' + field + '}';
				string = string.replace(placeholder, _settings[field]);
			});
			
			// Return the modified string
			return string;
		},
		
		
		throttle: function (fn, delay) {
			return (...args) => {
			  let now = new Date().getTime();
			  if(now - _lastBudgetUpdate < delay) {
				return;
			  }
			  console.log('running')
			  _lastBudgetUpdate = now;
			  return fn(...args);
			}
		},
		
		
		// Update budget
		updateBudget: function() {
			
			// Update screen to match the current budget
			$('.budget-remaining').text(`${_budgetCurrency}${_currentBudget}`).data('currentBudget', _currentBudget);

			// Calculate the colour (<20% red, <50% orange, green )
			var colour = '#83AD1F';
			if (_currentBudget < (_startingBudget * .2)) {
				colour = '#D52506';
			} else if (_currentBudget < (_startingBudget * .5)) {
				colour = '#F2BD54';
			}

			// Animate the number
			var element = $('.budget-remaining').first ();
			element.animateNumber ({
				number: _currentBudget,
				color: colour,

				numberStep: function(now, tween) {
					var flooredNumber = Math.floor(now);
					var target = $(tween.elem);

					flooredNumber = _budgetCurrency + flooredNumber.toLocaleString ();

					// Set text
					target.text(flooredNumber);
				}
			});

			// Set the property of number, so the animation begins from this number next time, as opposed to 0
			element.prop ('number', _currentBudget);
		},
		
		
		// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
		throttleFunction: function (func, delay) {
			// If setTimeout is already scheduled, no need to do anything
			if (throttleInProgress) {
				return
			}

			// Schedule a setTimeout after delay seconds
			throttleInProgress = setTimeout(function () {
				func()

				// Once setTimeout function execution is finished, timerId = undefined so that in <br>
				// the next scroll event function execution can be scheduled by the setTimeout
				throttleInProgress = undefined;
			}, delay)
		},


		// Geocoder, with associated UI functions
		geocoder: function ()
		{
			// Geocoder URL; re-use of settings values is supported, represented as placeholders {%cyclestreetsApiBaseUrl}, {%cyclestreetsApiKey}, {%autocompleteBbox}
			var geocoderApiUrl = streetvisions.settingsPlaceholderSubstitution (_settings.geocoderApiUrl, ['cyclestreetsApiBaseUrl', 'cyclestreetsApiKey', 'autocompleteBbox']);
			
			// Attach the autocomplete library behaviour to the location control
			autocomplete.addTo ('.geocoder input', {
				sourceUrl: geocoderApiUrl,
				select: function (event, ui) {
					var bbox = ui.item.feature.properties.bbox.split(',');	// W,S,E,N
					_map.flyToBounds ([
						[bbox[1], bbox[0]],
						[bbox[3], bbox[2]]
					],{
						duration: 2,
						maxZoom: 14
					});
					
					closeSearchBox ();
					event.preventDefault();
				}
			});
			
			var closeSearchBox = function () {
				$('.geocoder input').animate ({'width': '20px'});
			};
			
			var openSearchBox = function () {
				$('.geocoder input').animate ({'width': '275px'});
				//$('#browse-search-box').focus ();
			};
			
			// Enable search box
			$('#browse-search-box').on('click', function () {
				$(this).focus();
			});
			
			// Avoid double-click / drag in geocoder moving the map; see: https://gis.stackexchange.com/a/104609/58752
			$('.geocoder').on ('mouseover', function (e) {
				_map.dragging.disable ();
			});
			$('.geocoder').on ('mouseout', function (e) {
				_map.dragging.enable ();
			});
			$('.geocoder').on ('dblclick', function (e) {
				e.stopPropagation ();
			});
			
			$('.geocoder-button').on('click', function () {
				openSearchBox ();
			});
			
			$('.geocoder-button').on('mouseover', function () {
				openSearchBox ();
			});
			
			$('.geocoder-button').on('mouseleave', function () {
				setTimeout(function () {
					if ($('.geocoder input').val() == '') {
						closeSearchBox ();
					}
				}, 1500);
			});
			
			// Auto-open search box
			setTimeout (function () {
				openSearchBox ();
			}, 1000);
		},
		
		
		// Builder options
		initBuilder: function ()
		{
			// Add geocoder (with associated UI functions)
			streetvisions.geocoder ();

			// Enable drag to hide panel on mobile
			$('.pull-handle, .expand-handle').on('click', function () {
				$('.header-content').slideToggle();
				$('.expand-handle').toggle();
				$('.map-header h1').toggle();
			});
			
			// Set grabbing cursor as soon as the object has been clicked on
			$('.toolbox .group-contents ul li').mousedown (function (e) {
				$(this).css ('cursor', 'grabbing');
			});
			
			// Disable the help indicator if the user explicitly clicks on the map
			$('.leafletInstructions').click (function () {
				$('.leafletInstructions').addClass ('hidden');
			});

			// At startup load the starting budget
			_currentBudget = _startingBudget;
			streetvisions.updateBudget();
			
			// Allow objects to be draggable onto the map
			$('.toolbox .group-contents ul li').draggable ({
				revert: 'invalid',
				stack: '#leaflet',
				helper: 'clone',
				start: function (e, ui) {
					// Make sure cloned helper floats above other stuff
					$('.ui-draggable').not(ui.helper.css('z-index', '9999')).css( 'z-index', '0');
					
					// Once we start moving a marker, hide all popups
					Tipped.hideAll();

					// Collapse any map info elements
					$('#accordion').accordion('option', 'collapsible', true);
					$('#accordion').accordion('option', 'active', false);
					
					// Disable the help indicator as user has now dragged onto map
					$('.leafletInstructions').addClass ('hidden');
					
					// Store the toolname
					_draggedTool = $(this);
					var tool = $(this).data('tool');
					_draggedToolObject = _toolboxObjects.find ((o) => (o.type === tool));
					_draggedToolObject.colour = $(this).css('background-color');
					
					// Set the cursor
					$(this).css ('cursor', 'grabbing');
					
					// Add dragging style
					$(this).animate ({'opacity': 0.5});
					
					// Save initial position, to be used to return the item to this position when it's dropped
					_initialToolPosition = $(this).offset();
				},
				stop: function () {
					// Add dragging style
					$(this).animate ({'opacity': 1});
					
					// Reset the cursor
					$(this).css ('cursor', 'pointer');

					// Deduct the price of the dropped element from the budget
					_currentBudget -= _draggedToolObject.price;
					streetvisions.updateBudget();
				}
			});

			// Add map as droppable target
			$('#leaflet').droppable({
				drop: function() {
					// Hide element
					$(_draggedTool).animate ({'opacity': 0}, function () {
						
						// Return the element to the box
						var top = _initialToolPosition.top;
						var left = _initialToolPosition.left;
						$(_draggedTool).animate ({'opacity': 1});
						$(_draggedTool).offset ({top, left});
					});
				}
			});
			
			// Check the bounds of a marker (in pixel space), return bool in/out box
			var checkBounds = function (marker) {
				
				// Get the x,y locations of the marker and the map
				var point = _map.latLngToContainerPoint (marker.getLatLng ());
				var size = _map.getSize ();
				
				// Check against padded bounds
				var padding = 15;
				return (
					(point.x >= (0 + padding)) &&
					(point.x <= (size.x - padding)) &&
					(point.y >= (0 + padding + 40)) &&		/* Extra amount to take into account icon height as drag upwards */
					(point.y <= (size.y - 60))				/* Roughly the size of deleteTarget; ideally would reference that directly */
				);
			};
			
			// On drop on map, create an icon
			// Also, create the drag handler for the marker
			var mapdiv = document.getElementById ('leaflet');
			mapdiv.ondrop = function (e) {
				e.preventDefault ();
				
				// Create a new Leaflet Marker
				var coordinates = _map.mouseEventToLatLng (e);
				var id = Date.now().toString();
				var marker = L.marker (coordinates, {
					icon: streetvisions.fontAwesomeIcon (_draggedToolObject),
					draggable: true,
					uniqueId: id
				});
				
				// Handler for Marker deletion
				marker.deleteMarker = function (marker) {
					_map.removeLayer (marker);
				}

				// Save the price of this element
				marker._price = _draggedToolObject.price;
				
				// Handler for Marker move
				marker.streetVisionsId = id;
				marker.on ('move', function (event) {
					
					// Once we start moving a marker, hide all popups
					Tipped.hideAll();

					// Show the delete target
					$('.deleteTarget').show();

					// If we are dragging the icon to near the border of the map, delete it, by checking if the marker is outside those bounds
					if (!checkBounds (marker)) {
						
						// Get the offset of the icon, to send to the puff delete animation
						var offset = getOffset(marker._icon);
						
						// Fade out the icon
						$(this._icon).fadeOut(150, function () {
							// Hide delete target
							$('.deleteTarget').hide();
							
							// Display poof animation
							poofEvent (offset.left, offset.top);

							const budgetUpdate = function () {
								_currentBudget = _currentBudget + Number(marker._price);
								streetvisions.updateBudget ();
							};
							streetvisions.throttleFunction(budgetUpdate, 0);
							
							// Delete the marker from Leaflet
							marker.deleteMarker (marker);
						});
					}
					
					// If we are just dragging it around, update the position of the marker
					var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == id));
					_leafletMarkers[markerKey].latLng = [marker._latlng.lat, marker._latlng.lng];
				});

				// On Marker move end, hide the delete target
				marker.on ('moveend', function () {
					$('.deleteTarget').hide();
				})

				// Show a modal to add description to this marker
				// !TODO check if this is actually one of our toolbox elements being dropped?
				var htmlContent = '<h1><i class="fa fa-hard-hat" style="color: #f2bd54"></i> ' + _draggedToolObject.prettyName + '</h1><i class="fa fa-times-circle exit-popup"></i>';
				htmlContent += '<hr />';
				htmlContent += '<p>Describe how this element improves the area:</p>';
				htmlContent += '<input class="description" autofocus="autofocus" />';
				htmlContent += `<a data-id="${id}" class="button delete-button"><i class="fa fa-trash-alt"></i></a><a class="button button-general close-popup" data-new="true" data-id="${id}" href="#">Save</a>`;
				
				// Add the marker to the map
				marker.addTo (_map);
				
				// Add custom class to this marker
				$(marker._icon).addClass(id);
				
				// Store this marker in a global object
				_leafletMarkers.push({
					object: _draggedToolObject,
					'id': id
				});
				
				// Update the marker object with current coordinates
				var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == id));
				_leafletMarkers[markerKey].latLng = [marker._latlng.lat, marker._latlng.lng];
				
				// Create and display a popup
				Tipped.create ('.' + id, htmlContent, {skin: 'light', hideOthers: true, showOn: 'click', hideOn: false, padding: '20px', size: 'huge', offset: { x: 30, y: 0 }});
				Tipped.show ('.' + id);

				// Give focus to the input box
				$('.tpd-content input').focus();
			};

			// Handler for marker deletion
			$(document).on('click', '.button.delete-button', function (event) {

				// Iterate through the layers until we find a match
				var id = $(this).data('id');
				_map.eachLayer((layer) => {
					if (layer.hasOwnProperty('streetVisionsId') && layer.streetVisionsId == id) {

						// Hide any tooltip
						Tipped.hide('.' + id);

						// Display a poof event
						var offset = getOffset(layer._icon);
						poofEvent (offset.left, offset.top)

						// Remove layer
						layer.remove();

						// Top up the budget
						_currentBudget = _currentBudget + Number(layer._price);
						streetvisions.updateBudget ();
					}
				});
			});

			// On escape, hide tooltips
			$(document).on('keydown', function(event) {
				if (event.key == "Escape") {
					Tipped.hideAll()
				}
			});

			// Hide deletion target on load
			$('.deleteTarget').hide();
			
			// On map move, hide popups
			_map.on('movestart', function(e) {
				Tipped.hideAll();
			});
			
			// Get the offset of an element
			function getOffset(element) {
				const rect = element.getBoundingClientRect();
				return {
					left: rect.left + window.scrollX,
					top: rect.top + window.scrollY
				};
			}

			// Poof of smoke eye-candy animation
			function animatePoof() {
				var bgTop = 0,
					frame = 0,
					frames = 6,
					frameSize = 32,
					frameRate = 80,
					puff = $('#puff');
				var animate = function () {
					if (frame < frames) {
						puff.css({
							backgroundPosition: "0 " + bgTop + "px"
						});
						bgTop = bgTop - frameSize;
						frame++;
						setTimeout(animate, frameRate);
					}
				};
				animate();
				setTimeout("$('#puff').hide()", frames * frameRate);
			}

			// Controller for the poof event
			var poofEvent = function (left, top) {	
				var xOffset = -20;
				var yOffset = -5;
				$(this).fadeOut('fast');
				$('#puff').css({
					left: left - xOffset + 'px',
					top: top - yOffset + 'px'
				}).show();
				animatePoof();
			};
			
			// When clicking close on a popup box, save the details
			$(document).on ('click', '.close-popup', function (event) {
				saveDetails (this);
			});

			// Helper to save details of a marker
			var saveDetails = function (input) {
				var objectId = $(input).data('id');
				var description = $(input).siblings('.description').first().val();
				
				var markerKey = _leafletMarkers.findIndex ((marker) => (marker.id == objectId));
				_leafletMarkers[markerKey].description = description;

				Tipped.hide('.' + objectId);
				
				// If this was a first-time popup, delete it and add a normal one without the "New marker" title
				if ($(input).data('new')){
					Tipped.remove('.' + objectId);
					var typeOfObject = streetvisions.convertCamelCaseToSentence(_leafletMarkers[markerKey].object.type);
					var html = '';
					html += `<h1><i class="fa fa-hard-hat" style="color: #f2bd54"></i> ${typeOfObject}</h1><i class="fa fa-times-circle exit-popup"></i>`;
					html += '<hr>';
					html += '<p>Edit this marker in the box below:</p>';
					html += `<textarea class="description" rows="4">${description}</textarea>`;
					html += `<a data-id="${objectId}" class="button delete-button"><i class="fa fa-trash-alt"></i></a><a class="button button-general close-popup" data-new="false" data-id="${objectId}" href="#">Save</a>`;
					Tipped.create('.' + objectId, html, {skin: 'light', size: 'huge', hideOthers: true, offset: { x: 30, y: 0 }});
				}
			};

			// Close popup when pressing enter key
			document.addEventListener('keypress', function (e) {
				if (e.key === 'Enter') {
					if ($(e.target).hasClass ('description')) {
						var input = $(e.target).siblings ('.button').first();
						saveDetails (input);
					}
				}
			});

			// Exit popup without saving
			$(document).on('click', '.exit-popup', function () {
				Tipped.hideAll();
			});

			// Populate accordion with questions
			var populateQuestions = function () {
				$('.title').html(_builderInputs.title.map(
					inputInfo => 
						`<${inputInfo.element} class="untitled required ${inputInfo.className}" placeholder="${inputInfo.placeholder}">`
					).join(''));

				$('.questionnaire').html(_builderInputs.questionnaire.questions.map(
					question => 
						`<div class="question">
							<${_builderInputs.questionnaire.titleElement}>${question}</${_builderInputs.questionnaire.titleElement}>
							<${_builderInputs.questionnaire.answerElement} class="description untitled required" placeholder="${_builderInputs.questionnaire.questionPlaceholder}">
						</div>`
					).join(''));
			};
			populateQuestions();

			// Enable vision info accordion
			var icons = {
				header: 'fa fa-chevron-right',
				activeHeader: 'fa fa-chevron-down'
			  };
			$('#accordion').accordion({
				active: false,
				heightStyle: 'content',
				icons: icons,
				collapsible: true
			});

			// After initialising accordion, animate activating the first tab
			setTimeout(() => {
				$('#accordion').accordion('option', 'active', 0);
			}, 500);
			
			// Put focus in first box when an accordion panel is opened
			$('#accordion').on ('accordionactivate', function (event, ui) {
				if (!$.isEmptyObject (ui.newPanel)) {
					var inputs = $(ui.newPanel).find ('input');
					if (inputs[0]) {
						inputs[0].focus ();
					}
				}
			});
			
			// When clicking on the title bar, make it editable
			$('.builder .title input, .builder .title textarea, .builder input.description').on ('click', function (event){
				removeUntitledClass (event.target);
			});

			// When clicking the description field, expand it to indicate we weant more content
			$('.vision-description').on('focus', function () {
				// Only do this if we are in statu virginem
				if ($('.vision-description').first().hasClass('untitled')) {
					$('.vision-description').animate({'min-height': '60px'});
				}
			});

			// After we have filled out a description, show the next accordion
			$('.vision-description').on('blur', function () {
				if ($('.vision-description').val ()) {		// Only if it now has a value
					if (!$('.vision-description').first().hasClass('untitled')) {
						$('#accordion').accordion('option', 'active', 1 );
					}
				}
			});

			// Loop through inputs to check completion status
			var checkIfSectionIsComplete = function () {
				var titleComplete = true;
				// For each of the title questions
				_builderInputs.title.map(element => {
					// For any elements matching this descriptor
					if (!$(`.${element.className}`).first().val()) {
						// Has not been completed
						titleComplete = false;
					}
				})

				if (titleComplete) {
					$('.title-header i').removeClass();
					$('.title-header i').addClass('fa fa-check complete animate__animated animate__heartBeat')
				}

				var questionnaireComplete = true;
				$.each($(`.questionnaire ${_builderInputs.questionnaire.answerElement}`), function (indexInArray, input) { 
					if (!$(input).val()) {
						questionnaireComplete = false;
					}
				});

				if (questionnaireComplete) {
					$('.questionnaire-header i').removeClass();
					$('.questionnaire-header i').addClass('fa fa-check complete animate__animated animate__heartBeat')
				}

				return (titleComplete && questionnaireComplete);
			}

			// Check to see if each section has been filled out
			$('.untitled.required').on('keyup', function () {
				checkIfSectionIsComplete();
			});
	
			// If we have filled out all the fields, collapse all parts of the accordion
			$('.description').on('blur', function () {
				if (checkIfSectionIsComplete()) {
					$('#accordion').accordion('option', 'collapsible', true);
					$('#accordion').accordion('option', 'active', false);
				}
			});

			// Remove untitled status
			var removeUntitledClass = function (target) {
				// Change the opacity to indicate action
				$(target).removeClass ('untitled');
			};

			// When clicking publish button, check if all fields have been filled in
			$('.publish').on('click', function (event) {
				// If all fields aren't filled out, don't publish
				if (!checkIfSectionIsComplete()) {
					streetvisions.showModal ({
						text: '<i class="fa fa-exclamation"></i> Oops...',
						description: "It seems you haven't filled out all the information we need for this vision yet. Please check you have filled out the title, description, and FAQ questions."
					});
					event.preventDefault();
					return;
				}

				// Gather the questionnaire data into an object
				var questionnaire = [];
				$.each ($('.question'), function (indexInArray, object) {
					questionnaire.push ({
						question: $(object).find('h4').first().text(),
						answer: $(object).find('input').first().val()
					});
				});

				var geojsonFeatures = {
					type: 'FeatureCollection',
					features: _leafletMarkers.map ((marker) => (
						{
							type: 'Feature',
							properties: {
								description: marker.description,
								type: marker.object.type
							},
							geometry: {
								type: 'Point',
								coordinates: [marker.latLng[1], marker.latLng[0]]
							}
						}
					))
				};
				
				// Populate hidden form with stringified object
				$('#name').attr('value', $('.vision-title').first().val());
				$('#description').attr('value', $('.vision-description').first().val());
				$('#components').attr('value', JSON.stringify(geojsonFeatures));
				$('#questionnaire').attr('value', JSON.stringify(questionnaire));
			});
		},
		
		
		// Function to create a font awesome -based icon
		fontAwesomeIcon: function (toolObject)
		{
			// Get icon of specified tool
			var icon = toolObject.icon;
			var colour = toolObject.colour;
			
			return L.divIcon({
				html: `
				<span class="fa-stack fa-2x">
 					<i class="fas fa-map-marker fa-stack-2x" style="color: ${colour}"></i>
 					<i class="fa ${icon} fa-stack-1x" style="color: white"></i>
				</span>
				`,
				iconSize: [41, 62],
				iconAnchor: L.point(41, 12),
				className: 'leafletFontAwesomeIcon'
			});
		},
		
		
		// Function to display a modal
		showModal: function (modalObject, htmlContent = false, onClick = false)
		{
			if (modalObject) {
				$('.modalBackground h1').html(modalObject.text);
				$('.modalBackground p').text(modalObject.description);
			} else {
				$('.modalContent .innerContent').html (htmlContent);
			}
			
			if (onClick) {
				$(document).on ('click', '.modal .ok-button', function () {
					onClick();
				});
			}

			$('.modalBackground').show();
		},
		
		
		initModal: function ()
		{
			$('.modal .button').on ('click', function () {
				$('.modalBackground').hide();
			});
		},


		// Enable the discussion functionality
		initDiscussion: function ()
		{
			// Ensure correct default position
			$.each($('.discussion-header'), function (indexInArray, discussion) {
				
				// If any of these are NOT set to be open
				if (!$(discussion).hasClass('discussion-open')) {
					
					// Hide the contents
					$(discussion).find ('.answer').hide ();

					// Add chevron to the right >
					$(discussion).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(discussion).find ('.answer').show ();

					// Add down chevron, indicating open
					$(discussion).find ('i').removeClass ('rotated');
				}
			});

			// Enable discussion headers to be clickable
			$('.discussion-header > h3').on ('click', function (event) {
				toggleDiscussion (event);
			});

			// Enable discussion chevrons to be clickable
			$('.discussion-header > i').on ('click', function (event) {
				toggleDiscussion (event);
			});

			// Function to toggle a discussion open or closed
			var toggleDiscussion = function (event) {
				// Get current discussion drawer status
				var discussionHeader = $($(event.target)).closest ('.discussion-header').first();
				var isOpen = $(discussionHeader).hasClass ('discussion-open');

				if (isOpen) {
					$(discussionHeader).removeClass ('discussion-open');
					$(discussionHeader).find ('i').first ().addClass ('rotated');
					$(discussionHeader).find ('.answer').first ().slideToggle ();
				} else {
					$(discussionHeader).addClass ('discussion-open');
					$(discussionHeader).find ('i').first ().removeClass ('rotated');
					$(discussionHeader).find ('.answer').first ().slideToggle ();
				}
			};

			// Handler for creating new discussion topic
			const handleNewDiscussion = function () {
				// Get new discussion topic
				var newTopic = $('.newTopicTitle').val();
				$('.modalBackground').hide();
			};
			
			// Enable a new discussion to be created (display new discussion modal)
			$('.new-topic').on ('click', function () {
				var htmlContent = '<h1><i class="fa fa-plus-circle"></i> New discussion</h1>';
				htmlContent += '<hr>';
				htmlContent += '<p>Please enter a short topic title for this discussion:</p>';
				htmlContent += '<input class="newTopicTitle" placeholder="New topic..." />';
				streetvisions.showModal(false, htmlContent, handleNewDiscussion);
			});
		},

		
		// Initialise the search box
		initSearch: function ()
		{
			$('#search').on ('keyup', function () {
				var value = $(this).val ().toLowerCase ();
				$('.schemes ul li').filter (function () {
					$(this).toggle ($(this).text ().toLowerCase ().indexOf (value) > -1);
				});
			});
		},
		
		
		// Contextual data (e.g. cycle parking, speed limits)
		contextualData: function ()
		{
			// Define the layers and their API calls
			var layers = {
				cycleparking: _settings.cyclestreetsApiBaseUrl + '/v2/pois.locations?type=cycleparking&fields=id,name,osmTags[capacity,access,bicycle_parking,covered],nodeId',
				dublinbikelanes: '/libraries/streetvisions/images/dublinbikelanes.geojson',
				speedlimits: '/libraries/streetvisions/images/speedlimits.geojson',
				modalfilters: _settings.cyclestreetsApiBaseUrl + '/v2/advocacydata.modalfilters',
			};
			
			// End if not present
			var geojsonLayer;
			$('#contextualdata input').change (function (e) {
				
				if (this.checked) {
					
					// Determine the data URL
					var layer = this.name;
					var url = layers[layer];
					
					// Get the data
					$.ajax ({
						type: 'GET',
						url: url,
						dataType: 'json',
						data: {
							key: _settings.cyclestreetsApiKey,
							bbox: _map.getBounds ().toBBoxString ()
						},
						success: function (data) {
							geojsonLayer = L.geoJson (data, {
								
								// Set icon
								pointToLayer: function (feature, latlng) {
									var markerProperties = {
										icon: L.icon ({
											iconUrl: feature.properties.iconUrl || 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
											iconSize: 20
										})
									};
									var icon = L.marker (latlng, markerProperties);
									return icon;
								},
								
								// Set popup
								onEachFeature: function (feature, layer) {
									var popupContent = streetvisions.htmlTable (feature.properties)
									layer.bindPopup (popupContent);
								},
								
								// Lines
								style: function (feature) {
									return {
										color:   (feature.properties.maxspeed < 50 ? 'green' : 'red'),
										weight:  (feature.properties.maxspeed < 50 ? 2 : 4),
										opacity: (feature.properties.maxspeed < 50 ? 0.5 : 1),
									}
								}
								
							}).addTo (_map);
						}
					});
					
				} else {
					_map.removeLayer (geojsonLayer);
				}
			});
		},
		
		
		// Function to create a table from key,value pairs
		htmlTable: function (data)
		{
			// Construct the table
			var html = '<table>';
			$.each (data, function (key, value) {
				if (key == 'iconUrl') {return /* i.e. continue */;}
				key   = streetvisions.htmlentities (key);
				value = streetvisions.htmlentities (value);
				html += '<tr><td>' + key + ':</td><td><strong>' + value + '</strong></td></tr>';
			});
			html += '</table>';
			
			// Return the HTML
			return html;
		},
		
		
		// Function to escape entities in a string
		htmlentities: function (value)
		{
			if (typeof value != 'string') {return value;}
			return value.replace (/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}
	};
	
} (jQuery));
