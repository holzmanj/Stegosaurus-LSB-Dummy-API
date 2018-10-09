from flask import Flask, send_file, render_template, request
from flask_uploads import UploadSet, configure_uploads, IMAGES, ALL
import lsb
import cv2
import os
import time

app = Flask(__name__)

app.secret_key = os.urandom(16)

photoset = UploadSet('photos', IMAGES)
fileset  = UploadSet('files', ALL)
img_dir = 'static/img'
files_dir = 'static/files'

app.config['UPLOADED_PHOTOS_DEST'] = img_dir
app.config['UPLOADED_FILES_DEST'] = files_dir
configure_uploads(app, photoset)
configure_uploads(app, fileset)

@app.route("/")
def home_page():
    return render_template("home.html")

@app.route("/get_capacity", methods=["GET", "POST"])
def get_capacity():
    error = None
    if request.method == "POST":
        if "photo" in request.files:
            if request.files["photo"].filename == "":
                error = "No photo selected."
            else:
                file_name = os.path.join(img_dir, photoset.save(request.files["photo"]))
                img = cv2.imread(file_name, cv2.IMREAD_COLOR)
                if img is None:
                    error = "Image could not be read."
                    os.remove(file_name)
                else:
                    cap = lsb.get_capacity(img)
                    msg = "Capacity: %s" % lsb.format_capacity(cap)
                    os.remove(file_name)
                    return msg
        else:
            error = "Missing image in request."
    return render_template("capacity.html", error=error)

@app.route("/insert", methods=["GET", "POST"])
def insert():
    error = None
    if request.method == "POST":
        if "photo" in request.files and "file" in request.files:
            if request.files["photo"].filename == "" or request.files["file"].filename == "":
                error = "No image and/or file selected."
            else:
                image_fname = os.path.join(img_dir, photoset.save(request.files["photo"]))
                file_name = os.path.join(files_dir, fileset.save(request.files["file"]))
                output_fname = os.path.join(img_dir, "%d.png" % int(time.time() * 1000))
                try:
                    lsb.insert(image_fname, output_fname, file_name)
                    os.remove(image_fname)
                    os.remove(file_name)
                    return send_file(output_fname, as_attachment=True, mimetype="image/png")
                except Exception as e:
                    error = e
                    os.remove(image_fname)
                    os.remove(file_name)
        else:
            error = "Missing image and/or file in request"
    return render_template("insert.html", error=error)

@app.route("/extract", methods=["GET", "POST"])
def extract():
    error = None
    if request.method == "POST":
        if "photo" in request.files:
            if request.files["photo"].filename == "":
                error = "No image selected."
            else:
                image_fname = os.path.join(img_dir, photoset.save(request.files["photo"]))
                try:
                    file_out = lsb.extract(image_fname, files_dir)
                    os.remove(image_fname)
                    print(file_out)
                    return send_file(file_out, as_attachment=True, 
                        attachment_filename=os.path.basename(file_out))
                except Exception as e:
                    error = e
                    if os.path.isfile(image_fname):
                        os.remove(image_fname)
                    if file_out is not None and os.path.isfile(file_out):
                        os.remove(file_out)
    return render_template("extract.html", error=error)
