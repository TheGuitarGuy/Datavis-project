const productImages = {
    'Motorcycles': 'images/motorcycles.png',
    'Classic Cars': 'images/classic_cars.png',
    'Trucks and Buses': 'images/trucks_buses.png',
    'Vintage Cars': 'images/vintage_cars.png',
    'Planes': 'images/planes.png',
    'Ships': 'images/ships.png',
    'Trains': 'images/trains.png'
    // Add more if necessary
};

// Tooltip element (ensure it's selected inside the drawMap function for encapsulation)
const tooltip = d3.select('#tooltip');

// Declare bottomChartsVisible globally
let bottomChartsVisible = false;

// Function to aggregate data by a specified key and value
function aggregateData(data, key, value) {
    return d3.rollups(data, v => d3.sum(v, d => +d[value]), d => d[key]);
}

function showChart(chartId) {
    const chartContainers = document.querySelectorAll('.content > div');
    chartContainers.forEach(container => {
        container.style.display = 'none';
        container.classList.remove('visible'); // Remove visible from all containers
    });

    const targetChart = document.getElementById(chartId);
    targetChart.style.display = 'block';

    const sidebarButtons = document.querySelectorAll('.sidebar-button');
    sidebarButtons.forEach(button => {
        const isActive = button.getAttribute('data-chart') === chartId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive);
    });

    if (chartId === 'salesTrendChart') {
        // Show the first tab's container
        targetChart.classList.add('visible');
        // Ensure roadmap chart is drawn
        drawRoadmapChart(window.salesData);
    } else if (chartId === 'anotherChart') {
        drawCustomerAgePieChart();
        drawCustomerPurchaseBarChart();

        // Draw the map (updated)
        drawMap();

        // Add .visible classes after drawing the charts and map
        targetChart.classList.add('visible');
        document.getElementById('customerPieChart').classList.add('visible');
        document.getElementById('customerBarChart').classList.add('visible');
        document.getElementById('mapContainer').classList.add('visible');
    }
    

    // Trigger bottom charts animation if applicable
    if (chartId === 'salesTrendChart') {
        triggerBottomChartsAnimation();
    }
}

