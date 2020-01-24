from preprocess_spectrogram import *
import keras
from keras.models import Sequential
from keras.layers import Dense, Dropout, Flatten, Conv2D, MaxPooling2D
from keras.utils import to_categorical
from keras.models import load_model

img_dim = 28
channel = 1
path = 'test/test2.wav'
model = load_model('models/spectrogram.h5')

def predict(filepath, model):
    sample = spectrogram(filepath)
    sample_reshaped = sample.reshape(1, img_dim, img_dim, channel)
    return get_labels()[0][
            np.argmax(model.predict(sample_reshaped))
    ]

print(predict(path, model=model))
