import * as d3 from 'd3'

const GENRE_FR = {
    "Action": "Action", 
    "Adventure": "Aventure", 
    "Animation": "Animation", 
    "Comedy": "Comédie", 
    "Documentary": "Documentaire", 
    "Drama": "Drame", 
    "Family": "Famille", 
    "Fantasy": "Fantastique", 
    "History": "Histoire", 
    "Horror": "Horreur", 
    "Music": "Musique", 
    "Mystery": "Mystère", 
    "Romance": "Romance", 
    "Science Fiction": "Science-fiction",
    "TV Movie": "Téléfilm", 
    "Thriller": "Thriller", 
    "War": "Guerre", 
    "Western": "Western"
}

const MARGIN = {top: 30, right: 30, bottom: 100, left: 80}

function translateGenre(genre) {
    return GENRE_FR[genre] || genre
}

function parseGenres (genreStr) {
    if (!genreStr) return []
    return genreStr.split(',').map(g => g.trim()).filter(Boolean)
}

function calculateStats (values) {
    const sorted = [...values].sort(d3.ascending)
    const q1 = d3.quantile(sorted, 0.25)
    const median = d3.quantile(sorted, 0.5)
    const q3 = d3.quantile(sorted, 0.75)
    const iqr = q3-q1
    const min = Math.max(d3.min(sorted), q1 - 1.5 * iqr)
    const max = Math.min(d3.max(sorted), q3 + 1.5 * iqr)
    return {q1, median, q3, min, max, count: values.length}
}

function groupByGenre (data, metric, yearRange) {
    const [yearMin, yearMax] = yearRange
    const filtered = data.filter(d => {
        const year = d.year
        return year >= yearMin && year <= yearMax
    })

    const genreMap = new Map() 
    filtered.forEach(d => {
        const val = metric === 'revenue' ? d.revenue : d.vote_average
        if (!val || val <= 0) return 
        parseGenres(d.genres).forEach(genre => {
            const genreFR = translateGenre(genre)
            if (!genreMap.has(genreFR)) genreMap.set(genreFR, [])
            genreMap.get(genreFR).push(val)
        })
    })

    return Array.from(genreMap.entries())
        .filter(([, vals]) => vals.length >= 5)
        .map(([genre, vals]) => ({genre, stats: calculateStats(vals) }))
        .sort((a, b) => d3.ascending(a.genre, b.genre))
}

