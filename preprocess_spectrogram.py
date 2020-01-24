import numpy as np
from scipy.io import wavfile
import wave
import librosa
import os
from sklearn.model_selection import train_test_split
from keras.utils import to_categorical
from tqdm import tqdm

X_SIZE = 16000
IMG_SIZE = 28
DATA_PATH = "./data/"

# Input labels
def get_labels(path=DATA_PATH):
    labels = os.listdir(path)
    label_indices = np.arange(0, len(labels))
    return labels, label_indices, to_categorical(label_indices)


# Convert
def wav2mfcc(file_path, max_len=11):
    wave, sr = librosa.load(file_path, mono=True, sr=None)
    # wave = wave[::3]
    # wave = librosa.effects.pitch_shift(wave, sr, n_steps=4)

    return sr, wave

# Get spectrogram
def spectrogram(filepath):
	framerate, wav_data = wav2mfcc(filepath)

	window_length = 512
	window_shift = 121

	if len(wav_data) > X_SIZE:
		wav_data = wav_data[:X_SIZE]

	X = np.zeros(X_SIZE).astype('float32')
	X[:len(wav_data)] += wav_data
	spec = np.zeros((IMG_SIZE, IMG_SIZE)).astype('float32')

	for i in range(IMG_SIZE):
		start = i * window_shift
		end = start + window_length
		sig = np.abs(np.fft.rfft(X[start:end] * np.hanning(window_length)))
		spec[:,i] = (sig[1:IMG_SIZE + 1])[::-1]

	spec = (spec-spec.min())/(spec.max()-spec.min())
	spec = np.log10((spec * 100 + 0.01))
	spec = (spec-spec.min())/(spec.max()-spec.min()) - 0.5

	return spec


# Save to .npy
def save_data_to_array(path=DATA_PATH):
    labels, _, _ = get_labels(path)

    for label in labels:
        # Init mfcc vectors
        mfcc_vectors = []

        wavfiles = [path + label + '/' + wavfile for wavfile in os.listdir(path + '/' + label)]
        for wavfile in tqdm(wavfiles, "Saving vectors of label - '{}'".format(label)):
            mfcc = spectrogram(wavfile)
            mfcc_vectors.append(mfcc)
        np.save(label + 'spec.npy', mfcc_vectors)


def get_train_test(split_ratio=0.6, random_state=42):
    # Get available labels
    labels, indices, _ = get_labels(DATA_PATH)

    # Getting first arrays
    X = np.load(labels[0] + 'spec.npy')
    y = np.zeros(X.shape[0])

    # Append all of the dataset into one single array, same goes for y
    for i, label in enumerate(labels[1:]):
        x = np.load(label + 'spec.npy')
        X = np.vstack((X, x))
        y = np.append(y, np.full(x.shape[0], fill_value=(i + 1)))

    assert X.shape[0] == len(y)

    return train_test_split(X, y, test_size=(1 - split_ratio), random_state=random_state, shuffle=True)