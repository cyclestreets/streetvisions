<?php

# Set the module base URL, if required
$baseUrl = $this->baseUrl . '/schemes';

# Settings
$settings = array (
);

# Run the application
require_once ('app/controllers/streetvisions.php');
$schemes = new schemes ($settings, $baseUrl);
echo $schemes->getHtml ();

?>
