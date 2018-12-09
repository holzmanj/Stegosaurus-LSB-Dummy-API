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


  //If text is being encrypted
  if(typeof(dataToBeEncrypted) == "string")
  {
    dataToBeEncrypted = aesjs.utils.utf8.toBytes(dataToBeEncrypted);   //Converts the string to an array of bytes

    aesEncrypt("cipherText.txt"); //Encrypts it
  } //If a file is being encrypted
  else if(dataToBeEncrypted.constructor.name == "File")
  {
    var reader = new FileReader();
    reader.readAsArrayBuffer(dataToBeEncrypted);    //Read the data into the file

    var fileName = dataToBeEncrypted.name;

    reader.onload = function(e)                 //After the data has been read
    {
      dataToBeEncrypted = reader.result;

      var downloadableFile = new Blob([dataToBeEncrypted], {type: "application/octet-stream"}); //Store it in a blob

      console.log(typeof(dataToBeEncrypted) + "size: " + dataToBeEncrypted.length);
      console.log(dataToBeEncrypted);
      aesEncrypt(fileName);         //Send it to be encrypted
    }
  }




  /*
    Method for generating a server key
    Parameter: encryptionKey: Password to be used as a seed (string)
  */
  function generateServerKey(encryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(encryptionKey);
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

  /*
    Method for generating a client key
    Parameter: encryptionKey: Password to be used as a seed (string)
  */
  function generateClientKey(encryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(encryptionKey);
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

  function generateRandom()   //Generate a random number between 0 and 255
  {
    var random = (Math.random() * 256);

    var randomint = Math.floor(random);

    return randomint;

  }

  /*
    Method for encrypting data that was saved when takeInput was called
  */
  function aesEncrypt(encryptedFileName)
  {
    //Generate the keys
  serverKey = generateServerKey(encryptionKey);
  clientKey = generateClientKey(encryptionKey);
  //Generate the iv
  var iv = [generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(),generateRandom(), generateRandom(),generateRandom(), generateRandom()];

  var textBytes = new Uint8Array(dataToBeEncrypted);


  console.log("bytes type " + textBytes.constructor.name + " bytes size " + textBytes.length + " text size " + dataToBeEncrypted.length);

  //Padding the input, input must be a multiple of 16 bytes
  while(textBytes.length % 16 != 0)
  {
    var tempBytes = new Uint8Array(textBytes.length + 1);
    tempBytes.set(textBytes, 0);
    tempBytes.set([0],textBytes.length);
    textBytes=tempBytes;
    console.log("text length " + textBytes.length + " temp length " + tempBytes.length)

  }

  //Encrypting the file with the key
  var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);
  var encryptedFile = aesCbc.encrypt(textBytes);

  //Function for ensuring that the data can be stored in the image
  function checkValidImageFile(imageFile, encryptedData)
  {
    var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
    form_data.append("image", imageFile);


    var imageextension = imageFile.name.split('.').pop().toLowerCase();

    console.log("extension " + imageextension + " file name " + imageFile.name);


    if($.inArray(imageextension, ["png", "bmp", "jpeg", "jpg"]) == -1)  //Checks for valid extension
    {
      alert("Not valid image file");
      return false;
    }
    var capacity = 0; //variable that stores the capacity of the image file

    $.ajax(   //Ajax call for the getcapacity php file, which gets the capacity of the image file
    {
    async:false,
    contentType:false,
    cache: false,
    processData: false,
    method: "POST",
    data: form_data,
    url:"php/getcapacity.php",
    success: function(data)
      {                   //If the ajax call ran successfully, capacity should be returned
        console.log(data);
        capacity = parseInt(data.substring(1, data.length - 1));
        if(capacity > encryptedData.size)  //If the image has enough capacity
        {
          alert("Image is large enough to hold encrypted data");
          setTrue();                      //Allows the encryption to go on
        }
        else
        {                                 //Otherwise, alert the user this wont work out
          changeView("Image is too small to hold the file, capacity: " + capacity + " Size: " + encryptedData.size);
          setFalse();
        }
      },
    error: function()
      {
        alert("Error using image");
        setFalse();
      }
    });

    var returnValue;        //If false is returned the image is not usable.
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

  //var downloadableFile = new Blob([iv.concat(encryptedFile)], {type: "application/octet-stream"});

  console.log(iv.concat(encryptedFile));


  //Storing the encrypted data into a Blob
  //12/3/2018: I realized that the reason it was being read in as a decimal string was because an ArrayBuffer was being stored
  //If you convert it to a Uint8Array, a bunch of weird characters appear like theyre supposed
  //I havent really had the time to test this out though
  var downloadableFile = new Blob([Uint8Array.from(iv.concat(encryptedFile))], {type: "application/octet-stream"});
  console.log(downloadableFile);
  //saveAs(downloadableFile, "encryptedFile.txt");

  //Send the encrypted data to be stored in an image file on the steg server
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
        changeView(data.substring(1, data.length - 3))      //Updates index.html
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


  return encryptedFile;
  /*Call encryptdata.php, inputs are serverKey, imageFile, encryptedFile*/
  }
}
