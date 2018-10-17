from werkzeug.datastructures import FileStorage
from flask_restplus import reqparse, inputs

get_capacity = reqparse.RequestParser()
get_capacity.add_argument("image", type=FileStorage, location="files", required=True)
get_capacity.add_argument("formatted", type=inputs.boolean, default=False)