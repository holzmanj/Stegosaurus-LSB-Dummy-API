import cv2
import numpy as np

BLOCK_HEIGHT = 32
BLOCK_WIDTH  = 32

class ImageIterator():
    def __init__(self, img_path, img_out_path):
        self.img = cv2.imread(img_path, cv2.IMREAD_COLOR)
        if self.img is None:
            raise Exception("Unable to read image.")

        if img_out_path is None:
            self.img_out = None
        else:
            self.img_out = self.img.copy()

        self.in_x = 0
        self.in_y = 0

        self.out_path = img_out_path
        self.out_x = 0
        self.out_y = 0

        h, w, _ = self.img.shape
        self.max_x = w // BLOCK_WIDTH
        self.max_y = h // BLOCK_HEIGHT

        self.done_reading = False
        self.done_writing = False

    def get_next_block(self):
        if self.done_reading:
            return None
        if self.in_x == self.max_x:
            self.in_y += 1
            self.in_x = 0
            if self.in_y >= self.max_y:
                self.done_reading = True
                return None
        block = self.img[ self.in_y*BLOCK_HEIGHT: (self.in_y+1)*BLOCK_HEIGHT,
                self.in_x*BLOCK_WIDTH : (self.in_x+1)*BLOCK_WIDTH ]
        self.in_x += 1
        return block.copy()

    def put_next_block(self, block):
        if self.out_path is None:
            raise Exception("put_next_block was called on a read-only ImageIterator.")
        if self.done_writing:
            return
        if block.shape[0] != BLOCK_HEIGHT or block.shape[1] != BLOCK_WIDTH:
            raise Exception("Image block given has incorrect dimensions. ("\
                    "Got: %dx%d Expected: %dx%d)"
                    % (block.shape[1], block.shape[0], BLOCK_WIDTH, BLOCK_HEIGHT))
        if self.out_x == self.max_x:
            self.out_y += 1
            self.out_x = 0
            if self.out_y == self.max_x:
                self.done_writing = True
                return
        self.img_out[ self.out_y*BLOCK_HEIGHT: (self.out_y+1)*BLOCK_HEIGHT,
                self.out_x*BLOCK_WIDTH : (self.out_x+1)*BLOCK_WIDTH ] = block
        self.out_x += 1

    def save_output(self):
        cv2.imwrite(self.out_path, self.img_out)
