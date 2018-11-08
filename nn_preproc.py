import cv2
import numpy as np
import hashlib
import math
import os
import tensorflow as tf

FAIL_ON_BAD_HASH = True

def nn_to_bin(batch):
    return np.around(batch).astype(int)

def get_capacity(img):
    h, w, _ = img.shape
    cap = (h * w) // 8
    return cap - 384    # 3 reserved header batches = 384 bytes

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

def generate_header(file_path):
    """
    Creates header data (size, hash, and name) for a specific file.
    4 bytes for size is more or less arbitrary. If we ever need to embed anything >4GB it can be changed.
    16 bytes is the constant length of an MD5 digest.
    Filenames are padded 255 bytes because that is the max length for a filename in a lot of file systems.
    Altogether it adds up to 275 bytes, which is padded to 384 so it can occupy 3 reserved batches/blocks.
    """
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
    """
    Extracts a file's size, hash, and name from a byte string of header data (expecting at least 275 bytes).
    If anything is added or changed in the generate_header function that must be reflected here.
    """
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
    """
    Converts exactly 128 bytes to a 32x32x1 numpy array to be used as a batch for the neural network.
    Bytes are expanded into bits and converted to {-1.0, 1.0} in place of {0, 1}.
    """
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
    """
    The inverse of the bytes_to_batch function.  A 32x32x1 numpy array with values {-1.0, 1.0} is converted
    into a string of 128 bytes.
    """
    if batch.shape != (32, 32, 1):
        raise Exception("Got batch with invalid shape: %s" % str(batch.shape))

    # convert 1.0 and -1.0 values back to integer 1 and 0 bits
    tobits = lambda b: 1 if b > 0.0 else 0
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

def file_to_batches(file_path, n=None):
    """
    Reads file from given path and converts it into nx32x32x1 batches for the neural network
    First three batches hold the header data (file name, file size, and hash).
    If n is set, the batch set will be padded to n batches.
    """
    header_bytes = generate_header(file_path)

    filesize = os.path.getsize(file_path)
    if n is None:
        # 128 = number of bytes in 32x32 bitplane, 3 additional batches for header
        n = math.ceil(filesize / 128) + 3
    elif n < math.ceil(filesize / 128) + 3:
        raise Exception("Value for n is too small. Batch set for %s would be %d batches long."
                % (os.path.basename(file_path), math.ceil(filesize / 128) + 3))
    batches = np.zeros((n, 32, 32, 1))

    with open(file_path, "rb") as file:
        # convert header to batches
        for i in range(3):
            batches[i] = bytes_to_batch(header_bytes[128*i:128*(i+1)])

        # convert file to batches
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
        if FAIL_ON_BAD_HASH:
            raise Exception("Content could not be retrieved from image. Hashes do not match.")
        else:
            print("Data was not retrieved successfully. Hash verification failed.")

    # save file
    output_path = os.path.join(output_dir, file_name)
    with open(output_path, "wb") as file_out:
        file_out.write(file_bytes)
    return output_path

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


def insert(cfg, sess, img_path, file_path, img_out_path):
    """
    Inserts the file at file_path into the image at img_path using the neural network.
    Saves the resulting image to img_out_path
    """
    img = cv2.imread(img_path, cv2.IMREAD_COLOR)
    if img is None:
        raise Exception("Image could not be read.")

    if get_capacity(img) < os.path.getsize(file_path):
        raise Exception("Content file is too large to be inserted into image.")

    img_batches = image_to_batches(img)
    print(img_batches.shape)
    file_batches = file_to_batches(file_path, n=img_batches.shape[0])

    print(tf.shape(img_batches))
    print(tf.shape(file_batches))

    batches_out = sess.run('alice_out:0', feed_dict={
        'img_in:0': img_batches, 'msg_in:0': file_batches})

    img_out = batches_to_image(batches_out, img)
    cv2.imwrite(img_out_path, img_out)

def extract(cfg, sess, img_path, output_dir):
    """
    Extracts a content file from the image at img_path using the neural network.
    On success the file is saved to output_dir (file name comes from header).
    """
    img = cv2.imread(img_path, cv2.IMREAD_COLOR)
    img_batches = image_to_batches(img)

    batches_out = sess.run('bob_vars_1/bob_eval_out:0',
                           feed_dict={'img_in:0': img_batches})

    return batches_to_file(batches_out, output_dir)

    
