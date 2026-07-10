/**
 * @file Messages.jsx
 * @description Real-time direct messaging UI between the logged-in user and their friends.
 *
 * Purpose:
 *   Friends sidebar + conversation pane. Historical messages load over REST; new messages
 *   are sent and received over Socket.IO so the open chat updates without polling.
 *
 * Responsibilities:
 *   - Load the user's friends from `GET /users/:id` (friends array on the profile)
 *   - Load conversation history via `GET /messages/conversation/:friendId`
 *   - Register the user on the shared socket (`registerUser`) so the server can route DMs
 *   - Emit `sendMessage` with a callback for errors; listen for `receiveMessage`
 *   - Deduplicate incoming messages and ignore events that are not for the open chat
 *
 * Data flow:
 *   AuthContext.user → fetch friends → select friend → REST history into `conversation`
 *   → getSocket(): emit registerUser; on receiveMessage append if matches selectedFriendRef
 *   → sendMessage emit; server persists and broadcasts; listener updates UI
 *
 * Key concepts for defense:
 *   - registerUser: maps this socket connection to the user's id on the server
 *   - sendMessage / receiveMessage: realtime path; REST is only for initial history
 *   - selectedFriendRef: keeps the latest friend inside the socket listener (avoids stale closure)
 */

import { useEffect, useRef, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import { getSocket } from '../socket';
import UserBadge from '../components/UserBadge';

/**
 * Messages page: friends list, REST conversation history, and Socket.IO live chat.
 *
 * @returns {JSX.Element}
 */
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
  /**
   * Mirror of selectedFriend for use inside the Socket.IO listener.
   * Refs update synchronously and do not re-subscribe the effect on every friend change.
   */
  const selectedFriendRef = useRef(null);

  /**
   * Keep selected friend available inside the socket listener (avoids stale closure).
   * Without this, handleReceiveMessage would see an outdated selectedFriend from when
   * the effect last ran.
   */
  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  /**
   * Load friends list from the user's profile (`GET /users/:userId`).
   */
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

  /**
   * Register with Socket.IO and append incoming messages to the open conversation.
   * - `registerUser`: tells the server which user id owns this socket
   * - `receiveMessage`: server push when a DM is delivered; filtered to the open chat
   * Cleanup removes only this listener so other pages sharing the socket are unaffected.
   */
  useEffect(() => {
    if (authLoading || !user?._id) {
      return;
    }

    const socket = getSocket();
    // Bind this browser tab's socket to the logged-in user for DM routing
    socket.emit('registerUser', user._id);

    /**
     * Socket.IO handler: append a received message if it belongs to the currently open chat.
     * Uses selectedFriendRef so switching friends does not require re-binding the listener.
     *
     * @param {object} message - Message payload with from, to, content, _id, createdAt
     */
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

      // Only update UI when the event is between me and the selected friend
      const isCurrentConversation =
        (fromId === myId && toId === friendId) ||
        (fromId === friendId && toId === myId);

      if (!isCurrentConversation) {
        return;
      }

      setConversation((prevMessages) => {
        // Deduplicate if the same message was already added (e.g. echo / race)
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

  /**
   * REST history load for a friend: `GET /messages/conversation/:friendId`.
   * Used when opening a chat; live updates afterward come from receiveMessage.
   *
   * @param {string} friendId
   */
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

  /**
   * Select a friend in the sidebar: set selection, clear the composer, load REST history.
   *
   * @param {object} friend
   */
  const handleSelectFriend = (friend) => {
    if (!friend?._id) {
      return;
    }

    setSelectedFriend(friend);
    setContent('');
    fetchConversation(friend._id);
  };

  /**
   * Send via Socket.IO `sendMessage` (not REST).
   * Payload: { receiverId, content }. Optional ack callback restores content on error.
   * Successful delivery appears through `receiveMessage` (including the sender's own message).
   *
   * @param {React.FormEvent} event
   */
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

  /**
   * Whether a message bubble should use the "my-message" style (sent by the current user).
   *
   * @param {object} message
   * @returns {boolean}
   */
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
