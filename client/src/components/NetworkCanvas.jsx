import { useEffect, useRef } from 'react';

const NODE_COUNT = 8;

const createNodes = (width, height) => {
  return Array.from({ length: NODE_COUNT }, (_, index) => ({
    x: 80 + ((index * 70) % (width - 120)),
    y: 60 + ((index * 45) % (height - 100)),
    vx: 0.2 + (index % 3) * 0.1,
    vy: 0.15 + (index % 2) * 0.1,
    radius: 14 + (index % 3) * 2
  }));
};

const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [0, 4],
  [2, 6]
];

const NetworkCanvas = () => {
  const canvasRef = useRef(null);

  // Animate moving nodes and connection lines on HTML Canvas
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const nodes = createNodes(width, height);
    let animationId = null;
    let isMounted = true;

    const draw = () => {
      if (!isMounted) {
        return;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 20px SocialNetworkFont, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Social Network', width / 2, 28);

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x - node.radius < 20 || node.x + node.radius > width - 20) {
          node.vx *= -1;
        }

        if (node.y - node.radius < 45 || node.y + node.radius > height - 20) {
          node.vy *= -1;
        }
      });

      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;

      CONNECTIONS.forEach(([fromIndex, toIndex]) => {
        const fromNode = nodes[fromIndex];
        const toNode = nodes[toIndex];

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      });

      nodes.forEach((node, index) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = index % 2 === 0 ? '#2563eb' : '#16a34a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px SocialNetworkFont, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`U${index + 1}`, node.x, node.y);
      });

      animationId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      isMounted = false;
      if (animationId) {
        window.cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={300}
      className="network-canvas"
      aria-label="Animated social network visualization"
    />
  );
};

export default NetworkCanvas;
