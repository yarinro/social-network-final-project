import { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import { getSocket } from '../socket';
import UserBadge from '../components/UserBadge';

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [content, setContent] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const selectedFriendRef = useRef(null);

  // Keep selected friend available inside the socket listener (avoids stale closure)
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  // Load friends list from the user's profile
  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) {
        setLoadingFriends(false);
      }
      return;
    }

    const fetchFriends = async () => {
      try {
        setError('');
        setLoadingFriends(true);
        const response = await api.get(`/users/${user._id}`);
        setFriends(response.data?.friends || []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load friends'));
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user, authLoading]);

  // Register with Socket.IO and append incoming messages to the open conversation
  useEffect(() => {
    if (authLoading || !user?._id) {
      return;
    }

    const socket = getSocket();
    socket.emit('registerUser', user._id);

    const handleReceiveMessage = (message) => {
      if (!message?.from || !message?.to) {
        return;
      }

      const friend = selectedFriendRef.current;

      if (!friend) {
        return;
      }

      const fromId = (message.from._id || message.from)?.toString();
      const toId = (message.to._id || message.to)?.toString();
      const myId = user._id.toString();
      const friendId = friend._id?.toString();

      if (!fromId || !toId || !friendId) {
        return;
      }

      const isCurrentConversation =
        (fromId === myId && toId === friendId) ||
        (fromId === friendId && toId === myId);

      if (!isCurrentConversation) {
        return;
      }

      setConversation((prevMessages) => {
        if (prevMessages.some((item) => item._id === message._id)) {
          return prevMessages;
        }

        return [...prevMessages, message];
      });
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [user, authLoading]);

  const fetchConversation = async (friendId) => {
    try {
      setError('');
      setLoadingConversation(true);
      const response = await api.get(`/messages/conversation/${friendId}`);
      setConversation(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load conversation'));
      setConversation([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleSelectFriend = (friend) => {
    if (!friend?._id) {
      return;
    }

    setSelectedFriend(friend);
    setContent('');
    fetchConversation(friend._id);
  };

  const handleSendMessage = (event) => {
    event.preventDefault();

    if (!selectedFriend?._id || !content.trim()) {
      return;
    }

    const socket = getSocket();
    const trimmedContent = content.trim();

    setError('');
    setSending(true);
    setContent('');

    socket.emit(
      'sendMessage',
      {
        receiverId: selectedFriend._id,
        content: trimmedContent
      },
      (response) => {
        setSending(false);

        if (response?.error) {
          setError(response.error);
          setContent(trimmedContent);
        }
      }
    );
  };

  const isMyMessage = (message) => {
    if (!user?._id || !message?.from) {
      return false;
    }

    const fromId = message.from._id || message.from;
    return fromId.toString() === user._id.toString();
  };

  if (authLoading) {
    return (
      <div className="page">
        <h1>Messages</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Messages</h1>

      {error && <p className="error-message">{error}</p>}

      <section className="messages-section">
        <aside className="friends-sidebar">
          <h2>Friends</h2>

          {loadingFriends ? (
            <p>Loading friends...</p>
          ) : friends.length === 0 ? (
            <p>No friends yet. Add friends from the Users page.</p>
          ) : (
            <ul className="friends-list">
              {friends.map((friend) => (
                <li
                  key={friend?._id || friend}
                  className={
                    selectedFriend?._id === friend?._id
                      ? 'friend-item selected'
                      : 'friend-item'
                  }
                >
                  <UserBadge user={friend} />
                  <button
                    type="button"
                    className="friend-chat-button"
                    onClick={() => handleSelectFriend(friend)}
                  >
                    Chat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="conversation-box">
          {!selectedFriend ? (
            <p>Select a friend to start chatting.</p>
          ) : (
            <>
              <div className="conversation-header">
                <h2>Chat with</h2>
                <UserBadge user={selectedFriend} />
              </div>

              {loadingConversation ? (
                <p>Loading conversation...</p>
              ) : conversation.length === 0 ? (
                <p>No messages yet. Send the first message.</p>
              ) : (
                <div className="messages-list">
                  {conversation.map((message) => (
                    <div
                      key={message._id}
                      className={
                        isMyMessage(message)
                          ? 'message-bubble my-message'
                          : 'message-bubble their-message'
                      }
                    >
                      {!isMyMessage(message) && (
                        <UserBadge user={message.from} className="message-user-badge" />
                      )}
                      <p>{message.content || ''}</p>
                      <span className="message-time">
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleString()
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <form className="message-form" onSubmit={handleSendMessage}>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Type your message..."
                  rows="3"
                  required
                />
                <button type="submit" disabled={sending}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Messages;
