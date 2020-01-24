
# from preprocess import *
import keras
from keras.models import Sequential
from keras.layers import Dense, Dropout, Flatten, Conv2D, MaxPooling2D
from keras.utils import to_categorical
from keras.models import load_model
from preprocess_spectrogram import *

import os
os.environ["PATH"] += os.pathsep + 'C:/Program Files (x86)/Graphviz2.38/bin/'

# Preprocess data and save data to array file first
save_data_to_array()

# # Loading train set and test set
X_train, X_test, y_train, y_test = get_train_test()
#Shape of audio vectors
print(X_train.shape)


# Feature dimension
# Freq
img_dim = 28
channel = 1
epochs = 100
batch_size = 100
verbose = 1
num_classes = 8

# # Reshaping to perform 2D convolution
X_train = X_train.reshape(X_train.shape[0], img_dim, img_dim, channel)
X_test = X_test.reshape(X_test.shape[0], img_dim, img_dim, channel)

print(X_train.shape)

y_train_hot = to_categorical(y_train)
y_test_hot = to_categorical(y_test)


def get_model():
    model = Sequential()
    model.add(Conv2D(32, kernel_size=(2, 2), activation='relu', input_shape=(img_dim, img_dim, channel)))
    model.add(Conv2D(64, kernel_size=(2, 2), activation='relu'))
    model.add(MaxPooling2D(pool_size=(2, 2)))
    model.add(Dropout(0.3))
    model.add(Flatten())
    model.add(Dense(128, activation='relu'))
    model.add(Dropout(0.3))
    model.add(Dense(64, activation='relu'))
    model.add(Dropout(0.4))
    model.add(Dense(num_classes, activation='softmax'))
    model.compile(loss='categorical_crossentropy',
                  optimizer=keras.optimizers.Adadelta(),
                  metrics=['accuracy'])
    return model

# Predicts one sample
def predict(filepath, model):
    sample = spectrogram(filepath)
    sample_reshaped = sample.reshape(1, img_dim, img_dim, channel)
    return get_labels()[0][
            np.argmax(model.predict(sample_reshaped))
    ]


model = get_model()
# model.summary()
model.fit(X_train, y_train_hot, batch_size=batch_size, epochs=epochs, verbose=verbose, validation_data=(X_test, y_test_hot))

# model.save('models/spectrogram2.h5')

# Save model plot
# from keras.utils.vis_utils import plot_model
# plot_model(model, to_file='model_plot2.png', show_shapes=True, show_layer_names=True)

print(predict('test/down.wav', model=model))




