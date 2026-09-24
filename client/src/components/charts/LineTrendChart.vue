<script setup>
import { computed } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps({
  labels: {
    type: Array,
    required: true
  },
  datasets: {
    type: Array,
    required: true
  },
  height: {
    type: Number,
    default: 260
  },
  yAxisLabel: {
    type: String,
    default: 'Hours'
  }
});

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  tension: 0.35,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#475569',
        font: { size: 12, family: 'Inter, sans-serif' },
        usePointStyle: true,
        boxWidth: 8
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
      callbacks: {
        label: (context) => ` ${context.dataset.label}: ${context.raw} ${props.yAxisLabel}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: '#f1f5f9' },
      ticks: { color: '#64748b', font: { size: 11 } }
    },
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: {
        color: '#64748b',
        font: { size: 11 },
        callback: (val) => `${val}${props.yAxisLabel === 'Hours' ? 'h' : ''}`
      }
    }
  }
}));
</script>

<template>
  <div class="chart-wrapper" :style="{ height: `${height}px` }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
}
</style>
