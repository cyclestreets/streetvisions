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
		
		# Run the action
		$this->{$this->action} ();
		
		# Set the template for this action
		$this->templateFile = $this->action . '.html';
		
		# Set standard template values
		$this->template['action'] = $this->action;
		$this->template['baseUrl'] = $this->baseUrl;
		$this->template['applicationPath'] = $applicationPath;
		
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
	}
	
	
	# Add scheme
	public function schemeadd ()
	{
	}
	
	
	# Show scheme
	public function schemeshow ()
	{
	}
	
	
	# Edit scheme
	public function schemeedit ()
	{
	}
	
	
	# Add vision
	public function visionadd ()
	{
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
