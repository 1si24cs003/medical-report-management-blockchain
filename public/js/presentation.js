document.addEventListener('DOMContentLoaded', () => {
    let currentSlide = 1;
    const slides = document.querySelectorAll('.slide-container');
    const totalSlides = slides.length;
    const counter = document.getElementById('slideCounter');
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    const fullscreenBtn = document.getElementById('toggleFullscreenBtn');

    function showSlide(index) {
        if (index < 1) index = 1;
        if (index > totalSlides) index = totalSlides;
        currentSlide = index;

        slides.forEach(s => s.classList.remove('active'));
        const activeSlide = document.querySelector(`.slide-container[data-slide="${currentSlide}"]`);
        if (activeSlide) {
            activeSlide.classList.add('active');
        }

        if (counter) {
            counter.textContent = `Slide ${currentSlide} of ${totalSlides}`;
        }

        if (prevBtn) prevBtn.disabled = (currentSlide === 1);
        if (nextBtn) nextBtn.disabled = (currentSlide === totalSlides);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
    }

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            e.preventDefault();
            showSlide(currentSlide + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            showSlide(currentSlide - 1);
        } else if (e.key === 'f' || e.key === 'F') {
            toggleFullscreen();
        } else if (e.key === 'Home') {
            showSlide(1);
        } else if (e.key === 'End') {
            showSlide(totalSlides);
        }
    });

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Initialize with Slide 1
    showSlide(1);
});
