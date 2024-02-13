import React, { useContext, useEffect, useState, useRef } from 'react'
import { PlayerContext } from '../helpers/contextProvider'
import { IoClose, IoSend } from "react-icons/io5"

const ChatBox = ({setBoxes, boxes}) => {

    const [message, setMessage] = useState('')
    const { setControlsAllowed, peerConn, socket, myName } = useContext(PlayerContext)
    const [chats, setChats] = useState([])
    const [currChat, setCurrChat] = useState('all')

    const nameColors = useRef({})
    const randomColors = useRef([])

    useEffect(() => {
        const getData = () => {
            if(randomColors.current.length === 0){
                randomColors.current = ['#7dcceb', '#eb7d7d', '#ebe07d', '#e77deb']
            }
            const data = JSON.parse(sessionStorage.getItem('all'))
            if(data){
                if(!nameColors.current[data[0].id]){
                    nameColors.current[data[0].id] = randomColors.current.pop()
                }
                setChats(data)
            }
            console.log(nameColors.current)
        }
        document.addEventListener('chat', getData)
    },[])

    const onMessage = () => {
        let data = JSON.parse(sessionStorage.getItem('all'))
        let curr = {id: socket.id, name: myName, message: message}
        if(!data){
            data = [curr]
        }else {
            if(data[0].id === socket.id){
                curr = {...curr, prev: true}
            }
            data.unshift(curr)
        }
        sessionStorage.setItem('all', JSON.stringify(data))
        setMessage('')
        setChats((prev) => [curr, ...prev])
        Promise.all(peerConn.map(async (conn) => {
            conn.send({type: 'chat', channel: 'all', id: socket.current.id, message: message})
        }));
    }

  return (
    <div className='fixed bottom-[70px] right-2 z-10 bg-[#5c89d1] rounded w-72 h-[55%]'>
        <button className='absolute -top-4 -right-2 bg-[#445b80] rounded-full hover:scale-110' onClick={() => setBoxes({...boxes, chat: false})}>
            <IoClose size={20} color='#fff' />
        </button>
        <div className='flex flex-col h-full'>
            <div className='flex justify-between px-2 mt-1 border-b-2 rounded pb-1'>
                <img src='/placeholder.jpg' width={24} className='rounded-full' />
                <p>All Chat</p>
            </div>
            <div className='w-full flex-1 mt-1 px-2 overflow-y-scroll no-scrollbar flex flex-col-reverse'>
                {
                    chats.map((chat, index) => {
                        return(
                            <div key={index}>
                                <p 
                                    className={`p-1 ${chat.prev ? 'mt-[0.1rem]' : 'mt-1'}  max-w-[80%] rounded-lg break-words ${chat.id === socket.id ? 'float-end bg-[#498d73]' : 'float-start bg-[#445b80]'}`}
                                >{
                                    <span className='flex flex-col'>
                                        {
                                        (currChat === 'all' && chat.id !== socket.id && !chat.prev) &&
                                        <span className='text-[10px]' style={{color: nameColors.current[chat.id]}}>{chat.name}</span>
                                        }
                                        {chat.message}
                                    </span>
                               }</p>
                            </div>
                        )
                    })
                }
            </div>
            <div className='w-full p-1'>
                <div className='flex justify-between text-center bg-gray-700 rounded-3xl p-1'>
                    <input 
                        type='text' 
                        onFocus={() => setControlsAllowed(false)} 
                        onBlur={() => setControlsAllowed(true)} 
                        className='w-full rounded-3xl px-2 text-sm focus:outline-none' 
                        placeholder='Type a message' 
                        onChange={(e) => setMessage(e.target.value)}
                        value={message}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') onMessage()
                        }}
                    />
                    <button onClick={onMessage} className='bg-[#5c89d1] rounded-full p-1 hover:scale-90'>
                        <IoSend size={15} color='#fff' className='ml-1' />
                    </button>
                </div>
            </div>
        </div>
    </div>
  )
}

export default ChatBox