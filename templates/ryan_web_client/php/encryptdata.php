<?php
$ch = curl_init();

curl_setopt($ch,  CURLOPT_URL, "https://stegosaurus.ml/api/insert?key=" . $_GET["key"]);

//calling stegosaurus.ml/getcapacity
//input: image   type: file

$imagefile = new CURLFile($_FILES['image']['tmp_name'], $_FILES['image']['type'], $_FILES['image']['name']);
$encryptedfile = new CURLFile($_FILES['content']['tmp_name'], $_FILES['content']['type'], $_FILES['content']['name']);

$postfields = array(
  "image" => $imagefile,
  "content" => $encryptedfile
);

curl_setopt($ch, CURLOPT_POST, 1);      //Declaring that this is a post call
curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);    //Passing in the post fields


$insertedfile = curl_exec($ch);

if($insertedfile === FALSE)
{
  echo "ERROR: " + curl_error($ch);
}
else
{
  echo $insertedfile;
}


curl_close($ch);
?>
