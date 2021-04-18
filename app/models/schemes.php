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
		if (!$scheme = $this->databaseConnection->selectOne ($this->settings['database'], 'schemes', array ('moniker' => $moniker))) {return false;}
		
		# Return the scheme
		return $scheme;
	}
}

?>
