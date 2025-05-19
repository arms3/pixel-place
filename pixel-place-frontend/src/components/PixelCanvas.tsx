import { useRef, useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface PixelCanvasProps {
  width: number;
  height: number;
  pixels: { x: number; y: number; color: string }[];
  defaultColor: string;
  onPixelClick: (x: number, y: number, color: string) => void;
}

const getRandomColor = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
};

const PixelCanvas = ({ width, height, pixels, defaultColor, onPixelClick }: PixelCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(40); // Start with a closer zoom
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(true);
  const [selectedColor, setSelectedColor] = useState(getRandomColor());
  const [debugInfo, setDebugInfo] = useState({
    mouseX: 0,
    mouseY: 0,
    pixelX: 0,
    pixelY: 0,
    scale: 40,
    offsetX: 0,
    offsetY: 0,
    canvasWidth: 0,
    canvasHeight: 0
  });

  // Track space key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
        document.body.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsDragging(false);
        document.body.style.cursor = 'default';
      }
    };

    const handleWindowMouseLeave = () => {
      if (isDragging) {
        setIsDragging(false);
        setIsSpacePressed(false);
        document.body.style.cursor = isSpacePressed ? 'grab' : 'default';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseleave', handleWindowMouseLeave);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseleave', handleWindowMouseLeave);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, isSpacePressed]);

  // Draw pixels on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with a dark background
    ctx.fillStyle = defaultColor;
    ctx.fillRect(0, 0, width, height);

    // Draw all pixels
    pixels.forEach(pixel => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    });
  }, [pixels, width, height]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSpacePressed || isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to pixel coordinates
    const x = Math.floor((mouseX / rect.width) * width);
    const y = Math.floor((mouseY / rect.height) * height);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      onPixelClick(x, y, selectedColor);
    }
  };

  // Handle mouse move for hover effect and debug info
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to pixel coordinates
    const pixelX = Math.floor((mouseX / rect.width) * width);
    const pixelY = Math.floor((mouseY / rect.height) * height);

    // Update debug info
    setDebugInfo({
      mouseX: Math.round(mouseX),
      mouseY: Math.round(mouseY),
      pixelX,
      pixelY,
      scale: Math.round(scale * 100) / 100,
      offsetX: Math.round(offset.x),
      offsetY: Math.round(offset.y),
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });

  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom factor
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    // Use floor when zooming out and ceil when zooming in to ensure we can move past integer boundaries
    const newScale = e.deltaY > 0 
      ? Math.max(1, Math.min(200, Math.floor(scale * delta)))
      : Math.max(1, Math.min(200, Math.ceil(scale * delta)));

    // Calculate new offset to zoom towards mouse position
    const scaleChange = newScale / scale;
    const newOffsetX = offset.x - ((mouseX - rect.width / 2) * (scaleChange - 1));
    const newOffsetY = offset.y - ((mouseY - rect.height / 2) * (scaleChange - 1));

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });

    // Update debug info with new scale
    setDebugInfo(prev => ({
      ...prev,
      scale: newScale,
      offsetX: Math.round(newOffsetX),
      offsetY: Math.round(newOffsetY)
    }));
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSpacePressed) {
      setIsDragging(true);
      document.body.style.cursor = 'grabbing';
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    } else {
      handleCanvasClick(e);
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = isSpacePressed ? 'grab' : 'default';
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#1f1f1f', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
          transformOrigin: 'center',
          cursor: isSpacePressed ? (isDragging ? 'grabbing' : 'grab') : 'crosshair',
          imageRendering: 'pixelated',
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 1
        }}
      />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
        transformOrigin: 'center',
        width: `${width * scale}px`,
        height: `${height * scale}px`,
        border: '1px solid #333',
        pointerEvents: 'none',
        zIndex: 2
      }}>
        {scale >= 7 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(51, 51, 51, 0.8) 1px, transparent 0.5px),
              linear-gradient(to bottom, rgba(51, 51, 51, 0.8) 1px, transparent 0.5px)
            `,
            backgroundSize: `${scale}px ${scale}px`,
            imageRendering: 'crisp-edges',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }} />
        )}
      </div>
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 2
      }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '5px',
          overflow: 'hidden',
          width: '220px'
        }}>
          <div
            onClick={() => setIsColorPickerVisible(!isColorPickerVisible)}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fff',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '10px' }}>{isColorPickerVisible ? '▼' : '▶'}</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Color Picker</span>
          </div>
          {isColorPickerVisible && (
            <div style={{
              padding: '10px'
            }}>
              <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '5px',
          overflow: 'hidden',
          width: '220px'
        }}>
          <div
            onClick={() => setIsDebugPanelVisible(!isDebugPanelVisible)}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fff',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '10px' }}>{isDebugPanelVisible ? '▼' : '▶'}</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Debug Info</span>
          </div>
          {isDebugPanelVisible && (
            <div style={{
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#fff'
            }}>
              <div>Mouse: ({debugInfo.mouseX}, {debugInfo.mouseY})</div>
              <div>Pixel: ({debugInfo.pixelX}, {debugInfo.pixelY})</div>
              <div>Scale: {debugInfo.scale}</div>
              <div>Offset: ({debugInfo.offsetX}, {debugInfo.offsetY})</div>
              <div>Canvas Size: {Math.round(debugInfo.canvasWidth)}x{Math.round(debugInfo.canvasHeight)}</div>
              <div>Grid Size: {width}x{height}</div>
              <div>Space: {isSpacePressed ? 'Pressed' : 'Released'}</div>
              <div>Dragging: {isDragging ? 'Yes' : 'No'}</div>
              <div>Pixels: {pixels.length}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PixelCanvas; 