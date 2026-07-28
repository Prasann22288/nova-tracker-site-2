/* ===================================================================
   NOVA TRACKER — site behaviour
   Each feature below is wrapped in its own try/catch and initialised
   independently, so if one piece fails (e.g. no internet reaching the
   feedback endpoint) it can never take the others down with it.
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  initRating();
  initFeedbackForm();
});

/* ===================================================================
   1. SCREENSHOT CAROUSEL — no external library, plain scroll-snap +
      IntersectionObserver, so it always works with zero dependencies.
   =================================================================== */
function initCarousel() {
  try {
    const track = document.getElementById('carouselTrack');
    const dotsWrap = document.getElementById('carouselDots');
    const carousel = document.getElementById('screenCarousel');
    if (!track || !dotsWrap || !carousel) return;

    const slides = Array.from(track.querySelectorAll('.carousel__slide'));
    if (!slides.length) return;

    const prevBtn = carousel.querySelector('.carousel__arrow--prev');
    const nextBtn = carousel.querySelector('.carousel__arrow--next');

    // Build dot indicators
    slides.forEach((slide, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Go to screenshot ${i + 1}`);
      dot.addEventListener('click', () => scrollToSlide(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.querySelectorAll('.carousel__dot'));

    let activeIndex = 0;

    function setActive(index) {
      activeIndex = index;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    }

    function scrollToSlide(index) {
      const clamped = (index + slides.length) % slides.length;
      slides[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setActive(clamped);
    }

    // Track which slide is most visible as the user scrolls/swipes/drags
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              const idx = slides.indexOf(entry.target);
              if (idx !== -1) setActive(idx);
            }
          });
        },
        { root: track, threshold: [0.6] }
      );
      slides.forEach((slide) => observer.observe(slide));
    }

    if (prevBtn) prevBtn.addEventListener('click', () => scrollToSlide(activeIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollToSlide(activeIndex + 1));

    // Mouse drag-to-scroll for desktop (touch/trackpad already works natively)
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      track.classList.add('is-dragging');
      startX = e.pageX;
      startScroll = track.scrollLeft;
    });
    window.addEventListener('mouseup', () => {
      isDown = false;
      track.classList.remove('is-dragging');
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      track.scrollLeft = startScroll - (e.pageX - startX);
    });

    // Gentle autoplay, paused whenever the visitor interacts
    let autoplayTimer = setInterval(() => scrollToSlide(activeIndex + 1), 4200);
    function pauseAutoplay() {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    ['mouseenter', 'touchstart', 'mousedown', 'wheel'].forEach((evt) => {
      track.addEventListener(evt, pauseAutoplay, { passive: true });
    });
  } catch (err) {
    console.error('Carousel failed to initialise:', err);
  }
}

/* ===================================================================
   2. STAR RATING
   =================================================================== */
function initRating() {
  try {
    const ratingEl = document.getElementById('rating');
    if (!ratingEl) return;
    const stars = Array.from(ratingEl.querySelectorAll('.rating__star'));

    function paintStars(value) {
      stars.forEach((star) => {
        star.classList.toggle('is-active', Number(star.dataset.star) <= value);
      });
    }

    stars.forEach((star) => {
      star.addEventListener('click', () => {
        const value = Number(star.dataset.star);
        ratingEl.dataset.value = String(value);
        paintStars(value);
      });
    });
  } catch (err) {
    console.error('Rating widget failed to initialise:', err);
  }
}

/* ===================================================================
   3. FEEDBACK FORM
   Saves every submission to:
     a) localStorage on this browser only, as a safety net if (b) fails
        (viewable/exportable to a CSV file from local-feedback-backup.html —
        that page only ever shows this one device's own submissions)
     b) a private Google Sheet, via a Google Apps Script Web App URL you
        set in js/sheet-config.js — this is the real, cross-visitor
        feedback inbox, visible only to whoever owns/has access to that
        Sheet, never to other visitors
   =================================================================== */
function initFeedbackForm() {
  try {
    const form = document.getElementById('feedbackForm');
    if (!form) return;

    const statusEl = document.getElementById('feedbackStatus');
    const submitBtn = document.getElementById('fbSubmit');
    const ratingEl = document.getElementById('rating');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name: document.getElementById('fbName').value.trim(),
        email: document.getElementById('fbEmail').value.trim(),
        type: document.getElementById('fbType').value,
        rating: Number(ratingEl?.dataset.value) || 0,
        message: document.getElementById('fbMessage').value.trim(),
        page: window.location.href,
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString(),
      };

      if (!payload.name || !payload.message) {
        showStatus('Please fill in your name and a message.', true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      showStatus('', false);

      // (a) Always keep a local copy first — this can never fail silently.
      saveFeedbackLocally(payload);

      // (b) Try to also send it to the shared Google Sheet, if configured.
      const sheetResult = await sendToSheet(payload);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Feedback';

      if (sheetResult === 'not-configured') {
        showStatus('Thank you for sharing your review.', false);
      } else if (sheetResult === 'error') {
        showStatus('Saved locally on this device — could not reach the shared spreadsheet (check your connection).', true);
      } else {
        showStatus('Thanks — your feedback has been logged.', false);
      }

      form.reset();
      if (ratingEl) {
        ratingEl.dataset.value = '0';
        ratingEl.querySelectorAll('.rating__star').forEach((s) => s.classList.remove('is-active'));
      }
    });

    function showStatus(message, isError) {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.toggle('is-error', !!isError);
    }
  } catch (err) {
    console.error('Feedback form failed to initialise:', err);
  }
}

/** Append one feedback entry to localStorage (key: novaTrackerFeedback). */
function saveFeedbackLocally(entry) {
  try {
    const key = 'novaTrackerFeedback';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.error('Could not save feedback to localStorage:', err);
  }
}

/**
 * POST feedback to a Google Apps Script Web App (acts as a free,
 * no-backend endpoint that appends a row to a Google Sheet).
 * Returns 'ok' | 'error' | 'not-configured'.
 */
async function sendToSheet(payload) {
  const url = (typeof SHEET_WEB_APP_URL !== 'undefined') ? SHEET_WEB_APP_URL : '';

  if (!url || url.includes('YOUR_DEPLOYMENT_ID')) {
    return 'not-configured';
  }

  try {
    // Apps Script web apps don't return CORS headers we can read from
    // another origin, so the request is sent 'no-cors': it still
    // reaches the sheet and appends the row, we just can't read the
    // response body back. We treat "fetch didn't throw" as success.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return 'ok';
  } catch (err) {
    console.error('Could not reach the Google Sheet endpoint:', err);
    return 'error';
  }
}
