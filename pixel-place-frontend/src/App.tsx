import { useEffect, useState } from 'react';
import './App.css';
import PixelCanvas from './components/PixelCanvas';
import { HexColorPicker } from 'react-colorful';
import { DbConnection, type EventContext, Pixel, ErrorContext } from './spacetime';

const DEFAULT_COLOR = '#1a1a1a';

const getRandomColor = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
};

const fetchIdentityToken = async () => {
  try {
    const response = await fetch('/v1/identity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch identity token: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error fetching identity token:', error);
    throw error;
  }
};

function App() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [selectedColor, setSelectedColor] = useState(getRandomColor());
  const [connected, setConnected] = useState<boolean>(false);
  const [conn, setConn] = useState<DbConnection | null>(null);

  useEffect(() => {
    const setupConnection = async () => {
      try {
        let token = localStorage.getItem('auth_token') || '';
        
        if (!token) {
          console.log('No auth token found, fetching new identity...');
          token = await fetchIdentityToken();
          localStorage.setItem('auth_token', token);
        }

        const subscribeToQueries = (conn: DbConnection) => {
          conn
            .subscriptionBuilder()
            .onApplied(() => {
              console.log('SDK client cache initialized.');
              // Load initial pixels after cache is initialized
              const initialPixels = Array.from(conn.db.pixel.iter());
              console.log('Initial pixels loaded:', initialPixels);
              setPixels(initialPixels);
            })
            .subscribe(['SELECT * FROM pixel']);
        };

        const onConnect = (
          conn: DbConnection,
          identity: any,
          token: string
        ) => {
          setConnected(true);
          localStorage.setItem('auth_token', token);
          console.log(
            'Connected to SpacetimeDB with identity:',
            identity.toHexString()
          );

          // Set up pixel event handlers
          conn.db.pixel.onInsert((_ctx: EventContext, pixel: Pixel) => {
            // console.log('Pixel inserted:', pixel);
            setPixels(prev => {
              const idx = prev.findIndex(p => p.id === pixel.id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = pixel;
                return updated;
              } else {
                return [...prev, pixel];
              }
            });
          });

          conn.db.pixel.onUpdate((_ctx: EventContext, oldPixel: Pixel, newPixel: Pixel) => {
            console.log('Pixel updated:', { old: oldPixel, new: newPixel });
            setPixels(prev => {
              const idx = prev.findIndex(p => p.id === newPixel.id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = newPixel;
                return updated;
              }
              return prev;
            });
          });

          conn.db.pixel.onDelete((_ctx: EventContext, pixel: Pixel) => {
            console.log('Pixel deleted:', pixel);
            setPixels(prev => prev.filter(p => p.id !== pixel.id));
          });

          subscribeToQueries(conn);
        };

        const onDisconnect = () => {
          console.log('Disconnected from SpacetimeDB');
          setConnected(false);
        };

        const onConnectError = (_ctx: ErrorContext, err: Error) => {
          console.log('Error connecting to SpacetimeDB:', err);
        };

        // Use the proxy path for WebSocket connection
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/st/`;
        
        console.log('Connecting to SpacetimeDB at:', wsUrl);

        setConn(
          DbConnection.builder()
            .withUri(wsUrl)
            .withModuleName('pixel-place')
            .withToken(token)
            .onConnect(onConnect)
            .onDisconnect(onDisconnect)
            .onConnectError(onConnectError)
            .build()
        );
      } catch (error) {
        console.error('Failed to setup connection:', error);
      }
    };

    setupConnection();

    return () => {
      if (conn) {
        console.log('Disconnecting...');
        conn.disconnect();
      }
    };
  }, []);

  const handlePixelClick = (x: number, y: number) => {
    if (!connected || !conn) {
      console.warn('Not connected to server');
      return;
    }
    console.log('Setting pixel:', { x, y, color: selectedColor });
    try {
      conn.reducers.setPixel(x, y, selectedColor);
    } catch (error) {
      console.error('Error setting pixel:', error);
    }
  };

  return (
    <div className="App">
      <div className="controls">
        <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
        {!connected && (
          <div className="connection-status">
            Connecting to server...
          </div>
        )}
      </div>
      <PixelCanvas
        width={2000}
        height={2000}
        pixels={pixels}
        defaultColor={DEFAULT_COLOR}
        onPixelClick={handlePixelClick}
      />
    </div>
  );
}

export default App;