// Updated map drawing function with sales visualization
function drawMap() {
    const mapContainer = document.getElementById('mapContainer');
    const width = mapContainer.clientWidth;
    const height = mapContainer.clientHeight;

    // Remove existing map if any
    d3.select('#mapContainer').selectAll('svg').remove();

    const svg = d3.select('#mapContainer')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Define projection and path
    const projection = d3.geoMercator()
        .scale((width / 2 / Math.PI)) // Adjust scale based on width
        .translate([width / 2, height / 1.5]); // Center the map

    const path = d3.geoPath().projection(projection);

    // Tooltip element
    const tooltip = d3.select('#tooltip');

    // Load GeoJSON data
    d3.json('world.geojson').then(worldData => {
        // Aggregate sales data per country
        const salesPerCountry = d3.rollup(
            window.originalData,
            v => d3.sum(v, d => +d.SALES),
            d => d.COUNTRY // Ensure your CSV has a 'COUNTRY' field
        );

        // Determine the maximum sales value for color scaling
        const maxSales = d3.max(Array.from(salesPerCountry.values()));

        // Define a color scale
        const colorScale = d3.scaleSequential()
            .domain([0, maxSales])
            .interpolator(d3.interpolateBlues);

        // Draw the map
        svg.selectAll('path')
            .data(worldData.features)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', d => {
                const country = d.properties.name;
                const sales = salesPerCountry.get(country) || 0;
                return sales > 0 ? colorScale(sales) : '#3a3a5e'; // Default color for no sales
            })
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.5)
            .on('mouseover', (event, d) => {
                const country = d.properties.name;
                const sales = salesPerCountry.get(country) || 0;
                tooltip.style('opacity', 1)
                       .html(`<strong>${country}</strong><br/>Sales: $${sales.toLocaleString()}`)
                       .style('left', (event.pageX + 10) + 'px')
                       .style('top', (event.pageY - 28) + 'px');
            })
            .on('mousemove', (event) => {
                tooltip.style('left', (event.pageX + 10) + 'px')
                       .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            });

        // Optional: Add a legend
        const legendWidth = 300;
        const legendHeight = 10;

        const legendSvg = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - legendWidth - 50}, ${height - 40})`);

        // Define the gradient for the legend
        const defs = legendSvg.append('defs');

        const linearGradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient');

        linearGradient.selectAll('stop')
            .data([
                { offset: '0%', color: colorScale(0) },
                { offset: '100%', color: colorScale(maxSales) }
            ])
            .enter().append('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);

        // Draw the rectangle and fill with gradient
        legendSvg.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');

        // Define scale for the legend
        const legendScale = d3.scaleLinear()
            .domain([0, maxSales])
            .range([0, legendWidth]);

        // Define and add the axis
        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d3.format("$.2s"));

        legendSvg.append('g')
            .attr('transform', `translate(0, ${legendHeight})`)
            .call(legendAxis);
    }).catch(err => {
        console.error("Error loading GeoJSON:", err);
        // Optional: Show a message or fallback if needed
        d3.select('#mapContainer').append('p')
            .style('color', '#ffffff')
            .text('Failed to load the map data.');
    });
}

// Function to trigger bottom charts animation
function triggerBottomChartsAnimation() {
    const bottomCharts = document.getElementById('bottomCharts');

    // Add visible class to trigger CSS transitions
    bottomCharts.classList.add('visible');

    // Add visible class to individual chart containers for their own transitions
    document.querySelectorAll('.bottom-charts .chart-container').forEach(chartContainer => {
        chartContainer.classList.add('visible');
    });

    // Draw or update the charts
    drawDonutChart(window.salesData);
    drawStackedBarChart(window.salesData);

    bottomChartsVisible = true; // Update visibility state
}

// Function to reset bottom charts animation state
function resetBottomCharts() {
    const bottomCharts = document.getElementById('bottomCharts');
    bottomCharts.classList.remove('visible');
    document.querySelectorAll('.bottom-charts .chart-container').forEach(chartContainer => {
        chartContainer.classList.remove('visible');
    });
    bottomChartsVisible = false; // Reset visibility state
}

// Load the data and initialize the charts
d3.csv('sales_data_sample.csv').then(data => {
    console.log("CSV Data Loaded:", data);

    window.originalData = data;
    window.salesData = data.filter(d => d['PRODUCTLINE'] === 'Motorcycles');

    drawDonutChart(window.salesData);
    drawStackedBarChart(window.salesData);
    drawRoadmapChart(window.salesData);
}).catch(error => {
    console.error('Error loading the CSV data:', error);
    alert('Failed to load data. Please check the console for more details.');
});

// Function to draw the Donut Chart with tooltips
function drawDonutChart(data) {
    const aggregatedData = aggregateData(data, 'PRODUCTLINE', 'SALES');
    const width = 300, height = 300, radius = Math.min(width, height) / 2;

    // Remove any existing SVG
    d3.select('#donutChart').selectAll('svg').remove();

    const svg = d3.select('#donutChart')
        .append('svg')
        .attr('width', width + 150)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${radius}, ${radius})`);

    const arc = d3.arc().innerRadius(radius / 2).outerRadius(radius);
    const pie = d3.pie().sort(null).value(d => d[1]);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const arcs = svg.selectAll('path')
        .data(pie(aggregatedData))
        .enter().append('path')
        .attr('fill', (d, i) => color(i))
        .attr('stroke', '#171923')
        .attr('stroke-width', 2)
        .each(function(d) { this._current = { startAngle: 0, endAngle: 0 }; });

    arcs.on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                   .html(`<strong>${d.data[0]}</strong><br/>Sales: $${d.data[1].toFixed(2)}`)
                   .style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mousemove', (event) => {
            tooltip.style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.style('opacity', 0);
        });

    arcs.transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(1);
            return function(t) {
                return arc(interpolate(t));
            };
        });

    const legend = svg.selectAll('.legend')
        .data(aggregatedData)
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${radius + 20}, ${-radius / 2 + i * 20})`);

    legend.append('rect')
        .attr('x', 0)
        .attr('y', -6)
        .attr('width', 12)
        .attr('height', 12)
        .style('fill', (d, i) => color(i));

    legend.append('text')
        .attr('x', 18)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('fill', '#ffffff')
        .style('font-size', '12px')
        .text(d => d[0]);
}

// Function to draw the Stacked Bar Chart with tooltips
function drawStackedBarChart(data) {
    const productLines = Array.from(new Set(data.map(d => d.PRODUCTLINE)));
    const months = Array.from(new Set(data.map(d => d.MONTH_ID))).sort((a, b) => a - b);

    const stackedData = d3.stack()
        .keys(productLines)
        .order(d3.stackOrderDescending)
        (months.map(month => {
            const values = {};
            data.filter(d => d.MONTH_ID == month).forEach(d => {
                values[d.PRODUCTLINE] = +d.SALES;
            });
            return { month: month, ...values };
        }));

    const width = 300, height = 300;
    const margin = { top: 30, right: 20, bottom: 50, left: 50 };

    d3.select('#stackedBarChart').selectAll('svg').remove();
    const svg = d3.select('#stackedBarChart')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
        .domain(months)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stackedData, layer => d3.max(layer, d => d[1]))])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal().domain(productLines).range(d3.schemeCategory10);

    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    const groups = svg.selectAll('g.layer')
        .data(stackedData)
        .enter().append('g')
        .attr('class', 'layer')
        .attr('fill', d => color(d.key));

    groups.selectAll('rect')
        .data(d => d)
        .enter().append('rect')
        .attr('x', d => x(d.data.month))
        .attr('width', x.bandwidth())
        .attr('y', d => y(d[1]))
        .attr('height', 0)
        .on('mouseover', (event, d) => {
            const product = d3.select(event.currentTarget.parentNode).datum().key;
            const sales = d[1] - d[0];
            tooltip.style('opacity', 1)
                   .html(`<strong>${product}</strong><br/>Month: ${d.data.month}<br/>Sales: $${sales.toFixed(2)}`)
                   .style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mousemove', (event) => {
            tooltip.style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.style('opacity', 0);
        })
        .append('title')
        .text(d => `${d.data.month}: $${(d[1] - d[0]).toFixed(2)}`);

    groups.selectAll('rect')
        .transition()
        .duration(1000)
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .delay((d, i) => i * 100);

    const legend = svg.selectAll('.legend')
        .data(productLines)
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${width + 10}, ${i * 20})`);

    legend.append('rect')
        .attr('x', 0)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', d => color(d));

    legend.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .attr('dy', '.35em')
        .style('fill', '#ffffff')
        .text(d => d);
}

