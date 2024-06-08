### Original Project
The original project is Virtual Meet

### Problem Identified
We think that it might be able to use real-time generated BRIRs (Binaural Room Impulse Responses) to improve the immersiveness of 3D conferencing.

### Solution
We added a 3D scene file from the [ScanNet](https://github.com/ScanNet/ScanNet) dataset into Virtual Meet by adding a React component, using PLYloader to load the object and mesh component from React-Three to render it. Furthermore, we used Web Audio API to connect the audio stream to convolvers, in order to use the BRIRS to modify the audio. We then add a component that connects to a [local server](https://github.com/Ong-Tsing-iok/L2S) that generates the BRIRs. When a peer's position updated, it will call the local server for the generated BRIR with the current positions, and modify the underlying buffers of the convolvers with the respond BRIR.

### Comparison
From our own perspective, the audio after convolution sounded more pleasant than the audio without convolution. However, it’s still hard to say immersive. We think the reason is because the audio quality after transmission is too low. Comparing between moving and non moving convolutions, we found out that the effect of changing BRIRs is hard to tell. This might because by the difference between the BRIRs are too little.
