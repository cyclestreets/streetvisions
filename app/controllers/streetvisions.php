<?php

/**
 * Main controller
 */
class streetvisions
{
	# Specify available arguments as defaults or as NULL (to represent a required argument)
	public function defaults ()
	{
		return $defaults = array (
			'vendor'	=> 'mysql',
			'hostname'	=> 'localhost',
			'database'	=> 'streetvisions',
			'username'	=> 'streetvisions',
			'password'	=> NULL,
			'cyclestreetsApiBaseUrl'	=> 'https://api.cyclestreets.net',
			'cyclestreetsApiKey'		=> NULL,
			'defaultLatitude'	=> NULL,
			'defaultLongitude'	=> NULL,
			'defaultZoom'		=> NULL,
			'tileUrl'	=> 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			'geojsonData'	=> false,	// Set by the action
		);
	}
	
	
	# Register actions
	private function actions ()
	{
		# Specify available actions
		$actions = array (
			'schemeslist' => array (
				'description' => false,
				'url' => '/',
			),
			'schemeadd' => array (
				'description' => false,
				'url' => '/add.html',
			),
			'schemeshow' => array (
				'description' => false,
				'url' => '/%scheme/',
			),
			'schemeedit' => array (
				'description' => false,
				'url' => '/%scheme/edit.html',
			),
			'visionadd' => array (
				'description' => false,
				'url' => '/%scheme/addvision.html',
			),
			'visionshow' => array (
				'description' => false,
				'url' => '/%scheme/vision%vision/',
			),
			'visionedit' => array (
				'description' => false,
				'url' => '/%scheme/vision%vision/edit.html',
			),
		);
		
		#  Return the list
		return $actions;
	}
	
	
	# Class properties
	private $template = array ();
	private $templateFile = NULL;
	private $html = '';
	
	
	
