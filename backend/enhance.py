# js/backend/app/enhance.py

import cv2
import numpy as np

def enhance_image(input_path: str, output_path: str):
    """
    Simple "AI-style" enhancement:
    - upscale 1.5x
    - increase contrast/brightness
    - sharpen filter
    """
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError("Cannot read image")

    # upscale
    img = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)

    # convert to float and adjust contrast/brightness
    alpha = 1.2  # contrast
    beta = 10    # brightness
    img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

    # sharpen
    kernel = np.array([[0, -1, 0],
                       [-1, 5, -1],
                       [0, -1, 0]])
    img = cv2.filter2D(img, -1, kernel)

    cv2.imwrite(output_path, img)
