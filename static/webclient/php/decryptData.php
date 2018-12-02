<?php
$ch = curl_init();

curl_setopt($ch,  CURLOPT_URL, "https://stegosaurus.ml/api/extract?key=" . $_GET["key"]);

//calling stegosaurus.ml/getcapacity
//input: image   type: file

$imagefile = new CURLFile($_FILES['image']['tmp_name'], $_FILES['image']['type'], $_FILES['image']['name']);

$postfields = array(
  "image" => $imagefile,
);

curl_setopt($ch, CURLOPT_POST, 1);      //Declaring that this is a post call
curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);    //Passing in the post fields


$extractedfile = curl_exec($ch);

if($extractedfile === FALSE)
{
  echo "ERROR: " . curl_error($ch);
}
else
{
  echo $extractedfile;
}


curl_close($ch);
?>
