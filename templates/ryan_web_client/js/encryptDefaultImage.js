function takeDefaultFileInput(defaultNum, dataToBeEncrypted, encryptionKey)
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


  //If the data be encrypted is just text
  if(typeof(dataToBeEncrypted) == "string")
  {   //convert text to bytes
    dataToBeEncrypted = aesjs.utils.utf8.toBytes(dataToBeEncrypted);
    //encrypt it
    aesEncrypt("cipherText.txt");
  } //If the data being encrypted is a file
  else if(dataToBeEncrypted.constructor.name == "File")
  {
    var reader = new FileReader();
    reader.readAsArrayBuffer(dataToBeEncrypted);    //Read from the file

    var fileName = dataToBeEncrypted.name;          //Save the file name. This was part of a potential feature that was not implemented or planned for

    reader.onload = function(e)                     //After the file has been fully read from
    {
      dataToBeEncrypted = reader.result;
      console.log(dataToBeEncrypted);
      var downloadableFile = new Blob([dataToBeEncrypted], {type: "application/octet-stream"}); //Save it into a blob

      console.log(typeof(dataToBeEncrypted) + "size: " + dataToBeEncrypted.length);

      aesEncrypt(fileName);                         //Encrypt it
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

  function generateRandom()
  {
    var random = (Math.random() * 256);

    var randomint = Math.floor(random);

    return randomint;

  }

  function aesEncrypt(encryptedFileName){
    //Generates the keys
  serverKey = generateServerKey(encryptionKey);
  clientKey = generateClientKey(encryptionKey);
  //Generates the iv
  var iv = [generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(),generateRandom(), generateRandom(),generateRandom(), generateRandom()];


  console.log("Data to be encrypted " + dataToBeEncrypted);
  console.log(dataToBeEncrypted);

  var textBytes = new Uint8Array(dataToBeEncrypted);

  console.log(textBytes);

  console.log("bytes type " + textBytes.constructor.name + " bytes size " + textBytes.length + " text size " + dataToBeEncrypted.length);

  //Pads the input so that it can be encrypted
  while(textBytes.length % 16 != 0)
  {
    var tempBytes = new Uint8Array(textBytes.length + 1);
    tempBytes.set(textBytes, 0);
    tempBytes.set([0],textBytes.length);
    textBytes=tempBytes;
    console.log("text length " + textBytes.length + " temp length " + tempBytes.length)

  }

  //Encrypts the data
  var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);
  var encryptedFile = aesCbc.encrypt(textBytes);

  //12/3/2018: I realized that the reason it was being read in as a decimal string was because an ArrayBuffer was being stored
  //If you convert it to a Uint8Array, a bunch of weird characters appear like theyre supposed
  //I havent really had the time to test this out though
  var downloadableFile = new Blob([Uint8Array.from(iv.concat(encryptedFile))], {type: "application/octet-stream"});


  var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
  form_data.append("content", downloadableFile);

  //Ajax call for encrypting with a default image
  //Takes the number of the default image and the server key and the encrypted file as input
  $.ajax(
  {
    async:false,
    contentType:false,
    cache: false,
    processData: false,
    method: "POST",
    data:form_data,
    url:"php/encryptDefaultImage.php?key=" + serverKey + "&default=" + defaultNum,
    success: function(data)
      {
        console.log(data);
        changeView(data.substring(1, data.length - 2))    //Updates index.html on success
      },
    error: function()
      {
        alert("Insert error");
      }
  });


  return encryptedFile;
  /*Call encryptdata.php, inputs are serverKey, imageFile, encryptedFile*/
  }
}
