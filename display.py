import matplotlib.pyplot as plt
import librosa
import librosa.display
from sklearn import preprocessing
import numpy as np
import scipy
import sklearn
from preprocess_spectrogram import *
from scipy import signal
from scipy.io import wavfile

path = 'data/pause/pause-01.wav'
img_dim = 28
max_len = 11

spec = spectrogram(path)
librosa.display.specshow(spec, sr=16000, x_axis='time')
plt.show

y, sr = librosa.load(path, )
plt.figure()
plt.subplot(3, 1, 1)
librosa.display.waveplot(y, sr=sr)
plt.title('Monophonic')
plt.show()

# Load wav file and extract data, sample rate
wave, sr = librosa.load(path, mono=True, sr=None)
print(sr)

# Extract features using librosa
mfcc = librosa.feature.mfcc(wave, sr=16000)
print('Shape of mfcc: ', mfcc.shape)

#trim or pad
if (max_len > mfcc.shape[1]):
    pad_width = max_len - mfcc.shape[1]
    mfcc = np.pad(mfcc, pad_width=((0, 0), (0, pad_width)), mode='constant')
else:
    mfcc = mfcc[:, :max_len]
print('Shape after trim/padding: ', mfcc.shape)

# Spectrogram
librosa.display.specshow(mfcc, sr=sr, x_axis='time')
plt.show()


y, sr = librosa.load(path)
plt.figure()
D = librosa.amplitude_to_db(np.abs(librosa.stft(y)), ref=np.max)
plt.subplot(3, 1, 1)
librosa.display.specshow(D, y_axis='linear')
plt.colorbar(format='%+2.0f dB')
plt.title('Linear-frequency power spectrogram')
plt.show()

