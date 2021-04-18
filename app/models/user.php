<?php

# User model
class userModel
{
	# Constructor
	public function __construct ($databaseConnection, $settings)
	{
		# Convert arguments to properties
		$this->databaseConnection = $databaseConnection;
		$this->settings = $settings;
	}
	
	
	
	# Validate a user
	public function validateUser ($identifier, $password, &$error = false)
	{
		# Assemble the data
		$url = $this->settings['cyclestreetsApiBaseUrl'] . '/v2/user.authenticate' . '?key=' . $this->settings['cyclestreetsApiKey'];
		$postData = array (
			'identifier'	=> $identifier,
			'password'		=> $password,
		);
		
		# Validate the user; see: https://www.cyclestreets.net/api/v2/user.authenticate/
		$result = application::file_post_contents ($url, $postData);
		$user = json_decode ($result, true);
		
		# If an error is returned, allocate it for the UI
		if (isSet ($user['error'])) {
			$error = $user['error'];
			return false;
		}
		
		# Otherwise return the user data
		return $user;
	}
}