export function initBoxplot (data) {
    const container = document.getElementById('boxplot-container')
    if (!container) return 

    let metric = 'revenue'
    const yearMin = d3.min(data, d => d.year)
    const yearMax = d3.max(data, d => d.year)
    let yearRange = [yearMin, yearMax]

    const sliderMin = document.getElementById('bp-slider-min')
    const sliderMax = document.getElementById('bp-slider-max')
    const labelMin = document.getElementById('bp-year-min')
    const labelMax = document.getElementById('bp-year-max')

    for (const slider of [sliderMin, sliderMax]) {
        slider.min = yearMin
        slider.max = yearMax
        slider.step = 1
    }
    sliderMin.value = yearMin
    sliderMax.value = yearMax
    labelMin.textContent = yearMin 
    labelMax.textContent = yearMax

    function onSlider (movedSlider) {
        let lowerBound = +sliderMin.value 
        let upperBound = +sliderMax.value 
        if (movedSlider === 'min' && lowerBound > upperBound) {
            sliderMin.value = upperBound 
            lowerBound = upperBound
        }
        if (movedSlider === 'max' && upperBound < lowerBound) {
            sliderMax.value = lowerBound 
            upperBound = lowerBound
        }
        yearRange = [lowerBound, upperBound]
        labelMin.textContent = lowerBound 
        labelMax.textContent = upperBound 
        update()
    }
    sliderMin.addEventListener('input', () => {
        sliderMin.style.zIndex = 5 
        sliderMax.style.zIndex = 4
        onSlider('min')
    })
    sliderMax.addEventListener('input', () => {
        sliderMax.style.zIndex = 5 
        sliderMin.style.zIndex = 4
        onSlider('max')
    })

    document.querySelectorAll('.bp-toggle').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.bp-toggle').forEach(otherButton => otherButton.classList.remove('active'))
            button.classList.add('active')
            metric = button.dataset.metric 
            update()
        })
    })

    const svg = d3.select('#boxplot-svg')
    const tooltip = d3.select('#boxplot-tooltip')

    function getSize () {
        const width = container.clientWidth || 900
        const height = Math.max(420, width * 0.45)
        return {
            width: width, 
            height: height, 
            innerWidth: width - MARGIN.left - MARGIN.right, 
            innerHeight: height - MARGIN.top - MARGIN.bottom
        }
    }

    function update () {
        const {width, height, innerWidth, innerHeight} = getSize() 
        const genres = groupByGenre(data, metric, yearRange)

        svg.attr('width', width).attr('height', height)
        svg.selectAll('*').remove()
        const metricLabel = metric === 'revenue' ? 'revenus en USD' : 'notes moyennes sur 10'
        svg.attr('aria-label', 
            `Boites a moustaches des ${metricLabel} par genre cinematographique, pour la periode ${yearRange[0]}-${yearRange[1]}` 
        )
        
        const chartGroup = svg.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

        const xScale = d3.scaleBand() 
            .domain(genres.map(d => d.genre))
            .range([0, innerWidth])
            .padding(0.3)

        const values = []
        for (const d of genres) {
            values.push(d.stats.min, d.stats.max)
        }
        const yScale = metric === 'revenue'
            ? d3.scaleLog().domain([Math.max(1, d3.min(values)), d3.max(values)]).range([innerHeight, 0]).nice()
            : d3.scaleLinear().domain([0, 10]).range([innerHeight, 0])

        chartGroup.append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-35)')
            .style('text-anchor', 'end')
            .style('font-size', '11px')
            .style('fill', '#FFFFFF')

        const yAxis = metric === 'revenue'
            ? d3.axisLeft(yScale).ticks(6, '~s')
            : d3.axisLeft(yScale).ticks(10)

        chartGroup.append('g')
            .call(yAxis)
            .selectAll('text')
            .style('fill', '#FFFFFF')

        chartGroup.append('text')
            .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + MARGIN.bottom - 8})`)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('fill', '#FFFFFF')
            .text('Genres')

        chartGroup.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -MARGIN.left + 14)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('fill', '#FFFFFF')
            .text(metric === 'revenue' ? 'Revenus (USD)' : 'Note sur 10')

        const boxWidth = xScale.bandwidth()
        const color = '#D9232E'

        for (const {genre, stats} of genres) {
            const centerX = xScale(genre) + boxWidth / 2
            
            for (const val of [stats.min, stats.max]) {
                const fromY = val === stats.min ? yScale(stats.q1) : yScale(stats.q3)
                chartGroup.append('line')
                    .attr('x1', centerX).attr('x2', centerX)
                    .attr('y1', fromY).attr('y2', yScale(val))
                    .attr('stroke', '#FFFFFF')
                    .attr('stroke-width', 1.5)

                chartGroup.append('line')
                    .attr('x1', centerX - boxWidth * 0.15).attr('x2', centerX + boxWidth * 0.15)
                    .attr('y1', yScale(val)).attr('y2', yScale(val))
                    .attr('stroke', '#FFFFFF')
                    .attr('stroke-width', 1.5)
            }

            const box = chartGroup.append('rect')
                .attr('x', xScale(genre))
                .attr('y', yScale(stats.q3))
                .attr('width', boxWidth)
                .attr('height', Math.abs(yScale(stats.q1) - yScale(stats.q3)))
                .attr('fill', color)
                .attr('fill-opacity', 1)
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('rx', 3)
                .style('cursor', 'pointer')

            const medianLine = chartGroup.append('line')
                .attr('x1', xScale(genre)).attr('x2', xScale(genre) + boxWidth)
                .attr('y1', yScale(stats.median)).attr('y2', yScale(stats.median))
                .attr('stroke', '#FFFFFF').attr('stroke-width', 2)

            function formatValue (v) {
                return metric === 'revenue' ? `$${d3.format(',.0f')(v)}` : v.toFixed(2)
            }

            function showTip(event) {
                const rect = container.getBoundingClientRect()
                const x = event.clientX - rect.left
                const y = event.clientY - rect.top 
                tooltip.classed('visible', true).html(`
                    <strong>${genre}</strong><br/>
                    Mediane : ${formatValue(stats.median)}<br/>
                    Q1 : ${formatValue(stats.q1)}<br/>
                    Q3 : ${formatValue(stats.q3)}<br/>
                    Min : ${formatValue(stats.min)}<br/>
                    Max : ${formatValue(stats.max)}<br/>
                    Films : ${stats.count}
                `)
                
                const left = x + 140 + 20 > rect.width ? x - 140 - 10 : x + 14
                tooltip
                    .style('left', `${left}px`)
                    .style('top', `${y - 10}px`)
            }

            function moveTip(event) {
                tooltip
                    .style('left', `${event.offsetX + 14}px`)
                    .style('top', `${event.offsetY - 10}px`)
            }

            function hideTip() {
                tooltip.classed('visible', false)
            }

            for (const element of [box, medianLine]) {
                element.on('mouseover', showTip)
                .on('mouseout', hideTip)
            }
        }
    }

    update() 
    window.addEventListener('resize', update)
}