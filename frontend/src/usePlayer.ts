import { useCallback, useEffect, useState } from 'react';
import { apiFetch, clearToken, getToken, socket } from './api';

export interface Player {
  id: number;
  name: string;
  team_id: number | null;
  team_name: string | null;
  role: 'runner' | 'chaser' | null;
  track_key: string | null;
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [owntracksUrl, setOwntracksUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setPlayer(null);
      setLoading(false);
      return;
    }
    const res = await apiFetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setPlayer(data.player);
      setOwntracksUrl(data.owntracks_url);
    } else {
      // Servern har glömt sessionen -- t.ex. för att domaren skapat ett nytt spel.
      clearToken();
      setPlayer(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Laget tilldelas av domaren efter att spelaren gått med, och rollen byter
    // ägare vid varje tagning. Spelarens egen post måste därför hämtas om -- att
    // läsa den ur localStorage en gång vid start var precis det som gjorde att
    // GPS-spårningen aldrig startade.
    socket.on('lobby_updated', refresh);
    socket.on('roles_changed', refresh);
    return () => {
      socket.off('lobby_updated', refresh);
      socket.off('roles_changed', refresh);
    };
  }, [refresh]);

  return { player, owntracksUrl, loading, refresh };
}
