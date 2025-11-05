// Storage Module
// Handles saving and loading charts from local storage

const STORAGE_KEY = 'charts_data';

export function saveCharts(chartsData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chartsData));
    } catch (error) {
        console.error('Error saving charts to local storage:', error);
    }
}

export function loadCharts() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading charts from local storage:', error);
        return [];
    }
}

export function saveChart(chartId, chartData) {
    const charts = loadCharts();
    const index = charts.findIndex(c => c.id === chartId);
    
    if (index >= 0) {
        charts[index] = chartData;
    } else {
        charts.push(chartData);
    }
    
    saveCharts(charts);
}

export function deleteChart(chartId) {
    const charts = loadCharts();
    const filtered = charts.filter(c => c.id !== chartId);
    saveCharts(filtered);
}