	# Constructor
	public function __construct ($settings, $baseUrl = NULL, $applicationPath = NULL)
	{
		# Load libraries
		require_once ('application.php');
		require_once ('database.php');
		require_once ('ultimateForm.php');
		
		# Obtain settings, merged over the defaults
		if (!$this->settings = application::assignArguments ($errors, $settings, $this->defaults (), get_class ($this), NULL, $handleErrors = true)) {return false;}
		
		# Connect to the database
		$this->databaseConnection = new database ($this->settings['hostname'], $this->settings['username'], $this->settings['password'], $this->settings['database'], $this->settings['vendor']);
		
		# Determine the base URL
		$this->baseUrl = application::getBaseUrl ();
		if ($baseUrl !== NULL) {$this->baseUrl = $baseUrl;}		// Override if supplied in constructor, as an embedded application
		
		# Load the templatiser
		$this->loadTemplatiser ($applicationPath);
		
		# Get the actions registry
		$this->actions = $this->actions ();
		
		# Validate the specified local action
		$this->action = (isSet ($_GET['action']) && isSet ($this->actions[$_GET['action']]) ? $_GET['action'] : 'page404');
		
		# Load the schemes model
		require_once ('app/models/schemes.php');
		$this->schemesModel = new schemesModel ($this->databaseConnection, $this->settings);
		
		# Load the visions model
		require_once ('app/models/visions.php');
		$this->visionsModel = new visionsModel ($this->databaseConnection, $this->settings);
		
		# Load the user model
		require_once ('app/models/user.php');
		$this->userModel = new userModel ($this->databaseConnection, $this->settings);
		
		# Run the action
		$this->{$this->action} ();
		
		# Set the template for this action
		$this->templateFile = $this->action . '.html';
		
		# Set standard template values
		$this->template['action'] = $this->action;
		$this->template['baseUrl'] = $this->baseUrl;
		$this->template['applicationPath'] = $applicationPath;
		
		# Set the application JS settings
		$jsSettingsFields = array ('defaultLatitude', 'defaultLongitude', 'defaultZoom', 'tileUrl', 'geojsonData');
		$jsSettings = application::arrayFields ($this->settings, $jsSettingsFields);
		$this->template['settingsJs'] = json_encode ($jsSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
		
		# Compile the HTML from the template, which the boostrap file will then echo
		foreach ($this->template as $placeholder => $fragmentHtml) {
			$this->templateHandle->assign ($placeholder, $fragmentHtml);
		}
		$this->html = $this->templateHandle->fetch ($this->templateFile);
	}
	
	
	# Function to load the templatiser
	private function loadTemplatiser ($applicationPath)
	{
		# Load the library
		require_once ('libraries/smarty-3.1.39/libs/Smarty.class.php');
		
		# Initialise, setting locations
		$this->templateHandle = new Smarty ();
		// $this->templateHandle->caching = 0;
		// $this->templateHandle->force_compile = true;
		$this->templatesDirectory = $_SERVER['DOCUMENT_ROOT'] . $applicationPath . '/app/views/';
		$this->templateHandle->setTemplateDir ($this->templatesDirectory);
		$this->templateHandle->setCompileDir ($_SERVER['DOCUMENT_ROOT'] . $applicationPath . '/data/tempgenerated/templates_c/');
		$this->tplDirectory = $_SERVER['DOCUMENT_ROOT'] . $applicationPath . '/data/tempgenerated/templates_tpl/';
		$this->templateHandle->assign ('templates_tpl', $this->tplDirectory);
		
		# Start an array of template assignments that client pages can write to
		$this->template = array ();
	}
	
	
	# Function to get the HTML
	public function getHtml ()
	{
		return $this->html;
	}
	
	
	# 404 page
	public function page404 ()
	{
	}
	
	
	
	# List schemes
	public function schemeslist ()
	{
		# Get the schemes
		$schemes = $this->schemesModel->getSchemes ();
		
		# Send the schemes to the template
		$this->template['schemes'] = $schemes;
	}
	
	
	# Add scheme
	public function schemeadd ()
	{
		# Create a form to add a scheme
		$form = new form (array (
			'databaseConnection' => $this->databaseConnection,
			'displayRestrictions' => true,
			'formCompleteText' => false,
			'unsavedDataProtection' => true,
		));
		$form->dataBinding (array (
			'database'		=> $this->settings['database'],
			'table'			=> 'schemes',
			'intelligence'	=> true,
			'exclude'		=> array ('boundary', 'photo', 'private', 'deleted', 'username', 'person'),
			'attributes'	=> array (
				'moniker'	=> array ('regexp' => '^([-a-z0-9]+)$', ),
			),
		));
		$form->textarea (array (
			'name'			=> 'boundary',
			'title'			=> 'Scheme boundary (GeoJSON)',
			'required'		=> true,
		));
		$form->input (array (
			'name'			=> 'username',
			'title'			=> 'CycleStreets username/e-mail',
			'required'		=> true,
		));
		$form->password (array (
			'name'			=> 'password',
			'title'			=> 'CycleStreets password',
			'required'		=> true,
		));
		$formHtml = '';
		if ($unfinalisedData = $form->getUnfinalisedData ()) {
			
			# Ensure the moniker does not already exist
			if (strlen ($unfinalisedData['moniker'])) {
				if ($this->schemesModel->getScheme ($unfinalisedData['moniker'])) {
					$form->registerProblem ('monikertaken', "Sorry, there is <a href=\"{$this->baseUrl}/{$unfinalisedData['moniker']}/\" target=\"_blank\" title=\"[Link opens in a new window]\">already a scheme</a> with that URL moniker.", 'moniker');
				}
			}
			
			# Validate username and password against the CycleStreets API
			if (strlen ($unfinalisedData['username']) && strlen ($unfinalisedData['password'])) {
				if (!$user = $this->userModel->validateUser ($unfinalisedData['username'], $unfinalisedData['password'], $userError)) {
					$form->registerProblem ('userinvalid', $userError, array ('username', 'password'));
				}
			}
		}
		$scheme = $form->process ($formHtml);
		$this->template['form'] = $formHtml;
		
		# If the form is successful, assemble the data
		if ($scheme) {
			
			# Handle user details
			$scheme['username'] = $user['username'];
			$scheme['person'] = $user['name'];
			unset ($scheme['password']);
			
			# Add the scheme
			if (!$schemeMoniker = $this->schemesModel->addScheme ($scheme, $error)) {
				#!# Need to report error to the UI properly
				application::dumpData ($this->databaseConnection->error ());
				return false;
			}
			
			# Redirect the user to the new scheme page
			#!# Needs result flash message
			$redirectTo = $this->baseUrl . '/' . $schemeMoniker . '/';
			#!# HTML needs to be written to
			$html = application::sendHeader (302, $redirectTo);
		}
	}
	
	
	# Show scheme
	public function schemeshow ()
	{
		# Obtain the moniker
		#!# Needs error handling
		$moniker = $_GET['scheme'];
		
		# Get the scheme
		if (!$scheme = $this->schemesModel->getScheme ($moniker)) {
			#!# Error handling needed
		}
		
		# Populate the template
		$this->template['scheme'] = $scheme;
		
		# Set the default map data
		$this->settings['geojsonData'] = json_decode ($scheme['boundary']);
	}
	
	
	# Edit scheme
	public function schemeedit ()
	{
	}
	
	
	# Add vision
	public function visionadd ()
	{
		# Obtain the scheme moniker
		$moniker = (isSet ($_GET['scheme']) ? $_GET['scheme'] : false);
		
		# Get the scheme
		if (!$moniker || !$scheme = $this->schemesModel->getScheme ($moniker)) {
			#!# Error handling needed
		}
		
		# Create a form to add a vision
		$form = new form (array (
			'databaseConnection' => $this->databaseConnection,
			'displayRestrictions' => true,
			'formCompleteText' => false,
			'unsavedDataProtection' => true,
		));
		$form->dataBinding (array (
			'database'		=> $this->settings['database'],
			'table'			=> 'visions',
			'intelligence'	=> true,
			'exclude'		=> array ('schemeId', 'visionId', 'version', 'components', 'private', 'deleted', 'username', 'person'),
			'attributes'	=> array (
			),
		));
		$form->textarea (array (
			'name'			=> 'components',
			'title'			=> 'Components (GeoJSON)',
			'required'		=> true,
		));
		$form->input (array (
			'name'			=> 'username',
			'title'			=> 'CycleStreets username/e-mail',
			'required'		=> true,
		));
		$form->password (array (
			'name'			=> 'password',
			'title'			=> 'CycleStreets password',
			'required'		=> true,
		));
		$formHtml = '';
		if ($unfinalisedData = $form->getUnfinalisedData ()) {
			
			# Validate username and password against the CycleStreets API
			if (strlen ($unfinalisedData['username']) && strlen ($unfinalisedData['password'])) {
				if (!$user = $this->userModel->validateUser ($unfinalisedData['username'], $unfinalisedData['password'], $userError)) {
					$form->registerProblem ('userinvalid', $userError, array ('username', 'password'));
				}
			}
		}
		$vision = $form->process ($formHtml);
		$this->template['form'] = $formHtml;
		
		# If the form is successful, assemble the data
		if ($vision) {
			
			# Handle user details
			$vision['username'] = $user['username'];
			$vision['person'] = $user['name'];
			unset ($vision['password']);
			
			# Add fixed values
			$vision['schemeId'] = $scheme['id'];
			$vision['visionId'] = 1;	// #!# Needs to be automatically incremented against current highest
			$vision['version'] = 1;		// #!# Needs to be automatically incremented against current highest
			
			# Add the vision
			if (!$visionId = $this->visionsModel->addVision ($vision, $error)) {
				#!# Need to report error to the UI properly
				application::dumpData ($this->databaseConnection->error ());
				return false;
			}
			
			# Redirect the user to the new vision page
			#!# Needs result flash message
			$redirectTo = $this->baseUrl . '/' . $scheme['moniker'] . '/scheme' . $vision['visionId'] . '/';
			#!# HTML needs to be written to
			$html = application::sendHeader (302, $redirectTo);
		}
	}
	
	
	# Show vision
	public function visionshow ()
	{
	}
	
	
	# Edit vision
	public function visionedit ()
	{
	}
}
