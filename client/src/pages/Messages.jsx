import { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

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

  useEffect(() => {
    if (!user) {
      setLoadingFriends(false);
      return;
    }

    const fetchFriends = async () => {
      try {
        setError('');
        const response = await api.get(`/users/${user._id}`);
        setFriends(response.data.friends || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load friends');
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user]);

  const fetchConversation = async (friendId) => {
    try {
      setError('');
      setLoadingConversation(true);
      const response = await api.get(`/messages/conversation/${friendId}`);
      setConversation(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversation');
      setConversation([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setContent('');
    fetchConversation(friend._id);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!selectedFriend || !content.trim()) {
      return;
    }

    try {
      setError('');
      setSending(true);

      await api.post('/messages', {
        to: selectedFriend._id,
        content: content.trim()
      });

      setContent('');
      await fetchConversation(selectedFriend._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getFriendName = (friend) => {
    return friend.fullName || friend.username;
  };

  const isMyMessage = (message) => {
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

  if (!user) {
    return (
      <div className="page">
        <h1>Messages</h1>
        <p>Please login to view and send messages.</p>
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
                <li key={friend._id}>
                  <button
                    type="button"
                    className={
                      selectedFriend?._id === friend._id
                        ? 'friend-item selected'
                        : 'friend-item'
                    }
                    onClick={() => handleSelectFriend(friend)}
                  >
                    {getFriendName(friend)}
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
              <h2>Chat with {getFriendName(selectedFriend)}</h2>

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
                      <p>{message.content}</p>
                      <span className="message-time">
                        {new Date(message.createdAt).toLocaleString()}
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
