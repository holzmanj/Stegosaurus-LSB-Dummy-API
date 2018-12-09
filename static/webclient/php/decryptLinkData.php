<?php
$ch = curl_init();

curl_setopt($ch,  CURLOPT_URL, "https://stegosaurus.ml/api/extract?image_url=" . $_GET["image_url"] . "&key=" . $_GET["key"]);


#echo  "https://stegosaurus.ml/api/extract?key=" . urlencode($_GET["key"]) . "&image_url=" . urlencode($_GET["image_url"]);


//calling stegosaurus.ml/getcapacity
//input: image   type: file


curl_setopt($ch, CURLOPT_POST, 1);      //Declaring that this is a post call
                                        //This needs to be here if though there isnt actually anything being posted

$extractedfile = curl_exec($ch);

if($extractedfile === FALSE)
{
  echo "ERROR: " + curl_error($ch);
}
else
{
  echo $extractedfile;
}


curl_close($ch);
?>
