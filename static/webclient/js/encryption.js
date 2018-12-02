function takeInput(imageFile, dataToBeEncrypted, encryptionKey)
{
/*Take the input sent from the web page.
Generate 2 keys.
Encrypt it with AES with Key 1.
Send a second key to the connection to the steg server along with the rest of the data to be encrypted.
*/
  /*
    Key generation: Hash encryptionKey with SHA256
    Hash encryptionKey + bits 0-127 with SHA256 again: This is the server side key
    Hash encryptionKey + bits 128-255 with SHA256 again: This is the client side key
  */

  console.log("hue" + typeof(dataToBeEncrypted));

  //alert("why wonttdts you work");


  if(typeof(dataToBeEncrypted) == "string")
  {
    dataToBeEncrypted = aesjs.utils.utf8.toBytes(dataToBeEncrypted);

    aesEncrypt("cipherText.txt");
  }
  else if(dataToBeEncrypted.constructor.name == "File")
  {
    var reader = new FileReader();
    //reader.readAsText(dataToBeEncrypted);
    reader.readAsArrayBuffer(dataToBeEncrypted);

    var fileName = dataToBeEncrypted.name;

    reader.onload = function(e)
    {
      dataToBeEncrypted = reader.result;

    //  var downloadableFile = new Blob([dataToBeEncrypted], {type: "text/plain;charset=utf-8"});
      var downloadableFile = new Blob([dataToBeEncrypted], {type: "application/octet-stream"});

      //saveAs(downloadableFile, "fileBeforeEncrypt.txt");

      console.log(typeof(dataToBeEncrypted) + "size: " + dataToBeEncrypted.length);
      console.log(dataToBeEncrypted);
      aesEncrypt("fml");
    }
  }





  function generateServerKey(encryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(encryptionKey);
    //console.log("First Hash: " + firsthash[0].toString(16) + firsthash[1].toString(16) + firsthash[2].toString(16) + firsthash[3].toString(16) + firsthash[4].toString(16) + firsthash[5].toString(16) + firsthash[6].toString(16) + firsthash[7].toString(16));
    console.log("Server First Hash: " + sjcl.codec.hex.fromBits(firsthash));
    var cutkey = sjcl.codec.hex.fromBits(firsthash).substr(0,32);
    console.log("Server Cut Key: " + cutkey);

    var secondhash = sjcl.hash.sha256.hash(encryptionKey + cutkey);
    console.log("Server Second Hash: " + sjcl.codec.hex.fromBits(secondhash));

    var hexsecondhash = sjcl.codec.hex.fromBits(secondhash);

    var generatedKey = new Uint8Array(32);

    for(var i = 0; i < generatedKey.length; i++)
    {
      generatedKey[i] = parseInt(hexsecondhash.substr(i*2,2));

    }

    return generatedKey;

  }

  function generateClientKey(encryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(encryptionKey);
    //console.log("First Hash: " + firsthash[0].toString(16) + firsthash[1].toString(16) + firsthash[2].toString(16) + firsthash[3].toString(16) + firsthash[4].toString(16) + firsthash[5].toString(16) + firsthash[6].toString(16) + firsthash[7].toString(16));
    //console.log("First Hash: " + sjcl.codec.hex.fromBits(firsthash));
    var cutkey = sjcl.codec.hex.fromBits(firsthash).substr(32,32);
    console.log("Cut Key: " + cutkey);

    var secondhash = sjcl.hash.sha256.hash(encryptionKey + cutkey);
    console.log("Second Hash: " + sjcl.codec.hex.fromBits(secondhash));

    var hexsecondhash = sjcl.codec.hex.fromBits(secondhash);

    var generatedKey = new Uint8Array(32);

    for(var i = 0; i < generatedKey.length; i++)
    {
      generatedKey[i] = parseInt(hexsecondhash.substr(i*2,2));

    }

    return generatedKey;

  }

  function generateRandom()
  {
    var random = (Math.random() * 256);

    var randomint = Math.floor(random);

    return randomint;

  }

  function aesEncrypt(encryptedFileName){

  serverKey = generateServerKey(encryptionKey);
  clientKey = generateClientKey(encryptionKey);

  var iv = [generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(),generateRandom(), generateRandom(),generateRandom(), generateRandom()];

  //var textBytes = aesjs.utils.utf8.toBytes(dataToBeEncrypted);
  var textBytes = new Uint8Array(dataToBeEncrypted);


  console.log("bytes type " + textBytes.constructor.name + " bytes size " + textBytes.length + " text size " + dataToBeEncrypted.length);

  while(textBytes.length % 16 != 0)
  {
    var tempBytes = new Uint8Array(textBytes.length + 1);
    tempBytes.set(textBytes, 0);
    tempBytes.set([0],textBytes.length);
    textBytes=tempBytes;
    console.log("text length " + textBytes.length + " temp length " + tempBytes.length)

  }


  var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);
  var encryptedFile = aesCbc.encrypt(textBytes);
  //var encryptedHex = aesjs.util.hex.fromBytes(encryptedFile);
  //alert(encryptedHex);
  function checkValidImageFile(imageFile, encryptedData)
  {
    var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
    form_data.append("image", imageFile);


    var imageextension = imageFile.name.split('.').pop().toLowerCase();

    console.log("extension " + imageextension + " file name " + imageFile.name);


    if($.inArray(imageextension, ["png", "bmp", "jpg"]) == -1)
    {
      alert("Not valid image file");
      return false;
    }
    var capacity = 0; //variable that stores the capacity of the image file

    $.ajax(
    {
    async:false,
    contentType:false,
    cache: false,
    processData: false,
    method: "POST",
    data: form_data,
    url:"php/getcapacity.php",
    success: function(data)
      {
        //console.log("testsetst");
        console.log(data);
        capacity = parseInt(data.substring(1, data.length - 1));
        if(capacity > encryptedData.size)
        {
          alert("Image is large enough to hold encrypted data");
          setTrue();
        }
        else
        {
          changeView("Image is too small to hold the file, capacity: " + capacity + " Size: " + encryptedData.size);
          setFalse();
        }
      },
    error: function()
      {
        console.log("Error using image");
        setFalse();
      }
    });

    var returnValue;
    function setTrue()
    {
      returnValue = true;
    }
    function setFalse()
    {
      returnValue = false;
    }
    //alert("Value" + returnValue);
    return returnValue;


  }
  var encryptedString = "";
  for(var i = 0; i < encryptedFile.length; i++)
  {
    encryptedString = encryptedString + String.fromCharCode(encryptedFile[i]);

  }

  var stringIv = "";

  for(var j =0; j < iv.length; j++)
  {
    stringIv = stringIv + String.fromCharCode(iv[j]);
  }

  //var encryptedString = aesjs.utils.utf8.fromBytes(encryptedFile);

  //var stringIv = aesjs.utils.utf8.fromBytes(iv);

  //var downloadableFile = new Blob([btoa(stringIv) + btoa(encryptedString)], {type: "text/plain;charset=utf-8"});
  var downloadableFile = new Blob([iv.concat(encryptedFile)], {type: "application/octet-stream"});
  saveAs(downloadableFile, "encryptedFile.txt");


  if(checkValidImageFile(imageFile, downloadableFile) == true)
  {
    var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
    form_data.append("image", imageFile);
    form_data.append("content", downloadableFile);

    $.ajax(
    {
    async:false,
    contentType:false,
    cache: false,
    processData: false,
    method: "POST",
    data:form_data,
    url:"php/encryptdata.php?key=" + serverKey,
    success: function(data)
      {
        //alert(data);
        console.log(data);
        changeView(data.substring(1, data.length - 3))
      },
    error: function()
      {
        alert("Insert error");
      }
    });
  }
  else
  {
    alert("You must insert a valid image file");
  }
/*
  var newAesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);

  //var encryptedBytes = new aesjs.utils.hex.toBytes(encryptedFile);
  var decryptedBytes = newAesCbc.decrypt(encryptedFile);
  alert("Decrypted bytes: " + decryptedBytes);

  var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
  alert("Decrypted text:" + decryptedText);
*/


  return encryptedFile;
  /*Call encryptdata.php, inputs are serverKey, imageFile, encryptedFile*/
  }
}
