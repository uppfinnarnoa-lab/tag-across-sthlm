import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:3002');

interface Post {
  id: number;
  team_id: number;
  type: string;
  message: string;
  image_url: string;
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    socket.on('tagged', (data) => {
      setPosts(prev => [{ id: Date.now(), team_id: data.team_id, type: 'tag', message: 'TAGEN!', image_url: data.imageUrl }, ...prev]);
    });
    socket.on('claimed', (data) => {
      setPosts(prev => [{ id: Date.now(), team_id: data.team_id, type: 'claim', message: `Fick ${data.points} poäng!`, image_url: data.imageUrl }, ...prev]);
    });
    return () => {
      socket.off('tagged');
      socket.off('claimed');
    };
  }, []);

  const handleUpload = async (type: 'tag' | 'claim') => {
    if (!file) return alert('Välj en fil!');
    const formData = new FormData();
    formData.append('media', file);
    formData.append('team_id', '1'); // Hårdkodat för test
    if (type === 'claim') formData.append('points', '10'); // Hårdkodat testvärde

    const endpoint = type === 'tag' ? '/api/game/tag' : '/api/game/claim';
    
    await fetch(`http://localhost:3002${endpoint}`, {
      method: 'POST',
      body: formData
    });
    setFile(null);
  };

  return (
    <>
      <h1>LIVE FEED</h1>
      <div className="pixel-panel">
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ marginBottom: '16px' }} />
        <button className="red" onClick={() => handleUpload('tag')}>Skicka TAGEN!</button>
        <button className="green" onClick={() => handleUpload('claim')}>Gör anspråk (Claim)</button>
      </div>

      <div>
        {posts.map(post => (
          <div key={post.id} className="pixel-panel" style={{ padding: '8px' }}>
            <h3 style={{ color: post.type === 'tag' ? 'var(--sl-red)' : 'var(--sl-green)' }}>{post.message}</h3>
            {post.image_url && <img src={`http://localhost:3002${post.image_url}`} alt="Bevis" style={{ width: '100%', imageRendering: 'auto' }} />}
            <p>Lag {post.team_id}</p>
          </div>
        ))}
      </div>

      <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', color: 'var(--text-color)', fontSize: '10px' }}>
        &lt; Tillbaka
      </Link>
    </>
  );
}
