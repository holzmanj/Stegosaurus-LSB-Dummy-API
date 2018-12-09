var clientKey;
var serverKey;

function setPassword(decryptionKey)
{

  function generateServerKey(decryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(decryptionKey);
    //console.log("First Hash: " + firsthash[0].toString(16) + firsthash[1].toString(16) + firsthash[2].toString(16) + firsthash[3].toString(16) + firsthash[4].toString(16) + firsthash[5].toString(16) + firsthash[6].toString(16) + firsthash[7].toString(16));
    console.log("Server First Hash: " + sjcl.codec.hex.fromBits(firsthash));
    var cutkey = sjcl.codec.hex.fromBits(firsthash).substr(0,32);
    console.log("Server Cut Key: " + cutkey);

    var secondhash = sjcl.hash.sha256.hash(decryptionKey + cutkey);
    console.log("Server Second Hash: " + sjcl.codec.hex.fromBits(secondhash));

    var hexsecondhash = sjcl.codec.hex.fromBits(secondhash);
	return hexsecondhash
  }

  function generateClientKey(decryptionKey)
  {
    var firsthash = sjcl.hash.sha256.hash(decryptionKey);
    //console.log("First Hash: " + firsthash[0].toString(16) + firsthash[1].toString(16) + firsthash[2].toString(16) + firsthash[3].toString(16) + firsthash[4].toString(16) + firsthash[5].toString(16) + firsthash[6].toString(16) + firsthash[7].toString(16));
    console.log("First Hash: " + sjcl.codec.hex.fromBits(firsthash));
    var cutkey = sjcl.codec.hex.fromBits(firsthash).substr(32,32);
    console.log("Cut Key: " + cutkey);

    var secondhash = sjcl.hash.sha256.hash(decryptionKey + cutkey);
    console.log("Second Hash: " + sjcl.codec.hex.fromBits(secondhash));

    var hexsecondhash = sjcl.codec.hex.fromBits(secondhash);

    var generatedKey = new Uint8Array(32);
	return aesjs.utils.hex.toBytes(hexsecondhash);

  }
  clientKey = generateClientKey(decryptionKey);
  serverKey = generateServerKey(decryptionKey);

}

function decrypt_file(fileBlob, keybytes, filename) {
	var fileReader = new FileReader();
	fileReader.onload = function(event) {
		var arrayBuffer = this.result;
		var bufferBytes = new Uint8Array(arrayBuffer);
		//////////////////////////////
		// Decrypt the content file //
		//////////////////////////////
		var iv = bufferBytes.slice(0, 16);
		var dataBytes = bufferBytes.slice(16);
		var aesCbc = new aesjs.ModeOfOperation.cbc(keybytes, iv);
		var decryptedData = aesCbc.decrypt(dataBytes);
		
		var plaintextBlob = new Blob([decryptedData]);
		saveAs(plaintextBlob, filename);
	};
	fileReader.readAsArrayBuffer(fileBlob);
}

