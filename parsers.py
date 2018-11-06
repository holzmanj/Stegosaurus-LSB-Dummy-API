from werkzeug.datastructures import FileStorage
from flask_restplus import reqparse, inputs

test = reqparse.RequestParser()
test.add_argument("message", type=str, required=True)

get_capacity = reqparse.RequestParser()
get_capacity.add_argument("image", type=FileStorage, location="files", required=True)
get_capacity.add_argument("formatted", type=inputs.boolean, default=False)

insert = reqparse.RequestParser()
insert.add_argument("image", type=FileStorage, location="files", required=True)
insert.add_argument("content", type=FileStorage, location="files", required=True)
insert.add_argument("key", type=str, required=True)

extract = reqparse.RequestParser()
extract.add_argument("image", type=FileStorage, location="files", required=False)
extract.add_argument("image_url", type=str, required=False)
extract.add_argument("key", type=str, required=True)
