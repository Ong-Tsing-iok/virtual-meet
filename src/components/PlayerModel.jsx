/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
/* eslint-disable react/no-unknown-property */
import { memo, useEffect, useMemo, Suspense, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useVideoTexture, Html } from "@react-three/drei";
import { BsMicFill, BsMicMuteFill } from "react-icons/bs";
import irAudioFile from "/1.wav";
import { askForIR } from "../helpers/IRHelper";

const PlayerModel = memo((value) => {
  const [isVideo, setIsVideo] = useState(false);
  const playerNameRef = useRef();

  const VideoMaterial = ({ src, attach }) => {
    const texture = useVideoTexture(src);

    return (
      <meshBasicMaterial map={texture} toneMapped={false} attach={attach} />
    );
  };

  useFrame(() => {
    if (playerNameRef.current) {
      playerNameRef.current.lookAt(
        value.povRef.current.position.x,
        value.povRef.current.position.y + 0.2,
        value.povRef.current.position.z
      );
    }
  });

  const playerData = useMemo(
    () => ({
      refe: value.refe,
      position: value.position,
      rotation: value.rotation,
      name: value.name,
      video: value.video,
      audio: value.audio,
      audioIcon: value.audioIcon,
      nodes: value.nodes,
      materials: value.materials,
      placeHolder: value.placeHolder,
      irBuffer: value.irBuffer,
    }),
    [value]
  );

  const PlayerName = () => {
    return (
      <group position={[0, 0.2, 0]} ref={playerNameRef} rotation={[0, 3.2, 0]}>
        <Html
          distanceFactor={1}
          occlude="blending"
          zIndexRange={[0, 0]}
          transform
        >
          <div className="max-w-52 flex items-center justify-center relative">
            <div className="flex items-center justify-center h-10 px-2 mr-1 bg-gray-900 text-white rounded select-none">
              {playerData.name}
            </div>
            <div className="flex items-center justify-center h-10 px-2 bg-gray-900 text-white rounded select-none">
              {playerData.audioIcon ? <BsMicFill /> : <BsMicMuteFill />}
            </div>
          </div>
        </Html>
      </group>
    );
  };

  let videoTracks = useRef([]);
  let audioTracks = useRef([]);
  let channelBuffers = useRef([]);
  useEffect(() => {
    if (playerData.video) {
      videoTracks.current = playerData.video.getVideoTracks();
      if (videoTracks.current.length > 0) {
        setIsVideo(true);
        videoTracks.current[0].onmute = () => {
          setIsVideo(false);
          videoTracks.current = [];
        };
      } else {
        setIsVideo(false);
      }
    }
  }, [playerData.video]);

  useEffect(() => {
    if (playerData.audio) {
      audioTracks.current = playerData.audio.getAudioTracks();
      if (audioTracks.current.length > 0) {
        const stream = playerData.audio;
        const [audio, leftChannelBuffer, rightChannelBuffer] = createAudio(stream);
        channelBuffers.current = [leftChannelBuffer, rightChannelBuffer];
        // console.log('create audio')
        audioTracks.current[0].onmute = () => {
          audio.srcObject = null;
          audioTracks.current = [];
          channelBuffers.current = [];
        };
      }
    }
  }, [playerData.audio]);

  useEffect(() => {
    // console.log('in player model')
    // console.log(playerData.ir_buffer)
    if (channelBuffers.current.length > 0 && playerData.irBuffer) {
      const [leftChannelBuffer, rightChannelBuffer] = channelBuffers.current;
      const midpoint = playerData.irBuffer.length / 2;
      leftChannelBuffer.getChannelData(0).set(playerData.irBuffer.subarray(0, midpoint));
      rightChannelBuffer.getChannelData(0).set(playerData.irBuffer.subarray(midpoint));
      console.log('set ir buffer')
    }
  }, [playerData.irBuffer]);

  const createAudio = (stream) => {
    // const irAudioFile = './Factory Hall.wav';
    var ctx = new AudioContext();
    // Create ConvolverNodes for left and right channels
    const leftConvolver = ctx.createConvolver();
    const rightConvolver = ctx.createConvolver();
    var leftChannelBuffer = ctx.createBuffer(
      1,
      3969, // The length of IR is 3968
      ctx.sampleRate
    );
    var rightChannelBuffer = ctx.createBuffer(
      1,
      3969, // The length of IR is 3968
      ctx.sampleRate
    )
    const initialIR = new Float32Array(3969).fill(0);
    initialIR[1984] = 1; // Set the middle of the IR to 1
    leftChannelBuffer.getChannelData(0).set(initialIR);
    rightChannelBuffer.getChannelData(0).set(initialIR);

    leftConvolver.buffer = leftChannelBuffer;
    rightConvolver.buffer = rightChannelBuffer;
    // Load the stereo audio file
    // fetch(irAudioFile)
    //   .then((response) => response.arrayBuffer())
    //   .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
    //   .then((audioBuffer) => {
    //     // Separate the audio data into left and right channels
    //     const leftChannelData = audioBuffer.getChannelData(0); // Left channel data
    //     const rightChannelData = audioBuffer.getChannelData(1); // Right channel data

    //     // Create AudioBuffer for left channel
    //     const leftChannelBuffer = ctx.createBuffer(
    //       1,
    //       audioBuffer.length,
    //       audioBuffer.sampleRate
    //     );
    //     leftChannelBuffer.copyToChannel(leftChannelData, 0);

    //     // Create AudioBuffer for right channel
    //     const rightChannelBuffer = ctx.createBuffer(
    //       1,
    //       audioBuffer.length,
    //       audioBuffer.sampleRate
    //     );
    //     rightChannelBuffer.copyToChannel(rightChannelData, 0);

    //     // Set the left and right channel buffers to the ConvolverNodes
    //     leftConvolver.buffer = leftChannelBuffer;
    //     rightConvolver.buffer = rightChannelBuffer;
    //   })
    //   .catch((error) => {
    //     console.error("Error loading stereo audio file:", error);
    //   });
    const merger = ctx.createChannelMerger(2);
    var audio = new Audio();
    audio.srcObject = stream;
    var gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    audio.onloadedmetadata = function () {
      var source = ctx.createMediaStreamSource(audio.srcObject);
      audio.play();
      audio.muted = true;
      source.connect(leftConvolver);
      source.connect(rightConvolver);
      leftConvolver.connect(merger, 0, 0);
      rightConvolver.connect(merger, 0, 1);
      merger.connect(gainNode);
      // source.connect(gainNode);
      gainNode.connect(ctx.destination);
    };
    return [audio, leftChannelBuffer, rightChannelBuffer];
  };

  return (
    <group
      ref={(e) => {
        const map = value.getMap();
        if (e) {
          map.set(playerData.refe, e);
        } else {
          map.delete(playerData.refe);
        }
      }}
      position={[
        playerData.position.x,
        playerData.position.y,
        playerData.position.z,
      ]}
      rotation={[
        playerData.rotation._x,
        playerData.rotation._y,
        playerData.rotation._z,
      ]}
    >
      <PlayerName />
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0]} />
        <meshBasicMaterial color="black" attach="material-0" />
        <meshBasicMaterial color="black" attach="material-1" />
        <meshBasicMaterial color="black" attach="material-2" />
        <meshBasicMaterial color="black" attach="material-3" />
        <meshBasicMaterial color="black" attach="material-4" />
        {isVideo ? (
          <Suspense
            fallback={<meshBasicMaterial color="black" attach="material-5" />}
          >
            <VideoMaterial src={playerData.video} attach="material-5" />
          </Suspense>
        ) : (
          <meshBasicMaterial map={playerData.placeHolder} attach="material-5" />
        )}
      </mesh>
      <mesh
        geometry={playerData.nodes.TV__0.geometry}
        material={playerData.materials["Scene_-_Root"]}
        scale={[0.091, 0.105, 0.1]}
        position={[0, 0.001, 0.007]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
});

export default PlayerModel;
