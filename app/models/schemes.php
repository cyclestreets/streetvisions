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
	
	
	
	# Get scheme
	public function getScheme ($moniker)
	{
		# Get the scheme from the database
		if (!$scheme = $this->databaseConnection->selectOne ($this->settings['database'], 'schemes', array ('moniker' => $moniker), '*, ST_AsGeoJSON(boundary) AS boundary')) {return false;}
		
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
