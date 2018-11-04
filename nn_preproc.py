import cv2
import numpy as np
import hashlib
import math
import os

def generate_header(file_path):
    # 4 bytes for filesize
    filesize = os.path.getsize(file_path)
    if filesize >= 2**32:
        raise Exception("File too big. Header currently only works for files up to 4GB.")
    header_bytes = filesize.to_bytes(4, byteorder="big")

    # 16 bytes for hash
    with open(file_path, "rb") as file:
        header_bytes += hashlib.md5(file.read()).digest()

    # 255 bytes for filename
    header_bytes += os.path.basename(file_path).rjust(255).encode()

    # pad header to be exactly 3 batches in size
    header_bytes = header_bytes + b'\0' * (384 - len(header_bytes))
    return header_bytes

def parse_header(header_bytes):
    size = header_bytes[:4]
    size = int.from_bytes(size, byteorder="big")

    f_hash = header_bytes[4:20]

    f_name = header_bytes[20:275]
    try:
        f_name = f_name.decode()
    except:
        print(f_name)
        raise Exception("Content could not be retrieved from image. (File name could not be parsed.)")

    return size, f_hash, f_name.strip()

def bytes_to_batch(byte_str):
    if len(byte_str) != 128:
        raise Exception("bytes_to_batch takes exactly 128 bytes (got %d)" % len(byte_str))

    # convert to list of 1024 bits
    bit_list = lambda b: [int(i) for i in list(bin(b)[2:].zfill(8))]
    flatten = lambda l: [item for sublist in l for item in sublist]
    bits = flatten([bit_list(b) for b in list(byte_str)])

    # convert from binary bits to -1.0 and 1.0 for neural network
    bits = [-1.0 if b == 0 else 1.0 for b in bits]

    # fill numpy array
    batch = np.zeros((32, 32, 1))
    ptr = 0
    for x in range(32):
        for y in range(32):
            batch[x][y][0] = bits[ptr]
            ptr += 1
    return batch

def batch_to_bytes(batch):
    if batch.shape != (32, 32, 1):
        raise Exception("Got batch with invalid shape: %s" % str(batch.shape))

    # convert 1.0 and -1.0 values back to integer 1 and 0 bits
    tobits = lambda b: 1 if b == 1.0 else 0
    batch = np.vectorize(tobits)(batch)

    # extract bits from batch and turn into bytes
    bits = ""
    byte_vals = []
    for x in range(32):
        for y in range(32):
            bits = "%s%d" % (bits, batch[x][y][0])
            if len(bits) >= 8:
                byte_vals.append(int(bits, 2))
                bits = ""
    return bytes(byte_vals)

def file_to_batches(file_path):
    """
    Reads file from given path and converts it into nx32x32x1 batches for the neural network
    First three batches hold the header data (file name, file size, and hash).
    """
    header_bytes = generate_header(file_path)

    filesize = os.path.getsize(file_path)
    # 128 = number of bytes in 32x32 bitplane, 3 additional batches for header
    n = math.ceil(filesize / 128) + 3
    batches = np.zeros((n, 32, 32, 1))

    with open(file_path, "rb") as file:
        # convert header to batches
        for i in range(3):
            batches[i] = bytes_to_batch(header_bytes[128*i:128*(i+1)])

        # convert image to batches
        for batch_no in range(3, n):
            buf = file.read(128)

            if len(buf) < 128:
                # pad with null bytes
                buf = buf + b'\0' * (128 - len(buf))

            batches[batch_no] = bytes_to_batch(buf)
    return batches

def batches_to_file(batches, output_dir):
    """
    Converts content batches recieved from the neural network into a file.
    File name is derived from the header data and the file is saved to the specified directory.
    """
    # get params from header (first 3 batches)
    header_bytes = b''
    for n in range(3):
        header_bytes += batch_to_bytes(batches[n])
    file_size, header_hash, file_name = parse_header(header_bytes)

    if file_size > (batches.shape[0] - 3) * 128:
        raise Exception("Content could not be retrieved from image. File size in header is too large.")

    # get file data from the rest of the batches
    file_bytes = b""
    for n in range(3, batches.shape[0]):
        file_bytes += batch_to_bytes(batches[n])
        if len(file_bytes) >= file_size:
            break
    file_bytes = file_bytes[:file_size]

    # verify hash
    file_hash = hashlib.md5(file_bytes).digest()
    if file_hash != header_hash:
        raise Exception("Content could not be retrieved from image. Hashes do not match.")

    # save file
    output_path = os.path.join(output_dir, file_name)
    with open(output_path, "wb") as file_out:
        file_out.write(file_bytes)

def image_to_batches(img):
    """
    Converts image into 32x32x3 batches for neural network.
    Removes trim on right and bottom (blocks smaller than 32x32).
    """
    h, w, _ = img.shape
    n_h = math.floor(h / 32)
    n_w = math.floor(w / 32)
    batches = np.zeros((n_h * n_w, 32, 32, 3))
    n = 0
    # decompose image into 32x32 blocks
    for x in range(n_w):
        for y in range(n_h):
            batches[n] = img[y*32:(y+1)*32, x*32:(x+1)*32]
            n += 1
    # convert pixels from byte values into floats
    batches = np.vectorize(lambda b: b / 255)(batches)
    return batches

def batches_to_image(batches, img):
    """
    Converts batches back into image blocks.
    Pastes 32x32 blocks onto original image (to preserve trim).
    """
    n = batches.shape[0]
    h, w, _ = img.shape
    n_h = math.floor(h / 32)
    n_w = math.floor(w / 32)
    img_out = img.copy()

    if n_h * n_w < n:
        raise Exception("Too many batches for the provided image.")

    # convert pixel floats back to byte values
    batches = np.vectorize(lambda f: round(f * 255))(batches)

    # paste batches onto image
    batch_no = 0
    for x in range(n_w):
        for y in range(n_h):
            img_out[y*32:(y+1)*32, x*32:(x+1)*32] = batches[batch_no]
            batch_no += 1
            if batch_no >= n:
                return img_out

def insert(img_path, file_path):
    img = cv2.imread(img_path, cv2.IMREAD_COLOR)
    img_batches = img_to_batches(img)

    img_out = None # neuralnetwork.insert(img_batches, file_batches)
    
