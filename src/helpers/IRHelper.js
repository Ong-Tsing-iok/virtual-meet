import { io } from "socket.io-client";

const serverPath = "http://localhost:5000";
const socket = io(serverPath);
const peer_irs = {};

export const askForIR = (recv_pos, src_pos, id, ack) => {
  peer_irs[id] = new Float32Array([1, 1]);
  // Change into model space by swapping z and y, also make x = -x
  recv_pos = { x: -recv_pos.x, y: recv_pos.z, z: recv_pos.y };
  src_pos = { x: -src_pos.x, y: src_pos.z, z: src_pos.y };
  socket.emit("ask-for-IR", recv_pos, src_pos, id, ack);
  // socket.emit('message', `recv_pos: ${recv_pos}, src_pos: ${src_pos}`)
};

socket.on("send-IR", (data) => {
  const len = data.ir_array.byteLength / 4;
  const buffer = new Float32Array(data.ir_array, 0, len);
  // console.log(buffer);
});
