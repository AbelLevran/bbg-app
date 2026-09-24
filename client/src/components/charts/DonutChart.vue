<script setup>
import { computed } from 'vue';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Doughnut } from 'vue-chartjs';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

const props = defineProps({
  labels: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    required: true
  },
  colors: {
    type: Array,
    default: () => [
      '#94a3b8', // TODO (gray)
      '#38bdf8', // IN_PROGRESS (blue)
      '#a855f7', // IN_REVIEW (purple)
      '#ef4444', // STUCK (red)
      '#10b981'  // DONE (emerald)
    ]
  },
  height: {
    type: Number,
    default: 200
  }
});

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.data,
      backgroundColor: props.colors,
      borderWidth: 2,
      borderColor: '#ffffff'
    }
  ]
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#475569',
        font: { size: 11, family: 'Inter, sans-serif' },
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
      padding: 8,
      cornerRadius: 6
    }
  },
  cutout: '65%'
}));
</script>

<template>
  <div class="chart-wrapper" :style="{ height: `${height}px` }">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
}
</style>
