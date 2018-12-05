var clientKey;
var serverKey;


/*
  This function is called seperately and before the decryption function. It sets the values for the client and server keys
  Input: decryptionKey (string): The string being used as the seed for generating the decryption keys
*/
function setPassword(decryptionKey)
{
  /*
    Method for generating a server key
    Parameter: decryptionKey: Password to be used as a seed (string)
  */
  function generateServerKey(decryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(decryptionKey);
    console.log("Server First Hash: " + sjcl.codec.hex.fromBits(firsthash));
    var cutkey = sjcl.codec.hex.fromBits(firsthash).substr(0,32);
    console.log("Server Cut Key: " + cutkey);

    var secondhash = sjcl.hash.sha256.hash(decryptionKey + cutkey);
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
    Parameter: decryptionKey: Password to be used as a seed (string)
  */
  function generateClientKey(decryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(decryptionKey);
    console.log("First Hash: " + sjcl.codec.hex.fromBits(firsthash));
    var cutkey = sjcl.codec.hex.fromBits(firsthash).substr(32,32);
    console.log("Cut Key: " + cutkey);

    var secondhash = sjcl.hash.sha256.hash(decryptionKey + cutkey);
    console.log("Second Hash: " + sjcl.codec.hex.fromBits(secondhash));

    var hexsecondhash = sjcl.codec.hex.fromBits(secondhash);

    var generatedKey = new Uint8Array(32);

    for(var i = 0; i < generatedKey.length; i++)
    {
      generatedKey[i] = parseInt(hexsecondhash.substr(i*2,2));

    }

    return generatedKey;

  }
  clientKey = generateClientKey(decryptionKey);
  serverKey = generateServerKey(decryptionKey);

}


/*
  Method for retrieving data from an image file
  fileToBeDecrypted can be either a file or a link to an image file
*/
function clientSideDecryption(fileToBeDecrypted)
{

  //If the file being decrypted is a link to an image file
  if(typeof(fileToBeDecrypted) == "string")
  {

    $.ajax(
    {
    async:false,
    contentType:false,
    cache: false,
    processData: false,
    url:"php/decryptLinkData.php?key=" + serverKey + "&image_url=" + fileToBeDecrypted,
    success: function(data)
      {
        console.log("Length: " + data.substring(0,data.length-1).length);
        fileToBeDecrypted= data.substring(0,data.length-1);
        console.log(fileToBeDecrypted);


          /*This section of code right here is probably the only thing that needs to be changed with decryption
          The same line exists in the other ajax call down below
          You need to take the string, divide it into 8 bit chunks, and store it in a Uint8Array
          */
        var fileArray = fileToBeDecrypted.split(',').map(function(num){return parseInt(num);});
        console.log(fileArray);
        Uint8Array.from(fileArray);   //Converts fileArray from a regular array to a Uint8Array




        //var downloadableFile = new Blob([fileArray], {type:"application/octet-stream"});
        fileToBeDecrypted=fileArray;


        //Sets the iv to the first 16 elements in the array
        var iv = fileToBeDecrypted.slice(0,16);
        console.log(iv);

        //The encrypted bytes is the rest of the array
        var encryptedText = fileToBeDecrypted.slice(16,fileToBeDecrypted.length);
        iv = Array.from(iv);

        //set decryption cipher
        var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);


        var decryptedBytes = aesCbc.decrypt(encryptedText);
        //alert(decryptedBytes);


        //Automatically downloads the decrypted data
        var downloadableFile = new Blob([decryptedBytes], {type: "application/octet-stream"});
        saveAs(downloadableFile, "decryptedFile.txt");



      },
    error: function()
      {
        alert("Insert error");
      }
    });
  }
  else
  {
    var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
    form_data.append("image", fileToBeDecrypted);


    //Ajax call for decrypting a file that has been submitted
    $.ajax(
    {
      async:false,
      contentType:false,
      cache: false,
      processData: false,
      method: "POST",
      data:form_data,
      url:"php/decryptData.php?key=" + serverKey,
      success: function(data)   //If it went through successfully
        {
          console.log("Length: " + data.substring(0,data.length-1).length);
          fileToBeDecrypted= data.substring(0,data.length-1);   //The data being decrypted

          console.log(fileToBeDecrypted);

          //Pretty much just need to change this line right here
          var fileArray = fileToBeDecrypted.split(',').map(function(num){return parseInt(num);});




          console.log(fileArray);
          Uint8Array.from(fileArray);

          //var downloadableFile = new Blob([fileArray], {type:"application/octet-stream"});

          fileToBeDecrypted=fileArray;

          //Getting the iv
          var iv = fileToBeDecrypted.slice(0,16);
          console.log(iv);

          //Getting the AES encrypted bytes
          var encryptedText = fileToBeDecrypted.slice(16,fileToBeDecrypted.length);
          iv = Array.from(iv);

          var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);

          //Decrypting the bytes
          var decryptedBytes = aesCbc.decrypt(encryptedText);
          console.log(decryptedBytes);

          //Sending out the output
          var downloadableFile = new Blob([decryptedBytes], {type: "application/octet-stream"});
          saveAs(downloadableFile, "decryptedFile.txt");



        },
      error: function()
      {
        alert("Insert error");
      }
    });
  }

}
