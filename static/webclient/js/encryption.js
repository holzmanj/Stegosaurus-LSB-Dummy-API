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
	  console.log("file name: " + fileName);

    reader.onload = function(e)
    {
      dataToBeEncrypted = reader.result;

      var downloadableFile = new Blob([dataToBeEncrypted], {type: "application/octet-stream"});

      console.log(typeof(dataToBeEncrypted) + "size: " + dataToBeEncrypted.length);
      aesEncrypt(fileName);
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

	return aesjs.utils.hex.toBytes(hexsecondhash);
  }

  function generateRandom()
  {
    var random = (Math.random() * 256);

    var randomint = Math.floor(random);

    return randomint;

  }

	function concatTypedArrays(a, b) { // a, b TypedArray of same type
		var c = new (a.constructor)(a.length + b.length);
		c.set(a, 0);
		c.set(b, a.length);
		return c;
	}

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
/*
 * TODO check against capacity call
*/ return true;

  }


  function aesEncrypt(encryptedFileName){

  serverKey = generateServerKey(encryptionKey);
  clientKey = generateClientKey(encryptionKey);

  // var iv = [generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(), generateRandom(),generateRandom(), generateRandom(),generateRandom(), generateRandom()];

	var iv = new Uint8Array(16);
	for (var i = 0; i < 16; i++) {
		iv[i] = generateRandom();
	}

	var intBuffer = new Uint8Array(dataToBeEncrypted);

	// pad plaintext with zero-bytes
	if (intBuffer.length % 16 != 0) {
		var padSize = 16 - intBuffer.length % 16;
		var zeroPadding = new Uint8Array(padSize);
		for (var i = 0; i < padSize; i++) {
			zeroPadding[i] = 0;
		}
		intBuffer = concatTypedArrays(intBuffer, zeroPadding);
	}

	/////////////////////////////////
	// Encrypting the content file //
	/////////////////////////////////

	console.log(clientKey);
	var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);
	var encryptedData = aesCbc.encrypt(intBuffer);

	var encryptedBytes = new Uint8Array(iv.length + encryptedData.length);
	for (var i = 0; i < iv.length; i++) {
		encryptedBytes[i] = iv[i];
	}
	for (var i = 0; i < encryptedData.length; i++) {
		encryptedBytes[iv.length + i] = encryptedData[i];
	}

	var encryptedFile = new File([encryptedBytes], encryptedFileName, {type: "application/octet-stream", lastModified: Date.now()});

  if(checkValidImageFile(imageFile, encryptedFile) == true)
  {
    var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
    form_data.append("image", imageFile);
    form_data.append("content", encryptedFile);
	form_data.append("key", serverKey);

	var xhr = new XMLHttpRequest();

	xhr.addEventListener("readystatechange", function () {
		if (this.readyState === 4) {
			if (this.status != 200) {
				alert(this.response);
			} else {
				console.log(this.responseText);
				changeView(this.response);
			}
		}
	});

	xhr.open("POST", window.location.origin + "/api/insert");

	xhr.send(form_data);

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


  return encryptedBytes;
  /*Call encryptdata.php, inputs are serverKey, imageFile, encryptedFile*/
  }
}
