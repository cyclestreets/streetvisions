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
		unset ($scheme['id']);
		unset ($scheme['private']);
		unset ($scheme['deleted']);
		unset ($scheme['username']);
		unset ($scheme['createdAt']);
		unset ($scheme['updatedAt']);
		
		# Return the scheme
		return $scheme;
	}
	
	
	# Add scheme
	public function addScheme ($scheme, &$error = false)
	{
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
}

?>
