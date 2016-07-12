#!/usr/bin/env python
#  Usage : colorize <input_file> <output_file>
# 
#  Copyright (C) 2016 Vivek Kumar
#
#  This file is licensed under the Creative Commons
#  Attribution-NonCommercial-ShareAlike 4.0 International License. To view a copy
#  of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or
#  send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
#  Attribution-NonCommercial-ShareAlike 4.0 International License. To view a copy
#  of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or
#  send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
#
#     Vivek Kumar   http://v1vek.com   twitter:@vivek_kumar
#
# This file uses Colorful Image Colorizations work by  Richard Zhang et all
# which is Copyright (c) 2016, Richard Zhang, Phillip Isola, Alexei A. Efros
# See ../LICENSE for licensing details 
#



import os
import numpy as np
import matplotlib.image as img

# Set environement variables for Caffe to behave
os.environ["GLOG_minloglevel"] = "2"
import caffe

import skimage.color as color
import scipy.ndimage.interpolation as sni
import urllib
import sys

#Check Input arguments

if len(sys.argv) != 3:
    print 'Usage : colorize <input_file> <output_file>'
    sys.exit(2)

inputImage = sys.argv[1]
outputImage = sys.argv[2]

#Check if input image exists
if not os.path.isfile(inputImage):
    print 'Error: Input Image not Found !'
    print 'Usage : colorize <input_file> <output_file>'
    sys.exit(1)



#Download the colorization model if it is not present.
colorizeModel_url ='https://www.dropbox.com/s/8iq5wm4ton5gwe1/colorization_release_v0.caffemodel'
colorizeModel = 'colorization_release_v0.caffemodel'

if not os.path.isfile(colorizeModel):
       	#os.system('wget https://www.dropbox.com/s/8iq5wm4ton5gwe1/colorization_release_v0.caffemodel') 
        urllib.urlretrieve(colorizeModel_url, colorizeModel)

# Open the caffemodel. The model input blob is data_l, and has shape 1x1x224x224 by default. 
# The model output is class8_ab, and has shape 1x2x56x56. We also need to set the temperature T 
# for the annealed mean operation. Blob *Trecip* is the reciprocal  of the temperature.


caffe.set_mode_cpu()
net = caffe.Net('colorization_deploy_v0.prototxt', colorizeModel, caffe.TEST)

(H_in,W_in) = net.blobs['data_l'].data.shape[2:] 	# get input shape
(H_out,W_out) = net.blobs['class8_ab'].data.shape[2:]   # get output shape

net.blobs['Trecip'].data[...] = 6/np.log(10) 		# 1/T, set annealing temperature
    # (We found that we had introduced a factor of log(10). We will update the arXiv shortly.)


# Load the Image

# load the original image
img_rgb = caffe.io.load_image(inputImage)

# convert the image from full resulution to Lab and keep its L value 
# colors generated from the network would be contatinated to it.
# 

img_lab = color.rgb2lab(img_rgb) # convert image to lab color space
img_l = img_lab[:,:,0]           # pull out L channel
(H_orig,W_orig) = img_rgb.shape[:2] # original image size


# resize image to network input size
img_rs = caffe.io.resize_image(img_rgb,(H_in,W_in)) # resize image to network input size
img_lab_rs = color.rgb2lab(img_rs)
img_l_rs = img_lab_rs[:,:,0]



#  Colorization time!.  Run the network.
#  Subtract 50 from the L channel for mean centering), push it into the network, and run a forward pass. 



net.blobs['data_l'].data[0,0,:,:] = img_l_rs-50 # subtract 50 for mean-centering
net.forward() # run network

ab_dec = net.blobs['class8_ab'].data[0,:,:,:].transpose((1,2,0)) # this is our result

# Take the output from class8_ab, resize it to the full resolution, concatenate with the L channel, 
# convert to rgb

ab_dec_upsample = sni.zoom(ab_dec,(1.*H_orig/H_out,1.*W_orig/W_out,1)) 	     # upsample to match size of original image L
img_lab_out = np.concatenate((img_l[:,:,np.newaxis],ab_dec_upsample),axis=2) # concatenate with original image L
img_rgb_out = np.clip(color.lab2rgb(img_lab_out),0,1)                        # convert back to rgb

print 'colored image is at:', outputImage
# Save image as output
img.imsave(outputImage, img_rgb_out)
os.environ["GLOG_minloglevel"] = "0"