function clientSideDecryption(fileToBeDecrypted)
{

  if(typeof(fileToBeDecrypted) == "string")
  {
	var data = new FormData();
	data.append("image_url", fileToBeDecrypted);
	data.append("key", serverKey);

	var xhr = new XMLHttpRequest();
	xhr.responseType = "blob";
	xhr.addEventListener("readystatechange", function () {
		if (this.readyState === 4) {
			if (this.status != 200) {
				var reader = new FileReader();
				reader.onload = function() {
					alert(reader.result);
					window.location = window.location.origin + "/decrypt";
				}
				reader.readAsText(this.response);
			} else {
				var filename = this.getResponseHeader("content-disposition").split("=")[1];
				decrypt_file(this.response, clientKey, filename);
			}
		}
	});

	xhr.open("POST", window.location.origin + "/api/extract");

	xhr.send(data);

///////////////////////////////////////////////////////////////////
  }
  else
  {
	var data = new FormData();
	data.append("image", fileToBeDecrypted);
	data.append("key", serverKey);

	var xhr = new XMLHttpRequest();
	xhr.responseType = "blob";
	xhr.addEventListener("readystatechange", function () {
		if (this.readyState === 4) {
			if (this.status != 200) {
				var reader = new FileReader();
				reader.onload = function() {
					alert(reader.result);
					window.location = window.location.origin + "/decrypt";
				}
				reader.readAsText(this.response);
				console.log(this.statusText);
			} else {
				var filename = this.getResponseHeader("content-disposition").split("=")[1];
				decrypt_file(this.response, clientKey, filename);
			}
		}
	});

	xhr.open("POST", window.location.origin + "/api/extract");

	xhr.send(data);


/*

    var form_data = new FormData();         //Inserts the image file into a data form so it can be processed by steg server
    form_data.append("image", fileToBeDecrypted);
    //form_data.append("content", downloadableFile);

    $.ajax(
    {
      async:false,
      contentType:false,
      cache: false,
      processData: false,
      method: "POST",
      data:form_data,
      url:"php/decryptData.php?key=" + serverKey,
      success: function(data)
        {
          //alert(data.substring(0,data.length-1));
          console.log("Length: " + data.substring(0,data.length-1).length);
          fileToBeDecrypted= data.substring(0,data.length-1);
          console.log(fileToBeDecrypted);
          var fileArray = fileToBeDecrypted.split(',').map(function(num){return parseInt(num);});
          console.log(fileArray);
          Uint8Array.from(fileArray);

          var downloadableFile = new Blob([fileArray], {type:"application/octet-stream"});
          //saveAs(downloadableFile, "extractedBlob.txt");
          fileToBeDecrypted=fileArray;
//
          var iv = fileToBeDecrypted.slice(0,16);
          console.log(iv);
          //alert("File to be decrypted length " + atob(fileToBeDecrypted.substring(24, fileToBeDecrypted.length)).length);

          //var encryptedText = fileToBeDecrypted.substring(24, fileToBeDecrypted.length);
          var encryptedText = fileToBeDecrypted.slice(16,fileToBeDecrypted.length);
          iv = Array.from(iv);

          var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);


          var decryptedBytes = aesCbc.decrypt(encryptedText);
          //alert(decryptedBytes);



          var downloadableFile = new Blob([decryptedBytes], {type: "application/octet-stream"});
          saveAs(downloadableFile, "decryptedFile.txt");



        },
      error: function()
      {
        alert("Insert error");
      }
    });*/
  }

/*
  var reader = new FileReader();
  reader.readAsText(fileToBeDecrypted);*/
  //reader.readAsBinaryString(fileToBeDecrypted);
  /*
    After the file has been read in, iv is retrieved from the start, deleted from the ciphertext,
    then AES js is used to decrypt the ciphertext.
  */


/*  reader.onload = function(e)
  {
    var file = reader.result;
    console.log("ok" + file);
*/

    /*
      Algorithm for retrieving the IV from the start of the text file. Will need to be rewritten
      after the data to be decrypted is sent from the output of the steg server instead of an uploaded
      text file, as IV will be stored as a 128 bit object instead of the string representation of an array
    */
    /*var iv = new Array(16);
    var count = 0;
    var prevcount = 0;
    for(var i = 0; i < 16; i++)
    {
      do
      {
        count++;
      }while(fileToBeDecrypted[count] != ",");

      //}while(file[count] != ",");

      //console.log(file.substring(prevcount, count));
      //iv[i] = parseInt(file.substring(prevcount, count));
      iv[i] = parseInt(fileToBeDecrypted.substring(prevcount, count));

      prevcount = count + 1;

    }*/
    //file = file.substring(count + 1, file.length);
/*
    //var iv = atob(fileToBeDecrypted.substring(0,24))

    var iv = fileToBeDecrypted.slice(0,16);
    console.log(iv);
    //alert("File to be decrypted length " + atob(fileToBeDecrypted.substring(24, fileToBeDecrypted.length)).length);

    //var encryptedText = fileToBeDecrypted.substring(24, fileToBeDecrypted.length);
    var encryptedText = fileToBeDecrypted.slice(16,fileToBeDecrypted.length);

/*
    var ivArray = new Uint8Array(iv.length);
    var encryptedTextArray = new Uint8Array(atob(encryptedText).length);

    for(var i = 0; i < iv.length; i++)
    {
      ivArray[i] = iv[i].charCodeAt(0);
    }

    console.log(encryptedText);

    for(var j = 0; j < atob(encryptedText).length; j++)
    {
      encryptedTextArray[j] = atob(encryptedText)[j].charCodeAt(0);
    }
    //fileToBeDecrypted = fileToBeDecrypted.substring(count + 1, fileToBeDecrypted.length);

    console.log("Iv Length " + ivArray.length)
    console.log("Iv " +ivArray)
    console.log("Encrypted Text length " + encryptedTextArray.length);
    console.log("Encrypted text array " + encryptedTextArray);
    console.log("Encrypted text " + encryptedText);
*/
    /*
      Now I use the same algorithm to convert the remaining ciphertext into a bunch of integers.
    */

    //var parsedText = new Array();

  /*  count = 0;
    prevcount = 0;
    var index = 0;
    //do
    //{
    do
      {
          count++;
        //}while(file[count] != "," && count != file.length);
        //}while(file[count] != "," && count != file.length);

        //console.log(file.substring(prevcount, count));
        //parsedText[index] = parseInt(file.substring(prevcount, count));
        console.log(fileToBeDecrypted.substring(prevcount, count));
        parsedText[index] = parseInt(fileToBeDecrypted.substring(prevcount, count));
        prevcount = count + 1;
        index++;
      }while(count != fileToBeDecrypted.length);*/
    //}while(count != file.length);

    //console.log(fileToBeDecrypted);
    //console.log(file);
    //var cipherText = aesjs.utils.utf8.toBytes(parsedText);
    //console.log(parsedText);
/*  AAAAAAAAAAAAAAAAAAAA
    iv = Array.from(iv);

    var aesCbc = new aesjs.ModeOfOperation.cbc(clientKey, iv);
*/
  /*  while(encryptedText.length % 16 != 0)
    {
      var tempBytes = new Uint8Array(encryptedText.length + 1);
      tempBytes.set(encryptedText, 0);
      tempBytes.set([0],encryptedText.length);
      encryptedText=tempBytes;
      console.log("text length " + encryptedText.length + " temp length " + tempBytes.length)

    }*/

/* AAAAAAAAAAAAAA
    var decryptedBytes = aesCbc.decrypt(encryptedText);
    alert(decryptedBytes);



    var downloadableFile = new Blob([decryptedBytes], {type: "application/octet-stream"});
    saveAs(downloadableFile, "decryptedFile.txt");
*/
  //}
}
