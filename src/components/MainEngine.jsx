/* eslint-disable react/no-unknown-property */
import { useEffect, useRef, useState, useContext, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Stats, Stars } from "@react-three/drei";
import { Peer } from "peerjs";
import * as THREE from "three";
import { sendModel } from "../helpers/socketConnection";
import { PlayerContext } from "../helpers/contextProvider";
import { connectToNewUser, getDefaultDevices } from "../helpers/getMedia";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import PlayerModel from "./PlayerModel";
import Pov from "./Pov";
import BottomBar from "./BottomBar";
import { LoaderBar } from "../helpers/loaders";
import { askForIR } from "../helpers/IRHelper";
import Info from "./Info";
import OwnVideo from "./OwnVideo";
import RightBar from "./RightBar";
import Screen from "./Screen";
import ScreenFull from "./ScreenFull";
import Scene from "./Scene";

function MainEngine() {
  const [loading, setLoading] = useState(true);
  const {
    playerKeys,
    setPlayerKeys,
    myName,
    setPeerConn,
    socket,
    peer,
    room,
    screenShared,
    setDevice,
  } = useContext(PlayerContext);
  const [videos, setVideos] = useState({});
  const [audios, setAudios] = useState({});
  const [irBuffers, setIrBuffers] = useState({});
  const [audioIcon, setAudioIcon] = useState({});
  const [isOwnVideo, setIsOwnVideo] = useState(false);
  const [screen, setScreen] = useState(false);

  const players = useRef(null);
  const playersRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenShareInfo = useRef(null);
  const povRef = useRef(null);
  const randomPositionX = useRef();
  const randomPositionZ = useRef();

  const navigate = useNavigate();
  const { meetingId } = useParams();

  const getMap = () => {
    if (!playersRef.current) {
      playersRef.current = new Map();
    }
    return playersRef.current;
  };

  const { nodes, materials } = useLoader(GLTFLoader, "/television.glb");
  const sceneGeometry = useLoader(PLYLoader, "/scene0000_02_vh_clean_or.ply");

  const placeHolder = useLoader(THREE.TextureLoader, "/placeholder.jpg");

  useEffect(() => {
    if (!socket.current) {
      navigate(`/${meetingId}`);
      return;
    }
    sessionStorage.clear();
    try {
      const peerConnection = new Peer({
        host: import.meta.env.VITE_PEER_HOST,
        secure: true,
      });
      peerConnection.on("open", () => {
        peer.current = peerConnection;
        randomPositionX.current = Math.random() - 5;
        randomPositionZ.current = Math.random() * 2 + 2;
        getMedia();
        setLoading(false);
        getDefaultDevices().then((devices) => {
          setDevice({ audio: devices.audioDevice, video: devices.videoDevice });
        });
      });
    } catch (error) {
      console.error("Error initializing Peer:", error);
      alert("Server Error, please try again later");
      navigate("/");
    }
  }, []);

  const Plane = () => {
    const { gl } = useThree();

    useEffect(() => {
      const closeContext = () => {
        if (gl) {
          gl.dispose();
        }
      };

      return closeContext;
    }, []);

    return (
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
    );
  };

  const getMedia = () => {
    peer.current.on("call", (call) => {
      call.answer();
      call.on("stream", (userStream) => {
        if (call.metadata.type === "screen") {
          screenStreamRef.current = userStream;
          setScreen(true);
        } else if (call.metadata.type === "video") {
          if (!videos[call.peer]) {
            setVideos((prev) => {
              return { ...prev, [call.peer]: userStream };
            });
          }
        } else if (call.metadata.type === "audio") {
          if (!audios[call.peer]) {
            setAudios((prev) => {
              return { ...prev, [call.peer]: userStream };
            });
          }
        }
      });
    });
    sendModel(socket.current, {
      peerId: peer.current.id,
      room: room.current,
      name: myName,
    });
    getPlayers();
    onDisconnect();
    onMeetingEnd();

    peer.current.on("connection", (conn) => {
      conn.on("open", () => {
        setPeerConn((prev) => [...prev, conn]);
        if (povRef.current) {
          const position = {
            x: povRef.current.position.x,
            y: povRef.current.position.y,
            z: povRef.current.position.z,
          };
          const rotation = {
            _x: povRef.current.rotation._x,
            _y: povRef.current.rotation._y,
            _z: povRef.current.rotation._z,
          };
          conn.send({
            position: position,
            rotation: rotation,
            socketId: socket.current.id,
            peerId: peer.current.id,
            room: room.current,
            name: myName,
          });
        } else {
          conn.send({
            position: {
              x: randomPositionX.current,
              y: 1.6,
              z: randomPositionZ.current,
            },
            rotation: { _x: 0, _y: 0, _z: 0 },
            socketId: socket.current.id,
            peerId: peer.current.id,
            room: room.current,
            name: myName,
          });
        }
      });
      conn.on("data", (data) => {
        dataChannel(conn, data);
      });
    });
  };

  const getPlayers = () => {
    socket.current.emit("get-all-users");
    socket.current.on("all-users", (player) => {
      const keys = Object.entries(player).map(([key, value]) => ({
        socketId: key,
        peerId: value.peerId,
      }));

      keys.forEach((key) => {
        const conn = peer.current.connect(key.peerId);
        conn.on("open", () => {
          conn.send({
            position: {
              x: randomPositionX.current,
              y: 1.6,
              z: randomPositionZ.current,
            },
            rotation: { _x: 0, _y: 0, _z: 0 },
            socketId: socket.current.id,
            peerId: peer.current.id,
            room: room.current,
            name: myName,
          });
          setPeerConn((prev) => [...prev, conn]);
        });
        conn.on("data", (data) => {
          dataChannel(conn, data);
        });
      });
    });
  };

  const dataChannel = (conn, data) => {
    if (!players.current) {
      players.current = { [data.socketId]: { ...data, audio: false } };
    }
    if (data.type === "audio") {
      // console.log("audio data sent")
      setAudioIcon((prev) => {
        return { ...prev, [data.socketId]: data.audio };
      });
    } else if (data.type === "chat") {
      let curr = JSON.parse(sessionStorage.getItem(data.channel));
      if (!curr) {
        curr = [
          {
            id: data.id,
            name: players.current[data.id].name,
            message: data.message,
          },
        ];
      } else {
        if (curr[0].id === data.id) {
          curr.unshift({
            id: data.id,
            name: players.current[data.id].name,
            message: data.message,
            prev: true,
          });
        } else {
          curr.unshift({
            id: data.id,
            name: players.current[data.id].name,
            message: data.message,
          });
        }
      }
      sessionStorage.setItem(data.channel, JSON.stringify(curr));
      document.dispatchEvent(new Event("chat"));
    } else if (data.type === "screen") {
      if (data.screen) {
        screenShareInfo.current = data;
      } else {
        setScreen(false);
        screenShareInfo.current = null;
        screenStreamRef.current = null;
      }
    } else {
      updatePlayers(data, conn);
    }
  };

  const updatePlayers = (data, conn) => {
    const id = data.socketId;
    if (!players.current[id]) {
      players.current = { ...players.current, [id]: { ...data, audio: false } };
    }
    setPlayerKeys((prev) => {
      const socketIds = prev.map((key) => key.socketId);
      if (!socketIds.includes(id)) {
        if (screenStreamRef.current) {
          conn.send({
            type: "screen",
            screen: true,
            peerId: peer.current.id,
          });
          connectToNewUser(data.peerId, screenStreamRef.current, peer);
        }

        if (audioStreamRef.current) {
          conn.send({
            type: "audio",
            audio: true,
            socketId: socket.current.id,
          });
          connectToNewUser(data.peerId, audioStreamRef.current, peer);
        }

        if (videoStreamRef.current) {
          connectToNewUser(data.peerId, videoStreamRef.current, peer);
        }
        return [...prev, { socketId: id, peerId: data.peerId }];
      } else {
        return prev;
      }
    });
    if (playersRef.current) {
      const currPlayer = playersRef.current.get(id);
      if (currPlayer) {
        currPlayer.position.set(
          data.position.x,
          data.position.y,
          data.position.z
        );
        currPlayer.rotation.set(
          data.rotation._x,
          data.rotation._y,
          data.rotation._z
        );
        // TODO
        // This will not execute when checking for audioIcon[id]
        // Let's just leave it for now.
        // if (audioIcon[id]) {
          console.log('asking for IR')
          askForIR(
            {
              x: povRef.current.position.x,
              y: povRef.current.position.y,
              z: povRef.current.position.z,
            },
            {
              x: data.position.x,
              y: data.position.y,
              z: data.position.z,
            },
            id,
            (data) => {
              console.log(data)
              if (data) {
                setIrBuffers((prev) => {
                  return { ...prev, [id]: new Float32Array(data.ir_buffer, 0, data.ir_buffer.byteLength / 4) };
                })
                // players.current[id].ir_buffer = new Float32Array(data.ir_buffer, 0, data.ir_buffer.byteLength / 4);
                // console.log(players.current[id].ir_buffer)
              }
            }
          );
          // Update ir buffer here and store in currentPlayer? then it could be updated in PlayerModel.
        // }
      }
    }
  };

  const onDisconnect = () => {
    socket.current.on("user-disconnected", (player) => {
      const id = player.socketId;
      setPlayerKeys((prev) => {
        return prev.filter((key) => key.socketId !== id);
      });
      players.current[id] = null;
      if (playersRef.current) {
        const currPlayer = playersRef.current.get(id);
        if (currPlayer) {
          playersRef.current.delete(id);
        }
      }
      const peerId = player.peerId;
      videos[peerId] = null;
      if (videoRef.current) {
        const currVideo = videoRef.current.get(peerId);
        if (currVideo) {
          videoRef.current.delete(peerId);
        }
      }
      setPeerConn((prev) => {
        const conn = prev.find((conn) => conn.peer === peerId);
        if (conn) {
          conn.close();
          return prev.filter((conn) => conn.peer !== peerId);
        } else {
          return prev;
        }
      });
    });
  };

  const onMeetingEnd = () => {
    socket.current.on("admin-ended-call", () => {
      socket.current.disconnect();
      peer.current.destroy();
      setPlayerKeys([]);
      setPeerConn([]);
      setLoading(true);
      setTimeout(() => {
        navigate("/", { replace: true, state: { fromAdmin: true } });
      }, 1000);
    });
  };

  return (
    <Suspense fallback={<LoaderBar />}>
      <div className="h-screen w-screen">
        {!loading ? (
          <>
            <BottomBar
              audioStreamRef={audioStreamRef}
              videoStreamRef={videoStreamRef}
              screenStreamRef={screenStreamRef}
              setIsOwnVideo={setIsOwnVideo}
              setScreen={setScreen}
              screen={screen}
            />
            <Info />
            <OwnVideo videoStreamRef={videoStreamRef} isOwnVideo={isOwnVideo} />
            <RightBar />
            {players.current && screen && !screenShared && (
              <ScreenFull
                screen={screen}
                screenStreamRef={screenStreamRef}
                name={
                  Object.values(players.current).filter(
                    (obj) => obj.peerId == screenShareInfo.current.peerId
                  )[0].name
                }
              />
            )}
            <Canvas id="canvas" camera={{ position: [0, 0.5, 0.3] }}>
              <Plane />
              <Screen
                nodes={nodes}
                materials={materials}
                screen={screen}
                screenStreamRef={screenStreamRef}
              />
              <Scene sceneGeometry={sceneGeometry} />
              <Stars
                radius={100}
                depth={50}
                count={5000}
                factor={4}
                saturation={0}
                fade
                speed={1}
              />
              {socket.current && peer.current && (
                <Pov
                  socket={socket}
                  povRef={povRef}
                  randomPositionX={randomPositionX.current}
                  randomPositionZ={randomPositionZ.current}
                />
              )}
              {playerKeys &&
                playerKeys.map((key) => {
                  return (
                    <PlayerModel
                      refe={key.socketId}
                      key={key.socketId}
                      position={players.current[key.socketId].position}
                      rotation={players.current[key.socketId].rotation}
                      getMap={getMap}
                      video={videos ? videos[key.peerId] : null}
                      audio={audios ? audios[key.peerId] : null}
                      name={players.current[key.socketId].name}
                      povRef={povRef}
                      audioIcon={audioIcon[key.socketId]}
                      nodes={nodes}
                      materials={materials}
                      videos={videos}
                      placeHolder={placeHolder}
                      irBuffer={irBuffers[key.socketId]}
                    />
                  );
                })}
              <gridHelper args={[20, 20]} />
            </Canvas>
            {/* <Stats className='flex justify-end right-0 pointer-events-none z-50' /> */}
          </>
        ) : (
          <LoaderBar />
        )}
      </div>
    </Suspense>
  );
}

export default MainEngine;
