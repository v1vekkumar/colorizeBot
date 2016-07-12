import os
import sys
from PIL import Image

def resize(filePath, factor):
    im = Image.open(filePath)
    w, h  = im.size
    newIm = im.resize((int(w*factor), int(h*factor)))
    # i am saving a copy, you can overrider orginal, or save to other folder
    newIm.save(filePath+"copy.png")


if __name__ == "__main__":
    filePath=sys.argv[1] # first arg is path to image folder
    resizeFactor=float(sys.argv[2])/100.0# 2nd is resize in %
    resize(filePath, resizeFactor)

