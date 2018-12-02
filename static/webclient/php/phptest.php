<?php


$ch = curl_init();

curl_setopt($ch, "stegosaurus.ml/get_capacity");

//calling stegosaurus.ml/getcapacity
//input: image   type: file
$imagefile = $_FILES["file"]

$postfields = array(
  'image' => $_POST[]

);

curl_setopt($ch, CURLOPT_POST, 1);      //Declaring that this is a post call
curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);    //Passing in the post fields


$capacity = curl_exec($ch);

if($capacity === FALSE)
{
  echo "Error with curl " + curl_error($ch);

}


//if capacity > message size, continue



//otherwise, send an error message


curl_close($ch);

echo "<script type='text/javascript'>alert('hello');</script>"


?>
