import React, { useEffect, useState } from "react";
import InputEmoji from "react-input-emoji";
import { over } from "stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

var stompClient = null;
const Chat = () => {
  const [privateChats, setPrivateChats] = useState(new Map());
  const [publicChats, setPublicChats] = useState([]);
  const [tab, setTab] = useState("chat");
  const [userData, setUserData] = useState({
    username: "",
    receivername: "",
    connected: false,
    message: "",
  });

  const [click, setClick] = useState(false);

  //upload file
  const [file, setFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    console.log(file);
  };

  const handleFileUpload = () => {
    const formData = new FormData();
    formData.append("file", file);
    axios
      .post("http://localhost:8080/upload", formData)
      .then((response) => {
        console.log(response.data);
        const blobURL = URL.createObjectURL(file);
        setFileURL(blobURL);
        console.log(fileURL);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    console.log(userData);
  }, [userData]);

  const connect = () => {
    let Sock = new SockJS("http://localhost:8080/chat");
    stompClient = over(Sock);
    stompClient.connect({}, onConnected, onError);
    console.log(Sock, stompClient);
  };

  const onConnected = () => {
    setUserData({ ...userData, connected: true });
    stompClient.subscribe("/chat/public", onMessageReceived);
    stompClient.subscribe(
      "/user/" + userData.username + "/private",
      onPrivateMessage
    );
    userJoin();
  };

  const userJoin = () => {
    var chatMessage = {
      senderName: userData.username,
      status: "JOIN",
    };
    stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
  };

  const onMessageReceived = (payload) => {
    var payloadData = JSON.parse(payload.body);
    // eslint-disable-next-line default-case
    switch (payloadData.status) {
      case "JOIN":
        if (!privateChats.get(payloadData.senderName)) {
          privateChats.set(payloadData.senderName, []);
          setPrivateChats(new Map(privateChats));
        }
        break;
      case "MESSAGE":
        publicChats.push(payloadData);
        setPublicChats([...publicChats]);
        break;
      case "LEAVE":
        break;
    }
  };

  const onPrivateMessage = (payload) => {
    console.log(payload);
    var payloadData = JSON.parse(payload.body);
    if (privateChats.get(payloadData.senderName)) {
      privateChats.get(payloadData.senderName).push(payloadData);
      setPrivateChats(new Map(privateChats));
    } else {
      let list = [];
      list.push(payloadData);
      privateChats.set(payloadData.senderName, list);
      setPrivateChats(new Map(privateChats));
    }
  };

  const onError = (err) => {
    alert("something error: " + err);
  };

  const handleMessage = (value) => {
    setUserData({ ...userData, message: value });
  };

  const sendValue = () => {
    if (stompClient && userData.message !== "") {
      var chatMessage = {
        senderName: userData.username,
        message: userData.message,
        status: "MESSAGE",
      };
      console.log(chatMessage);
      stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
      setUserData({ ...userData, message: "" });
    }
  };

  const sendPrivateValue = () => {
    if (stompClient && userData.message !== "") {
      var chatMessage = {
        senderName: userData.username,
        receiverName: tab,
        message: userData.message,
        status: "MESSAGE",
      };

      if (userData.username !== tab) {
        privateChats.get(tab).push(chatMessage);
        setPrivateChats(new Map(privateChats));
      }
      stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage));
      setUserData({ ...userData, message: "" });
    }
  };

  const handleUsername = (event) => {
    const { value } = event.target;
    setUserData({ ...userData, username: value });
  };

  const handleOfToggle = () => {
    setClick(!click);
  };

  const registerUser = () => {
    if (userData.username !== "") {
      connect();
    }
  };

  const handleInputPublic = (e) => {
    if (e.keyCode === 13) {
      sendValue();
    }
  };

  const handleInputPrivate = (e) => {
    if (e.keyCode === 13) {
      sendPrivateValue();
    }
  };

  const handleInputName = (enter) => {
    if (enter.keyCode === 13) {
      registerUser();
    }
  };

  return (
    <div className="container">
      {userData.connected ? (
        <div className="chat-box">
          <div className="member-list">
            <ul>
              <li
                onClick={() => {
                  setTab("chat");
                }}
                className={`member ${tab === "chat" && "active"}`}
              >
                Public
              </li>
              {[...privateChats.keys()].map((name, index) => (
                <li
                  onClick={() => {
                    setTab(name);
                  }}
                  className={`member ${tab === name && "active"}`}
                  key={index}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
          {tab === "chat" && (
            <div className="chat-content">
              <ul className="chat-messages">
                {publicChats.map((chat, index) => (
                  <li
                    className={`message ${
                      chat.senderName === userData.username && "self"
                    }`}
                    key={index}
                  >
                    {chat.senderName !== userData.username && (
                      <div className="avatar">{chat.senderName}</div>
                    )}
                    <div className="message-data">{chat.message}</div>
                    {chat.senderName === userData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="send-message">
                {click === true ? (
                  <div className="file-s">
                    <input
                      type="file"
                      className="input-file"
                      onChange={handleFileChange}
                    />
                    <button onClick={handleFileUpload}>send</button>
                  </div>
                ) : (
                  ""
                )}
                <button className="btn-file" onClick={handleOfToggle}>
                  ChooseFile
                </button>
                <InputEmoji
                  className="input-message"
                  placeholder="enter your message"
                  value={userData.message}
                  onKeyDown={handleInputPublic}
                  onChange={handleMessage}
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={sendValue}
                >
                  <i class="fa-regular fa-paper-plane"></i>
                </button>
              </div>
            </div>
          )}
          {tab !== "chat" && (
            <div className="chat-content">
              <ul className="chat-messages">
                {[...privateChats.get(tab)].map((chat, index) => (
                  <li
                    className={`message ${
                      chat.senderName === userData.username && "self"
                    }`}
                    key={index}
                  >
                    {chat.senderName !== userData.username && (
                      <div className="avatar">{chat.senderName}</div>
                    )}
                    <div className="message-data">{chat.message}</div>
                    {chat.senderName === userData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="send-message">
                <InputEmoji
                  className="input-message"
                  placeholder="enter your message"
                  value={userData.message}
                  onKeyDown={handleInputPrivate}
                  onChange={handleMessage}
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={sendPrivateValue}
                >
                  <i class="fa-regular fa-paper-plane"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="register">
          <input
            id="user-name"
            placeholder="Enter your name"
            name="userName"
            value={userData.username}
            onChange={handleUsername}
            onKeyDown={handleInputName}
            margin="normal"
          />
          <button type="button" onClick={registerUser}>
            connect
          </button>
        </div>
      )}
    </div>
  );
};

export default Chat;
