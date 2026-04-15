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

function computerBoxStats (values) {
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
        .map(([genre, vals]) => ({genre, stats: computerBoxStats(vals) }))
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

    ;[sliderMin, sliderMax].forEach(s => {
        s.min = yearMin
        s.max = yearMax
        s.step = 1
    })
    sliderMin.value = yearMin
    sliderMax.value = yearMax
    labelMin.textContent = yearMin 
    labelMax.textContent = yearMax

    function onSlider (movedSlider) {
        let lo = +sliderMin.value 
        let hi = +sliderMax.value 
        if (movedSlider === 'min' && lo > hi) {
            sliderMin.value = hi 
            lo = hi
        }
        if (movedSlider === 'max' && hi < lo) {
            sliderMax.value = lo 
            hi = lo
        }
        yearRange = [lo, hi]
        labelMin.textContent = lo 
        labelMax.textContent = hi 
        update()
    }
    sliderMin.addEventListener('input', () => onSlider('min'))
    sliderMax.addEventListener('input', () => onSlider('max'))

    document.querySelectorAll('.bp-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bp-toggle').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            metric = btn.dataset.metric 
            update()
        })
    })

    const svg = d3.select('#boxplot-svg')
    const tooltip = d3.select('#boxplot-tooltip')

    function getSize () {
        const w = container.clientWidth || 900
        const h = Math.max(420, w * 0.45)
        return {
            width: w, 
            height: h, 
            innerW: w - MARGIN.left - MARGIN.right, 
            innerH: h - MARGIN.top - MARGIN.bottom
        }
    }

    function update () {
        const {width, height, innerW, innerH} = getSize() 
        const grouped = groupByGenre(data, metric, yearRange)

        svg.attr('width', width).attr('height', height)
        svg.selectAll('*').remove()
        
        const g = svg.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

        const xScale = d3.scaleBand() 
            .domain(grouped.map(d => d.genre))
            .range([0, innerW])
            .padding(0.3)

        const allVals = grouped.flatMap(d => [d.stats.min, d.stats.max])
        const yScale = metric === 'revenue'
            ? d3.scaleLog().domain([Math.max(1, d3.min(allVals)), d3.max(allVals)]).range([innerH, 0]).nice()
            : d3.scaleLinear().domain([0, 10]).range([innerH, 0])

        g.append('g')
            .attr('transform', `translate(0, ${innerH})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-35)')
            .style('text-anchor', 'end')
            .style('font-size', '11px')
            .style('fill', '#FFFFFF')

        const yAxis = metric === 'revenue'
            ? d3.axisLeft(yScale).ticks(6, '~s')
            : d3.axisLeft(yScale).ticks(10)

        g.append('g')
            .call(yAxis)
            .selectAll('text')
            .style('fill', '#FFFFFF')

        g.append('text')
            .attr('transform', `translate(${innerW / 2}, ${innerH + MARGIN.bottom - 8})`)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('fill', '#FFFFFF')
            .text('Genres')

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -MARGIN.left + 14)
            .attr('x', -innerH / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '13px')
            .style('fill', '#FFFFFF')
            .text(metric === 'revenue' ? 'Revenus (USD)' : 'Note sur 10')

        const boxW = xScale.bandwidth()
        const color = '#D9232E'

        grouped.forEach(({genre, stats}) => {
            const cx = xScale(genre) + boxW / 2
            
            ;[stats.min, stats.max].forEach(val => {
                const fromY = val === stats.min ? yScale(stats.q1) : yScale(stats.q3)
                g.append('line')
                    .attr('x1', cx).attr('x2', cx)
                    .attr('y1', fromY).attr('y2', yScale(val))
                    .attr('stroke', '#FFFFFF')
                    .attr('stroke-width', 1.5)

                g.append('line')
                    .attr('x1', cx - boxW * 0.15).attr('x2', cx + boxW * 0.15)
                    .attr('y1', yScale(val)).attr('y2', yScale(val))
                    .attr('stroke', '#FFFFFF')
                    .attr('stroke-width', 1.5)
            })

            const boxEl = g.append('rect')
                .attr('x', xScale(genre))
                .attr('y', yScale(stats.q3))
                .attr('width', boxW)
                .attr('height', Math.abs(yScale(stats.q1) - yScale(stats.q3)))
                .attr('fill', color)
                .attr('fill-opacity', 1)
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('rx', 3)
                .style('cursor', 'pointer')

            const medLine = g.append('line')
                .attr('x1', xScale(genre)).attr('x2', xScale(genre) + boxW)
                .attr('y1', yScale(stats.median)).attr('y2', yScale(stats.median))
                .attr('stroke', '#FFFFFF').attr('stroke-width', 2)

            function fmt (v) {
                return metric === 'revenue' ? `$${d3.format(',.0f')(v)}` : v.toFixed(2)
            }

            function showTip(event) {
                const rect = container.getBoundingClientRect()
                const x = event.clientX - rect.left
                const y = event.clientY - rect.top 
                tooltip.classed('visible', true).html(`
                    <strong>${genre}</strong><br/>
                    Mediane : ${fmt(stats.median)}<br/>
                    Q1 : ${fmt(stats.q1)}<br/>
                    Q3 : ${fmt(stats.q3)}<br/>
                    Min : ${fmt(stats.min)}<br/>
                    Max : ${fmt(stats.max)}<br/>
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

            ;[boxEl, medLine].forEach(el => {
                el.on('mouseover', showTip)
                    .on('mouseout', hideTip)
            })
        })
    }

    update() 
    window.addEventListener('resize', update)
}