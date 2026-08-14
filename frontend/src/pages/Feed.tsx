import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, API_URL, socket } from '../api';

interface Post {
  id: number;
  team_id: number;
  team_name: string | null;
  player_name: string | null;
  type: string;
  message: string;
  image_url: string | null;
  timestamp: string;
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchFeed = useCallback(async () => {
    const res = await apiFetch('/api/feed');
    if (!res.ok) return;
    const data = await res.json();
    setPosts(data.feed || []);
  }, []);

  useEffect(() => {
    // Feeden hämtades aldrig tidigare -- den lyssnade bara på två socket-event
    // som servern inte sänder, så den var alltid tom.
    fetchFeed();
    const onEntry = (entry: Post) => setPosts(prev => [entry, ...prev]);
    socket.on('new_feed_entry', onEntry);
    return () => { socket.off('new_feed_entry', onEntry); };
  }, [fetchFeed]);

  return (
    <>
      <h1>LIVE FEED</h1>

      {posts.length === 0 && (
        <div className="pixel-panel"><p style={{ fontSize: '10px' }}>Inget har hänt ännu.</p></div>
      )}

      {posts.map(post => (
        <div key={post.id} className="pixel-panel" style={{ padding: '8px' }}>
          <h3 style={{ color: post.type === 'tag' ? 'var(--sl-red)' : 'var(--sl-green)' }}>{post.message}</h3>
          {post.image_url && (
            <img src={`${API_URL}${post.image_url}`} alt="Bevis" style={{ width: '100%', imageRendering: 'auto' }} />
          )}
          <p style={{ fontSize: '10px' }}>{post.team_name || `Lag ${post.team_id}`} — {post.player_name}</p>
        </div>
      ))}

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka
      </Link>
    </>
  );
}