// Draw the Roadmap Chart (unchanged)
function drawRoadmapChart(data) {
    const selectedProducts = Array.from(document.querySelectorAll('#productSelector input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
    const filteredData = data.filter(d => selectedProducts.includes(d.PRODUCTLINE));

    const productLineData = {};
    selectedProducts.forEach(product => {
        const dataForProduct = filteredData.filter(d => d.PRODUCTLINE === product);
        const quarterlyData = d3.rollups(
            dataForProduct,
            v => d3.sum(v, d => +d.SALES),
            d => d.QTR_ID
        ).sort((a, b) => a[0] - b[0]);
        productLineData[product] = quarterlyData;
    });

    const allQuarters = Array.from(new Set(filteredData.map(d => d.QTR_ID))).sort((a, b) => a - b);
    const labels = allQuarters.map(q => `Q${q}`);

    const margin = { top: 60, right: 200, bottom: 60, left: 80 };
    const width = 1200;
    const height = 800;

    d3.select('#roadmapChart').selectAll('svg').remove();

    const svg = d3.select('#roadmapChart')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scalePoint()
        .domain(labels)
        .range([0, width]);

    const maxY = d3.max(Object.values(productLineData).flatMap(d => d.map(s => s[1])));
    const y = d3.scaleLinear()
        .domain([0, maxY]).nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(selectedProducts)
        .range(d3.schemeCategory10);

    svg.append('g').attr('transform', `translate(0, ${height})`).call(d3.axisBottom(x));
    svg.append('g').call(d3.axisLeft(y));

    selectedProducts.forEach(product => {
        const data = productLineData[product];

        const line = svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', color(product))
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '5,5')
            .attr('d', d3.line()
                .x(d => x(`Q${d[0]}`))
                .y(d => y(d[1]))
            );

        svg.selectAll(`.dot-${product.replace(/\s+/g, '-')}`)
            .data(data)
            .enter().append('circle')
            .attr('class', `dot-${product.replace(/\s+/g, '-')}`)
            .attr('cx', d => x(`Q${d[0]}`))
            .attr('cy', d => y(d[1]))
            .attr('r', 8)
            .attr('fill', color(product))
            .on('mouseover', (event, d) => {
                tooltip.style('opacity', 1)
                       .html(`<strong>${product}</strong><br/>Quarter: Q${d[0]}<br/>Sales: $${d[1].toFixed(2)}`)
                       .style('left', (event.pageX + 10) + 'px')
                       .style('top', (event.pageY - 28) + 'px');
            })
            .on('mousemove', (event) => {
                tooltip.style('left', (event.pageX + 10) + 'px')
                       .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.style('opacity', 0);
            });

        const vehicleImage = svg.append('image')
            .attr('xlink:href', productImages[product])
            .attr('width', 50)
            .attr('height', 50)
            .attr('class', 'vehicle-image')
            .attr('transform', 'translate(-25, -25)')
            .style('pointer-events', 'none');

        if (line.node()) {
            const totalLength = line.node().getTotalLength();
            vehicleImage.transition()
                .delay(500)
                .duration(8000)
                .attr('class', 'vehicle-image visible')
                .attrTween('transform', function () {
                    return function (t) {
                        const point = line.node().getPointAtLength(t * totalLength);
                        return `translate(${point.x - 25}, ${point.y - 25})`;
                    };
                });
        }
    });

    const legend = svg.selectAll('.legend')
        .data(selectedProducts)
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${width + 20}, ${i * 40})`);

    legend.append('rect')
        .attr('x', 0)
        .attr('width', 20)
        .attr('height', 20)
        .style('fill', d => color(d));

    legend.append('text')
        .attr('x', 30)
        .attr('y', 10)
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .style('fill', '#ffffff')
        .text(d => d);
}

// Function to draw the Customer Age Distribution Pie Chart
function drawCustomerAgePieChart() {
    // Remove any existing SVG
    d3.select('#customerPieChart').selectAll('svg').remove();

    // Use window.originalData to create synthetic age distribution
    const fallbackData = window.originalData;
    const totalCount = fallbackData.length;
    const group1Count = Math.floor(totalCount * 0.3);
    const group2Count = Math.floor(totalCount * 0.4);
    const group3Count = totalCount - group1Count - group2Count;

    const aggregatedData = [
        ["18-25", group1Count],
        ["26-40", group2Count],
        ["41+", group3Count]
    ];

    const width = 300, height = 300, radius = Math.min(width, height) / 2;

    const svg = d3.select('#customerPieChart')
        .append('svg')
        .attr('width', width + 150)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${radius}, ${radius})`);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const pie = d3.pie().sort(null).value(d => d[1]);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const arcsPath = svg.selectAll('path')
        .data(pie(aggregatedData))
        .enter().append('path')
        .attr('fill', (d, i) => color(i))
        .attr('stroke', '#171923')
        .attr('stroke-width', 2)
        .each(function(d) { this._current = { startAngle: 0, endAngle: 0 }; });

    arcsPath.on('mouseover', (event, d) => {
        tooltip.style('opacity', 1)
               .html(`<strong>${d.data[0]}</strong><br/>Count: ${d.data[1]}`)
               .style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
    })
    .on('mousemove', (event) => {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => { tooltip.style('opacity', 0); });

    arcsPath.transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(1);
            return function(t) {
                return arc(interpolate(t));
            };
        });

    const legend = svg.selectAll('.legend')
        .data(aggregatedData)
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${radius + 20}, ${-radius / 2 + i * 20})`);

    legend.append('rect')
        .attr('x', 0)
        .attr('y', -6)
        .attr('width', 12)
        .attr('height', 12)
        .style('fill', (d, i) => color(i));

    legend.append('text')
        .attr('x', 18)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('fill', '#ffffff')
        .style('font-size', '12px')
        .text(d => d[0]);
}

// Function to draw the Customer Purchase Frequency Bar Chart
function drawCustomerPurchaseBarChart() {
    // Remove any existing SVG
    d3.select('#customerBarChart').selectAll('svg').remove();

    // Use window.originalData to create synthetic purchase frequency distribution
    const fallbackData = window.originalData;
    const totalCount = fallbackData.length;
    const freqLow = Math.floor(totalCount * 0.5);
    const freqMed = Math.floor(totalCount * 0.3);
    const freqHigh = totalCount - freqLow - freqMed;

    const aggregatedData = [
        ["Low (1-2x)", freqLow],
        ["Medium (3-5x)", freqMed],
        ["High (5+x)", freqHigh]
    ];

    const width = 500, height = 300;
    const margin = { top: 30, right: 20, bottom: 50, left: 50 };

    const svg = d3.select('#customerBarChart')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
        .domain(aggregatedData.map(d => d[0]))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, d => +d[1])])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(aggregatedData.map(d => d[0]))
        .range(d3.schemeCategory10);

    svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")	
            .style("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "-0.15em")
            .attr("transform", "rotate(-65)");

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.selectAll('.bar')
        .data(aggregatedData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d[0]))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => color(d[0]))
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                   .html(`<strong>${d[0]}</strong><br/>Count: ${d[1]}`)
                   .style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mousemove', (event) => {
            tooltip.style('left', (event.pageX + 10) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', () => {
            tooltip.style('opacity', 0);
        })
        .transition()
        .duration(1000)
        .attr('y', d => y(d[1]))
        .attr('height', d => height - y(d[1]))
        .delay((d, i) => i * 100);

    svg.append("text")
        .attr("x", width / 2 )
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")
        .style("fill", "#ffffff")
        .text("Customer Purchase Frequency");
}

// Function to update charts dynamically
function updateCharts() {
    const selectedProducts = Array.from(document.querySelectorAll('#productSelector input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
    const filteredData = window.originalData.filter(d => selectedProducts.includes(d['PRODUCTLINE']));
    window.salesData = filteredData;

    // Redraw Roadmap Chart
    drawRoadmapChart(window.salesData);

    // Reset bottom charts animations
    resetBottomCharts();

    // Trigger bottom charts animation if the salesTrendChart is currently visible
    const currentChartId = Array.from(document.querySelectorAll('.content > div')).find(div => div.style.display === 'block')?.id;
    if (currentChartId === 'salesTrendChart') {
        triggerBottomChartsAnimation();
    }

    // Also, redraw the map to reflect any changes if necessary
    drawMap();
}

// Initialize the display by showing the active chart on page load
document.addEventListener('DOMContentLoaded', () => {
    const activeButton = document.querySelector('.sidebar-button.active');
    if (activeButton) {
        const chartId = activeButton.getAttribute('data-chart');
        showChart(chartId);
    }
});

// Ensure that clicking on the sidebar buttons loads the corresponding chart
document.querySelectorAll('.sidebar-button').forEach(button => {
    button.addEventListener('click', function() {
        const chartId = this.getAttribute('data-chart');
        showChart(chartId);
    });
});
