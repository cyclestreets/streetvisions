<?php

# Visions model
class visionsModel
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
			CREATE TABLE `visions` (
			  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Automatic key',
			  `schemeId` int(11) NOT NULL COMMENT 'Scheme',
			  `visionId` int(11) NOT NULL COMMENT 'Vision no. for scheme',
			  `version` int(11) NOT NULL COMMENT 'Version',
			  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Vision name',
			  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Description',
			  `components` text NOT NULL COMMENT 'Components (GeoJSON)',
			  `questionnaire` text NOT NULL COMMENT 'Questionnaire',
			  `private` tinyint(1) DEFAULT NULL COMMENT 'Private?',
			  `deleted` tinyint(1) DEFAULT NULL COMMENT 'Deleted?',
			  `person` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Creator name',
			  `username` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'CycleStreets username',
			  `createdAt` datetime NOT NULL COMMENT 'Created at',
			  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated at',
			  PRIMARY KEY (`id`),
			  INDEX (schemeId),
			  INDEX (version)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table of visions';
		";
	}
	
	
	
	# Get vision for a scheme
	public function getVision ($schemeId, $visionId)
	{
		# Get the vision from the database
		$constraints = array ('schemeId' => $schemeId, 'visionId' => $visionId);
		if (!$vision = $this->databaseConnection->selectOne ($this->settings['database'], 'visions', $constraints)) {return array ();}
		
		# Format the data
		$vision = $this->decorateVision ($vision);
		
		# Return the vision
		return $vision;
	}
	
	
	# Get visions for a scheme
	public function getVisions ($schemeId)
	{
		# Get the visions from the database
		$constraints = array ('schemeId' => $schemeId);
		if (!$visionsByIndex = $this->databaseConnection->select ($this->settings['database'], 'visions', $constraints)) {return array ();}
		
		# Reindex by vision ID
		$visions = array ();
		foreach ($visionsByIndex as $vision) {
			$visionId = $vision['visionId'];
			$visions[$visionId] = $vision;
		}
		
		# Format the data
		foreach ($visions as $visionId => $vision) {
			$visions[$visionId] = $this->decorateVision ($vision);
		}
		
		# Return the visions
		return $visions;
	}
	
	
	# Vision data decorator
	private function decorateVision ($vision)
	{
		# Remove internal fields
		unset ($vision['id']);
		unset ($vision['deleted']);
		unset ($vision['username']);
		unset ($vision['createdAt']);
		unset ($vision['updatedAt']);
		
		# Decode JSON fields
		$vision['components'] = json_decode ($vision['components'], true);
		$vision['questionnaire'] = json_decode ($vision['questionnaire'], true);
		
		#!# For now, set likes and comments to random value, pending database implementation
		$vision['likes'] = rand (1, 100);
		$vision['comments'] = rand (1, 100);
		
		# Return the vision
		return $vision;
	}
	
	
	# Add vision
	public function addVision ($vision, &$error = false)
	{
		# Add fixed fields
		$vision['createdAt'] = 'NOW()';
		
		# Insert the data
		if (!$this->databaseConnection->insert ($this->settings['database'], 'visions', $vision)) {
			#!# Need to populate $error;
			return false;
		}
		
		# Return the vision ID
		return $vision['visionId'];
	}
}

?>
