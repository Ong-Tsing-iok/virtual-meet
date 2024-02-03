export const getMediaStreamVideo = (videoStreamRef, playerKeys, peer) => {
    const getUserMedia = navigator.mediaDevices.getUserMedia
    getUserMedia({
      video: {
        width: {max: 640},
        height: {max: 480}
      },
      audio: false
    }).then(stream => {
      videoStreamRef.current = stream
      playerKeys.forEach((key) => {
        connectToNewUser(key.peerId, stream, peer)
      })
    })
    .catch(err => {
        if(err.message === 'Permission denied'){
            alert('Please allow camera access to use the video camera')
        }
        if(err.message === 'Device in use'){
            alert('Camera is already in use, please close all other apps using the camera')
        }
        console.log(err)
    })
}

export const getMediaStreamAudio = (audioStreamRef, playerKeys, peerConn, socket, peer) => {
    const getUserMedia = navigator.mediaDevices.getUserMedia
    getUserMedia({
      video: false,
      audio: true
    }).then(stream => {
      audioStreamRef.current = stream
      playerKeys.forEach((key) => {
        connectToNewUser(key.peerId, stream, peer)
      })
    Promise.all(peerConn.map(async (conn) => {
        conn.send({ type: 'audio', audio: true, socketId: socket.current.id});
    }));
    })
    .catch(err => {
      if(err.message === 'Permission denied'){
        alert('Please allow microphone access to use the global mic')
      }
      if(err.message === 'Device in use'){
        alert('Microphone is already in use, please close all other apps using the microphone')
      }
      console.log(err)
    })
}

export const connectToNewUser = (id, stream, peer) => {
    const call = peer.current.call(id, stream)
        
    console.log('calling', id)
}