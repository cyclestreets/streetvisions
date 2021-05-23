<?php

# Schemes model
class schemesModel
{
	# Constructor
	public function __construct ($databaseConnection, $settings)
	{
		# Convert arguments to properties
		$this->databaseConnection = $databaseConnection;
		$this->settings = $settings;
	}
	
	
	# Database definition
	private function databaseStructure ()
	{
		return $sql = "
			CREATE TABLE `schemes` (
			  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Automatic key',
			  `moniker` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Moniker',
			  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Scheme name',
			  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Description',
			  `boundary` geometry NOT NULL COMMENT 'Boundary',
			  `postcodeArea` VARCHAR(255) NOT NULL COMMENT 'Postcode area',
			  `link` text COLLATE utf8mb4_unicode_ci COMMENT 'Link giving more info',
			  `photo` int(11) DEFAULT NULL COMMENT 'Photo ID',
			  `private` tinyint(1) DEFAULT NULL COMMENT 'Private?',
			  `deleted` tinyint(1) DEFAULT NULL COMMENT 'Deleted?',
			  `person` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Creator name',
			  `username` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'CycleStreets username',
			  `createdAt` datetime NOT NULL COMMENT 'Created at',
			  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated at',
			  PRIMARY KEY (`id`),
			  SPATIAL KEY `boundary` (`boundary`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table of schemes';
		";
	}
	
	
	
	# Get scheme
	public function getScheme ($moniker)
	{
		# Get the scheme from the database
		if (!$scheme = $this->databaseConnection->selectOne ($this->settings['database'], 'schemes', array ('moniker' => $moniker), '*, ST_AsGeoJSON(boundary) AS boundary')) {return array ();}
		
		# Format the data
		$scheme = $this->decorateScheme ($scheme);
		
		# Return the scheme
		return $scheme;
	}
	
	
	# Get schemes, indexed by moniker
	public function getSchemes ()
	{
		# Get the schemes from the database
		if (!$schemesById = $this->databaseConnection->select ($this->settings['database'], 'schemes', array (), '*, ST_AsGeoJSON(boundary) AS boundary')) {return array ();}
		
		# Reindex by moniker
		$schemes = array ();
		foreach ($schemesById as $scheme) {
			$moniker = $scheme['moniker'];
			$schemes[$moniker] = $scheme;
		}
		
		# Format the data
		foreach ($schemes as $moniker => $scheme) {
			$schemes[$moniker] = $this->decorateScheme ($scheme);
		}
		
		# Return the schemes
		return $schemes;
	}
	
	
	# Scheme data decorator
	private function decorateScheme ($scheme)
	{
		# Remove internal fields
		unset ($scheme['private']);
		unset ($scheme['deleted']);
		unset ($scheme['username']);
		unset ($scheme['createdAt']);
		unset ($scheme['updatedAt']);
		
		#!# For now, set upvotes to random value, pending database implementation
		$scheme['votes'] = strlen ($scheme['name']);
		
		# Return the scheme
		return $scheme;
	}
	
	
	# Add scheme
	public function addScheme ($scheme, &$error = false)
	{

		# Add the postcode area
		$boundary = json_decode ($scheme['boundary'], true);
		$scheme['postcodeArea'] = $this->getPostcodeArea ($boundary['features'][0]['geometry']);
		
		# Handle geometries
		$functionValues = array ('boundary' => $scheme['boundary']);
		$scheme['boundary'] = "ST_GeomFromGeoJSON(:boundary)";
		
		# Add fixed fields
		$scheme['createdAt'] = 'NOW()';
		
		# Insert the data
		if (!$this->databaseConnection->insert ($this->settings['database'], 'schemes', $scheme, false, true, false, false, 'INSERT', $functionValues)) {
			#!# Need to populate $error;
			return false;
		}
		
		# Return the scheme moniker
		return $scheme['moniker'];
	}
	
	
	# Function to convert a location to a postcode area
	private function getPostcodeArea ($boundary)
	{
		# Get the centre
		$centre = self::getCentre ($boundary);
		
		# Convert to postcode; see: https://postcodes.io/
		#!# Needs a CycleStreets API
		$url = "https://api.postcodes.io/postcodes?lon={$centre['lon']}&lat={$centre['lat']}";
		$response = file_get_contents ($url);
		$geocode = json_decode ($response, true);
		$postcodeArea = $geocode['result'][0]['outcode'];
		
		# Return the result
		return $postcodeArea;
	}
	
	
	# Helper function to get the centre-point of a geometry
	#!# Copied from https://github.com/cyclestreets/streetfocus/blob/master/app/controllers/streetfocus.php#L488 - should be extracted to a library
	public static function getCentre ($geometry, &$bbox = array ())
	{
		# Determine the centre point
		switch ($geometry['type']) {
			
			case 'Point':
				$centre = array (
					'lat'	=> $geometry['coordinates'][1],
					'lon'	=> $geometry['coordinates'][0]
				);
				$bbox = implode (',', array ($centre['lon'], $centre['lat'], $centre['lon'], $centre['lat']));
				break;
				
			case 'LineString':
				$longitudes = array ();
				$latitudes = array ();
				foreach ($geometry['coordinates'] as $lonLat) {
					$longitudes[] = $lonLat[0];
					$latitudes[] = $lonLat[1];
				}
				$centre = array (
					'lat'	=> ((max ($latitudes) + min ($latitudes)) / 2),
					'lon'	=> ((max ($longitudes) + min ($longitudes)) / 2)
				);
				$bbox = implode (',', array (min ($longitudes), min ($latitudes), max ($longitudes), max ($latitudes)));
				break;
				
			case 'MultiLineString':
			case 'Polygon':
				$longitudes = array ();
				$latitudes = array ();
				foreach ($geometry['coordinates'] as $line) {
					foreach ($line as $lonLat) {
						$longitudes[] = $lonLat[0];
						$latitudes[] = $lonLat[1];
					}
				}
				$centre = array (
					'lat'	=> ((max ($latitudes) + min ($latitudes)) / 2),
					'lon'	=> ((max ($longitudes) + min ($longitudes)) / 2)
				);
				$bbox = implode (',', array (min ($longitudes), min ($latitudes), max ($longitudes), max ($latitudes)));
				break;
				
			case 'MultiPolygon':
				$longitudes = array ();
				$latitudes = array ();
				foreach ($geometry['coordinates'] as $polygon) {
					foreach ($polygon as $line) {
						foreach ($line as $lonLat) {
							$longitudes[] = $lonLat[0];
							$latitudes[] = $lonLat[1];
						}
					}
				}
				$centre = array (
					'lat'	=> ((max ($latitudes) + min ($latitudes)) / 2),
					'lon'	=> ((max ($longitudes) + min ($longitudes)) / 2)
				);
				$bbox = implode (',', array (min ($longitudes), min ($latitudes), max ($longitudes), max ($latitudes)));
				break;
				
			case 'GeometryCollection':
				$longitudes = array ();
				$latitudes = array ();
				foreach ($geometry['geometries'] as $geometryItem) {
					$centroid = self::getCentre ($geometryItem, $bboxItem);	// Iterate
					$longitudes[] = $centroid['lon'];
					$latitudes[] = $centroid['lat'];
				}
				$centre = array (
					'lat'	=> ((max ($latitudes) + min ($latitudes)) / 2),
					'lon'	=> ((max ($longitudes) + min ($longitudes)) / 2)
				);
				$bbox = implode (',', array (min ($longitudes), min ($latitudes), max ($longitudes), max ($latitudes)));	// #!# Need to iterate BBOX items instead
				break;
		}
		
		# Reduce decimal places for output brevity
		$centre['lon'] = (float) number_format ($centre['lon'], 6);
		$centre['lat'] = (float) number_format ($centre['lat'], 6);
		
		# Return the centre
		return $centre;
	}
}

?>
