/**
 * @file NetworkCanvas.jsx
 * @description Decorative HTML Canvas animation that visualizes a small "social network"
 * of moving user nodes connected by edges — used as a branding/hero visual, not live data.
 *
 * Purpose:
 * Draw and continuously animate a fixed set of circular nodes (labeled U1–U8) bouncing
 * inside a canvas, with static index-pair connections redrawn each frame so the graph
 * appears to move as a network.
 *
 * Responsibilities:
 * - Create initial node positions/velocities sized to the canvas dimensions
 * - Run a `requestAnimationFrame` loop that updates positions, bounces off margins,
 *   redraws edges, then redraws nodes
 * - Clean up the animation frame and stop drawing when the component unmounts
 *
 * Data flow:
 * No props or API data. Node state lives in a closure inside `useEffect` (not React state)
 * so each frame can mutate positions without triggering re-renders. The canvas DOM node
 * is accessed via `useRef`.
 *
 * React concepts demonstrated:
 * `useRef` for an imperative canvas handle, `useEffect` with an empty dependency array
 * for mount-only side effects, and cleanup that cancels `requestAnimationFrame` plus an
 * `isMounted` flag to avoid drawing after unmount.
 */

import { useEffect, useRef } from 'react';

/** Fixed number of animated "user" nodes drawn on the canvas. */
const NODE_COUNT = 8;

/**
 * Builds the initial node list with staggered positions and slight velocity variation
 * so the graph does not look perfectly synchronized.
 *
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @returns {Array<{x: number, y: number, vx: number, vy: number, radius: number}>}
 */
const createNodes = (width, height) => {
  return Array.from({ length: NODE_COUNT }, (_, index) => ({
    x: 80 + ((index * 70) % (width - 120)),
    y: 60 + ((index * 45) % (height - 100)),
    vx: 0.2 + (index % 3) * 0.1,
    vy: 0.15 + (index % 2) * 0.1,
    radius: 14 + (index % 3) * 2
  }));
};

/**
 * Undirected edges as pairs of node indices. Drawn every frame between current positions
 * so connections follow the moving nodes without storing edge geometry separately.
 */
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

/**
 * Renders an animated social-network graph on a 2D canvas.
 *
 * @returns {JSX.Element}
 */
const NetworkCanvas = () => {
  const canvasRef = useRef(null);

  /**
   * Starts the animation loop once on mount and tears it down on unmount.
   * Node positions are mutated in place each frame for performance (no React setState).
   */
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
    // Prevents scheduling/drawing after cleanup if a frame was already queued
    let isMounted = true;

    /**
     * One animation frame: clear, update physics, draw edges, draw nodes, schedule next frame.
     */
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

      // Integrate velocity, then reverse on hitting padded bounds (title area at top)
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
