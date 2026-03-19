// Gradient Orbs Background Animation
// Scroll-driven color transitions per section + dark mode toggle
// Large, soft, blurred orbs with slow orbital drift

(function() {
    const canvas = document.getElementById('constellation-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isMobile = () => window.innerWidth < 768;

    // Hero palettes per cycling word (matched to gradient text colors)
    var heroWordPalettes = {
        day:       [[0, 122, 255, 0.6],   [175, 82, 222, 0.5],  [236, 0, 140, 0.5],  [120, 60, 200, 0.5],  [0, 122, 255, 0.4],  [175, 82, 222, 0.45]],
        routines:  [[52, 199, 89, 0.6],   [48, 209, 88, 0.5],   [249, 237, 50, 0.5], [52, 199, 89, 0.5],   [249, 237, 50, 0.4], [48, 209, 88, 0.45]],
        focus:     [[88, 86, 214, 0.6],   [0, 122, 255, 0.5],   [52, 199, 89, 0.5],  [88, 86, 214, 0.5],   [0, 122, 255, 0.4],  [52, 199, 89, 0.45]],
        goals:     [[255, 149, 0, 0.6],   [255, 59, 48, 0.5],   [236, 0, 140, 0.5],  [255, 149, 0, 0.5],   [255, 59, 48, 0.4],  [236, 0, 140, 0.45]],
        health:    [[28, 117, 188, 0.6],  [52, 199, 89, 0.5],   [129, 199, 132, 0.5],[28, 117, 188, 0.5],  [52, 199, 89, 0.4],  [129, 199, 132, 0.45]],
        nutrition: [[255, 149, 0, 0.6],   [242, 101, 34, 0.5],  [249, 237, 50, 0.5], [255, 149, 0, 0.5],   [242, 101, 34, 0.4], [249, 237, 50, 0.45]],
        life:      [[236, 0, 140, 0.6],   [242, 101, 34, 0.5],  [249, 237, 50, 0.5], [236, 0, 140, 0.5],   [242, 101, 34, 0.4], [249, 237, 50, 0.45]],
    };

    var currentHeroWord = 'day';

    // Color palettes per section: [r, g, b, opacity] per orb
    const palettes = {
        hero: heroWordPalettes.day,
        features: [
            [0, 0, 0, 0.5],
            [10, 10, 15, 0.5],
            [0, 0, 0, 0.4],
            [5, 5, 10, 0.5],
            [0, 0, 0, 0.4],
            [10, 10, 15, 0.45],
        ],
        macos: [
            [28, 117, 188, 0.7],
            [175, 82, 222, 0.6],
            [236, 0, 140, 0.6],
            [242, 101, 34, 0.6],
            [249, 237, 50, 0.5],
            [28, 117, 188, 0.55],
        ],
        howItWorks: [
            [28, 117, 188, 0.7],
            [175, 82, 222, 0.6],
            [236, 0, 140, 0.6],
            [242, 101, 34, 0.6],
            [249, 237, 50, 0.5],
            [175, 82, 222, 0.55],
        ],
        cta: [
            [0, 70, 200, 0.6],
            [28, 117, 188, 0.5],
            [0, 122, 255, 0.5],
            [90, 160, 220, 0.5],
            [0, 90, 170, 0.5],
            [28, 117, 188, 0.45],
        ],
    };

    const orbDefs = [
        { cx: 0.20, cy: 0.25, size: 0.55, orbitR: 160, period: 18   },
        { cx: 0.70, cy: 0.35, size: 0.50, orbitR: 140, period: 15   },
        { cx: 0.15, cy: 0.70, size: 0.52, orbitR: 180, period: 21   },
        { cx: 0.80, cy: 0.60, size: 0.48, orbitR: 130, period: 13.5 },
        { cx: 0.50, cy: 0.15, size: 0.45, orbitR: 150, period: 19   },
        { cx: 0.40, cy: 0.50, size: 0.48, orbitR: 145, period: 16.5 },
    ];

    let orbs = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let mouseActive = false;
    let resizeTimeout = null;
    let startTime = performance.now() / 1000;
    let sectionPositions = [];
    let currentZone = 'hero';

    const lerpSpeed = 0.025;
    var transitionTime = 0; // timestamp when zone last changed
    var orbTransitionDelays = []; // per-orb delay in seconds
    var lastScrollY = 0;

    function cacheSections() {
        const defs = [
            { sel: '.hero', palette: 'hero' },
            { sel: '#features', palette: 'features' },
            { sel: '#macos-hero', palette: 'macos' },
            { sel: '.how-it-works', palette: 'howItWorks' },
            { sel: '.cta-section', palette: 'cta' },
        ];
        sectionPositions = [];
        defs.forEach(function(d) {
            var el = document.querySelector(d.sel);
            if (el) {
                sectionPositions.push({
                    top: el.offsetTop,
                    bottom: el.offsetTop + el.offsetHeight,
                    palette: d.palette,
                });
            }
        });
    }

    function getActiveZone() {
        var scrollCenter = window.scrollY + window.innerHeight / 2;
        for (var i = sectionPositions.length - 1; i >= 0; i--) {
            if (scrollCenter >= sectionPositions[i].top) {
                return sectionPositions[i].palette;
            }
        }
        return 'hero';
    }

    function buildOrbs() {
        var w = canvas.width;
        var h = canvas.height;
        var mobile = isMobile();
        var minDim = Math.min(w, h);
        var initPalette = palettes[currentZone] || palettes.hero;

        orbs = orbDefs.map(function(def, i) {
            if (mobile && i >= 3) return null;

            var radius = (mobile ? def.size * 1.1 : def.size) * minDim;
            var col = initPalette[i];
            return {
                baseX: def.cx * w,
                baseY: def.cy * h,
                radius: Math.max(radius, 150),
                currentColor: [col[0], col[1], col[2]],
                currentOpacity: col[3],
                orbitR: mobile ? def.orbitR * 0.6 : def.orbitR,
                period: def.period,
                phase: i * 1.3,
                displaceX: 0,
                displaceY: 0,
                index: i,
            };
        }).filter(Boolean);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            resizeCanvas();
            buildOrbs();
            cacheSections();
        }, 150);
    }

    // Blue shades for CTA cycling
    var blueShades = [
        [0, 70, 200],
        [28, 117, 188],
        [0, 122, 255],
        [90, 160, 220],
        [0, 90, 170],
        [50, 140, 210],
        [10, 80, 180],
    ];

    function lerpColors() {
        var targetPalette = palettes[currentZone] || palettes.hero;
        var now = performance.now() / 1000;
        var elapsed = now - transitionTime;

        orbs.forEach(function(orb) {
            var target;

            if (currentZone === 'cta') {
                // Cycle through blue shades — each orb offset in phase
                var cycleSpeed = 0.15; // full cycle every ~47s (7 shades)
                var phase = (now * cycleSpeed + orb.index * 1.4) % blueShades.length;
                var idx = Math.floor(phase);
                var frac = phase - idx;
                var a = blueShades[idx];
                var b = blueShades[(idx + 1) % blueShades.length];
                target = [
                    a[0] + (b[0] - a[0]) * frac,
                    a[1] + (b[1] - a[1]) * frac,
                    a[2] + (b[2] - a[2]) * frac,
                    0.55
                ];
            } else {
                target = targetPalette[orb.index];
            }

            if (!target) return;

            // Only start lerping after this orb's stagger delay
            var delay = orbTransitionDelays[orb.index] || 0;
            if (elapsed < delay) return;

            orb.currentColor[0] += (target[0] - orb.currentColor[0]) * lerpSpeed;
            orb.currentColor[1] += (target[1] - orb.currentColor[1]) * lerpSpeed;
            orb.currentColor[2] += (target[2] - orb.currentColor[2]) * lerpSpeed;
            orb.currentOpacity += (target[3] - orb.currentOpacity) * lerpSpeed;
        });
    }

    function drawOrb(orb, time) {
        var angle = (time / orb.period) * Math.PI * 2 + orb.phase;
        var ox = orb.baseX + Math.cos(angle) * orb.orbitR + orb.displaceX;
        var oy = orb.baseY + Math.sin(angle * 0.7) * orb.orbitR * 0.8 + orb.displaceY;

        var r = Math.round(orb.currentColor[0]);
        var g = Math.round(orb.currentColor[1]);
        var b = Math.round(orb.currentColor[2]);
        var a = orb.currentOpacity;

        var grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.radius);
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
        grad.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + (a * 0.6) + ')');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function updateMouseDisplacement() {
        if (!mouseActive) {
            orbs.forEach(function(orb) {
                orb.displaceX *= 0.95;
                orb.displaceY *= 0.95;
            });
            return;
        }

        orbs.forEach(function(orb) {
            var dx = orb.baseX - mouseX;
            var dy = orb.baseY - mouseY;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 400 && dist > 0) {
                var strength = (1 - dist / 400) * 25;
                var targetX = (dx / dist) * strength;
                var targetY = (dy / dist) * strength;
                orb.displaceX += (targetX - orb.displaceX) * 0.08;
                orb.displaceY += (targetY - orb.displaceY) * 0.08;
            } else {
                orb.displaceX *= 0.95;
                orb.displaceY *= 0.95;
            }
        });
    }

    function updateZone() {
        var newZone = getActiveZone();
        if (newZone !== currentZone) {
            currentZone = newZone;
            transitionTime = performance.now() / 1000;

            // Sort orbs by proximity to the intersecting section edge
            // Scrolling down = new section enters from bottom, so nearest to bottom first
            // Scrolling up = new section enters from top, so nearest to top first
            var scrollingDown = (window.scrollY || 0) >= (lastScrollY || 0);
            lastScrollY = window.scrollY || 0;

            var distances = orbs.map(function(orb, i) {
                // Distance from the entering edge (bottom if scrolling down, top if up)
                var dist = scrollingDown ? (canvas.height - orb.baseY) : orb.baseY;
                return { index: i, dist: dist };
            });
            distances.sort(function(a, b) { return a.dist - b.dist; });

            var staggerStep = 0.12; // seconds between each orb starting
            orbTransitionDelays = [];
            distances.forEach(function(d, rank) {
                orbTransitionDelays[d.index] = rank * staggerStep;
            });

            // Dark mode is controlled by system preference and manual toggle only
        }
    }

    function animate() {
        var time = performance.now() / 1000 - startTime;

        updateZone();
        lerpColors();
        updateMouseDisplacement();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        orbs.forEach(function(orb) { drawOrb(orb, time); });

        requestAnimationFrame(animate);
    }

    function init() {
        resizeCanvas();
        cacheSections();
        buildOrbs();

        setTimeout(function() {
            resizeCanvas();
            cacheSections();
            buildOrbs();
        }, 100);

        window.addEventListener('resize', handleResize);

        if (!isMobile()) {
            document.addEventListener('mousemove', function(e) {
                mouseX = e.clientX;
                mouseY = e.clientY;
                mouseActive = true;
            });

            document.addEventListener('mouseleave', function() {
                mouseActive = false;
            });
        }

        // Listen for cycling word changes to update hero palette with stagger
        document.addEventListener('heroWordChange', function(e) {
            var word = e.detail;
            if (heroWordPalettes[word] && currentZone === 'hero') {
                currentHeroWord = word;
                palettes.hero = heroWordPalettes[word];
                transitionTime = performance.now() / 1000;

                // Stagger orbs randomly for an organic trickle
                var indices = orbs.map(function(_, i) { return i; });
                // Shuffle
                for (var i = indices.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = tmp;
                }
                orbTransitionDelays = [];
                indices.forEach(function(idx, rank) {
                    orbTransitionDelays[idx] = rank * 0.25;
                });
            }
        });

        animate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
