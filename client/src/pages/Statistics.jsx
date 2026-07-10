/**
 * @file Statistics.jsx
 * @description Admin/analytics-style page that visualizes post activity with D3.js charts.
 *
 * Purpose:
 *   After login, fetch aggregated stats from the backend and draw two charts:
 *   a bar chart of posts per group and a line chart of posts per month.
 *
 * Responsibilities:
 *   - Parallel fetch of `/stats/posts-by-group` and `/stats/posts-by-month`
 *   - Imperative D3 rendering into DOM nodes held by refs (not React SVG elements)
 *   - Clear and redraw whenever the corresponding dataset state changes
 *   - Gate the page on auth (login required)
 *
 * Data flow:
 *   AuthContext.user → fetchStats (Promise.all on both /stats endpoints)
 *   → postsByGroup / postsByMonth state
 *   → D3 useEffects select groupChartRef / monthChartRef and draw SVG
 *
 * Key concepts for defense:
 *   - Stats are server-aggregated; the client only maps fields (groupName, month, postCount)
 *   - D3 owns the SVG under the ref containers; React re-runs effects when data arrays change
 *   - scaleBand (bars) vs scalePoint + line generator (monthly trend)
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Statistics page: loads `/stats/*` aggregates and draws D3 bar + line charts.
 *
 * @returns {JSX.Element}
 */
const Statistics = () => {
  const { user, loading: authLoading } = useAuth();
  /** @type {Array<{ groupName: string, postCount: number }>} */
  const [postsByGroup, setPostsByGroup] = useState([]);
  /** @type {Array<{ month: string, postCount: number }>} */
  const [postsByMonth, setPostsByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** DOM mount point for the posts-per-group bar chart SVG */
  const groupChartRef = useRef(null);
  /** DOM mount point for the posts-per-month line chart SVG */
  const monthChartRef = useRef(null);

  /**
   * Fetch chart data from the stats API once the user is authenticated.
   * Loads both series in parallel so the page waits for a single loading state.
   */
  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    /**
     * Inner async loader: GET /stats/posts-by-group and GET /stats/posts-by-month.
     */
    const fetchStats = async () => {
      try {
        setError('');
        setLoading(true);

        const [groupResponse, monthResponse] = await Promise.all([
          api.get('/stats/posts-by-group'),
          api.get('/stats/posts-by-month')
        ]);

        setPostsByGroup(groupResponse.data || []);
        setPostsByMonth(monthResponse.data || []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load statistics'));
        setPostsByGroup([]);
        setPostsByMonth([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading]);

  /**
   * D3 drawing effect — bar chart: posts per group.
   * Clears previous SVG children, builds scales (band x, linear y), axes, and rect bars.
   * Re-runs whenever `postsByGroup` changes after a successful fetch.
   */
  useEffect(() => {
    if (!groupChartRef.current || postsByGroup.length === 0) {
      return;
    }

    const container = groupChartRef.current;
    const width = 700;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 70, left: 50 };

    // Imperative redraw: remove any previous SVG before appending a new one
    d3.select(container).selectAll('*').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'stats-svg');

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Categorical x-axis: one band per group name
    const x = d3
      .scaleBand()
      .domain(postsByGroup.map((item) => item.groupName))
      .range([0, chartWidth])
      .padding(0.2);

    // Quantitative y-axis: post counts (nice() rounds domain for readable ticks)
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(postsByGroup, (item) => item.postCount) || 1])
      .nice()
      .range([chartHeight, 0]);

    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'end');

    g.append('g').call(d3.axisLeft(y).ticks(5));

    // Enter selection: one rect per data row
    g.selectAll('.bar')
      .data(postsByGroup)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (item) => x(item.groupName))
      .attr('y', (item) => y(item.postCount))
      .attr('width', x.bandwidth())
      .attr('height', (item) => chartHeight - y(item.postCount))
      .attr('fill', '#2563eb');

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-title')
      .text('Posts per Group');
  }, [postsByGroup]);

  /**
   * D3 drawing effect — line chart: posts per month.
   * Uses scalePoint for month labels, a line generator for the path, and circles for points.
   * Re-runs whenever `postsByMonth` changes.
   */
  useEffect(() => {
    if (!monthChartRef.current || postsByMonth.length === 0) {
      return;
    }

    const container = monthChartRef.current;
    const width = 700;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };

    d3.select(container).selectAll('*').remove();

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'stats-svg');

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Point scale places month labels evenly along the x-axis
    const x = d3
      .scalePoint()
      .domain(postsByMonth.map((item) => item.month))
      .range([0, chartWidth])
      .padding(0.5);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(postsByMonth, (item) => item.postCount) || 1])
      .nice()
      .range([chartHeight, 0]);

    // Line generator maps each { month, postCount } to an (x, y) coordinate
    const line = d3
      .line()
      .x((item) => x(item.month))
      .y((item) => y(item.postCount));

    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x));

    g.append('g').call(d3.axisLeft(y).ticks(5));

    g.append('path')
      .datum(postsByMonth)
      .attr('fill', 'none')
      .attr('stroke', '#16a34a')
      .attr('stroke-width', 2)
      .attr('d', line);

    g.selectAll('.dot')
      .data(postsByMonth)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (item) => x(item.month))
      .attr('cy', (item) => y(item.postCount))
      .attr('r', 4)
      .attr('fill', '#16a34a');

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-title')
      .text('Posts per Month');
  }, [postsByMonth]);

  if (authLoading) {
    return (
      <div className="page">
        <h1>Statistics</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Statistics</h1>
        <p>Please login to view statistics.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Statistics</h1>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p>Loading statistics...</p>
      ) : (
        <section className="statistics-section">
          <div className="chart-card">
            <h2>Posts by Group</h2>
            {postsByGroup.length === 0 ? (
              <p className="empty-state">No post data available yet.</p>
            ) : (
              /* Ref target: D3 appends the bar-chart SVG here */
              <div ref={groupChartRef} className="chart-container" />
            )}
          </div>

          <div className="chart-card">
            <h2>Posts by Month</h2>
            {postsByMonth.length === 0 ? (
              <p className="empty-state">No monthly post data available yet.</p>
            ) : (
              /* Ref target: D3 appends the line-chart SVG here */
              <div ref={monthChartRef} className="chart-container" />
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Statistics;
