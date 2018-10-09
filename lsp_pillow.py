import cv2
import os
import hashlib
from PIL import Image

HEADER_LENGTH = 275

class ImagePointer:
	def __init__(self, h, w, c):
		self.h = h
		self.w = w
		self.c = c
		self.x = 0
		self.y = 0
		self.z = 0
		self.end = False

	def get_coords(self):
		if self.end:
			return -1, -1, -1
		x, y, z = self.x, self.y, self.z
		self.z += 1
		if self.z == self.c:
			self.x += 1
			self.z = 0
			if self.x == self.w:
				self.y += 1
				self.x = 0
				if self.y == self.h:
					self.end = True
					return -1, -1, -1
		return y, x, z

def byte_to_bits(byte):
	s = bin(int.from_bytes(byte, "big"))[2:]
	l = len(s)
	s = '0' * (8 - l) + s
	bits = [int(bit) for bit in s]
	return bits

def bits_to_byte(bits):
	bits = [str(b) for b in bits]
	s = ''.join(bits)
	val = int(s, 2)
	return bytes([val])

def get_capacity(img):
	h, w, c = img.shape
	cap = int((h * w * c) / 8)
	cap -= HEADER_LENGTH
	return cap

def format_capacity(bytes):
	units = ["B", "KB", "MB", "GB", "TB"]
	i = 0
	while i < len(units):
		if bytes < 1024:
			break
		else:
			bytes /= 1024
		i += 1
	return "%.2f%s" % (bytes, units[i])

def parse_header(h_bytes):
	size = h_bytes[:4]
	size = [str(bit) for byte in size for bit in byte]
	size = "".join(size)
	size = int(size, 2)

	f_hash = h_bytes[4:20]
	f_hash = [bits_to_byte(b) for b in f_hash]
	f_hash = b''.join(f_hash)

	f_name = h_bytes[20:]
	f_name = [bits_to_byte(bits).decode() for bits in f_name]
	f_name = "".join(f_name)

	return size, f_hash, f_name.strip()

def insert(img_path, img_out_path, file_path):
	img = Image.open(img_path)
	if img is None:
		raise Exception("Unable to read image.")

	file = open(file_path, "rb")
	img_out = img.copy()
	ip = ImagePointer(*img.shape)

	filesize = os.path.getsize(file_path)
	if filesize > get_capacity(img):
		raise Exception("File is too big for image")

	# 4 bytes for filesize
	size_bits = bin(filesize)[2:].zfill(32)
	header_bytes = [size_bits[x:x+8] for x in range(0, 32, 8)]
	# 16 bytes for hash
	file_hash = hashlib.md5(file.read()).digest()
	for hb in file_hash:
		header_bytes.append(byte_to_bits([hb]))
	# 255 bytes for filename
	fname = os.path.basename(file_path).rjust(255)
	if len(fname) > 255:
		raise Exception("Filename too long. Max 255 characters.")
	for c in fname:
		header_bytes.append(byte_to_bits(c.encode()))

	# embed data
	file.seek(0)
	while True:
		if len(header_bytes) > 0:
			byte = header_bytes[0]
			header_bytes = header_bytes[1:]
		else:
			byte = file.read(1)
			if byte == b'':
				break;
			byte = byte_to_bits(byte)

		for i in range(8):
			y, x, c = ip.get_coords()
			p = img.item(y, x, c)
			p = byte_to_bits(bytes([p]))
			p[-1] = byte[i]
			p = ord(bits_to_byte(p))
			img_out[y][x][c] = p
	file.close()
	cv2.imwrite(img_out_path, img_out)

def extract(img_path, file_dir):
	img = cv2.imread(img_path, cv2.IMREAD_COLOR)
	file = None

	ip = ImagePointer(*img.shape)

	y, x, c = ip.get_coords()
	header_bytes = []
	filesize, header_hash, out_file_name = None, None, None
	output_path = None
	bytes_written = 0
	while y != -1:
		byte = []
		for i in range(8):
			p = img.item(y, x, c)
			p = byte_to_bits(bytes([p]))
			byte.append(p[-1])
			y, x, c = ip.get_coords()
		if len(header_bytes) < HEADER_LENGTH:
			header_bytes.append(byte)
			if len(header_bytes) == HEADER_LENGTH:
				filesize, header_hash, out_file_name = parse_header(header_bytes)
				output_path = os.path.join(file_dir, out_file_name)
				if filesize > get_capacity(img):
					raise Exception("Invalid header data. File size exceeds image capacity.")
				file = open(output_path, "wb")
		else:
			byte = bits_to_byte(byte)
			file.write(byte)
			bytes_written += 1
			if bytes_written >= filesize:
				break

	# verify hash
	file.close()
	file = open(output_path, "rb")
	file_hash = hashlib.md5(file.read()).digest()
	file.close()
	if file_hash != header_hash:
		raise Exception("No file. Data retreived from image does not match the hash included.")

	return output_path
