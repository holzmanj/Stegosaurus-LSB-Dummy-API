
import sys
import os

import cv2
import numpy as np

import time
import datetime


def split_into_rgb_channels(image):
    '''Split the target image into its red, green and blue channels.
    image - a numpy array of shape (rows, columns, 3).
    output - three numpy arrays of shape (rows, columns) and dtype same as
             image, containing the corresponding channels.
    '''
    red = image[:, :, 2]
    green = image[:, :, 1]
    blue = image[:, :, 0]
    return red, green, blue


def get_pixel_difference(color,difference_img_path):
  '''Calculate the percentage of pixels altered in a given image.
  color - the string representation of the color channel (red, green, blue).
  difference_img - a numpy array of shape (rows, columns,3).
  '''

  difference_img = cv2.imread(difference_img_path, cv2.IMREAD_COLOR)
  percent_diff = (np.count_nonzero(difference_img) * 100)/ difference_img.size
  return "Percentage of pixels altered in %s channel: %0.2f%%" % (color, percent_diff)

def get_variation(color,difference_img_path):
  '''Calculate the percentage of variation in a given image.
  color - the string representation of the color channel (red, green, blue).
  difference_img - a numpy array of shape (rows, columns,3).
  '''

  difference_img = cv2.imread(difference_img_path, cv2.IMREAD_COLOR)
  total_change = np.sum(difference_img) * 100/ (difference_img.size * 255)
  return "Percentage of variation in %s channel: %0.2f%%" % (color, total_change)


def compare_images(img_path1, img_path2, out_dir):
    '''check that images exist'''
    if os.path.exists(img_path1) and os.path.exists(img_path2):
        img_1 = cv2.imread(img_path1, cv2.IMREAD_COLOR)
        img_2 = cv2.imread(img_path2, cv2.IMREAD_COLOR)
    else:
        if not os.path.exists(img_path1):
            raise Exception("Error: No image at %s" % img_path1)
        if not os.path.exists(img_path2):
            raise Exception("Error: No image at %s" % img_path2)

    ms_time = int(time.time() * 1000)
    # pre-generate all output paths so they can be returned
    diff_fname  = "%d-diff.png" % ms_time
    fnames = {
          "red": "%d-red.png" % ms_time,
         "blue": "%d-blue.png" % ms_time,
        "green": "%d-green.png" % ms_time
    }

    difference_img = np.absolute(img_1 - img_2)
    cv2.imwrite(os.path.join(out_dir, diff_fname), difference_img)

    '''split difference image into red green and blue color channels'''
    red, green, blue = split_into_rgb_channels(difference_img)
    for values, color, channel in zip((red, green, blue), ('red', 'green', 'blue'), (2, 1, 0)):
        difference_img = np.zeros(
            (values.shape[0], values.shape[1], 3), dtype=values.dtype)
        difference_img[:, :, channel] = values
        cv2.imwrite(os.path.join(out_dir, fnames[color]), difference_img)
    
    return diff_fname, fnames["red"], fnames["green"], fnames["blue"]

def main():
    '''temporary --- path for local testing'''
    root_dir = os.path.abspath("")
    img_dir = os.path.join(root_dir, "Images")

    '''create directory --- named by date and time --- to store the output images'''
    date_time = datetime.datetime.now().strftime("%Y-%m-%d %H_%M_%S")
    out_dir = os.path.join(img_dir, date_time)
    os.mkdir(out_dir)

    '''get original image that has been inputted in the Neural Network'''
    user_in = input("Please enter name of original image: ")
    original_img_path = os.path.join(img_dir, user_in)

    '''get image that has been outputted by the Neural Network'''
    user_in = input("Please enter name of outputted image: ")
    outputted_img_path = os.path.join(img_dir, user_in)

    '''check that images exist'''
    if os.path.exists(original_img_path) and os.path.exists(outputted_img_path):
        original_img = cv2.imread(original_img_path, cv2.IMREAD_COLOR)
        outputted_img = cv2.imread(outputted_img_path, cv2.IMREAD_COLOR)
    else:
        if not os.path.exists(original_img_path):
            print("Error: No image at %s" % original_img_path)
        if not os.path.exists(outputted_img_path):
            print("Error: No image at %s" % outputted_img_path)

    difference_img = np.absolute(original_img - outputted_img)
    cv2.imwrite(os.path.join(out_dir, "difference.png"), difference_img)

    '''split difference image into red green and blue color channels'''
    red, green, blue = split_into_rgb_channels(difference_img)
    for values, color, channel in zip((red, green, blue), ('red', 'green', 'blue'), (2, 1, 0)):
        difference_img = np.zeros(
            (values.shape[0], values.shape[1], 3), dtype=values.dtype)
        difference_img[:, :, channel] = values
        print("Saving Image: %s." % color + '.png')
        cv2.imwrite(os.path.join(out_dir, color+"_out.png"), difference_img)


if __name__ == "__main__":
    main()
