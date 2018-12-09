# Stegosaurus API
This repository contains all of the code that is hosted on our server
(go to https://stegosaurus.ml to see it in action!)
including slightly modified versions of
[Seamus' neural network](https://github.com/skirby1996/SteGANographer) and 
[Ryan's web client](https://github.com/Mimcaster/StegWebApp)

Stegosaurus is a machine learning based steganography service.
Users can hide secret data within an image file by using our website, IOS app, or Android app.

To download this code and test it locally on your own computer via the command line, go to your
desired installation directory and enter:
```
git clone https://github.com/holzmanj/stegosaurus-api.git
cd stegosaurus-api/
```
Before running the code you will need to install the required python packages by running:
```
pip3 install -r requirements.txt
```
After that you can run the server with:
```
python3 wsgi.py
```
or use Gunicorn to run the server, which provides automated web workers, logging and other
helpful improvements, by executing:
```
gunicorn --log-file app.log wsgi:app
```
