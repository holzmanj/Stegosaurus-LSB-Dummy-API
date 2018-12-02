<?php
$ch = curl_init();

curl_setopt($ch,  CURLOPT_URL, "https://stegosaurus.ml/api/insert?key=" . $_GET["key"]);

$defaultnum = $_GET["default"];

//calling stegosaurus.ml/getcapacity
//input: image   type: file

//$imagefile = new CURLFile($_FILES['image']['tmp_name'], $_FILES['image']['type'], $_FILES['image']['name']);
$encryptedfile = new CURLFile($_FILES['content']['tmp_name'], $_FILES['content']['type'], $_FILES['content']['name']);

$imagefilepath = "";
$filename = "default1.jpg";

if($defaultnum == "1")
{
  $imagefilepath = "../images/default1.jpg";
}
else if($defaultnum == "2")
{
  $imagefilepath = "../images/default2.jpg";
}
else if($defaultnum == "3")
{
  $imagefilepath = "../images/default3.png";
}
else if($defaultnum == "4")
{
  $imagefilepath = "../images/default4.jpg";
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$finfo = finfo_file($finfo, $imagefilepath);

//echo $finfo;

$imagefile = new CURLFile(realpath($imagefilepath), $finfo, realpath($imagefilepath));

$postfields = array(
  #  "image" => "@" . realpath($imagefilepath) . ";filename=" . $filename . ";type=" . mime_content_type($imagefilepath),
  "image" => $imagefile,
  "content" => $encryptedfile
);


curl_setopt($ch, CURLOPT_POST, 1);      //Declaring that this is a post call
curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);    //Passing in the post fields
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);




$insertedfile = curl_exec($ch);

if($insertedfile === FALSE)
{
  echo "ERROR: " . curl_errno($ch);
}
else
{
  echo $insertedfile;
}


curl_close($ch);
?>
