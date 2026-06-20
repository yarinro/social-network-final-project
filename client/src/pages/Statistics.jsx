import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Statistics = () => {
  const { user, loading: authLoading } = useAuth();
  const [postsByGroup, setPostsByGroup] = useState([]);
  const [postsByMonth, setPostsByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const groupChartRef = useRef(null);
  const monthChartRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

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
        setError(err.response?.data?.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!groupChartRef.current || postsByGroup.length === 0) {
      return;
    }

    const container = groupChartRef.current;
    const width = 700;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 70, left: 50 };

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

    const x = d3
      .scaleBand()
      .domain(postsByGroup.map((item) => item.groupName))
      .range([0, chartWidth])
      .padding(0.2);

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
              <div ref={groupChartRef} className="chart-container" />
            )}
          </div>

          <div className="chart-card">
            <h2>Posts by Month</h2>
            {postsByMonth.length === 0 ? (
              <p className="empty-state">No monthly post data available yet.</p>
            ) : (
              <div ref={monthChartRef} className="chart-container" />
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Statistics;
